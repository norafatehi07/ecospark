// src/pages/Home.jsx
import { Suspense, lazy, useMemo, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useUiStore } from '../store/uiStore';
import { subscribeUserNotifications } from '../services/firestoreService';
import NewsBoard from '../components/news/NewsBoard';
import EcoHeroStatic from '../components/hero/EcoHeroStatic';
import { Camera, Trophy, Gift, Globe, Bell, Zap, Flame, CheckSquare, Leaf, Sparkles } from 'lucide-react';
import styles from './Home.module.css';

// Lazy-load 3D hero (code-split, never blocks initial paint)
const EcoHero3D = lazy(() => import('../components/hero/EcoHero3D'));

// Capability check for 3D
function canRender3D() {
  if (typeof window === 'undefined') return false;
  // We'll respect user accessibility preferences
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false;
  
  // Removed strict deviceMemory and hardwareConcurrency checks 
  // because the 3D globe is lightweight and users want the premium experience.
  
  const w = window.innerWidth;
  if (w < 768) return false; // Always static on mobile for battery saving
  return true;
}

function HeroSection() {
  const use3D = useMemo(() => canRender3D(), []);
  const { reducedMotion } = useUiStore();

  if (reducedMotion || !use3D) {
    return <EcoHeroStatic />;
  }

  return (
    <Suspense fallback={<EcoHeroStatic />}>
      <EcoHero3D />
    </Suspense>
  );
}

function StatCard({ icon, label, value, sublabel, color, to, current, goal }) {
  const hasProgress = typeof current === 'number' && typeof goal === 'number';
  const progress = hasProgress ? Math.min(1, Math.max(0, current / goal)) : 0;
  
  const content = (
    <motion.div
      className={styles.statCard}
      whileHover={{ y: -4, boxShadow: 'var(--elevation-3)' }}
      transition={{ duration: 0.2 }}
      style={{ '--card-accent': color }}
    >
      <div className={styles.statHeader}>
        <div className={styles.statIconWrap}>
          {hasProgress && (
            <svg className={styles.progressRing} width="48" height="48">
              <circle stroke="var(--color-border)" strokeWidth="4" fill="transparent" r="20" cx="24" cy="24" />
              <circle 
                stroke={color} 
                strokeWidth="4" 
                fill="transparent" 
                r="20" 
                cx="24" 
                cy="24" 
                strokeDasharray={`${20 * 2 * Math.PI}`}
                strokeDashoffset={`${20 * 2 * Math.PI * (1 - progress)}`}
                strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1s ease-out', transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}
              />
            </svg>
          )}
          <div className={styles.statIcon}>{icon}</div>
        </div>
      </div>
      <div className={styles.statBody}>
        <motion.p
          className={styles.statValue}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {value}
        </motion.p>
        <p className={styles.statLabel}>{label}</p>
        {sublabel && <p className={styles.statSub}>{sublabel}</p>}
      </div>
      <div className={styles.statAccent} />
    </motion.div>
  );

  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{content}</Link> : content;
}

function QuickActions() {
  const actions = [
    { icon: <Camera size={24} color="var(--color-primary)" />, label: 'Log Task', to: '/tasks', color: 'var(--color-primary)' },
    { icon: <Trophy size={24} color="var(--color-gold)" />, label: 'Leaderboard', to: '/leaderboard', color: 'var(--color-gold)' },
    { icon: <Gift size={24} color="var(--color-error)" />, label: 'Rewards', to: '/rewards', color: 'var(--color-error)' },
    { icon: <Globe size={24} color="var(--color-info)" />, label: 'Community', to: '/community', color: 'var(--color-info)' },
  ];

  return (
    <div className={styles.quickActions}>
      {actions.map((a) => (
        <Link key={a.label} to={a.to} className={styles.quickAction}>
          <motion.div
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.96 }}
            className={styles.quickActionInner}
            style={{ '--qa-color': a.color }}
          >
            <span className={styles.qaIcon}>{a.icon}</span>
            <span className={styles.qaLabel}>{a.label}</span>
          </motion.div>
        </Link>
      ))}
    </div>
  );
}

export default function Home() {
  const { profile } = useAuthStore();

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const streakMsg = useMemo(() => {
    const s = profile?.streak || 0;
    if (s === 0) return 'Start your streak today!';
    if (s === 1) return <span className="flex items-center gap-1">You've started! Keep going <Leaf size={16} /></span>;
    if (s < 7) return `${s} days strong!`;
    if (s < 30) return <span className="flex items-center gap-1">{s} days — you're on fire! <Flame color="var(--color-error)" size={16} /></span>;
    return <span className="flex items-center gap-1">{s} days — legend! <Trophy color="var(--color-gold)" size={16} /></span>;
  }, [profile?.streak]);

  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (!profile?.id) return;
    const unsubNotifs = subscribeUserNotifications(profile.id, (notifs) => {
      setUnreadNotifs(notifs.filter(n => !n.read).length);
    });
    return () => unsubNotifs();
  }, [profile?.id]);

  return (
    <div className={styles.page}>
      {/* Welcome header */}
      <motion.div
        className={styles.welcome}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div>
          <h1 className={styles.greeting}>
            {greeting}, <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', whiteSpace: 'nowrap' }}><span className={styles.name}>{profile?.displayName?.split(' ')[0] || 'EcoHero'}</span> <Sparkles color="var(--color-gold)" size={24} /></span>
          </h1>
          <div className={styles.subgreeting}>{streakMsg}</div>
        </div>
        <Link to="/notifications" className={styles.settingsBtn} aria-label="Notifications" style={{ position: 'relative' }}>
          <Bell color="var(--color-text)" size={24} />
          {unreadNotifs > 0 && (
            <div style={{
              position: 'absolute', top: -2, right: -2,
              background: '#EF4444', color: '#FFF', fontSize: '10px',
              fontWeight: 'bold', width: '18px', height: '18px',
              borderRadius: '50%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              {unreadNotifs > 9 ? '9+' : unreadNotifs}
            </div>
          )}
        </Link>
      </motion.div>

      {/* ══════════════════════════════════════════
          LAYOUT GRID
          Mobile: stacked single column
          Tablet: 2-col
          Desktop: 3-col with hero spanning 2 rows
      ══════════════════════════════════════════ */}
      <div className={styles.grid}>
        
        <div className={styles.leftCol}>
          {/* 3D Hero (desktop only, spans 2 rows) */}
          <motion.div
            className={styles.heroCard}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
          >
            <HeroSection />
            <div className={styles.heroOverlay}>
              <p className={styles.heroLabel}>Your Eco Impact</p>
              <p className={styles.heroPoints} style={{display:'flex', alignItems:'center', gap:'0.5rem', justifyContent:'flex-start'}}>
                <Zap color="var(--color-gold)" size={20} /> <strong>{(profile?.lifetimePoints || profile?.points || 0).toLocaleString()}</strong> points earned
              </p>
            </div>
          </motion.div>

          {/* Quick actions */}
          <div className={styles.actionsArea}>
            <h2 className={styles.sectionHeading}>Quick Actions</h2>
            <QuickActions />
          </div>
        </div>

        <div className={styles.rightCol}>
          {/* Stats row */}
          <div className={styles.statsArea}>
            <StatCard
              icon={<Flame color="var(--color-error)" size={24} />}
              label="Day Streak"
              value={profile?.streak || 0}
              sublabel={profile?.longestStreak ? `Longest: ${profile.longestStreak} days` : 'Start your streak today!'}
              color="var(--color-streak)"
              to="/tasks"
            />
            <StatCard
              icon={<Zap color="var(--color-gold)" size={24} />}
              label="Available Points"
              value={(profile?.spendableBalance ?? profile?.points ?? 0).toLocaleString()}
              sublabel={`This week: ${profile?.weeklyPoints || 0}`}
              color="var(--color-gold)"
              to="/leaderboard"
            />
            <StatCard
              icon={<CheckSquare color="var(--color-primary)" size={24} />}
              label="Tasks Done"
              value={profile?.totalTasksCompleted || 0}
              sublabel="Weekly Goal: 5 Tasks"
              color="var(--color-primary)"
              to="/tasks"
              current={profile?.totalTasksCompleted || 0}
              goal={5}
            />
            <StatCard
              icon={<Leaf color="var(--color-secondary)" size={24} />}
              label="CO₂ Saved"
              value={`${((profile?.totalCO2Saved || 0) / 1000).toFixed(1)}kg`}
              sublabel="Weekly Goal: 10kg"
              color="var(--color-secondary)"
              current={(profile?.totalCO2Saved || 0) / 1000}
              goal={10}
            />
          </div>

          {/* News board */}
          <div className={styles.newsArea}>
            <NewsBoard />
          </div>
        </div>
      </div>
    </div>
  );
}
