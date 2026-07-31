// src/components/layout/AppShell.jsx
import { useEffect, Suspense } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import BottomTabBar from './BottomTabBar';
import OfflineBanner from '../common/OfflineBanner';
import StreakRiskBanner from '../common/StreakRiskBanner';
import AICoachWidget from '../coach/AICoachWidget';
import AppEntryAnimation from '../common/AppEntryAnimation';
import styles from './AppShell.module.css';

export default function AppShell({ children }) {
  const location = useLocation();

  return (
    <div className={styles.shell}>
      <OfflineBanner />
      <StreakRiskBanner />

      {/* Desktop/tablet sidebar */}
      <Sidebar />

      {/* Main content area */}
      <main className={styles.main}>
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className={styles.pageWrapper}
          >
            <Suspense fallback={
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh', color: 'var(--color-primary)' }}>
                <span style={{ fontSize: '24px', animation: 'pulse 1.5s infinite' }}>Loading...</span>
              </div>
            }>
              {children}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile bottom tab bar */}
      <BottomTabBar />

      {/* AI Coach FAB — mounted once at app shell level */}
      <AICoachWidget />

      {/* App Entry Animations */}
      <AppEntryAnimation />
    </div>
  );
}
