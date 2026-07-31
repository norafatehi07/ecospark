// src/components/layout/PointsReadout.jsx
// Phase 4 §4.C — The shell's one piece of jewellery.
// Rolling counter with mechanical deceleration, border pulse on change.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore } from '../../store/uiStore';
import { tierFromLifetime, TIER_NAMES, TIER_THRESHOLDS } from '../../constants/economy';
import { Zap } from 'lucide-react';
import { Tooltip } from '../ui/Tooltip';
import styles from './PointsReadout.module.css';

// A material palette rather than a theme palette: a tier reads as the substance
// it is made of — weathered stone, live wood, gold — which is why these are raw
// hex and do not follow the theme.
const TIER_MATERIALS = ['#7C8783', '#B9C4C0', '#8FBF9F', '#2FE38A', '#C9A253', '#E8C87A'];

// cubic-bezier(0.16, 1, 0.3, 1) — the shell's arrival curve, solved rather than
// approximated. It spends roughly three quarters of the distance in its first
// fifth of time, and that front-loading is the whole character of the count; a
// generic cubic ease-out flattens exactly the part that carries it.
const P1X = 0.16, P1Y = 1, P2X = 0.3, P2Y = 1;

function bezier(a, b, t) {
  const u = 1 - t;
  return 3 * a * u * u * t + 3 * b * u * t * t + t * t * t;
}

/** Curve y at a given x, by bisection — the x polynomial is monotonic on [0,1]. */
function ease(x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  let lo = 0;
  let hi = 1;
  let t = x;
  for (let i = 0; i < 20; i++) {
    const err = bezier(P1X, P2X, t) - x;
    if (Math.abs(err) < 1e-5) break;
    if (err > 0) hi = t; else lo = t;
    t = (lo + hi) / 2;
  }
  return bezier(P1Y, P2Y, t);
}

export default function PointsReadout({ compact = false }) {
  const spendable = useAuthStore((s) => s.profile?.spendableBalance ?? s.profile?.points ?? 0);
  // Tier is read off lifetime, never off the spendable balance: buying something
  // must never demote anyone.
  const lifetime = useAuthStore((s) => s.profile?.lifetimePoints ?? s.profile?.points ?? 0);
  const reducedMotion = useUiStore((s) => s.reducedMotion);

  const [displayValue, setDisplayValue] = useState(spendable);
  const [pulse, setPulse] = useState(null);
  const prevValue = useRef(spendable);
  const rafRef = useRef(null);

  const tier = tierFromLifetime(lifetime);
  const nextThreshold = TIER_THRESHOLDS[tier + 1];

  const animate = useCallback((from, to) => {
    cancelAnimationFrame(rafRef.current);

    // Asked before anything is scheduled or tinted: reduced motion means the
    // number is simply correct, not the same journey taken faster.
    const reduce = reducedMotion;
    if (reduce) {
      setDisplayValue(to);
      return;
    }

    const duration = Math.min(1400, Math.max(400, Math.abs(to - from) * 3));
    const start = performance.now();
    // Earning is the accent; spending dims instead. Spending is a choice the
    // user just made, so nothing here is allowed to look like an error.
    setPulse(to > from ? 'up' : 'down');

    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      // Rounded every frame — nobody owns a fraction of a point.
      setDisplayValue(Math.round(from + (to - from) * ease(p)));
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        setDisplayValue(to);
        setPulse(null);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (prevValue.current === spendable) return;
    animate(prevValue.current, spendable);
    prevValue.current = spendable;
  }, [spendable, animate]);

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  const progress = nextThreshold === undefined
    ? `${TIER_NAMES[tier]}, the top tier`
    : `${(nextThreshold - lifetime).toLocaleString()} to ${TIER_NAMES[tier + 1]}`;
  const tooltip = `${lifetime.toLocaleString()} lifetime · Tier ${tier} · ${progress}`;

  // The mobile header has 56px of its own and no room for a second box.
  if (compact) {
    return (
      <Tooltip content={tooltip}>
        <span className={styles.compact} aria-live="polite" tabIndex={0}>
          {displayValue.toLocaleString()}
        </span>
      </Tooltip>
    );
  }

  return (
    <div className={styles.host}>
      <Tooltip content={tooltip}>
        <div
          className={styles.readout}
          data-pulse={pulse ?? undefined}
          aria-live="polite"
          tabIndex={0}
        >
          <div className={styles.figures}>
            <span className={styles.balance}>{displayValue.toLocaleString()}</span>
            <span className={styles.label}>SPENDABLE</span>
          </div>
            <Zap size={24} color={TIER_MATERIALS[tier] || "var(--color-gold)"} />
        </div>
      </Tooltip>
    </div>
  );
}
