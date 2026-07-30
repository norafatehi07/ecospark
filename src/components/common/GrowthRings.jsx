// src/components/common/GrowthRings.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// GROWTH RINGS — the Regalia signature motif.
//
// Concentric rings read as tree growth rings / ripples. Ring count and
// ornamentation scale with tier, so rarity is encoded structurally rather than
// only by colour (which §10 forbids relying on alone).
//
// Four consumers, one motif:
//   <GrowthRings tier />  frame / badge construction
//   <RingBurst />         reveal shockwave (loot, tier unlock)
//   <RingSpinner />       loading state
//   <AmbientRings />      slow hero backdrop
//
// Every animated variant checks reduced motion and degrades to a static,
// still-legible composition — never to nothing.
// ═══════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { TIER_RINGS, TIER_CONFIG } from '../../constants/rewards';
import { useUiStore } from '../../store/uiStore';
import styles from './GrowthRings.module.css';

/** Rings are laid out outermost-first; spacing tightens as the count grows. */
function ringRadii(count) {
  const OUTER = 48;
  const gap = Math.min(7, 30 / Math.max(count, 1));
  return Array.from({ length: count }, (_, i) => OUTER - i * gap);
}

/**
 * Concentric tier rings.
 *
 * @param {string}  tier      key into TIER_CONFIG; drives ring count + colour
 * @param {number}  size      px
 * @param {string}  color     overrides the tier colour
 * @param {boolean} animated  slow drift on the ornamented ring (high tiers only)
 * @param {boolean} aurora    force the Celestial aurora sweep
 */
export function GrowthRings({
  tier = 'bronze',
  size = 96,
  color,
  animated = true,
  aurora,
  className = '',
  style = {},
}) {
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  const cfg = TIER_CONFIG[tier] || TIER_CONFIG.bronze;
  const count = TIER_RINGS[tier] ?? 1;
  const stroke = color || cfg.color;
  const radii = ringRadii(count);

  // Celestial is the only tier that earns the aurora. Its rarity is the design.
  const showAurora = aurora ?? tier === 'prime';
  const moving = animated && !reducedMotion;

  return (
    <div
      className={`${styles.wrap} ${className}`}
      style={{ width: size, height: size, ...style }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className={styles.svg}>
        {radii.map((r, i) => {
          const isOutermost = i === 0;
          // Higher tiers ornament their outer ring with a dashed cadence.
          const ornamented = count >= 5 && isOutermost;
          return (
            <circle
              key={r}
              cx="50"
              cy="50"
              r={r}
              fill="none"
              stroke={stroke}
              strokeWidth={isOutermost ? 2 : 1}
              // Inner rings fade inward, like older growth
              strokeOpacity={isOutermost ? 0.95 : Math.max(0.18, 0.7 - i * 0.1)}
              strokeDasharray={ornamented ? '3 5' : undefined}
              strokeLinecap="round"
              className={ornamented && moving ? styles.drift : undefined}
              style={ornamented ? { transformOrigin: '50% 50%' } : undefined}
            />
          );
        })}
      </svg>

      {showAurora && (
        <div
          className={`${styles.auroraRing} celestial-aurora`}
          data-static={!moving || undefined}
        />
      )}
    </div>
  );
}

/**
 * Expanding shockwave for ceremonial reveals. Rings travel outward from the
 * revealed item — the motif's job here is to replace generic confetti-only.
 *
 * Renders nothing under reduced motion: a burst has no static equivalent, and
 * the reveal it accompanies is already legible on its own.
 */
export function RingBurst({ color = 'var(--color-gold)', count = 3, size = 260 }) {
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  if (reducedMotion) return null;

  return (
    <div className={styles.burst} style={{ width: size, height: size }} aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className={styles.burstRing}
          style={{ borderColor: color, animationDelay: `${i * 0.22}s` }}
        />
      ))}
    </div>
  );
}

/**
 * Loading state — a ring pulse rather than a generic spinner.
 * Under reduced motion this becomes a static ring plus the text label, so the
 * "busy" state is still announced and visible.
 */
export function RingSpinner({ size = 44, color = 'var(--color-primary)', label = 'Loading' }) {
  const reducedMotion = useUiStore((s) => s.reducedMotion);

  return (
    <div className={styles.spinner} style={{ width: size, height: size }} role="status">
      {reducedMotion ? (
        <span className={styles.spinnerStatic} style={{ borderColor: color }} />
      ) : (
        <>
          <span className={styles.spinnerRing} style={{ borderColor: color }} />
          <span
            className={styles.spinnerRing}
            style={{ borderColor: color, animationDelay: '0.5s' }}
          />
        </>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}

/**
 * Faint drifting rings behind the hero. Purely decorative and always
 * pointer-transparent; suppressed entirely under reduced motion.
 */
export function AmbientRings({ className = '' }) {
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  if (reducedMotion) return null;

  return (
    <div className={`${styles.ambient} ${className}`} aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={styles.ambientRing} style={{ animationDelay: `${i * 2.5}s` }} />
      ))}
    </div>
  );
}

export default GrowthRings;
