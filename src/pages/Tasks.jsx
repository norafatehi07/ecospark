// src/pages/Tasks.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { getTasks, getUserSubmissions, createTask } from '../services/firestoreService';
import { generateTaskAI } from '../services/aiService';
import TaskLogModal from '../components/tasks/TaskLogModal';
import toast from 'react-hot-toast';
import PremiumIcon from '../components/common/PremiumIcon';
import { Zap, Droplets, Recycle, Utensils, Bike, Leaf, Users, CheckSquare, XCircle, Timer, Flag, Globe, Camera, AlertTriangle, Sparkles } from 'lucide-react';
import styles from './Tasks.module.css';

// Seeded random generator
function mulberry32(a) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function getDailySeed(userId) {
  const date = new Date().toDateString(); // e.g. "Mon Jul 21 2026"
  let str = date + (userId || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash;
}

const CATEGORY_ICONS = {
  energy: <PremiumIcon icon={Zap} color="gold" size={16} />,
  water: <PremiumIcon icon={Droplets} color="sapphire" size={16} />,
  waste: <PremiumIcon icon={Recycle} color="emerald" size={16} />,
  food: <PremiumIcon icon={Utensils} color="ruby" size={16} />,
  transport: <PremiumIcon icon={Bike} color="slate" size={16} />,
  nature: <PremiumIcon icon={Leaf} color="emerald" size={16} />,
  community: <PremiumIcon icon={Users} color="amethyst" size={16} />,
};

const STATUS_CONFIG = {
  approved: { icon: <PremiumIcon icon={CheckSquare} color="emerald" size={16} />, label: 'Approved', color: 'var(--color-success)' },
  rejected: { icon: <PremiumIcon icon={XCircle} color="ruby" size={16} />, label: 'Rejected', color: 'var(--color-error)' },
  pending: { icon: <PremiumIcon icon={Timer} color="gold" size={16} />, label: 'Verifying...', color: 'var(--color-warning)' },
  flagged: { icon: <PremiumIcon icon={Flag} color="ruby" size={16} />, label: 'Flagged', color: 'var(--color-warning)' },
};

function TaskCard({ task, submissions, onLog }) {
  const latestSub = submissions
    .filter((s) => s.taskId === task.id)
    .sort((a, b) => b.createdAt?.toMillis?.() - a.createdAt?.toMillis?.())
    [0];

  const status = latestSub?.status;
  const statusCfg = STATUS_CONFIG[status];
  const isCompleted = status === 'approved';

  return (
    <motion.div
      className={`${styles.taskCard} ${isCompleted ? styles.completed : ''}`}
      layout
      whileHover={!isCompleted ? { y: -3, boxShadow: 'var(--elevation-3)' } : {}}
      transition={{ duration: 0.2 }}
    >
      <div className={styles.taskHeader}>
        <div className={styles.catBadge}>
          <span>{CATEGORY_ICONS[task.category] || <PremiumIcon icon={Leaf} color="emerald" size={16} />}</span>
          <span>{task.category}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {task.expiresAt && !isCompleted && (
            <Countdown expiresAt={task.expiresAt} />
          )}
          <span className={styles.points}>+{task.points} pts</span>
        </div>
      </div>

      <h3 className={styles.taskTitle}>{task.title}</h3>
      <p className={styles.taskDesc}>{task.description}</p>

      <div className={styles.taskImpact}>
        {task.co2 && <span><PremiumIcon icon={Globe} color="emerald" size={14} /> {task.co2}g CO₂ saved</span>}
        {task.water && <span><PremiumIcon icon={Droplets} color="sapphire" size={14} /> {task.water}L water saved</span>}
      </div>

      <div className={styles.taskFooter}>
        {statusCfg ? (
          <div className={styles.statusBadge} style={{ '--status-color': statusCfg.color }}>
            {statusCfg.icon} {statusCfg.label}
          </div>
        ) : (
          <div />
        )}

        {!isCompleted && (
          <motion.button
            className={styles.logBtn}
            onClick={() => onLog(task)}
            whileTap={{ scale: 0.95 }}
            disabled={status === 'pending'}
          >
            {status === 'pending' ? <><PremiumIcon icon={Timer} size={16} /> Verifying</> : <><PremiumIcon icon={Camera} size={16} /> Log Task</>}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}

function Countdown({ expiresAt }) {
  const [left, setLeft] = useState(() => Math.max(0, expiresAt - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      setLeft(Math.max(0, expiresAt - Date.now()));
    }, 1000);
    return () => clearInterval(timer);
  }, [expiresAt]);

  if (left <= 0) return <span className={styles.expiredBadge}>Expired</span>;

  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  return (
    <span className={styles.timeBadge}>
      <PremiumIcon icon={Timer} color="gold" size={14} /> {h}h {m}m left
    </span>
  );
}

export default function Tasks() {
  const { profile } = useAuthStore();
  const [allGlobalTasks, setAllGlobalTasks] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState(null); // null | 'asc' | 'desc'
  const [selectedTask, setSelectedTask] = useState(null);

  const loadData = () => {
    if (!profile?.id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    Promise.all([
      getTasks(),
      getUserSubmissions(profile.id, 50),
    ])
      .then(([t, s]) => { 
        // 1. Sort ALL tasks by creation time so they unlock in a predictable global order
        const allSorted = [...t].sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeA - timeB;
        });
        setAllGlobalTasks(allSorted);
        setSubmissions(s); 
      })
      .catch((err) => {
        console.error('[Tasks] Failed to load:', err);
        setError(err?.message || 'Unknown error loading tasks');
        toast.error('Could not load tasks — check console for details');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [profile?.id]);

  useEffect(() => {
    if (!allGlobalTasks.length || !profile) return;
    
    // The user unlocks 1 new task from the global pool for every task they complete!
    // Base starter tasks are 14.
    const unlockedCount = 14 + (profile.totalTasksCompleted || 0);
    const allowedTasks = allGlobalTasks.slice(0, unlockedCount);

    // Shuffle deterministically for the day
    const rand = mulberry32(getDailySeed(profile.id));
    const shuffled = [...allowedTasks].sort(() => rand() - 0.5);
    
    const bonusTask = {
      id: `bonus-${getDailySeed(profile.id)}`,
      title: 'Daily Bonus Challenge!',
      description: 'A special high-value task available only for today.',
      category: 'community',
      points: 150,
      co2: 50,
      verificationPrompt: 'Show evidence of doing something exceptionally green today!',
      expiresAt: new Date().setHours(23, 59, 59, 999),
    };
    
    setTasks([bonusTask, ...shuffled]);
  }, [allGlobalTasks, profile?.totalTasksCompleted]);

  const categories = ['all', ...new Set(tasks.map((t) => t.category))];

  // Replenishment: Keep the board at 10 tasks max. Take first 10 uncompleted + any completed
  // (so completed tasks stay visible in 'done' filter, but uncompleted ones replenish).
  const uncompletedAll = tasks.filter(t => {
    if (submissions.some(s => s.taskId === t.id && s.status === 'approved')) return false;
    
    // 3-STRIKE RULE: If a teacher rejects this task 3 times, it's permanently removed!
    const rejectedCount = submissions.filter(s => s.taskId === t.id && s.status === 'rejected').length;
    if (rejectedCount >= 3) return false;
    
    return true;
  });
  
  // Only show active unexpired tasks
  const activeUncompleted = uncompletedAll.filter(t => !t.expiresAt || t.expiresAt > Date.now());
  const visibleUncompleted = activeUncompleted.slice(0, 10);
  
  const completed = tasks.filter(t => submissions.some(s => s.taskId === t.id && s.status === 'approved'));
  const visibleTasks = [...visibleUncompleted, ...completed];

  let filtered = filter === 'all' ? visibleTasks
    : filter === 'done'
    ? completed
    : visibleTasks.filter((t) => t.category === filter);

  if (sortOrder === 'asc') {
    filtered.sort((a, b) => (a.points || 0) - (b.points || 0));
  } else if (sortOrder === 'desc') {
    filtered.sort((a, b) => (b.points || 0) - (a.points || 0));
  }

  const doneCount = tasks.filter((t) =>
    submissions.some((s) => s.taskId === t.id && s.status === 'approved')
  ).length;

  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.skeletonGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skeletonCard}`} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.page}>
        <div className={styles.empty} style={{ padding: '48px 24px', gap: '16px' }}>
          <PremiumIcon icon={AlertTriangle} color="ruby" size={48} />
          <p style={{ fontWeight: 600, color: 'var(--color-text)', marginBottom: 0 }}>Failed to load tasks</p>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 8, maxWidth: '100%', wordBreak: 'break-all' }}>
            {error}
          </p>
          <button
            onClick={loadData}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-sm)' }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }


  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Eco Tasks</h1>
          <p className={styles.subtitle}>
            {profile?.totalTasksCompleted || 0} tasks completed
          </p>
        </div>
        <div className={styles.progressRing}>
          <svg viewBox="0 0 48 48" className={styles.ring}>
            <circle cx="24" cy="24" r="20" className={styles.ringBg} />
            <circle
              cx="24" cy="24" r="20"
              className={styles.ringFill}
              strokeDasharray={`${tasks.length > 0 ? (doneCount / tasks.length) * 125.6 : 0} 125.6`}
            />
          </svg>
          <span className={styles.ringText}>{tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0}%</span>
        </div>
      </div>

      {/* Filter chips & Sort */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div className={styles.filters}>
          {['all', 'done', ...new Set(tasks.map((t) => t.category))].map((cat) => (
            <button
              key={cat}
              className={`${styles.chip} ${filter === cat ? styles.chipActive : ''}`}
              onClick={() => setFilter(cat)}
            >
              {cat === 'all' ? <><PremiumIcon icon={Globe} size={16} /> All</> : cat === 'done' ? <><PremiumIcon icon={CheckSquare} size={16} /> Done</> : <><span style={{display: 'inline-flex'}}>{CATEGORY_ICONS[cat] || <PremiumIcon icon={Leaf} size={16} />}</span> <span style={{marginLeft: '4px'}}>{cat}</span></>}
            </button>
          ))}
        </div>
        
        {/* Sort toggle (off by default) */}
        <select 
          className={styles.sortSelect} 
          value={sortOrder || ''} 
          onChange={(e) => setSortOrder(e.target.value || null)}
        >
          <option value="">Sort: Default</option>
          <option value="desc">Sort: Points (High to Low)</option>
          <option value="asc">Sort: Points (Low to High)</option>
        </select>
      </div>

      {/* Task grid */}
      <motion.div className={styles.grid} layout>
        <AnimatePresence>
          {filtered.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              submissions={submissions}
              onLog={setSelectedTask}
            />
          ))}
        </AnimatePresence>
        {filtered.length === 0 && (
          <div className={styles.empty}>
            <PremiumIcon icon={Leaf} color="emerald" size={32} />
            <p>No tasks in this category yet.</p>
          </div>
        )}
      </motion.div>

      {/* Task log modal */}
      <AnimatePresence>
        {selectedTask && (
          <TaskLogModal
            task={selectedTask}
            onClose={() => setSelectedTask(null)}
            onSuccess={(sub) => {
              setSubmissions((prev) => [sub, ...prev]);
              
              // Only generate a new task if the global pool is exhausted for this user!
              const expectedUnlocked = 14 + (profile.totalTasksCompleted || 0) + 1; // +1 because profile state updates async
              
              if (expectedUnlocked > allGlobalTasks.length) {
                // Global pool is empty for them! Time for the AI to expand the world's tasks!
                const taskContext = selectedTask.title;
                const existingTitles = allGlobalTasks.map(t => t.title);
                setSelectedTask(null);

                toast.promise(
                  generateTaskAI(taskContext, existingTitles).then(async (newTaskData) => {
                    const taskToSave = { ...newTaskData, isAIGenerated: true };
                    const newId = await createTask(taskToSave);
                    setAllGlobalTasks(prev => [...prev, { id: newId, ...taskToSave, createdAt: { toMillis: () => Date.now() } }]);
                  }),
                  {
                    loading: '🌱 AI is expanding the global task pool...',
                    success: 'New global task created!',
                    error: 'Failed to generate task.'
                  }
                );
              } else {
                toast.success('Task logged! A new task is generated from the global task pool!');
                setSelectedTask(null);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
