// src/components/layout/BottomTabBar.jsx
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import styles from './BottomTabBar.module.css';

import { Home, CheckSquare, Trophy, Gift, User, Flame } from 'lucide-react';
import PremiumIcon from '../common/PremiumIcon';

const TABS = [
  { path: '/', icon: <PremiumIcon icon={Home} color="emerald" size={22} />, label: 'Home' },
  { path: '/tasks', icon: <PremiumIcon icon={CheckSquare} color="sapphire" size={22} />, label: 'Tasks' },
  { path: '/arena', icon: <PremiumIcon icon={Flame} color="ruby" size={22} />, label: 'Arena' },
  { path: '/leaderboard', icon: <PremiumIcon icon={Trophy} color="gold" size={22} />, label: 'Rank' },
  { path: '/rewards', icon: <PremiumIcon icon={Gift} color="ruby" size={22} />, label: 'Rewards' },
  { path: '/profile', icon: <PremiumIcon icon={User} color="amethyst" size={22} />, label: 'Profile' },
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
              <span className={styles.icon}>{tab.icon}</span>
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
