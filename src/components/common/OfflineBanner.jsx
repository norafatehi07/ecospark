// src/components/common/OfflineBanner.jsx
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useOfflineStore } from '../../store/offlineStore';

export default function OfflineBanner() {
  const { isOnline, setOnline, pendingTasks } = useOfflineStore();

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ y: -48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -48, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9998,
            background: 'linear-gradient(135deg, #78350f, #d97706)',
            color: 'white',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
            fontFamily: 'var(--font-body)',
          }}
        >
          <span>📡</span>
          <span>You're offline. Tasks will sync when you reconnect.</span>
          {pendingTasks.length > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.25)',
              borderRadius: 12,
              padding: '2px 8px',
              fontSize: 'var(--text-xs)',
            }}>
              {pendingTasks.length} pending
            </span>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
