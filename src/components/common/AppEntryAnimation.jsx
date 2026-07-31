// src/components/common/AppEntryAnimation.jsx
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';

export default function AppEntryAnimation() {
  const { profile } = useAuthStore();
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show if they have an equipped entry and we just loaded
    if (profile?.equipped?.entry && !sessionStorage.getItem('entryPlayed')) {
      setShow(true);
      sessionStorage.setItem('entryPlayed', 'true');
      setTimeout(() => setShow(false), 3000); // Play for 3 seconds
    }
  }, [profile]);

  if (!show) return null;

  const entryType = profile.equipped.entry;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 1 } }}
        style={{
          position: 'fixed',
          top: 0, left: 0, width: '100vw', height: '100vh',
          pointerEvents: 'none',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {entryType === 'entry-portal' && (
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
            <motion.div
              initial={{ scale: 0, rotate: 0, opacity: 0 }}
              animate={{ scale: [0, 1, 1.2, 50], rotate: 360, opacity: [0, 1, 1, 0] }}
              transition={{ duration: 2.8, ease: "easeInOut", times: [0, 0.4, 0.7, 1] }}
              style={{
                width: '150px', height: '150px',
                borderRadius: '50%',
                border: '10px solid transparent',
                borderTopColor: '#3B82F6',
                borderRightColor: '#8B5CF6',
                borderBottomColor: '#EC4899',
                boxShadow: '0 0 50px #8B5CF6, inset 0 0 50px #3B82F6',
                position: 'absolute',
              }}
            />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 0] }}
              transition={{ duration: 2.5, times: [0, 0.5, 1] }}
              style={{
                position: 'absolute',
                width: '100%', height: '100%',
                background: 'radial-gradient(circle, transparent 20%, #000 70%)',
              }}
            />
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
                animate={{
                  scale: Math.random() * 2,
                  x: (Math.random() - 0.5) * window.innerWidth * 1.5,
                  y: (Math.random() - 0.5) * window.innerHeight * 1.5,
                  opacity: 0
                }}
                transition={{ duration: 1.5 + Math.random(), delay: 0.5 }}
                style={{
                  position: 'absolute',
                  width: '4px', height: '4px',
                  background: '#FCD34D',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px #F59E0B'
                }}
              />
            ))}
          </div>
        )}
        
        {entryType === 'entry-cyber' && (
          <div style={{ position: 'relative', width: '100%', height: '100%', background: '#020617', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
            <motion.div
              initial={{ y: '-100%' }}
              animate={{ y: '200%' }}
              transition={{ duration: 2, ease: "linear" }}
              style={{
                position: 'absolute',
                width: '100%', height: '20px',
                background: 'linear-gradient(to bottom, transparent, rgba(16, 185, 129, 0.8), transparent)',
                boxShadow: '0 0 20px rgba(16, 185, 129, 0.5)'
              }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.8, filter: 'hue-rotate(0deg)' }}
              animate={{ 
                opacity: [0, 1, 0.2, 1, 0.5, 1, 0], 
                scale: [0.8, 1, 1.05, 0.95, 1, 1.2, 3],
                filter: ['hue-rotate(0deg)', 'hue-rotate(90deg)', 'hue-rotate(0deg)', 'hue-rotate(-45deg)', 'hue-rotate(0deg)']
              }}
              transition={{ duration: 2.5, ease: "easeInOut" }}
              style={{
                fontSize: '5rem',
                fontWeight: '900',
                color: '#10B981',
                textShadow: '5px 0 0 #ff00c1, -5px 0 0 #00fff9',
                fontFamily: 'monospace',
                letterSpacing: '10px'
              }}
            >
              SYSTEM.INIT()
            </motion.div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
