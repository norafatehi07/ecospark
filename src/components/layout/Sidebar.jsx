// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { subscribeConversations } from '../../services/firestoreService';
import { useEffect, useState, useRef } from 'react';
import { Home, CheckSquare, Trophy, Gift, Globe, MessageCircle, Info, ShieldAlert, LogOut, Flame, Zap } from 'lucide-react';
import Avatar from '../common/Avatar';
import PointsReadout from './PointsReadout';
import styles from './Sidebar.module.css';

const PRIMARY_NAV = [
  { path: '/', icon: Home, label: 'Home', end: true },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { path: '/rewards', icon: Gift, label: 'Rewards' },
  { path: '/arena', icon: Flame, label: 'Arena' },
];

const EXPLORE_NAV = [
  { path: '/community', icon: Globe, label: 'Community' },
  { path: '/messages', icon: MessageCircle, label: 'Messages' },
];

const MANAGE_NAV = [
  { path: '/admin', icon: ShieldAlert, label: 'Admin', require: 'staff' },
  { path: '/about', icon: Info, label: 'About' },
];

import { useSettingsStore } from '../../store/settingsStore';

function NavItem({ item, isActive, children, onClick }) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      onClick={onClick}
      className={({ isActive }) =>
        `${styles.navItem} ${isActive ? styles.active : ''}`
      }
    >
      {({ isActive }) => (
        <>
          <item.icon size={18} className={styles.navIcon} aria-hidden="true" style={{ color: 'var(--color-text-tertiary)' }} />
          <span className={styles.navLabel}>{item.label}</span>
          {children}
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
  );
}

export default function Sidebar() {
  const { profile } = useAuthStore();
  const { unreadCount } = useUiStore();
  const settings = useSettingsStore(s => s.settings) || {};
  const arenaEnabled = settings.arenaEnabled ?? true;
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const accountRef = useRef(null);

  const visiblePrimary = PRIMARY_NAV.filter(item => item.path !== '/arena' || arenaEnabled);

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

  const isStaff = profile?.role === 'teacher' || profile?.role === 'admin' || profile?.role === 'owner';
  const visibleManage = MANAGE_NAV.filter(item => {
    if (item.require === 'staff') return isStaff;
    return true;
  });

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
            {visiblePrimary.map((item) => (
              <NavItem key={item.path} item={item} />
            ))}
            
            {EXPLORE_NAV.map((item) => (
              <NavItem key={item.path} item={item}>
              {item.path === '/messages' && unreadCount > 0 && (
                <div style={{
                  position: 'absolute', right: 12,
                  background: 'var(--color-error)', color: '#FFF', fontSize: '10px',
                  fontWeight: 'bold', padding: '2px 6px',
                  borderRadius: '99px', display: 'flex', alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </div>
              )}
            </NavItem>
            ))}

            {visibleManage.length > 0 && (
              <>
                <div className={styles.hairline} style={{ margin: '0 12px 12px 12px' }} />
                {visibleManage.map((item) => (
                  <NavItem key={item.path} item={item} />
                ))}
              </>
            )}
          </div>
        </nav>

        <div className={styles.readoutWrap}>
        <PointsReadout />
      </div>

      <div className={styles.userCard}>
        <NavLink to="/profile" className={styles.userLink}>
          <div className={styles.userAvatar}>
            <Avatar src={profile?.photoURL} activeFrame={profile?.activeFrame} size={36} alt={profile?.displayName} />
          </div>
          <div className={styles.userInfo}>
            <p className={styles.userName}>{profile?.displayName || 'EcoUser'}</p>
          </div>
        </NavLink>
        <button onClick={handleLogout} className={styles.logoutBtn} title="Sign out">
          <LogOut size={18} style={{ color: 'var(--color-text-tertiary)' }} />
        </button>
      </div>
    </aside>
  );
}
