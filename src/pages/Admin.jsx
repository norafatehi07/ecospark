import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { getFlaggedSubmissions, updateSubmissionStatus, resolveReport, getTasks, getRewards, createNotification, createOrGetChat } from '../services/firestoreService';
import { adminReviewSubmission } from '../services/economyService';
import { getAdminUsers, adminUpdateUserPoints, adminUpdateUserProfile, adminAwardFrame, adminBanUser, adminDeletePost, getReportedPosts, getAdminStats, getAdminChartData, getResolvedSubmissions, adminDeleteSubmission, adminCreateTask, adminUpdateTask, adminDeleteTask, adminCreateReward, adminUpdateReward, adminDeleteReward, getGlobalSettings, updateGlobalSettings, getFrameRequests, resolveFrameRequest, adminForceWeeklyReset, adminClearAllPastSubmissions, adminGetDuplicateTasks, adminDeleteTasksBulk, adminDeleteUserDeep } from '../services/adminService';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { Navigate, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import styles from './Admin.module.css';
import { FileText, Shield, Users, Globe, Leaf, Ban, CheckSquare, Sparkles, XCircle, AlertTriangle, Trash2, Inbox, Crown, Diamond, Medal, Save, MoreVertical, Edit2, Coins, Key, MessageSquare, UserCheck, UserX } from 'lucide-react';
import PremiumIcon from '../components/common/PremiumIcon';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { REWARDS_DB } from '../constants/rewards';
const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'submissions', label: 'Flagged Submissions' },
  { id: 'reports', label: 'Reported Posts' },
  { id: 'past', label: 'Past Submissions' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'reward-toggles', label: 'Reward Toggles' },
  { id: 'settings', label: 'Settings' }
];

export default function Admin() {
  const { profile } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [stats, setStats] = useState({ totalUsers: 0, totalPosts: 0, approvedSubmissions: 0 });
  const [chartData, setChartData] = useState([]);
  const [users, setUsers] = useState([]);
  const [flagged, setFlagged] = useState([]);
  const [reports, setReports] = useState([]);
  const [pastSubmissions, setPastSubmissions] = useState([]);
  
  const [tasksData, setTasksData] = useState([]);
  const [rewardsData, setRewardsData] = useState([]);
  const [frameRequests, setFrameRequests] = useState([]);
  const [settingsData, setSettingsData] = useState(null);

  // Modals
  const [pointsModal, setPointsModal] = useState({ open: false, user: null, amount: 0 });
  const [editUserModal, setEditUserModal] = useState({ open: false, user: null, name: '' });
  const [frameModal, setFrameModal] = useState({ open: false, user: null, frameId: 'frame-god' });
  const [directAward, setDirectAward] = useState({ userId: '', frameId: 'frame-prime' });
  const [taskModal, setTaskModal] = useState({ open: false, task: null });
  const [rewardModal, setRewardModal] = useState({ open: false, reward: null });
  const [duplicateGroups, setDuplicateGroups] = useState(null); // null=not scanned, []=no dupes, [...]= groups
  const [scanningDupes, setScanningDupes] = useState(false);
  const [clearingAll, setClearingAll] = useState(false);

  const [openDropdownId, setOpenDropdownId] = useState(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClick = () => setOpenDropdownId(null);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  // Role gate - check both profile.role and fallback to string checks
  // Default role to 'student' if undefined/null to prevent unauthorized access
  const userRole = profile?.role || 'student';
  const isAuthorized = userRole === 'teacher' || userRole === 'admin' || userRole === 'owner';
  
  if (profile && !isAuthorized) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    if (!profile) return;
    loadTabData(activeTab);
  }, [activeTab, profile]);

  const loadTabData = async (tab) => {
    setLoading(true);
    try {
      if (tab === 'overview') {
        const [s, c] = await Promise.all([
          getAdminStats(),
          getAdminChartData()
        ]);
        setStats(s);
        setChartData(c);
      } else if (tab === 'users') {
        const u = await getAdminUsers();
        setUsers(u);
      } else if (tab === 'submissions') {
        const f = await getFlaggedSubmissions(profile?.groupId);
        setFlagged(f);
      } else if (tab === 'reports') {
        const r = await getReportedPosts();
        setReports(r);
      } else if (tab === 'past') {
        const p = await getResolvedSubmissions();
        setPastSubmissions(p);
      } else if (tab === 'tasks') {
        const t = await getTasks();
        setTasksData(t);
      } else if (tab === 'reward-toggles' || tab === 'settings') {
        const setg = await getGlobalSettings();
        setSettingsData(setg || {});
      }
    } catch (err) {
      toast.error(err.message || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // --- Submissions Logic ---
  const handleDecision = async (sub, status) => {
    try {
      const { doc, updateDoc, increment, collection, setDoc, serverTimestamp } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      
      const subRef = doc(db, 'submissions', sub.id);
      await updateDoc(subRef, {
        status: status,
        reviewedAt: serverTimestamp(),
        reviewerNote: status === 'approved' ? 'Manually approved by staff' : 'Manually rejected by staff'
      });

      if (status === 'approved') {
        const points = sub.points || 50;
        
        // Add points and impact stats
        const userRef = doc(db, 'users', sub.userId);
        await updateDoc(userRef, {
          points: increment(points),
          lifetimePoints: increment(points),
          spendableBalance: increment(points),
          totalTasksCompleted: increment(1),
          totalCO2Saved: increment(sub.co2 || 0),
          totalWaterSaved: increment(sub.water || 0),
          totalWasteSaved: increment(sub.waste || 0),
          updatedAt: serverTimestamp()
        });

        // Add transaction
        const txRef = doc(collection(db, 'transactions'));
        await setDoc(txRef, {
          userId: sub.userId,
          type: 'task_reward',
          amount: points,
          description: `Task Approved: ${sub.title || 'Task'}`,
          createdAt: serverTimestamp(),
        });

        await createNotification(sub.userId, 'system', {
          message: `Your task verification was approved. You've been credited ${points} points.`,
        });
      }

      setFlagged((prev) => prev.filter((s) => s.id !== sub.id));
      toast.success(`Submission ${status}`);
    } catch (err) {
      toast.error(err.message || 'Could not update submission');
    }
  };

  const handleDeletePastSubmission = async (subId) => {
    if (!window.confirm('Are you sure you want to permanently delete this submission?')) return;
    try {
      await adminDeleteSubmission(subId);
      toast.success('Submission deleted!');
      setPastSubmissions(prev => prev.filter(s => s.id !== subId));
    } catch (err) {
      toast.error(err.message || 'Failed to delete submission');
    }
  };

  const handleClearAllPastSubmissions = async () => {
    if (!window.confirm(`Are you SURE you want to permanently delete ALL ${pastSubmissions.length} past submissions? This cannot be undone.`)) return;
    setClearingAll(true);
    try {
      const result = await adminClearAllPastSubmissions();
      toast.success(`Cleared ${result.deleted} submissions!`);
      setPastSubmissions([]);
    } catch (err) {
      toast.error(err.message || 'Failed to clear submissions');
    } finally {
      setClearingAll(false);
    }
  };

  const handleScanDuplicates = async () => {
    setScanningDupes(true);
    try {
      const groups = await adminGetDuplicateTasks();
      setDuplicateGroups(groups);
      if (groups.length === 0) toast.success('No duplicates found! Task pool is clean.');
      else toast(`Found ${groups.length} duplicate group(s) with ${groups.reduce((sum, g) => sum + g.length - 1, 0)} extra tasks.`, { icon: '⚠️' });
    } catch (err) {
      toast.error(err.message || 'Failed to scan duplicates');
    } finally {
      setScanningDupes(false);
    }
  };

  const handleDeleteDuplicateTask = async (taskId) => {
    try {
      await adminDeleteTasksBulk([taskId]);
      toast.success('Duplicate removed!');
      setDuplicateGroups(prev => {
        const updated = prev.map(group => group.filter(t => t.id !== taskId)).filter(group => group.length > 1);
        return updated;
      });
      loadTabData('tasks');
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  const handleDeleteAllDuplicates = async () => {
    if (!duplicateGroups?.length) return;
    // Keep the first task in each group (oldest), delete the rest
    const toDelete = duplicateGroups.flatMap(group => group.slice(1).map(t => t.id));
    if (!window.confirm(`Delete ${toDelete.length} duplicate tasks? The first (oldest) copy of each group will be kept.`)) return;
    try {
      await adminDeleteTasksBulk(toDelete);
      toast.success(`Removed ${toDelete.length} duplicates!`);
      setDuplicateGroups([]);
      loadTabData('tasks');
    } catch (err) {
      toast.error(err.message || 'Failed to delete duplicates');
    }
  };

  // --- Users Logic ---
  const handleEditUserSubmit = async (e) => {
    e.preventDefault();
    if (!editUserModal.name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    try {
      await adminUpdateUserProfile(editUserModal.user.id, { displayName: editUserModal.name });
      toast.success('User profile updated successfully!');
      setEditUserModal({ open: false, user: null, name: '' });
      loadTabData('users');
    } catch (err) {
      toast.error(err.message || 'Failed to update user profile');
    }
  };

  const handleUpdatePoints = async () => {
    try {
      await adminUpdateUserPoints(pointsModal.user.id, Number(pointsModal.amount));
      toast.success('Points updated successfully!');
      setPointsModal({ open: false, user: null, amount: 0 });
      loadTabData('users'); // refresh
    } catch (err) {
      toast.error(err.message || 'Failed to update points');
    }
  };

  const handleAwardFrame = async (e) => {
    e.preventDefault();
    try {
      await adminAwardFrame(frameModal.user.id, frameModal.frameId);
      toast.success(`Successfully awarded ${frameModal.frameId} to ${frameModal.user.displayName}!`);
      setFrameModal({ open: false, user: null, frameId: 'frame-god' });
      // Users array doesn't track frames directly, but we can refresh just in case
      loadTabData('users');
    } catch (err) {
      toast.error(err.message || 'Failed to award frame');
    }
  };

  const handleBanUser = async (user, ban) => {
    if (!window.confirm(`Are you sure you want to ${ban ? 'ban' : 'unban'} ${user.displayName}?`)) return;
    try {
      await adminBanUser(user.id, ban);
      toast.success(ban ? 'User banned' : 'User unbanned');
      loadTabData('users');
    } catch (err) {
      toast.error(err.message || 'Failed to ban/unban user');
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Are you absolutely sure you want to completely delete ${user.displayName}? This will wipe their leaderboard, tasks, and data from Firestore. (Note: Firebase Auth account will remain active)`)) return;
    try {
      await adminDeleteUserDeep(user.id);
      toast.success('User and all associated data deleted!');
      loadTabData('users');
    } catch (err) {
      toast.error(err.message || 'Failed to delete user');
    }
  };

  const handleLoginAsUser = (user) => {
    if (!window.confirm(`You are entering View-Only mode as ${user.displayName}. You will see their dashboard, but cannot perform actions for them. To return to Admin, simply refresh the page.`)) return;
    useAuthStore.setState({ profile: user });
    navigate('/');
  };

  const handleResetPassword = async (email) => {
    if (!window.confirm(`Send password reset email to ${email}?`)) return;
    try {
      await sendPasswordResetEmail(auth, email);
      toast.success('Password reset email sent!');
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email');
    }
  };

  const handleOpenMessenger = async (otherUserId) => {
    try {
      const chatId = await createOrGetChat(profile.id, otherUserId);
      navigate(`/messages/${chatId}`);
    } catch (err) {
      console.error(err);
      toast.error(`Failed to open chat: ${err.message}`);
    }
  };

  // --- Reports Logic ---
  const handleDeletePost = async (postId, reportId) => {
    if (!window.confirm('Are you sure you want to delete this reported post?')) return;
    try {
      await adminDeletePost(postId, reportId);
      toast.success('Post deleted successfully');
      loadTabData('reports');
    } catch (err) {
      toast.error(err.message || 'Failed to delete post');
    }
  };

  const handleDismissReport = async (reportId) => {
    if (!window.confirm('Are you sure you want to dismiss this report? The post will be kept safe.')) return;
    try {
      await resolveReport(reportId, 'dismissed');
      toast.success('Report dismissed');
      setReports((prev) => prev.filter((r) => r.id !== reportId));
    } catch (err) {
      toast.error(err.message || 'Failed to dismiss report');
    }
  };

  // --- Tasks Logic ---
  const handleSaveTask = async (e) => {
    e.preventDefault();
    const t = taskModal.task;
    try {
      if (t.id) {
        await adminUpdateTask(t.id, t);
        toast.success('Task updated!');
      } else {
        await adminCreateTask(t);
        toast.success('Task created!');
      }
      setTaskModal({ open: false, task: null });
      loadTabData('tasks');
    } catch (err) {
      toast.error(err.message || 'Failed to save task');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await adminDeleteTask(taskId);
      toast.success('Task deleted');
      loadTabData('tasks');
    } catch (err) {
      toast.error(err.message || 'Failed to delete task');
    }
  };

  // --- Rewards Logic ---
  const handleSaveReward = async (e) => {
    e.preventDefault();
    const r = rewardModal.reward;
    try {
      if (r.id) {
        await adminUpdateReward(r.id, r);
        toast.success('Reward updated!');
      } else {
        await adminCreateReward(r);
        toast.success('Reward created!');
      }
      setRewardModal({ open: false, reward: null });
      loadTabData('rewards');
    } catch (err) {
      toast.error(err.message || 'Failed to save reward');
    }
  };

  const handleDeleteReward = async (rewardId) => {
    if (!window.confirm('Are you sure you want to delete this reward?')) return;
    try {
      await adminDeleteReward(rewardId);
      toast.success('Reward deleted');
      loadTabData('rewards');
    } catch (err) {
      toast.error(err.message || 'Failed to delete reward');
    }
  };

  // --- Settings Logic ---
  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await updateGlobalSettings(settingsData);
      toast.success('Settings saved successfully!');
    } catch (err) {
      toast.error(err.message || 'Failed to save settings');
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    try {
      await adminUpdateUserProfile(userId, { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast.success(`User role updated to ${newRole}`);
    } catch (err) {
      toast.error('Failed to update role: ' + err.message);
    }
  };

  const handleForceWeeklyReset = async () => {
    if (!window.confirm('Are you SURE you want to end the week now? This will reward the top 3 users and reset all weekly points to 0!')) return;
    setLoading(true);
    try {
      await adminForceWeeklyReset();
      toast.success('Week successfully ended. Rewards distributed!');
      loadTabData(activeTab);
    } catch (err) {
      toast.error(err.message || 'Failed to force reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h1 className={styles.title} style={{display:'flex', alignItems:'center', gap:'0.5rem'}}><PremiumIcon icon={Shield} color="slate" size={32} /> Admin Panel</h1>
          <p className={styles.subtitle}>Manage users, content, and review flagged submissions</p>
        </div>
        <button className={styles.forceResetBtn} onClick={handleForceWeeklyReset}>
          <PremiumIcon icon={Crown} color="white" size={20} /> End Week & Distribute Rewards
        </button>
      </div>

      <div className={styles.layout}>
        <div className={styles.sidebar}>
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.mainContent}>
          {loading && activeTab !== 'submissions' && activeTab !== 'past' ? (
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading...</div>
      ) : (
        <>
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)' }}><PremiumIcon icon={Users} color="sapphire" size={24} /></div>
                  <div>
                    <span className={styles.statLabel}>Total Users</span>
                    <span className={styles.statValue}>{stats.totalUsers}</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: 'rgba(245, 158, 11, 0.1)' }}><PremiumIcon icon={Globe} color="gold" size={24} /></div>
                  <div>
                    <span className={styles.statLabel}>Community Posts</span>
                    <span className={styles.statValue}>{stats.totalPosts}</span>
                  </div>
                </div>
                <div className={styles.statCard}>
                  <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)' }}><PremiumIcon icon={Leaf} color="emerald" size={24} /></div>
                  <div>
                    <span className={styles.statLabel}>Approved Eco-Actions</span>
                    <span className={styles.statValue}>{stats.approvedSubmissions}</span>
                  </div>
                </div>
              </div>

              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Platform Activity (Last 7 Days)</h3>
                <div style={{ width: '100%', height: 350 }}>
                  <ResponsiveContainer>
                    <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--color-text-tertiary)" fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: '8px', color: 'var(--color-text)' }}
                        itemStyle={{ color: 'var(--color-text)' }}
                      />
                      <Legend wrapperStyle={{ paddingTop: '20px' }} />
                      <Line type="monotone" dataKey="Signups" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Posts" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                      <Line type="monotone" dataKey="Actions" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USERS */}
          {activeTab === 'users' && (
            <div className={styles.tableContainer}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Points</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id} style={{ opacity: user.banned ? 0.5 : 1 }}>
                      <td>{user.displayName}</td>
                      <td>{user.email || 'N/A'}</td>
                      <td>{user.spendableBalance ?? user.points ?? 0}</td>
                      <td>{user.role || 'user'}</td>
                      <td>{user.banned ? <><PremiumIcon icon={Ban} color="ruby" size={16} /> Banned</> : <><PremiumIcon icon={CheckSquare} color="emerald" size={16} /> Active</>}</td>
                      <td className={styles.actionCell}>
                        <div className={styles.dropdownWrapper} onClick={e => e.stopPropagation()}>
                          <button 
                            className={styles.iconBtn} 
                            onClick={() => setOpenDropdownId(openDropdownId === user.id ? null : user.id)}
                          >
                            <MoreVertical size={20} />
                          </button>
                          
                          {openDropdownId === user.id && (
                            <div className={styles.dropdownMenu}>
                              <button 
                                className={styles.dropdownItem} 
                                onClick={() => { setEditUserModal({ open: true, user, name: user.displayName || '' }); setOpenDropdownId(null); }}
                              >
                                <PremiumIcon icon={Edit2} color="slate" size={16} /> Edit Profile
                              </button>
                              {(profile?.role === 'owner' || profile?.role === 'admin') && (user.role !== 'admin' && user.role !== 'owner') && (
                                <button 
                                  className={styles.dropdownItem} 
                                  onClick={() => { handleUpdateRole(user.id, 'admin'); setOpenDropdownId(null); }}
                                >
                                  <PremiumIcon icon={Shield} color="gold" size={16} /> Promote to Admin
                                </button>
                              )}
                              {(profile?.role === 'owner' || profile?.role === 'admin') && (user.role === 'admin') && (
                                <button 
                                  className={styles.dropdownItem} 
                                  onClick={() => { handleUpdateRole(user.id, 'user'); setOpenDropdownId(null); }}
                                >
                                  <PremiumIcon icon={Shield} color="slate" size={16} /> Demote from Admin
                                </button>
                              )}
                              <button 
                                className={styles.dropdownItem} 
                                onClick={() => { setPointsModal({ open: true, user, amount: 0 }); setOpenDropdownId(null); }}
                              >
                                <PremiumIcon icon={Coins} color="gold" size={16} /> Edit Balance
                              </button>
                              <button 
                                className={styles.dropdownItem} 
                                onClick={() => { handleResetPassword(user.email); setOpenDropdownId(null); }}
                              >
                                <PremiumIcon icon={Key} color="slate" size={16} /> Reset Password
                              </button>
                              <button 
                                className={styles.dropdownItem} 
                                onClick={() => { handleLoginAsUser(user); setOpenDropdownId(null); }}
                              >
                                <PremiumIcon icon={UserCheck} color="emerald" size={16} /> View as User
                              </button>
                              <button 
                                className={styles.dropdownItem} 
                                onClick={() => { handleOpenMessenger(user.id); setOpenDropdownId(null); }}
                              >
                                <PremiumIcon icon={MessageSquare} color="primary" size={16} /> Direct Message
                              </button>
                              <button 
                                className={`${styles.dropdownItem} ${styles.danger}`} 
                                onClick={() => { handleBanUser(user, !user.banned); setOpenDropdownId(null); }}
                              >
                                <PremiumIcon icon={Ban} color="ruby" size={16} /> {user.banned ? 'Unban User' : 'Ban User'}
                              </button>
                              <button 
                                className={`${styles.dropdownItem} ${styles.danger}`} 
                                onClick={() => { handleDeleteUser(user); setOpenDropdownId(null); }}
                              >
                                <PremiumIcon icon={UserX} color="ruby" size={16} /> Delete User
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* TAB 3: FLAGGED SUBMISSIONS */}
          {activeTab === 'submissions' && (
            loading ? (
              <div className={styles.grid}>
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className={`skeleton ${styles.cardSkel}`} />)}
              </div>
            ) : flagged.length === 0 ? (
              <div className={styles.empty}>
                <PremiumIcon icon={Sparkles} color="gold" size={32} />
                <p>No submissions waiting for review! All clear.</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {flagged.map((sub) => (
                  <motion.div key={sub.id} className={styles.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {sub.imageUrl && (
                      <a href={sub.imageUrl} target="_blank" rel="noopener noreferrer">
                        <img src={sub.imageUrl} alt="Submission" className={styles.photo} />
                      </a>
                    )}
                    <div className={styles.cardBody}>
                      <p className={styles.cardId}>Submission #{sub.id.slice(0, 8)}</p>
                      <p className={styles.cardReason}>
                        <strong>AI reasoning:</strong> {sub.reason || 'No reasoning provided'}
                      </p>
                      {sub.confidence != null && (
                        <p className={styles.cardConf}>Confidence: {Math.round(sub.confidence * 100)}%</p>
                      )}
                    </div>
                    <div className={styles.cardActions}>
                      <button className={styles.approveBtn} onClick={() => handleDecision(sub, 'approved')}><PremiumIcon icon={CheckSquare} size={16} /> Approve</button>
                      <button className={styles.rejectBtn} onClick={() => handleDecision(sub, 'rejected')}><PremiumIcon icon={XCircle} size={16} /> Reject</button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )
          )}

          {/* TAB 4: REPORTED POSTS */}
          {activeTab === 'reports' && (
             reports.length === 0 ? (
              <div className={styles.empty}>
                <PremiumIcon icon={Sparkles} color="gold" size={32} />
                <p>No reported posts!</p>
              </div>
             ) : (
              <div className={styles.grid}>
                {reports.map((report) => (
                  <motion.div key={report.id} className={styles.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Media Preview */}
                    {report.post?.imageUrl && (
                      <div style={{ width: '100%', maxHeight: '300px', overflow: 'hidden', backgroundColor: 'var(--color-surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {report.post.imageUrl.startsWith('data:image/') && (
                          <a href={report.post.imageUrl} target="_blank" rel="noopener noreferrer">
                            <img src={report.post.imageUrl} alt="Reported Post" className={styles.photo} style={{ height: 'auto', maxHeight: '300px', objectFit: 'contain' }} />
                          </a>
                        )}
                        {report.post.imageUrl.startsWith('data:video/') && (
                          <video src={report.post.imageUrl} controls style={{ width: '100%', maxHeight: '300px', backgroundColor: '#000' }} />
                        )}
                        {report.post.imageUrl.startsWith('data:audio/') && (
                          <div style={{ padding: '24px', width: '100%' }}>
                            <audio src={report.post.imageUrl} controls style={{ width: '100%' }} />
                          </div>
                        )}
                        {report.post.imageUrl.startsWith('data:application/pdf') && (
                          <div style={{ padding: '24px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <FileText size={48} style={{ color: 'var(--color-text-secondary)' }} />
                            <a href={report.post.imageUrl} download="document.pdf" style={{ color: 'var(--color-primary)', fontSize: 'var(--text-sm)', fontWeight: 'bold' }}>Download PDF to Review</a>
                          </div>
                        )}
                      </div>
                    )}
                    
                    <div className={styles.cardBody}>
                      <p className={styles.cardReason} style={{ color: 'var(--color-error)', fontWeight: 'bold', fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <PremiumIcon icon={AlertTriangle} color="ruby" size={20} /> Report: {report.reason || 'No reason'}
                      </p>
                      <p className={styles.cardConf}>Reporter ID: {report.reporterId}</p>
                      
                      {report.post ? (
                        <>
                          <div style={{ marginTop: '12px', padding: '12px', backgroundColor: 'var(--color-bg)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                            <p style={{ margin: '0 0 8px', fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)' }}>
                              Original Post by <strong>{report.post.displayName || report.post.userId}</strong>:
                            </p>
                            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                              {report.post.content}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p style={{ marginTop: '12px', fontSize: 'var(--text-sm)', color: 'var(--color-text-tertiary)' }}>
                          <em>Original post not found or already deleted.</em>
                        </p>
                      )}
                    </div>
                    
                    <div className={styles.cardActions}>
                      <button 
                        className={styles.rejectBtn} 
                        onClick={() => handleDeletePost(report.postId, report.id)}
                        disabled={!report.post}
                        style={{ opacity: !report.post ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        <PremiumIcon icon={Trash2} color="white" size={16} /> Delete Post
                      </button>
                      <button 
                        className={styles.approveBtn} 
                        style={{ background: 'transparent', border: '1px solid var(--color-border)', color: 'var(--color-text)' }}
                        onClick={() => handleDismissReport(report.id)}
                      >
                        Dismiss Report
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
             )
          )}

          {/* TAB 5: PAST SUBMISSIONS */}
          {activeTab === 'past' && (
            loading ? (
              <div className={styles.grid}>
                {Array.from({ length: 3 }).map((_, i) => <div key={i} className={`skeleton ${styles.cardSkel}`} />)}
              </div>
            ) : pastSubmissions.length === 0 ? (
              <div className={styles.empty}>
                <PremiumIcon icon={Inbox} color="slate" size={32} />
                <p>No past submissions found.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Clear All toolbar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px' }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, color: 'var(--color-text)' }}>{pastSubmissions.length} past submissions</p>
                    <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--color-text-secondary)' }}>Delete all at once to free up storage.</p>
                  </div>
                  <button
                    onClick={handleClearAllPastSubmissions}
                    disabled={clearingAll}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '10px', color: '#f87171', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                  >
                    <Trash2 size={16} />
                    {clearingAll ? 'Clearing...' : 'Clear All Submissions'}
                  </button>
                </div>
                <div className={styles.grid}>
                  {pastSubmissions.map((sub) => (
                    <motion.div key={sub.id} className={styles.card} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                      {sub.imageUrl && (
                        <a href={sub.imageUrl} target="_blank" rel="noopener noreferrer">
                          <img src={sub.imageUrl} alt="Submission" className={styles.photo} />
                        </a>
                      )}
                      <div className={styles.cardBody}>
                        <p className={styles.cardId}>Submission #{sub.id.slice(0, 8)}</p>
                        <p className={styles.cardReason}>
                          <strong>Status:</strong>
                          <span style={{ color: sub.status === 'approved' ? 'var(--color-success)' : 'var(--color-error)', fontWeight: 'bold', marginLeft: '4px' }}>
                            {sub.status.toUpperCase()}
                          </span>
                        </p>
                        <p className={styles.cardReason}><strong>User ID:</strong> <span style={{ fontSize: '10px' }}>{sub.userId}</span></p>
                        <p className={styles.cardReason}><strong>AI reasoning:</strong> {sub.reason || 'No reasoning provided'}</p>
                        {sub.confidence != null && <p className={styles.cardConf}>Confidence: {Math.round(sub.confidence * 100)}%</p>}
                      </div>
                      <div className={styles.cardActions}>
                        <button
                          className={styles.rejectBtn}
                          style={{ background: 'transparent', border: '1px solid var(--color-error)', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '4px' }}
                          onClick={() => handleDeletePastSubmission(sub.id)}
                        >
                          <PremiumIcon icon={Trash2} color="ruby" size={16} /> Delete
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )
          )}
          {/* TAB 6: TASKS MANAGER */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Action toolbar */}
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <button
                  className={styles.approveBtn}
                  style={{ width: 'auto', padding: '10px 20px' }}
                  onClick={() => setTaskModal({ open: true, task: { title: '', description: '', category: 'nature', points: 50, co2: 0, water: 0, waste: 0, verificationPrompt: '', difficulty: 'easy' }})}
                >
                  + Add New Task
                </button>
                <button
                  style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: '8px', color: '#fbbf24', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                  onClick={handleScanDuplicates}
                  disabled={scanningDupes}
                >
                  <AlertTriangle size={16} />
                  {scanningDupes ? 'Scanning...' : 'Scan for Duplicates'}
                </button>
                {duplicateGroups !== null && duplicateGroups.length > 0 && (
                  <button
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#f87171', fontWeight: 700, cursor: 'pointer', fontSize: '14px' }}
                    onClick={handleDeleteAllDuplicates}
                  >
                    <Trash2 size={16} /> Remove All Duplicates ({duplicateGroups.reduce((s, g) => s + g.length - 1, 0)} tasks)
                  </button>
                )}
              </div>

              {/* Duplicate warning panel */}
              {duplicateGroups !== null && duplicateGroups.length > 0 && (
                <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '16px 20px' }}>
                  <h4 style={{ margin: '0 0 14px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={18} /> {duplicateGroups.length} Duplicate Group(s) Found
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {duplicateGroups.map((group, gi) => (
                      <div key={gi} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', padding: '12px 16px' }}>
                        <p style={{ margin: '0 0 8px', fontWeight: 700, color: 'var(--color-text)', fontSize: '14px' }}>📌 "{group[0].title}"</p>
                        {group.map((task, ti) => (
                          <div key={task.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderTop: ti > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                              {ti === 0 ? '✅ Keep' : '⚠️ Duplicate'} — ID: {task.id.slice(0, 10)}... · {task.points}pts · {task.category}
                            </span>
                            {ti > 0 && (
                              <button
                                onClick={() => handleDeleteDuplicateTask(task.id)}
                                style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', borderRadius: '6px', padding: '4px 10px', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {duplicateGroups !== null && duplicateGroups.length === 0 && (
                <div style={{ padding: '14px 18px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px', color: '#34d399', fontWeight: 600, display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <CheckSquare size={18} /> Task pool is clean — no duplicates found!
                </div>
              )}

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Points</th>
                      <th>Source</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tasksData.map(t => (
                      <tr key={t.id}>
                        <td>{t.title}</td>
                        <td style={{ textTransform: 'capitalize' }}>{t.category}</td>
                        <td>{t.points}</td>
                        <td><span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '100px', background: t.isAIGenerated ? 'rgba(139,92,246,0.15)' : 'rgba(16,185,129,0.15)', color: t.isAIGenerated ? '#a78bfa' : '#34d399', fontWeight: 700 }}>{t.isAIGenerated ? 'AI' : 'Manual'}</span></td>
                        <td className={styles.actionCell}>
                          <button className={styles.btnSm} onClick={() => setTaskModal({ open: true, task: t })}>Edit</button>
                          <button className={`${styles.btnSm} ${styles.danger}`} onClick={() => handleDeleteTask(t.id)}>Delete</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 8: REWARD TOGGLES */}
          {activeTab === 'reward-toggles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              {settingsData && (
                <div className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div>
                    <h3 className={styles.chartTitle} style={{ margin: 0 }}>Reward Visibility Toggles</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>Enable or disable specific rewards. Disabled rewards won't appear in the shop.</p>
                  </div>

                  {['frame', 'glow', 'companion', 'background', 'entry'].map(type => {
                    const categoryRewards = REWARDS_DB.filter(r => r.type === type);
                    if (categoryRewards.length === 0) return null;
                    const typeLabel = type === 'frame' ? 'Frames' : type === 'glow' ? 'Name Glows' : type === 'companion' ? 'Companions' : type === 'background' ? 'Backgrounds' : 'App Entry Animations';
                    return (
                      <div key={type} style={{ marginTop: '16px' }}>
                        <h4 style={{ color: 'var(--color-text)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px', borderBottom: '1px solid var(--color-border)', paddingBottom: '8px', marginBottom: '12px' }}>{typeLabel}</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
                          {categoryRewards.map(reward => {
                            const isDisabled = settingsData.disabledRewards?.includes(reward.id);
                            return (
                              <div key={reward.id} className={styles.inputGroup} style={{ background: 'var(--color-surface-hover)', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-sm)', color: 'var(--color-text)', cursor: 'pointer', margin: 0 }}>
                                  <input 
                                    type="checkbox" 
                                    checked={!isDisabled} 
                                    onChange={e => {
                                      const currentDisabled = settingsData.disabledRewards || [];
                                      let newDisabled;
                                      if (!e.target.checked) {
                                        newDisabled = [...currentDisabled, reward.id];
                                      } else {
                                        newDisabled = currentDisabled.filter(id => id !== reward.id);
                                      }
                                      setSettingsData({...settingsData, disabledRewards: newDisabled});
                                    }}
                                    style={{ width: '16px', height: '16px' }}
                                  />
                                  <span style={{ fontSize: '18px' }}>{reward.icon || '🏅'}</span>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{reward.name}</span>
                                  </div>
                                </label>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                  
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', borderTop: '1px solid var(--color-border)', paddingTop: '20px' }}>
                    <button onClick={handleSaveSettings} className={styles.approveBtn} style={{ padding: '10px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <PremiumIcon icon={Save} color="white" size={16} /> Save Settings
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 9: GLOBAL SETTINGS */}
          {activeTab === 'settings' && settingsData && (
            <form onSubmit={handleSaveSettings} className={styles.chartCard} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 className={styles.chartTitle}>Global Application Settings</h3>
              
              <div className={styles.inputGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                  <input 
                    type="checkbox" 
                    checked={settingsData.maintenanceMode} 
                    onChange={e => setSettingsData({...settingsData, maintenanceMode: e.target.checked})}
                    style={{ width: '20px', height: '20px' }}
                  />
                  Maintenance Mode (Currently active users only)
                </label>
              </div>
              
              <div className={styles.inputGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                  <input 
                    type="checkbox" 
                    checked={settingsData.allowSignups} 
                    onChange={e => setSettingsData({...settingsData, allowSignups: e.target.checked})}
                    style={{ width: '20px', height: '20px' }}
                  />
                  Allow New User Signups
                </label>
              </div>

              <div className={styles.inputGroup}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-base)', color: 'var(--color-text)' }}>
                  <input 
                    type="checkbox" 
                    checked={settingsData.arenaEnabled ?? true} 
                    onChange={e => setSettingsData({...settingsData, arenaEnabled: e.target.checked})}
                    style={{ width: '20px', height: '20px', accentColor: 'var(--color-ruby)' }}
                  />
                  Enable Arena (Global Kill Switch)
                </label>
              </div>

              {/* ARENA SUB-SECTION TOGGLES */}
              <div style={{ paddingLeft: '32px', display: 'flex', flexDirection: 'column', gap: '12px', opacity: (settingsData.arenaEnabled ?? true) ? 1 : 0.5, pointerEvents: (settingsData.arenaEnabled ?? true) ? 'auto' : 'none' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                  <input type="checkbox" checked={settingsData.arenaOracleEnabled ?? true} onChange={e => setSettingsData({...settingsData, arenaOracleEnabled: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  Enable The Oracle
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                  <input type="checkbox" checked={settingsData.arenaTriviaEnabled ?? true} onChange={e => setSettingsData({...settingsData, arenaTriviaEnabled: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  Enable Trivia Tournaments
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                  <input type="checkbox" checked={settingsData.arenaSpinEnabled ?? true} onChange={e => setSettingsData({...settingsData, arenaSpinEnabled: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  Enable Spin to Win
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>
                  <input type="checkbox" checked={settingsData.arenaStakingEnabled ?? true} onChange={e => setSettingsData({...settingsData, arenaStakingEnabled: e.target.checked})} style={{ width: '16px', height: '16px' }} />
                  Enable Yield Farming Pool
                </label>
              </div>
              
              <div className={styles.inputGroup} style={{ maxWidth: '300px' }}>
                <label>Global Points Multiplier (e.g. 1.5 for +50% points)</label>
                <input 
                  type="number" 
                  step="0.1" 
                  value={settingsData.pointsMultiplier || 1} 
                  onChange={e => setSettingsData({...settingsData, pointsMultiplier: parseFloat(e.target.value)})}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: '16px' }}>
                <button type="submit" className={styles.approveBtn} style={{ width: 'auto', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PremiumIcon icon={Save} color="white" size={16} /> Save Global Settings
                </button>
              </div>
            </form>
          )}
        </>
      )}
        </div>
      </div>

      {/* Points Modal */}
      {pointsModal.open && pointsModal.user && (
        <div className={styles.modalOverlay} style={{ zIndex: 10000 }}>
          <div className={styles.modalContent}>
            <h3>Edit Points for {pointsModal.user.displayName}</h3>
            <p style={{ fontSize: '14px', color: 'gray', margin: 0 }}>
              Current Spendable Balance: {pointsModal.user.spendableBalance ?? pointsModal.user.points ?? 0}
            </p>
            <div className={styles.inputGroup}>
              <label>Amount to Add / Deduct (Use negative numbers to deduct)</label>
              <input 
                type="number" 
                value={pointsModal.amount} 
                onChange={(e) => setPointsModal({ ...pointsModal, amount: e.target.value })}
              />
            </div>
            <div className={styles.modalActions}>
              <button className={styles.btnSm} onClick={() => setPointsModal({ open: false, user: null, amount: 0 })}>Cancel</button>
              <button className={`${styles.btnSm} ${styles.approveBtn}`} style={{flex: 0}} onClick={handleUpdatePoints}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUserModal.open && editUserModal.user && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Edit Profile for {editUserModal.user.email}</h3>
            <form onSubmit={handleEditUserSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
              <div className={styles.inputGroup}>
                <label>Display Name</label>
                <input 
                  type="text" 
                  value={editUserModal.name} 
                  onChange={(e) => setEditUserModal({ ...editUserModal, name: e.target.value })}
                  placeholder="Enter user's new name"
                  style={{ padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSm} onClick={() => setEditUserModal({ open: false, user: null, name: '' })}>Cancel</button>
                <button type="submit" className={`${styles.btnSm} ${styles.approveBtn}`} style={{flex: 0}}>Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Frame Modal */}
      {frameModal.open && frameModal.user && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>Award Frame to {frameModal.user.displayName}</h3>
            <form onSubmit={handleAwardFrame} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.inputGroup}>
                <label>Select Frame to Award</label>
                <select 
                  value={frameModal.frameId} 
                  onChange={(e) => setFrameModal({ ...frameModal, frameId: e.target.value })}
                  style={{ padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}
                >
                  <option value="frame-prime">✨ PRIME FRAME (Admin Exclusive)</option>
                  <option value="frame-supernova">🌌 Supernova Frame (Legendary)</option>
                  <option value="frame-gaia">🌿 Gaia Crown Frame (Legendary)</option>
                  <option value="frame-god">👑 God Frame (Ultimate Celestial)</option>
                  <option value="frame-platinum">💎 Platinum Frame</option>
                  <option value="frame-gold">🥇 Gold Frame</option>
                  <option value="frame-silver">🥈 Silver Frame</option>
                  <option value="frame-bronze">🥉 Bronze Frame</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSm} onClick={() => setFrameModal({ open: false, user: null, frameId: 'frame-god' })}>Cancel</button>
                <button type="submit" className={`${styles.btnSm} ${styles.approveBtn}`} style={{flex: 0}}>Award Frame</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Modal */}
      {taskModal.open && taskModal.task && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
            <h3>{taskModal.task.id ? 'Edit Task' : 'Create New Task'}</h3>
            <form onSubmit={handleSaveTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.inputGroup}>
                <label>Title</label>
                <input required value={taskModal.task.title} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, title: e.target.value }})} />
              </div>
              <div className={styles.inputGroup}>
                <label>Description</label>
                <textarea required rows={3} value={taskModal.task.description} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, description: e.target.value }})} style={{ padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)', fontFamily: 'var(--font-body)', resize: 'vertical' }} />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                  <label>Category</label>
                  <select value={taskModal.task.category} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, category: e.target.value }})} style={{ padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}>
                    <option value="waste">Waste</option>
                    <option value="water">Water</option>
                    <option value="energy">Energy</option>
                    <option value="transport">Transport</option>
                    <option value="food">Food</option>
                    <option value="nature">Nature</option>
                    <option value="community">Community</option>
                  </select>
                </div>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                  <label>Difficulty</label>
                  <select value={taskModal.task.difficulty} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, difficulty: e.target.value }})} style={{ padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}>
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className={styles.inputGroup}>
                  <label>Points</label>
                  <input type="number" required value={taskModal.task.points} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, points: parseInt(e.target.value) }})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>CO2 Savings (g)</label>
                  <input type="number" required value={taskModal.task.co2} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, co2: parseInt(e.target.value) }})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Water Savings (L)</label>
                  <input type="number" required value={taskModal.task.water} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, water: parseInt(e.target.value) }})} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Waste Savings (g)</label>
                  <input type="number" required value={taskModal.task.waste} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, waste: parseInt(e.target.value) }})} />
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Verification Prompt (Instructions for AI validation)</label>
                <input required value={taskModal.task.verificationPrompt} onChange={e => setTaskModal({ ...taskModal, task: { ...taskModal.task, verificationPrompt: e.target.value }})} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSm} onClick={() => setTaskModal({ open: false, task: null })}>Cancel</button>
                <button type="submit" className={`${styles.btnSm} ${styles.approveBtn}`} style={{flex: 0}}>Save Task</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reward Modal */}
      {rewardModal.open && rewardModal.reward && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <h3>{rewardModal.reward.id ? 'Edit Reward' : 'Create New Reward'}</h3>
            <form onSubmit={handleSaveReward} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className={styles.inputGroup}>
                <label>Name</label>
                <input required value={rewardModal.reward.name} onChange={e => setRewardModal({ ...rewardModal, reward: { ...rewardModal.reward, name: e.target.value }})} />
              </div>
              <div className={styles.inputGroup}>
                <label>Description</label>
                <input required value={rewardModal.reward.description} onChange={e => setRewardModal({ ...rewardModal, reward: { ...rewardModal.reward, description: e.target.value }})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px' }}>
                <div className={styles.inputGroup}>
                  <label>Icon</label>
                  <input required value={rewardModal.reward.icon} onChange={e => setRewardModal({ ...rewardModal, reward: { ...rewardModal.reward, icon: e.target.value }})} style={{ fontSize: '24px', textAlign: 'center' }} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Tier</label>
                  <select value={rewardModal.reward.tier} onChange={e => setRewardModal({ ...rewardModal, reward: { ...rewardModal.reward, tier: e.target.value }})} style={{ padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text)' }}>
                    <option value="bronze">Bronze</option>
                    <option value="silver">Silver</option>
                    <option value="gold">Gold</option>
                    <option value="platinum">Platinum</option>
                  </select>
                </div>
              </div>
              <div className={styles.inputGroup}>
                <label>Point Cost</label>
                <input type="number" required value={rewardModal.reward.pointCost} onChange={e => setRewardModal({ ...rewardModal, reward: { ...rewardModal.reward, pointCost: parseInt(e.target.value) }})} />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnSm} onClick={() => setRewardModal({ open: false, reward: null })}>Cancel</button>
                <button type="submit" className={`${styles.btnSm} ${styles.approveBtn}`} style={{flex: 0}}>Save Reward</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
