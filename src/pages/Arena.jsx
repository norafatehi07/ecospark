import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { updateUserProfile } from '../services/firestoreService';
import { increment } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './Arena.module.css';
import { Flame, Target, Zap, Clock, Coins, CheckCircle2, History, Sprout, Swords, Trophy, Lock, Unlock, TrendingUp, Users, AlertCircle, ShieldCheck, Bomb, Dices } from 'lucide-react';
import PremiumIcon from '../components/common/PremiumIcon';
import { useSettingsStore } from '../store/settingsStore';
import MinesGame from '../components/casino/MinesGame';
import DiceGame from '../components/casino/DiceGame';
import {
  subscribeActiveMarkets,
  subscribeRecentMarkets,
  refreshOracleMarketsIfStale,
  fetchCryptoPrices,
  placeBetOnMarket,
  settleExpiredMarketsForUser,
  recalculateMultipliers,
  getOptionProbabilities,
  MIN_BET,
  MAX_BET,
} from '../services/oracleService';

const WHEEL_SEGMENTS = [
  { value: 500,  label: '500',  color: '#f59e0b', textColor: '#fff' },
  { value: 0,    label: 'MISS', color: '#374151', textColor: '#6b7280' },
  { value: 1000, label: '1K',   color: '#8b5cf6', textColor: '#fff' },
  { value: 50,   label: '50',   color: '#1d4ed8', textColor: '#fff' },
  { value: 0,    label: 'MISS', color: '#374151', textColor: '#6b7280' },
  { value: 200,  label: '200',  color: '#10b981', textColor: '#fff' },
  { value: 100,  label: '100',  color: '#06b6d4', textColor: '#fff' },
  { value: 0,    label: 'MISS', color: '#374151', textColor: '#6b7280' },
];
const SEG_COUNT = WHEEL_SEGMENTS.length;
const SEG_DEG = 360 / SEG_COUNT; // 45

// SVG wheel renderer — proper arc segments
function WheelSVG({ rotation, isSpinning }) {
  const R = 200, cx = 200, cy = 200;

  function segPath(i) {
    const startA = (i * SEG_DEG - 90) * (Math.PI / 180);
    const endA   = ((i + 1) * SEG_DEG - 90) * (Math.PI / 180);
    const x1 = cx + R * Math.cos(startA), y1 = cy + R * Math.sin(startA);
    const x2 = cx + R * Math.cos(endA),   y2 = cy + R * Math.sin(endA);
    return `M${cx},${cy} L${x1},${y1} A${R},${R},0,0,1,${x2},${y2} Z`;
  }

  function labelPos(i) {
    const midA = ((i + 0.5) * SEG_DEG - 90) * (Math.PI / 180);
    return {
      x: cx + R * 0.65 * Math.cos(midA),
      y: cy + R * 0.65 * Math.sin(midA),
      rot: (i + 0.5) * SEG_DEG,
    };
  }

  return (
    <svg
      width="400" height="400"
      viewBox="0 0 400 400"
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: isSpinning ? 'transform 4.5s cubic-bezier(0.05,0.9,0.1,1)' : 'none',
        filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.8))',
        willChange: 'transform',
      }}
    >
      {/* Outer ring */}
      <circle cx={cx} cy={cy} r={R + 10} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="4" />
      <circle cx={cx} cy={cy} r={R + 6} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />

      {/* Segments */}
      {WHEEL_SEGMENTS.map((seg, i) => {
        const lp = labelPos(i);
        return (
          <g key={i}>
            <path d={segPath(i)} fill={seg.color} stroke="rgba(0,0,0,0.5)" strokeWidth="2" />
            {/* Shimmer overlay */}
            <path d={segPath(i)} fill="url(#shimmer)" opacity="0.15" />
            <text
              x={lp.x} y={lp.y}
              textAnchor="middle" dominantBaseline="middle"
              transform={`rotate(${lp.rot},${lp.x},${lp.y})`}
              fill={seg.textColor}
              fontSize={seg.label === 'MISS' ? '13' : '18'}
              fontWeight="900"
              fontFamily="var(--font-display)"
              style={{ letterSpacing: '1px' }}
            >
              {seg.label}
            </text>
          </g>
        );
      })}

      {/* Divider lines */}
      {WHEEL_SEGMENTS.map((_, i) => {
        const a = (i * SEG_DEG - 90) * (Math.PI / 180);
        return (
          <line key={`div-${i}`}
            x1={cx} y1={cy}
            x2={cx + R * Math.cos(a)} y2={cy + R * Math.sin(a)}
            stroke="rgba(0,0,0,0.6)" strokeWidth="2"
          />
        );
      })}

      {/* Center hub */}
      <circle cx={cx} cy={cy} r={48} fill="url(#hubGrad)" stroke="rgba(255,255,255,0.15)" strokeWidth="3" />
      <circle cx={cx} cy={cy} r={32} fill="url(#innerHub)" />
      <circle cx={cx} cy={cy} r={10} fill="rgba(255,255,255,0.8)" />

      <defs>
        <radialGradient id="hubGrad" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#4c1d95" />
          <stop offset="100%" stopColor="#1e1b4b" />
        </radialGradient>
        <radialGradient id="innerHub" cx="35%" cy="35%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#4c1d95" />
        </radialGradient>
        <linearGradient id="shimmer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="white" stopOpacity="1" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Oracle live helpers ──────────────────────────────────────────────────────

const COINS_STRIP = [
  { id: 'bitcoin', sym: 'BTC' },
  { id: 'ethereum', sym: 'ETH' },
  { id: 'solana', sym: 'SOL' },
  { id: 'ripple', sym: 'XRP' },
];

function useNow(intervalMs = 30000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function timeLeft(msLeft) {
  if (msLeft <= 0) return 'closing now';
  const d = Math.floor(msLeft / 86400000);
  const h = Math.floor((msLeft % 86400000) / 3600000);
  const m = Math.floor((msLeft % 3600000) / 60000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

function fmtUsd(v) {
  if (v == null) return '';
  if (v >= 1000) return '$' + Math.round(v).toLocaleString('en-US');
  if (v >= 1) return '$' + Number(v).toFixed(2);
  return '$' + Number(v).toFixed(4);
}

/** One Polymarket-style market card. Odds, volumes and probabilities are
    recalculated live from the subscribed market doc. */
function MarketCard({ market, profile, selectedOption, setSelectedOption, betAmounts, setBetAmounts, onPlaceBet, now }) {
  const msLeft = new Date(market.endTime) - now;
  const closingSoon = msLeft < 86400000 * 2 && msLeft > 0;
  const closed = msLeft <= 0;
  const opts = Array.isArray(market.options) ? market.options : [];
  const liveOptions = recalculateMultipliers(opts);
  const probs = getOptionProbabilities(opts);
  const selOpt = selectedOption[market.id];
  const selMult = liveOptions.find(o => o.id === selOpt)?.multiplier || 1;
  const crypto = market.crypto;

  return (
    <motion.div
      key={market.id}
      className={styles.marketCard}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.3 }}
      layout
    >
      <div className={styles.marketCardGlow} />

      {/* Top row: category + timer */}
      <div className={styles.marketCardTop}>
        <span className={styles.marketCategory}>
          {market.emoji || '🔮'} {market.category || 'Prediction'}
        </span>
        <span className={`${styles.marketTimer} ${closingSoon ? styles.marketTimerUrgent : ''}`}>
          <Clock size={12} /> {closed ? 'closed — settling' : timeLeft(msLeft)}
        </span>
      </div>

      <h3 className={styles.marketTitle}>{market.title}</h3>
      {market.description && <p className={styles.marketDesc}>{market.description}</p>}

      {/* Live crypto price strip */}
      {crypto && (
        <div className={styles.livePriceRow}>
          <span className={styles.liveDot} />
          <span className={styles.livePriceVal}>{fmtUsd(crypto.basePrice)}</span>
          <span className={crypto.base24h >= 0 ? styles.liveChgUp : styles.liveChgDown}>
            <TrendingUp size={12} style={crypto.base24h < 0 ? { transform: 'rotate(180deg)' } : undefined} />
            {crypto.base24h >= 0 ? '+' : ''}{crypto.base24h}% 24h
          </span>
          <span className={styles.liveStrike}>strike {fmtUsd(crypto.level)}</span>
        </div>
      )}

      {/* Probability bars — move live with every bet on the board */}
      <div className={styles.probContainer}>
        {liveOptions.map((opt, i) => (
          <div key={opt.id} className={styles.probRow}>
            <span className={styles.probLabel}>{opt.label}</span>
            <div className={styles.probBarTrack}>
              <div
                className={`${styles.probBar} ${opt.id === 'yes' ? styles.probBarYes : styles.probBarNo}`}
                style={{ width: `${probs[i] || 0}%` }}
              />
            </div>
            <span className={styles.probPct}>{probs[i] || 0}%</span>
          </div>
        ))}
      </div>

      {/* Volume */}
      <div className={styles.marketVolume}>
        <Users size={12} /> {market.betCount || 0} bets ·
        <Coins size={12} style={{ marginLeft: 4 }} /> {(market.totalStaked || 0).toLocaleString()} pts volume
      </div>

      {/* Option selector */}
      <div className={styles.optionSelector}>
        {liveOptions.map(opt => (
          <button
            key={opt.id}
            className={`${styles.optionBtn} ${selOpt === opt.id ? styles.optionBtnSelected : ''} ${opt.id === 'yes' ? styles.optionBtnYes : styles.optionBtnNo}`}
            onClick={() => setSelectedOption(p => ({ ...p, [market.id]: p[market.id] === opt.id ? null : opt.id }))}
            disabled={closed}
          >
            <span className={styles.optionLabel}>{opt.label}</span>
            <span className={styles.optionMult}>{opt.multiplier}x</span>
          </button>
        ))}
      </div>

      {/* Stake input */}
      <div className={styles.betRow}>
        <input
          type="number"
          placeholder={`${MIN_BET}–${MAX_BET.toLocaleString()} pts`}
          min={MIN_BET}
          max={MAX_BET}
          value={betAmounts[market.id] || ''}
          onChange={e => setBetAmounts(p => ({ ...p, [market.id]: e.target.value }))}
          className={styles.stakeInput}
          disabled={closed}
        />
        <button
          className={styles.betPlaceBtn}
          onClick={() => onPlaceBet(market)}
          disabled={!selOpt || !betAmounts[market.id] || closed || !profile}
        >
          Stake
          {selOpt && betAmounts[market.id] >= MIN_BET && (
            <span className={styles.betPotential}>
              → {Math.round((parseInt(betAmounts[market.id] || 0) || 0) * selMult).toLocaleString()} pts
            </span>
          )}
        </button>
      </div>

      {/* Integrity footer */}
      <div className={styles.marketSource}>
        <ShieldCheck size={11} />
        {market.kind === 'crypto'
          ? <>Settles on the real CoinGecko price at close — <a href={`https://www.coingecko.com/en/coins/${crypto?.coinId}`} target="_blank" rel="noopener noreferrer">verify feed</a></>
          : <>Settles from live web evidence with cited sources · unverifiable → auto void + refund</>}
      </div>
    </motion.div>
  );
}

export default function Arena() {
  const { profile, setProfile } = useAuthStore();
  const settings = useSettingsStore(s => s.settings) || {};

  // Casino games hit api/_lib/casino.js directly (not updateUserProfile), so
  // mirror the server's authoritative balanceAfter into the store immediately
  // — the live users/{uid} onSnapshot in App.jsx will confirm the same value
  // a moment later, this just removes the visible lag before it arrives.
  const handleCasinoBalanceChange = useCallback((balanceAfter) => {
    setProfile(profile ? { ...profile, spendableBalance: balanceAfter } : profile);
  }, [profile, setProfile]);

  const oracleOn  = settings.arenaOracleEnabled  ?? true;
  const spinOn    = settings.arenaSpinEnabled    ?? true;
  const stakingOn = settings.arenaStakingEnabled ?? true;

  const TABS = [
    { id: 'mines',    label: 'Mines',            icon: Bomb    },
    { id: 'dice',     label: 'Dice',              icon: Dices   },
    ...(oracleOn  ? [{ id: 'oracle',   label: 'The Oracle',       icon: Target  }] : []),
    ...(spinOn    ? [{ id: 'spin',     label: 'Spin to Win',      icon: Zap     }] : []),
    ...(stakingOn ? [{ id: 'staking',  label: 'Staking Pool',     icon: Sprout  }] : []),
    ...(oracleOn  ? [{ id: 'history',  label: 'Bets & History',   icon: History }] : []),
  ];

  const [activeTab, setActiveTab] = useState(TABS[0]?.id || 'mines');

  // Oracle
  const [betAmounts, setBetAmounts]     = useState({});
  const [predictions, setPredictions]   = useState([]);
  const [recentMarkets, setRecentMarkets] = useState([]);
  const [loadingOracle, setLoadingOracle] = useState(true);
  const [oracleError, setOracleError]   = useState(null);
  const [selectedOption, setSelectedOption] = useState({});
  const [cryptoPrices, setCryptoPrices] = useState(null);
  const [settling, setSettling]         = useState(false);
  const now = useNow(30000);

  // Spin — track actual cumulative degrees for correct landing
  const [spinRotation, setSpinRotation] = useState(0);
  const [isSpinning, setIsSpinning]     = useState(false);
  const [lastWin, setLastWin]           = useState(null);
  const spinRotationRef = useRef(0); // keep ref in sync so we can read latest value

  // Staking
  const [stakeAmount, setStakeAmount]   = useState('');
  const [resolvingBetId, setResolvingBetId] = useState(null);

  // Oracle — realtime: subscribe to the live market board the first time the
  // tab is opened, then keep odds/volumes fresh via onSnapshot as bets land.
  useEffect(() => {
    if (activeTab !== 'oracle') return;

    let unsubActive = null;
    let unsubRecent = null;
    let disposed = false;
    let ticker = null;

    unsubActive = subscribeActiveMarkets((markets) => {
      if (disposed) return;
      setPredictions(markets);
      setLoadingOracle(false);
      setOracleError(null);
    }, (err) => {
      if (disposed) return;
      console.error('[Oracle] Live board subscription failed:', err);
      setOracleError('Could not reach the live market board. Check your connection.');
      setLoadingOracle(false);
    });

    unsubRecent = subscribeRecentMarkets((markets) => {
      if (!disposed) setRecentMarkets(markets);
    }, () => {});

    // Populate with real markets (live crypto prices + grounded events).
    refreshOracleMarketsIfStale().catch(err => {
      console.warn('[Oracle] Refresh failed:', err);
      if (!disposed && predictions.length === 0) {
        setOracleError('Market generation is temporarily unavailable — retrying automatically.');
      }
    });

    // Live price ticker for crypto markets.
    const loadPrices = () => fetchCryptoPrices()
      .then(p => { if (!disposed) setCryptoPrices(p); })
      .catch(() => {});
    loadPrices();
    ticker = setInterval(loadPrices, 60000);

    return () => {
      disposed = true;
      clearInterval(ticker);
      unsubActive?.();
      unsubRecent?.();
    };
  }, [activeTab]);

  // Auto-settle expired bets from REAL outcomes — on mount and when the user
  // visits Oracle or History with pending, expired stakes.
  useEffect(() => {
    if (!profile || settling) return;
    if (activeTab !== 'oracle' && activeTab !== 'history') return;
    const hasPendingExpired = (profile.arenaBets || []).some(
      b => b.status === 'pending' && b.endTime && new Date(b.endTime) <= new Date()
    );
    if (!hasPendingExpired) return;

    setSettling(true);
    settleExpiredMarketsForUser(profile.id, profile)
      .then(({ settled, pointsAwarded, refunded }) => {
        if (!settled.length) return;
        if (pointsAwarded > 0) {
          toast.success(`🎉 ${settled.length} market(s) settled — you won ${pointsAwarded.toLocaleString()} pts from real outcomes!`, { duration: 6000 });
        } else if (refunded > 0) {
          toast(`${refunded.toLocaleString()} pts refunded — market(s) voided (outcome not verified)`, { icon: '🛡️', duration: 6000 });
        } else {
          toast(`${settled.length} market(s) settled from verified real-world outcomes. Better luck next time!`, { duration: 5000 });
        }
      })
      .catch(err => console.error('[Oracle] Auto-settle failed:', err))
      .finally(() => setSettling(false));
  }, [activeTab, profile?.arenaBets?.length]);

  const deductPoints = async (amount) => {
    if (!profile || (profile.spendableBalance || 0) < amount) {
      toast.error('Not enough points!');
      return false;
    }
    await updateUserProfile(profile.id, { spendableBalance: increment(-amount) });
    return true;
  };

  const addPoints = async (amount) => {
    if (!profile) return;
    await updateUserProfile(profile.id, {
      points: increment(amount),
      lifetimePoints: increment(amount),
      weeklyPoints: increment(amount),
      spendableBalance: increment(amount),
    });
  };

  // ── ORACLE ──────────────────────────────────────────────────────────────────
  const handlePlaceBet = async (prediction) => {
    const optId = selectedOption[prediction.id];
    if (!optId) { toast.error('Select YES or NO first'); return; }
    const amount = parseInt(betAmounts[prediction.id] || 0);
    if (amount < MIN_BET) { toast.error(`Minimum bet is ${MIN_BET} pts`); return; }
    if (amount > MAX_BET) { toast.error(`Maximum bet is ${MAX_BET.toLocaleString()} pts per market`); return; }
    if (!profile) { toast.error('Please sign in to bet'); return; }

    const tid = toast.loading('Placing your bet...');
    try {
      const { multiplier, potentialWin } = await placeBetOnMarket({
        userId: profile.id,
        profile,
        marketId: prediction.id,
        optionId: optId,
        amount,
      });
      toast.success(
        `✅ Bet placed! ${amount} pts on ${optId.toUpperCase()} @ ${multiplier}x → potential ${potentialWin.toLocaleString()} pts`,
        { id: tid, duration: 5000 }
      );
      // Odds update automatically — the live board subscription pushes the
      // new totals the moment the write lands, for everyone, in realtime.
      setBetAmounts(prev => ({ ...prev, [prediction.id]: '' }));
      setSelectedOption(prev => ({ ...prev, [prediction.id]: null }));
    } catch (err) {
      toast.error(err.message || 'Failed to place bet', { id: tid });
    }
  };

  // ── STAKING ─────────────────────────────────────────────────────────────────
  const handlePlaceStake = async () => {
    const amount = parseInt(stakeAmount);
    if (!amount || amount < 100) { toast.error('Minimum stake is 100 points.'); return; }
    const ok = await deductPoints(amount);
    if (!ok) return;
    toast.loading('Locking funds in the treasury...', { id: 'stake' });
    const unlockDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const newStake = {
      id: Date.now().toString(),
      amount,
      potentialReturn: Math.round(amount * 1.5),
      unlockDate,
      status: 'locked',
      date: new Date().toISOString(),
    };
    setTimeout(async () => {
      await updateUserProfile(profile.id, { arenaStakes: [newStake, ...(profile.arenaStakes || [])] });
      toast.success(`Staked ${amount} pts! 50% yield in 5 days.`, { id: 'stake' });
      setStakeAmount('');
    }, 800);
  };

  const handleClaimStake = async (stake) => {
    if (new Date(stake.unlockDate) > new Date() && !import.meta.env.DEV) {
      toast.error('Stake is still locked!'); return;
    }
    toast.loading('Claiming yield...', { id: 'claim' });
    const updatedStakes = (profile.arenaStakes || []).map(s =>
      s.id === stake.id ? { ...s, status: 'claimed' } : s
    );
    await addPoints(stake.potentialReturn);
    await updateUserProfile(profile.id, { arenaStakes: updatedStakes });
    toast.success(`Claimed ${stake.potentialReturn} pts!`, { id: 'claim' });
  };

  // ── SPIN ─────────────────────────────────────────────────────────────────────
  // Fixed spin math: pointer is at the top (12 o'clock = 0°).
  // We accumulate rotation so that the pointer always points to the correct segment.
  // Segment 0 starts at the top by default (since we offset wheel -90° in SVG labels).
  // Target: pointer is at top (0°), so to center segment `s` under it, we need
  // the wheel rotated such that the midpoint of segment `s` is at the top.
  // midpoint of segment s = s * SEG_DEG + SEG_DEG/2 degrees from the start
  // We need that angle to be AT the top (0°), so we rotate wheel by -(s * SEG_DEG + SEG_DEG/2)
  // Plus extra full spins for drama. We accumulate from current rotation to avoid rubber-banding.
  const handleSpin = async () => {
    if (isSpinning) return;
    const ok = await deductPoints(250);
    if (!ok) return;

    setIsSpinning(true);
    setLastWin(null);

    const segIdx   = Math.floor(Math.random() * SEG_COUNT);
    const extraSpins = 8; // number of full extra rotations
    const segMid   = segIdx * SEG_DEG + SEG_DEG / 2;
    // New absolute rotation: enough extra spins + landing on segMid at top
    // Pointer is at top. Wheel segment 0's midpoint is at top when wheel rotation = 0.
    // To put segMid under the pointer (top), we want wheel to be rotated by -segMid.
    // But we need a positive, ever-increasing number for animation. We round up to nearest full spin first.
    const prevRot = spinRotationRef.current;
    const prevFullSpins = Math.ceil(prevRot / 360);
    const newRot = (prevFullSpins + extraSpins) * 360 + (360 - segMid);

    spinRotationRef.current = newRot;
    setSpinRotation(newRot);

    const won = WHEEL_SEGMENTS[segIdx].value;
    setTimeout(async () => {
      setIsSpinning(false);
      setLastWin({ value: won, seg: WHEEL_SEGMENTS[segIdx] });
      if (won > 0) {
        await addPoints(won);
        toast.success(`🎉 You won ${won} pts!`, { style: { background: '#10b981', color: '#fff' } });
      } else {
        toast.error('Ouch! Better luck next time.', { style: { background: '#ef4444', color: '#fff' } });
      }
    }, 4600);
  };

  const spendable = profile?.spendableBalance?.toLocaleString() || 0;

  return (
    <div className={styles.page}>
      {/* Ambient background */}
      <div className={styles.ambientBg} />

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerBadge}>
          <Swords size={16} />
          <span>The Arena</span>
        </div>
        <h1 className={styles.title}>
          <PremiumIcon icon={Flame} color="ruby" size={52} />
          Compete & Conquer
        </h1>
        <p className={styles.subtitle}>High-stakes tournaments, predictions, and rewards await the bold.</p>
        {profile && (
          <div className={styles.balancePill}>
            <PremiumIcon icon={Coins} color="gold" size={18} />
            <span>{spendable} spendable pts</span>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.activeTab : ''}`}
          >
            <tab.icon size={18} />
            {tab.label}
            {activeTab === tab.id && <span className={styles.tabUnderline} />}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className={styles.tabContent}
        >

          {/* ═══════════════ MINES ═══════════════ */}
          {activeTab === 'mines' && (
            <MinesGame balance={profile?.spendableBalance || 0} onBalanceChange={handleCasinoBalanceChange} />
          )}

          {/* ═══════════════ DICE ═══════════════ */}
          {activeTab === 'dice' && (
            <DiceGame balance={profile?.spendableBalance || 0} onBalanceChange={handleCasinoBalanceChange} />
          )}

          {/* ═══════════════ ORACLE ═══════════════ */}
          {activeTab === 'oracle' && (
            loadingOracle ? (
              <div className={styles.loadingPanel}>
                <div className={styles.loadingOrb} />
                <h3>Consulting the Oracle...</h3>
                <p>Connecting to the live market board.</p>
              </div>
            ) : (
              <div>
                {/* Oracle Header */}
                <div className={styles.oracleHeader}>
                  <div className={styles.oracleHeaderLeft}>
                    <span className={styles.oracleLiveBadge}>
                      <span className={styles.oracleLiveDot} />
                      LIVE · REALTIME
                    </span>
                    <span className={styles.oracleSubtitle}>
                      Real markets on live crypto prices & verified events · settles from evidence, never guesses
                    </span>
                  </div>
                </div>

                {oracleError && (
                  <div className={styles.oracleAlert}>
                    <AlertCircle size={14} />
                    {oracleError}
                  </div>
                )}

                {/* Live crypto price strip */}
                {cryptoPrices && (
                  <div className={styles.cryptoStrip}>
                    {COINS_STRIP.map(c => {
                      const p = cryptoPrices[c.id];
                      if (!p?.usd) return null;
                      const chg = p.usd_24h_change || 0;
                      return (
                        <div key={c.id} className={styles.cryptoChip}>
                          <span className={styles.cryptoSym}>{c.sym}</span>
                          <span className={styles.cryptoVal}>{fmtUsd(p.usd)}</span>
                          <span className={chg >= 0 ? styles.liveChgUp : styles.liveChgDown}>
                            {chg >= 0 ? '+' : ''}{chg.toFixed(1)}%
                          </span>
                        </div>
                      );
                    })}
                    <span className={styles.cryptoFeed}>Feed: CoinGecko · updates live</span>
                  </div>
                )}

                <AnimatePresence>
                  <div className={styles.marketsGrid}>
                    {predictions.map(pred => (
                      <MarketCard
                        key={pred.id}
                        market={{
                          ...pred,
                          crypto: pred.crypto && cryptoPrices?.[pred.crypto.coinId]
                            ? { ...pred.crypto, basePrice: cryptoPrices[pred.crypto.coinId].usd, base24h: Math.round((cryptoPrices[pred.crypto.coinId].usd_24h_change || 0) * 10) / 10 }
                            : pred.crypto,
                        }}
                        profile={profile}
                        selectedOption={selectedOption}
                        setSelectedOption={setSelectedOption}
                        betAmounts={betAmounts}
                        setBetAmounts={setBetAmounts}
                        onPlaceBet={handlePlaceBet}
                        now={now}
                      />
                    ))}
                  </div>
                </AnimatePresence>

                {predictions.length === 0 && !oracleError && (
                  <div className={styles.emptyState}>
                    <Target size={64} style={{ opacity: 0.3, marginBottom: '16px' }} />
                    <p>New real markets are being generated from live data — check back shortly.</p>
                  </div>
                )}

                {/* Recently settled / voided — proves settlement is real */}
                {recentMarkets.length > 0 && (
                  <div className={styles.recentBlock}>
                    <h3 className={styles.recentTitle}>
                      <ShieldCheck size={16} /> Recently resolved — settled from real-world evidence
                    </h3>
                    {recentMarkets.map(m => (
                      <div key={m.id} className={styles.recentRow}>
                        <span className={m.status === 'settled' ? styles.recentSettled : styles.recentVoided}>
                          {m.status === 'settled' ? `${(m.winner || '').toUpperCase()} WON` : 'VOIDED · REFUNDED'}
                        </span>
                        <span className={styles.recentText}>{m.title}</span>
                        {m.settleReason && <span className={styles.recentReason}>{m.settleReason}</span>}
                        {(m.settleSources || []).length > 0 && (
                          <span className={styles.recentSources}>
                            {m.settleSources.slice(0, 2).map((u, i) => (
                              <a key={i} href={u} target="_blank" rel="noopener noreferrer">source {i + 1}</a>
                            ))}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          )}



          {/* ═══════════════ SPIN ═══════════════ */}
          {activeTab === 'spin' && (
            <div className={styles.spinContainer}>
              <div className={styles.spinHeader}>
                <h2 className={styles.spinTitle}>Wheel of Fortune</h2>
                <p className={styles.spinSubtitle}>Spin for 250 pts · Win up to 1,000 pts instantly</p>
              </div>

              <div className={styles.wheelScene}>
                {/* Pointer */}
                <div className={styles.wheelPointer}>
                  <div className={styles.wheelPointerInner} />
                </div>
                {/* Glow ring */}
                <div className={`${styles.wheelRing} ${isSpinning ? styles.wheelRingSpinning : ''}`} />
                {/* SVG Wheel */}
                <WheelSVG rotation={spinRotation} isSpinning={isSpinning} />
              </div>

              {lastWin && !isSpinning && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className={styles.spinResult}
                  style={{ '--win-color': lastWin.seg.color }}
                >
                  {lastWin.value > 0 ? (
                    <><Trophy size={24} /> You won <strong>{lastWin.value}</strong> pts!</>
                  ) : (
                    <><Flame size={24} /> Better luck next spin!</>
                  )}
                </motion.div>
              )}

              <button
                className={`${styles.primaryBtn} ${styles.spinBtn}`}
                onClick={handleSpin}
                disabled={isSpinning}
              >
                {isSpinning ? (
                  <><span className={styles.btnSpinner} /> Spinning...</>
                ) : (
                  <><Zap size={20} /> Spin (250 pts)</>
                )}
              </button>
            </div>
          )}

          {/* ═══════════════ STAKING ═══════════════ */}
          {activeTab === 'staking' && (
            <div className={styles.stakingContainer}>
              <div className={styles.stakingHero}>
                <div className={styles.stakingHeroGlow} />
                <PremiumIcon icon={Sprout} color="emerald" size={64} />
                <h2 className={styles.stakingTitle}>EcoSpark Treasury</h2>
                <p className={styles.stakingDesc}>
                  Lock points in the green treasury for <strong>5 days</strong> and earn a guaranteed <strong>50% return</strong>.
                  Only spendable points can be staked.
                </p>
                <div className={styles.stakingStats}>
                  <div className={styles.stakingStat}>
                    <span className={styles.stakingStatNum}>50%</span>
                    <span className={styles.stakingStatLabel}>Guaranteed Yield</span>
                  </div>
                  <div className={styles.stakingStatDivider} />
                  <div className={styles.stakingStat}>
                    <span className={styles.stakingStatNum}>5</span>
                    <span className={styles.stakingStatLabel}>Days Lock Period</span>
                  </div>
                  <div className={styles.stakingStatDivider} />
                  <div className={styles.stakingStat}>
                    <span className={styles.stakingStatNum}>100</span>
                    <span className={styles.stakingStatLabel}>Minimum Stake</span>
                  </div>
                </div>
                <div className={styles.stakeRow}>
                  <input
                    type="number"
                    placeholder="Enter amount to stake..."
                    value={stakeAmount}
                    onChange={e => setStakeAmount(e.target.value)}
                    className={styles.stakeInput}
                  />
                  <button onClick={handlePlaceStake} className={styles.primaryBtn} style={{ width: 'auto', padding: '16px 32px' }}>
                    <Lock size={16} /> Stake
                  </button>
                </div>
                {stakeAmount >= 100 && (
                  <p style={{ color: '#10b981', fontSize: '0.9rem', marginTop: '8px' }}>
                    You will receive <strong>{Math.round(stakeAmount * 1.5).toLocaleString()}</strong> pts after 5 days.
                  </p>
                )}
              </div>

              {(profile?.arenaStakes?.length > 0) && (
                <div className={styles.stakesGrid}>
                  <h3 className={styles.stakesGridTitle}>My Active Stakes</h3>
                  {profile.arenaStakes.map(stake => {
                    const unlocked = new Date(stake.unlockDate) <= new Date() || import.meta.env.DEV;
                    return (
                      <div key={stake.id} className={`${styles.stakeCard} ${stake.status === 'claimed' ? styles.stakeCardClaimed : ''}`}>
                        <div className={styles.stakeCardLeft}>
                          <div className={styles.stakeCardAmount}>
                            <Coins size={16} style={{ color: '#f59e0b' }} />
                            {stake.amount.toLocaleString()} pts staked
                          </div>
                          <div className={styles.stakeCardYield}>
                            → <span>{stake.potentialReturn.toLocaleString()} pts return</span>
                          </div>
                          <div className={styles.stakeCardDate}>
                            {unlocked || stake.status === 'claimed'
                              ? <><Unlock size={12} /> Ready to claim</>
                              : <><Lock size={12} /> Unlocks {new Date(stake.unlockDate).toLocaleDateString()}</>
                            }
                          </div>
                        </div>
                        <div>
                          {stake.status === 'claimed' ? (
                            <span className={styles.claimedBadge}><CheckCircle2 size={16} /> Claimed</span>
                          ) : (
                            <button
                              onClick={() => handleClaimStake(stake)}
                              disabled={!unlocked}
                              className={unlocked ? styles.claimBtn : styles.lockedBtn}
                            >
                              {unlocked ? 'Claim Yield' : 'Locked'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════ HISTORY ═══════════════ */}
          {activeTab === 'history' && (
            <div className={styles.historyPanel}>
              <div className={styles.historyHeader}>
                <h2 className={styles.historyTitle}>My Prediction History</h2>
                <p className={styles.historySubtitle}>Track your Oracle stakes and outcomes.</p>
              </div>
              {(!profile?.arenaBets || profile.arenaBets.length === 0) ? (
                <div className={styles.emptyState}>
                  <History size={64} style={{ opacity: 0.3, marginBottom: '16px' }} />
                  <p>No prediction stakes yet. Head to The Oracle to start!</p>
                </div>
              ) : (
                <div className={styles.betsList}>
                  {profile.arenaBets.map(bet => (
                    <div key={bet.id} className={`${styles.betCard} ${bet.status === 'won' ? styles.betWon : bet.status === 'lost' ? styles.betLost : ''}`}>
                      <div className={styles.betCardLeft}>
                        <h4 className={styles.betTitle}>{bet.title}</h4>
                        <div className={styles.betMeta}>
                          <span>Staked on: <strong style={{ color: 'var(--color-primary)' }}>{bet.option}</strong></span>
                          <span>{bet.amount} pts · {bet.multiplier ?? bet.multiplierAtBet}x · Potential: {bet.potentialWin} pts</span>
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>{new Date(bet.date).toLocaleString()}</span>
                        </div>
                        {bet.resultReason && <p className={styles.betReason}>{bet.resultReason}</p>}
                        {bet.settlePrice != null && bet.kind === 'crypto' && (
                          <p className={styles.betReason}>Settled at {fmtUsd(bet.settlePrice)} (real market price)</p>
                        )}
                      </div>
                      <div className={styles.betCardRight}>
                        {bet.status === 'pending' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                            <span className={styles.pendingBadge}>PENDING</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                              Auto-settles from real outcomes at expiry
                            </span>
                          </div>
                        ) : bet.status === 'voided' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
                            <span className={styles.voidedBadge}>VOIDED</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                              <ShieldCheck size={11} style={{ verticalAlign: '-2px' }} /> {bet.amount} pts refunded
                            </span>
                          </div>
                        ) : (
                          <span className={bet.status === 'won' ? styles.wonBadge : styles.lostBadge}>
                            {bet.status === 'won' ? `WON +${bet.potentialWin}` : 'LOST'}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </motion.div>
      </AnimatePresence>
    </div>
  );
}
