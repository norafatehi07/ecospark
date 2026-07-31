// src/components/layout/BottomTabBar.jsx
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './BottomTabBar.module.css';

import { Home, CheckSquare, Trophy, Gift, User, Flame } from 'lucide-react';

const TABS = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { path: '/arena', icon: Flame, label: 'Arena' },
  { path: '/leaderboard', icon: Trophy, label: 'Rank' },
  { path: '/rewards', icon: Gift, label: 'Rewards' },
  { path: '/profile', icon: User, label: 'Profile' },
];

import { useSettingsStore } from '../../store/settingsStore';

export default function BottomTabBar() {
  const settings = useSettingsStore(s => s.settings) || {};
  const arenaEnabled = settings.arenaEnabled ?? true;
  
  const visibleTabs = TABS.filter(tab => tab.path !== '/arena' || arenaEnabled);

  return (
    <nav className={styles.tabBar}>
      {visibleTabs.map((tab) => (
        <NavLink
          key={tab.path}
          to={tab.path}
          end={tab.path === '/'}
          className={({ isActive }) =>
            `${styles.tab} ${isActive ? styles.active : ''}`
          }
        >
          {({ isActive }) => (
            <>
              <span className={styles.icon}>
                <tab.icon size={22} style={{ color: isActive ? 'var(--color-primary)' : 'var(--color-text-tertiary)' }} />
              </span>
              <span className={styles.label}>{tab.label}</span>
              {isActive && (
                <motion.div
                  layoutId="bottomTabActive"
                  className={styles.activePill}
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
