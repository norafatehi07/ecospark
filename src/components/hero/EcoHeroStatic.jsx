// src/components/hero/EcoHeroStatic.jsx
// Lightweight SVG + CSS animation fallback for low-end devices and reduced-motion
import styles from './EcoHeroStatic.module.css';

export default function EcoHeroStatic() {
  return (
    <div className={styles.hero}>
      <div className={styles.orb}>
        <div className={styles.core}>
          <span className={styles.emoji}>🌍</span>
        </div>
        <div className={styles.ring1} />
        <div className={styles.ring2} />
        <div className={styles.ring3} />
        <div className={styles.particles}>
          {['🌿', '💧', '☀️', '♻️', '🌱', '🍃'].map((e, i) => (
            <span key={i} className={styles.particle} style={{ '--i': i }}>
              {e}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
