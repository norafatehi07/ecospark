// src/components/common/StreakRiskBanner.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

export default function StreakRiskBanner() {
  const { profile } = useAuthStore();
  const [show, setShow] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!profile || dismissed) return;

    const streak = profile.streak || 0;
    if (streak === 0) return;

    const hour = new Date().getHours();
    const lastDate = profile.lastActivityDate?.toDate?.();
    const todayStr = new Date().toDateString();
    const lastStr = lastDate?.toDateString?.();

    // Show banner if: has streak, hasn't logged today, and it's after 8 PM
    const hasNotLoggedToday = lastStr !== todayStr;
    const isLate = hour >= 20;

    setShow(streak > 0 && hasNotLoggedToday && isLate);
  }, [profile, dismissed]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -64, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -64, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9997,
            background: 'linear-gradient(135deg, #7f1d1d, #dc2626)',
            color: 'white',
            padding: '10px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            fontFamily: 'var(--font-body)',
            fontSize: 'var(--text-sm)',
            fontWeight: 600,
          }}
        >
          <span>
            🔥 Your {profile?.streak}-day streak resets at midnight! 
            <Link to="/tasks" style={{ color: '#fde68a', marginLeft: 8, textDecoration: 'underline' }}>
              Log a task now →
            </Link>
          </span>
          <button
            onClick={() => { setShow(false); setDismissed(true); }}
            style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: 18 }}
          >
            ✕
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
