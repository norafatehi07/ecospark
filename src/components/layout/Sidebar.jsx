// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { subscribeConversations } from '../../services/firestoreService';
import { useEffect, useState } from 'react';
import { Home, CheckSquare, Trophy, Gift, Globe, MessageCircle, Info, ShieldAlert, Zap, LogOut, Flame } from 'lucide-react';
import PremiumIcon from '../common/PremiumIcon';
import Avatar from '../common/Avatar';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  { path: '/', icon: <PremiumIcon icon={Home} color="emerald" size={20} />, label: 'Home' },
  { path: '/tasks', icon: <PremiumIcon icon={CheckSquare} color="sapphire" size={20} />, label: 'Tasks' },
  { path: '/leaderboard', icon: <PremiumIcon icon={Trophy} color="gold" size={20} />, label: 'Leaderboard' },
  { path: '/rewards', icon: <PremiumIcon icon={Gift} color="ruby" size={20} />, label: 'Rewards' },
  { path: '/arena', icon: <PremiumIcon icon={Flame} color="ruby" size={20} />, label: 'Arena' },
  { path: '/community', icon: <PremiumIcon icon={Globe} color="emerald" size={20} />, label: 'Community' },
  { path: '/messages', icon: <PremiumIcon icon={MessageCircle} color="amethyst" size={20} />, label: 'Messages' },
  { path: '/about', icon: <PremiumIcon icon={Info} color="slate" size={20} />, label: 'About' },
];

import { useSettingsStore } from '../../store/settingsStore';

export default function Sidebar() {
  const { user, profile } = useAuthStore();
  const settings = useSettingsStore(s => s.settings) || {};
  const arenaEnabled = settings.arenaEnabled ?? true;
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);

  const visibleNavItems = NAV_ITEMS.filter(item => item.path !== '/arena' || arenaEnabled);

  useEffect(() => {
    if (!profile?.id) return;
    const unsubChats = subscribeConversations(profile.id, (chats) => {
      const unreadChats = chats.filter(c => c.unreadBy?.includes(profile.id));
      setUnreadCount(unreadChats.length);
    });
    
    return () => {
      unsubChats();
    };
  }, [profile?.id]);

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/auth');
  };

  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <img src="/logo-8k.jpeg" alt="EcoSpark Icon" className={styles.logoIconImg} />
        <span className={styles.logoText}>EcoSpark</span>
      </div>

      {/* Nav Links */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <div style={{ position: 'relative' }}>
                    <span className={styles.navIcon}>{item.icon}</span>
                    {item.path === '/messages' && unreadCount > 0 && (
                      <div style={{
                        position: 'absolute', top: -4, right: -4,
                        background: '#EF4444', color: '#FFF', fontSize: '10px',
                        fontWeight: 'bold', width: '18px', height: '18px',
                        borderRadius: '50%', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </div>
                    )}
                  </div>
                  <span className={styles.navLabel}>{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeNavIndicator"
                      className={styles.activeIndicator}
                      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {(profile?.role === 'teacher' || profile?.role === 'admin') && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `${styles.navItem} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.navIcon}><PremiumIcon icon={ShieldAlert} color="ruby" size={20} /></span>
              <span className={styles.navLabel}>Admin</span>
            </NavLink>
          )}
        </div>
      </nav>

      {/* User mini card */}
      <div className={styles.userCard}>
        <NavLink to="/profile" className={styles.userLink}>
          <div className={styles.userAvatar}>
            <Avatar src={profile?.photoURL} activeFrame={profile?.activeFrame} size={40} alt={profile?.displayName} />
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{profile?.displayName || 'EcoUser'}</p>
            <p className={styles.userPoints}>
              <PremiumIcon icon={Zap} color="gold" size={14} className="mr-1" />
              {profile?.spendableBalance ?? profile?.points ?? 0} pts
            </p>
          </div>
        </NavLink>
        <button onClick={handleLogout} className={styles.logoutBtn} title="Sign out">
          <PremiumIcon icon={LogOut} color="slate" size={18} />
        </button>
      </div>
    </aside>
  );
}
