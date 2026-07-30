// src/pages/Rewards.jsx
// ═══════════════════════════════════════════════════════════════════════════════
// REWARDS — Ultra ecosystem: Frame Fitting Studio + kinetic bento catalog.
// 3D tilt w/ specular lighting, glassmorphism, count-up points, neon progress
// ring, scroll-staggered reveals. All motion via framer-motion (no new deps).
// ═══════════════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef } from 'react';
import {
  motion, AnimatePresence, animate,
  useMotionValue, useSpring, useTransform, useMotionTemplate,
} from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { subscribeUserTransactions } from '../services/firestoreService';
import {
  redeemReward, equipCosmetic, unequipCosmetic, openCase, newIdempotencyKey,
} from '../services/economyService';
import {
  BronzeFrame, SilverFrame, GoldFrame, PlatinumFrame, GodFrame,
  GaiaFrame, SupernovaFrame, PrimeFrame,
  BiocircuitFrame, HelixFrame, SingularityFrame,
} from '../components/common/Frames';
import FrameStudio from '../components/rewards/FrameStudio';
import {
  REWARDS_DB, TIER_CONFIG, LOOT_CASES, computeDropRates, poolForCase,
} from '../constants/rewards';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import { useUiStore } from '../store/uiStore';
import styles from './Rewards.module.css';

// ─── Reel geometry ────────────────────────────────────────────────────────────
// Must match .scrollerItem in Rewards.module.css: 180px wide + 15px margin each
// side. If that CSS changes, change this with it or the reel stops off-centre.
const ITEM_WIDTH = 210;
const WIN_INDEX = 25;
const REEL_LENGTH = 32;

const FRAME_COMPONENTS = {
  'frame-bronze': BronzeFrame,
  'frame-silver': SilverFrame,
  'frame-gold': GoldFrame,
  'frame-platinum': PlatinumFrame,
  'frame-god': GodFrame,
  'frame-gaia': GaiaFrame,
  'frame-supernova': SupernovaFrame,
  'frame-prime': PrimeFrame,
  'frame-biocircuit': BiocircuitFrame,
  'frame-helix': HelixFrame,
  'frame-singularity': SingularityFrame,
};

// Tiers that earn an oversized bento cell
const FEATURED_TIERS = ['gaia', 'supernova', 'prime', 'quantum', 'helix', 'singularity'];

// ─── Kinetic primitives ───────────────────────────────────────────────────────

function ConfettiParticle({ delay }) {
  const colors = ['#2E7D32', '#F59E0B', '#00897B', '#EF4444', '#3B82F6'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  return (
    <motion.div
      style={{
        position: 'fixed', top: '30%', left: `${left}%`,
        width: 8, height: 8, borderRadius: 2,
        background: color, pointerEvents: 'none', zIndex: 9999,
      }}
      initial={{ y: 0, opacity: 1, rotate: 0 }}
      animate={{ y: window.innerHeight * 0.6, opacity: 0, rotate: 360 }}
      transition={{ duration: 1.5, delay, ease: 'easeIn' }}
    />
  );
}

// Fluid count-up number
function CountUp({ value, duration = 1.4 }) {
  const ref = useRef(null);
  const mv = useMotionValue(0);
  useEffect(() => {
    const controls = animate(mv, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        if (ref.current) ref.current.textContent = Math.round(v).toLocaleString();
      },
    });
    return () => controls.stop();
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref}>0</span>;
}

// Self-drawing neon progress ring
function ProgressRing({ progress, color, size = 88, label }) {
  const r = (size - 12) / 2;
  return (
    <div className={styles.ringWrap} style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)', overflow: 'visible' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
        <motion.circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 8px ${color}) drop-shadow(0 0 18px ${color}66)` }}
          initial={{ pathLength: 0 }}
          animate={{ pathLength: Math.max(0.02, Math.min(1, progress)) }}
          transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
        />
      </svg>
      <div className={styles.ringLabel}>{label}</div>
    </div>
  );
}

// Vanilla-Tilt-style kinetic 3D card with specular light follow-through
function TiltCard({ children, className, style, glow }) {
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rx = useSpring(useTransform(py, [0, 1], [8, -8]), { stiffness: 160, damping: 18, mass: 0.5 });
  const ry = useSpring(useTransform(px, [0, 1], [-8, 8]), { stiffness: 160, damping: 18, mass: 0.5 });
  const specX = useTransform(px, (v) => v * 100);
  const specY = useTransform(py, (v) => v * 100);
  const specular = useMotionTemplate`radial-gradient(460px circle at ${specX}% ${specY}%, rgba(255,255,255,0.13), transparent 55%)`;

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    px.set((e.clientX - rect.left) / rect.width);
    py.set((e.clientY - rect.top) / rect.height);
  };
  const handleLeave = () => { px.set(0.5); py.set(0.5); };

  return (
    <motion.div
      className={className}
      style={{ ...style, rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      whileHover={glow ? { boxShadow: glow } : undefined}
    >
      {children}
      <motion.div className={styles.specular} style={{ background: specular }} aria-hidden />
    </motion.div>
  );
}

// Scroll-triggered stagger reveal (0.85 → 1.0 scale + alpha fade)
const revealProps = (i = 0) => ({
  initial: { opacity: 0, scale: 0.85, y: 26 },
  whileInView: { opacity: 1, scale: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.6, delay: (i % 6) * 0.06, ease: [0.16, 1, 0.3, 1] },
});

// ─── Reward card ──────────────────────────────────────────────────────────────

function RewardCard({ reward, userPoints, owned, onRedeem, onEquip, onUnequip, isEquipped, index }) {
  const cfg = TIER_CONFIG[reward.tier] || TIER_CONFIG.bronze;
  const canAfford = userPoints >= reward.pointCost;
  const isFrame = reward.type === 'frame';
  const FrameComponent = isFrame ? FRAME_COMPONENTS[reward.id] : null;
  const featured = FEATURED_TIERS.includes(reward.tier);

  return (
    <motion.div className={`${styles.cell} ${featured ? styles.cellFeatured : ''}`} {...revealProps(index)}>
      <TiltCard
        className={`${styles.card} ${owned ? styles.owned : ''} ${!canAfford && !owned ? styles.locked : ''}`}
        glow={canAfford && !owned ? cfg.glow : undefined}
        style={{ '--reward-color': cfg.color, border: isEquipped ? `1.5px solid ${cfg.color}` : undefined }}
      >
        <div className={styles.badgeArt}>
          <div className={styles.badgeGlow} style={{ background: cfg.color }} />
          {FrameComponent ? (
            <div style={{ width: '80%', height: '80%', position: 'relative', zIndex: 2 }}>
              <FrameComponent />
            </div>
          ) : reward.type === 'glow' ? (
            <span className={reward.cssClass} style={{ fontSize: '1.5rem', zIndex: 2, position: 'relative' }}>EcoUser</span>
          ) : reward.type === 'background' ? (
            <div className={reward.cssClass} style={{
              width: '80%', height: '80%', borderRadius: '8px', zIndex: 2, minHeight: 'auto', padding: 0, position: 'relative',
              boxShadow: 'inset 0 0 10px rgba(255,255,255,0.5), 0 0 15px rgba(255,255,255,0.3)',
              border: '2px solid rgba(255,255,255,0.8)',
            }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 50%)', borderRadius: '6px', pointerEvents: 'none' }} />
            </div>
          ) : reward.type === 'companion' ? (
            reward.imageUrl ? (
              <img src={reward.imageUrl} alt={reward.name} style={{ width: '60%', height: '60%', objectFit: 'contain', zIndex: 2, position: 'relative', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }} />
            ) : (
              <span style={{ fontSize: '3rem', zIndex: 2, position: 'relative', filter: `drop-shadow(0 0 16px ${cfg.color})` }}>{reward.icon}</span>
            )
          ) : (
            <span className={styles.badgeEmoji} style={{ zIndex: 2, position: 'relative' }}>{reward.icon || '🏅'}</span>
          )}
        </div>

        <div className={styles.tierLabel} style={{ color: cfg.color }}>
          {cfg.label} Tier
        </div>

        <h3 className={styles.rewardName}>{reward.name}</h3>
        <p className={styles.rewardDesc}>{reward.description}</p>

        <div className={styles.cardFooter}>
          <div className={styles.cost}>
            <span className={styles.costNum}>{reward.pointCost.toLocaleString()}</span>
            <span className={styles.costLabel}>pts</span>
          </div>

          {owned ? (
            isEquipped ? (
              <motion.button
                className={styles.redeemBtn}
                style={{ background: 'var(--color-surface)', color: 'var(--color-text)', border: '1px solid var(--color-border)' }}
                onClick={() => onUnequip(reward.type)}
                whileTap={{ scale: 0.95 }}
              >
                Unequip
              </motion.button>
            ) : (
              <motion.button
                className={styles.redeemBtn}
                style={{ background: cfg.color, color: '#000', boxShadow: cfg.glow }}
                onClick={() => onEquip(reward.type, reward.id)}
                whileTap={{ scale: 0.95 }}
              >
                Equip
              </motion.button>
            )
          ) : (
            <motion.button
              className={styles.redeemBtn}
              disabled={!canAfford}
              onClick={() => onRedeem(reward)}
              whileTap={{ scale: 0.95 }}
              style={canAfford ? { boxShadow: cfg.glow } : {}}
            >
              {canAfford ? 'Redeem 🎁' : `Need ${(reward.pointCost - userPoints).toLocaleString()} more`}
            </motion.button>
          )}
        </div>
      </TiltCard>
    </motion.div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Rewards() {
  const { user, profile } = useAuthStore();
  const { settings } = useSettingsStore();
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unlocking, setUnlocking] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [transactions, setTransactions] = useState([]);
  const [txLoading, setTxLoading] = useState(false);

  // Lootboxes
  const [lootboxActive, setLootboxActive] = useState(false);
  const [spinningCase, setSpinningCase] = useState(null);
  const [scrollerItems, setScrollerItems] = useState([]);
  const [openingCase, setOpeningCase] = useState(null);   // case id while in flight
  const [lootResult, setLootResult] = useState(null);     // server-decided outcome
  const [spinTargetX, setSpinTargetX] = useState(null);   // px, measured on open
  const [revealed, setRevealed] = useState(false);        // reel has finished
  const [ratesOpen, setRatesOpen] = useState(null);       // case id of open panel
  const scrollerWindowRef = useRef(null);
  const reducedMotion = useUiStore((s) => s.reducedMotion);

  const wonReward = lootResult?.reward || null;

  useEffect(() => {
    if (user && activeTab === 'history') {
      setTxLoading(true);
      const unsub = subscribeUserTransactions(user.uid, (data) => {
        setTransactions(data);
        setTxLoading(false);
      });
      return unsub;
    }
  }, [user, activeTab]);

  const loadRewards = () => {
    setLoading(true);
    setError(null);
    try {
      const combined = [];

      // Add all predefined rewards from REWARDS_DB
      REWARDS_DB.forEach(reward => {
        // If the user ALREADY OWNS the reward, ALWAYS show it so they can equip it!
        let ownsReward = false;
        if (reward.type === 'frame') {
          ownsReward = profile?.unlockedFrames?.includes(reward.id) || profile?.inventory?.frames?.includes(reward.id);
        } else {
          const pluralType = reward.type === 'entry' ? 'entries' : `${reward.type}s`;
          ownsReward = profile?.inventory?.[pluralType]?.includes(reward.id);
        }

        let shouldShow = true;
        // Hide reward if it is globally disabled and the user doesn't already own it
        if (!ownsReward && settings?.disabledRewards?.includes(reward.id)) {
          shouldShow = false;
        }

        if (shouldShow && !combined.find(r => r.id === reward.id)) {
          combined.push(reward);
        }
      });

      combined.sort((a, b) => a.pointCost - b.pointCost);
      setRewards(combined);
      setLoading(false);
    } catch (err) {
      console.error('[Rewards] Failed to load:', err);
      setError('Failed to load rewards');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRewards();
  }, [profile?.unlockedFrames?.length, profile?.inventory, settings?.gaiaFrameEnabled, settings?.supernovaFrameEnabled, settings?.primeFrameEnabled]);

  const handleEquip = async (type, rewardId) => {
    if (!user) return;
    try {
      await equipCosmetic(type, rewardId);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} equipped`);
    } catch (err) {
      toast.error(err.message || 'Could not equip that item');
    }
  };

  const handleUnequip = async (type) => {
    if (!user) return;
    try {
      await unequipCosmetic(type);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} unequipped`);
    } catch (err) {
      toast.error(err.message || 'Could not unequip that item');
    }
  };

  const handleRedeem = async (reward) => {
    if (!user || !profile) return;
    if (unlocking) return; // in-flight guard: one purchase at a time
    setUnlocking(reward.id);
    try {
      // Price, affordability and ownership are all validated server-side; the
      // client sends an id and renders the result.
      await redeemReward(reward.id);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      toast.success(`${reward.name} unlocked`);
    } catch (err) {
      toast.error(err.message || 'Could not redeem that reward');
    } finally {
      setUnlocking(null);
    }
  };

  const checkOwned = (r) => {
    if (r.type === 'frame') return profile?.unlockedFrames?.includes(r.id) || profile?.inventory?.frames?.includes(r.id);
    const pluralType = r.type === 'entry' ? 'entries' : `${r.type}s`;
    return profile?.inventory?.[pluralType]?.includes(r.id);
  };

  const checkEquipped = (r) => {
    if (r.type === 'frame') return profile?.activeFrame === r.id || profile?.equipped?.frame === r.id;
    return profile?.equipped?.[r.type] === r.id;
  };

  const userPoints = profile?.spendableBalance ?? profile?.points ?? 0;
  // Raw error detail is shown to staff only (§2.6).
  const isStaff = ['teacher', 'admin', 'owner'].includes(profile?.role);

  // Filter and sort logic
  const filteredRewards = rewards.filter(r => {
    if (activeTab === 'all') return true;
    if (activeTab === 'frames') return r.type === 'frame';
    if (activeTab === 'glows') return r.type === 'glow';
    if (activeTab === 'companions') return r.type === 'companion';
    if (activeTab === 'backgrounds') return r.type === 'background';
    if (activeTab === 'entries') return r.type === 'entry';
    return true;
  });

  if (activeTab === 'all') {
    filteredRewards.sort((a, b) => {
      // Prioritize frames first
      if (a.type === 'frame' && b.type !== 'frame') return -1;
      if (b.type === 'frame' && a.type !== 'frame') return 1;

      // For the rest, sort by cost to mix them naturally
      if (a.pointCost !== b.pointCost) return a.pointCost - b.pointCost;
      return a.id.localeCompare(b.id);
    });
  }

  const TABS = ['all', 'lootboxes', 'frames', 'glows', 'companions', 'backgrounds', 'entries'];

  // ── Loot case opening ───────────────────────────────────────────────────────
  // The outcome is decided by the server (crypto RNG, weighted by the same table
  // the drop-rate panel displays). The client's only job is to animate a result
  // it has already been given.
  const handleOpenLootbox = async (caseConfig) => {
    if (!user) return;
    if (openingCase) return;               // A-2: no double-spend on double-click
    if (userPoints < caseConfig.cost) {
      toast.error('Not enough points for that case yet.');
      return;
    }

    setOpeningCase(caseConfig.id);

    // Stable across retries of this same open, so a flaky connection cannot
    // charge twice.
    const idempotencyKey = newIdempotencyKey('case');

    try {
      const result = await openCase(caseConfig.id, idempotencyKey);
      const won = result.reward;

      // Build the reel from the case's real pool, so what scrolls past is an
      // honest sample of what could have been won.
      const pool = poolForCase(caseConfig.id);
      const reel = Array.from(
        { length: REEL_LENGTH },
        (_, i) => pool[i % pool.length] || won
      );
      // Shuffle visually (presentation only — never decides an outcome).
      for (let i = reel.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [reel[i], reel[j]] = [reel[j], reel[i]];
      }
      reel[WIN_INDEX] = won;

      setScrollerItems(reel);
      setSpinningCase(caseConfig);
      setLootResult(result);
      setSpinTargetX(null);   // measured once the modal is on screen
      setRevealed(false);
      setLootboxActive(true);
    } catch (err) {
      toast.error(err.message || 'Could not open that case');
      setOpeningCase(null);
    }
  };

  // Measure the window and start the reel only once the modal is actually laid
  // out — the track must animate to a real pixel target, not a percentage of
  // its own 6,000px width.
  useEffect(() => {
    if (!lootboxActive || !scrollerItems.length || spinTargetX !== null) return;

    const frame = requestAnimationFrame(() => {
      const width = scrollerWindowRef.current?.offsetWidth || 1200;
      // Land slightly off-centre inside the winning tile so it reads as a real
      // stop rather than a snap. Presentation only.
      const jitter = (Math.random() - 0.5) * (ITEM_WIDTH * 0.4);
      setSpinTargetX(width / 2 - (WIN_INDEX * ITEM_WIDTH + ITEM_WIDTH / 2) + jitter);
    });
    return () => cancelAnimationFrame(frame);
  }, [lootboxActive, scrollerItems.length, spinTargetX]);

  const finishReveal = () => {
    if (revealed) return;
    setRevealed(true);
    setOpeningCase(null);
    if (lootResult && !lootResult.duplicate) {
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
    }
  };

  const closeLootbox = () => {
    setLootboxActive(false);
    setOpeningCase(null);
    setSpinTargetX(null);
    setRevealed(false);
    setLootResult(null);
    setScrollerItems([]);
  };

  // Escape dismisses the reveal. Allowed only once the reel has stopped, so a
  // keypress mid-spin cannot hide an outcome the user has already paid for.
  useEffect(() => {
    if (!lootboxActive) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && revealed) closeLootbox();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lootboxActive, revealed]);

  // ── Progress toward next unowned reward (neon ring) ──
  const nextGoal = rewards
    .filter(r => !checkOwned(r) && r.pointCost > 0 && r.pointCost < 999999)
    .sort((a, b) => a.pointCost - b.pointCost)
    .find(r => r.pointCost > 0);
  const goalProgress = nextGoal ? Math.min(1, userPoints / nextGoal.pointCost) : 1;
  const goalCfg = nextGoal ? (TIER_CONFIG[nextGoal.tier] || TIER_CONFIG.bronze) : TIER_CONFIG.prime;

  const frameRewards = rewards.filter(r => r.type === 'frame');
  const equippedFrameId = profile?.activeFrame || profile?.equipped?.frame || null;
  const showStudio = (activeTab === 'all' || activeTab === 'frames') && frameRewards.length > 0 && !loading && !error;

  return (
    <div className={styles.page}>
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && Array.from({ length: 30 }).map((_, i) => (
          <ConfettiParticle key={i} delay={i * 0.04} />
        ))}
      </AnimatePresence>

      {/* ── Kinetic header panel ── */}
      <motion.div
        className={styles.headerPanel}
        initial={{ opacity: 0, y: -18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <div>
          <h1 className={styles.title}>Rewards</h1>
          <p className={styles.subtitle}>
            <strong className={styles.pointsCounter}><CountUp value={userPoints} /></strong>
            <span> pts to spend</span>
          </p>
          {nextGoal && (
            <p className={styles.goalHint}>
              Next unlock: <span style={{ color: goalCfg.color }}>{nextGoal.name}</span> · {nextGoal.pointCost.toLocaleString()} pts
            </p>
          )}
        </div>
        <ProgressRing
          progress={goalProgress}
          color={goalCfg.color}
          label={`${Math.round(goalProgress * 100)}%`}
        />
      </motion.div>

      <div className={styles.tabsContainer} style={{ flexWrap: 'wrap', gap: '8px' }}>
        <div className={styles.tabs} style={{ flexWrap: 'wrap', gap: '8px', borderBottom: 'none' }}>
          {TABS.map((tab) => (
            <button
              key={tab}
              className={`${styles.tabBtn} ${activeTab === tab ? styles.tabActive : ''}`}
              onClick={() => setActiveTab(tab)}
              style={{ textTransform: 'capitalize', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}
            >
              {tab}
            </button>
          ))}
        </div>
        <button
          className={`${styles.tabBtn} ${activeTab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('history')}
          style={{ borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)' }}
        >
          View History 📜
        </button>
      </div>

      {/* ── Frame Fitting Studio ── */}
      {showStudio && (
        <FrameStudio
          frames={frameRewards}
          frameComponents={FRAME_COMPONENTS}
          avatarUrl={profile?.photoURL}
          displayName={profile?.displayName}
          userPoints={userPoints}
          equippedId={equippedFrameId}
          checkOwned={checkOwned}
          onEquip={handleEquip}
          onUnequip={handleUnequip}
          onRedeem={handleRedeem}
          reducedMotion={!!profile?.reducedMotion}
        />
      )}

      {activeTab === 'history' ? (
        <div className={styles.historyList}>
          {txLoading ? (
            <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)' }}>Loading history...</p>
          ) : transactions.length === 0 ? (
            <div className={styles.empty}>
              <span>📜</span>
              <p>No transactions yet. Complete some tasks to earn points!</p>
            </div>
          ) : (
            transactions.map((tx) => {
              const isPositive = tx.amount > 0;
              const dateObj = tx.createdAt?.toDate ? tx.createdAt.toDate() : new Date();
              return (
                <div key={tx.id} className={styles.txRow}>
                  <div className={styles.txInfo}>
                    <div className={styles.txType} style={{ background: isPositive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)', color: isPositive ? 'var(--color-success)' : 'var(--color-error)' }}>
                      {tx.type.toUpperCase()}
                    </div>
                    <div className={styles.txDesc}>{tx.description}</div>
                    <div className={styles.txDate}>{dateObj.toLocaleString()}</div>
                  </div>
                  <div className={styles.txAmount} style={{ color: isPositive ? 'var(--color-success)' : 'var(--color-error)' }}>
                    {isPositive ? '+' : ''}{tx.amount}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : activeTab === 'lootboxes' ? (
        <div className={styles.lootboxContainer}>
          <div style={{ textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', margin: '0 0 10px 0', fontSize: '2rem' }}>Mystery Lootboxes</h2>
            <p style={{ color: 'var(--color-text-secondary)' }}>Test your luck to win high-tier rewards for a fraction of the cost.</p>
          </div>

          <div className={styles.lootboxGrid}>
            {LOOT_CASES.map((c, i) => {
              const busy = openingCase === c.id;
              const affordable = userPoints >= c.cost;
              const rates = ratesOpen === c.id ? computeDropRates(c.id) : null;
              return (
                <motion.div key={c.id} {...revealProps(i)}>
                  <div className={styles.caseCard} style={{ '--case-color': c.color }}>
                    <div className={styles.caseIcon}>{c.icon}</div>
                    <h3 className={styles.caseTitle}>{c.name}</h3>
                    <div className={styles.caseCost}>{c.cost.toLocaleString()} pts</div>
                    <button
                      className={styles.caseBtn}
                      disabled={!affordable || !!openingCase}
                      onClick={() => handleOpenLootbox(c)}
                    >
                      {busy
                        ? 'Opening…'
                        : affordable
                          ? 'Unlock Case'
                          : `Need ${(c.cost - userPoints).toLocaleString()} more`}
                    </button>

                    {/* Drop-rate disclosure — derived from the same weight table
                        the server rolls against, so it cannot drift. */}
                    <button
                      type="button"
                      className={styles.ratesToggle}
                      aria-expanded={ratesOpen === c.id}
                      onClick={() => setRatesOpen(ratesOpen === c.id ? null : c.id)}
                    >
                      {ratesOpen === c.id ? 'Hide drop rates' : 'Drop rates'}
                    </button>

                    <AnimatePresence initial={false}>
                      {rates && (
                        <motion.ul
                          className={styles.ratesPanel}
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: reducedMotion ? 0 : 0.22 }}
                        >
                          {rates.map((r) => (
                            <li key={r.tier} className={styles.ratesRow}>
                              <span className={styles.ratesDot} style={{ background: r.color }} aria-hidden="true" />
                              <span className={styles.ratesLabel}>{r.label}</span>
                              <span className={styles.ratesPct}>
                                {(r.probability * 100).toFixed(r.probability < 0.01 ? 2 : 1)}%
                              </span>
                            </li>
                          ))}
                          <li className={styles.ratesNote}>
                            Duplicates are converted to points automatically.
                          </li>
                        </motion.ul>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : loading ? (
        <div className={styles.bentoGrid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.cardSkeleton}`} />
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: '48px 24px', gap: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }} aria-hidden="true">⚠️</span>
          <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>We couldn't load the rewards catalog</p>
          <p style={{ color: 'var(--color-text-secondary)', margin: 0, maxWidth: 420, fontSize: 'var(--text-sm)' }}>
            This is usually a temporary connection problem. Try again in a moment.
          </p>
          {/* Raw detail stays available to staff only — students get a sentence. */}
          {isStaff && (
            <code style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 8, maxWidth: '100%', wordBreak: 'break-all', display: 'block' }}>
              {error}
            </code>
          )}
          <button
            onClick={loadRewards}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-sm)' }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className={styles.bentoGrid}>
          {filteredRewards.map((r, i) => (
            <RewardCard
              key={r.id}
              index={i}
              reward={r}
              userPoints={userPoints}
              owned={checkOwned(r)}
              onRedeem={handleRedeem}
              onEquip={handleEquip}
              onUnequip={handleUnequip}
              isEquipped={checkEquipped(r)}
            />
          ))}
          {filteredRewards.length === 0 && (
            <div className={styles.empty}>
              <span>🎁</span>
              <p>No rewards found for this category!</p>
            </div>
          )}
        </div>
      )}

      {/* LOOTBOX SCROLLER MODAL */}
      {lootboxActive && (
        <div
          className={styles.scrollerOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={`Opening ${spinningCase?.name || 'case'}`}
        >
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: '2.5rem', textTransform: 'uppercase', letterSpacing: '2px', color: spinningCase?.color }}>
              {revealed ? spinningCase?.name : `Opening ${spinningCase?.name}…`}
            </h2>
          </div>

          <div className={styles.scrollerWindow} ref={scrollerWindowRef}>
            <div className={styles.scrollerLine}></div>
            <motion.div
              className={styles.scrollerTrack}
              initial={{ x: 0 }}
              animate={{ x: spinTargetX ?? 0 }}
              transition={{
                duration: reducedMotion ? 0 : 5,
                ease: [0.05, 0.9, 0.1, 1],
              }}
              // The reveal is gated on the reel actually finishing, so the card
              // can never cover a spin that is still running.
              onAnimationComplete={() => {
                if (spinTargetX !== null) finishReveal();
              }}
            >
              {scrollerItems.map((item, idx) => {
                const cfg = TIER_CONFIG[item.tier] || TIER_CONFIG.bronze;
                return (
                  <div key={idx} className={styles.scrollerItem} style={{ borderColor: cfg.color, boxShadow: `inset 0 0 30px ${cfg.color}40, 0 10px 20px rgba(0,0,0,0.5)` }}>
                    <div className={styles.scrollerItemIcon}>{item.icon || '🏅'}</div>
                    <div className={styles.scrollerItemName} style={{ color: cfg.color }}>{item.name}</div>
                  </div>
                );
              })}
            </motion.div>
          </div>

          <AnimatePresence>
            {revealed && wonReward && (
              <motion.div
                className={styles.lootReveal}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <motion.div
                  className={styles.lootRevealCard}
                  initial={{ scale: 0.5, y: 100 }}
                  animate={{ scale: 1, y: 0 }}
                  transition={{ type: 'spring', bounce: 0.6, duration: 0.8 }}
                >
                  <div style={{ fontSize: '120px', marginBottom: '20px', filter: `drop-shadow(0 0 50px ${(TIER_CONFIG[wonReward.tier] || TIER_CONFIG.bronze).color})`, position: 'relative', zIndex: 2 }}>
                    {wonReward.icon || '🏅'}
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-ceremonial, var(--font-display))', margin: '0 0 10px 0', fontSize: '3rem', position: 'relative', zIndex: 2 }}>{wonReward.name}</h2>
                  <p style={{ color: (TIER_CONFIG[wonReward.tier] || TIER_CONFIG.bronze).color, textTransform: 'uppercase', fontWeight: '900', letterSpacing: '4px', fontSize: '1.2rem', position: 'relative', zIndex: 2 }}>
                    {(TIER_CONFIG[wonReward.tier] || TIER_CONFIG.bronze).label} Tier
                  </p>

                  {/* A-1: a duplicate used to charge full price for nothing.
                      It is now converted to points, and we say so plainly. */}
                  {lootResult?.duplicate && (
                    <p style={{ marginTop: 14, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', maxWidth: 380, position: 'relative', zIndex: 2 }}>
                      You already owned this, so it was converted to{' '}
                      <strong style={{ color: 'var(--color-gold, #F59E0B)' }}>
                        +{lootResult.refund.toLocaleString()} points
                      </strong>.
                    </p>
                  )}

                  <button
                    onClick={closeLootbox}
                    autoFocus
                    style={{ marginTop: '32px', padding: '16px 40px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '100px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', position: 'relative', zIndex: 2, boxShadow: '0 10px 20px rgba(139, 92, 246, 0.4)' }}
                  >
                    {lootResult?.duplicate ? 'Collect Points' : 'Claim Reward'}
                  </button>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
