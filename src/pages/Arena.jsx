import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { updateUserProfile } from '../services/firestoreService';
import { generateArenaTrivia } from '../services/aiService';
import { increment } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './Arena.module.css';
import { Flame, Brain, Target, Zap, Clock, Coins, CheckCircle2, History, Sprout, Swords, Trophy, Lock, Unlock, ChevronRight, Leaf, Star, TrendingUp, Users, AlertCircle, RefreshCw } from 'lucide-react';
import PremiumIcon from '../components/common/PremiumIcon';
import { MOCK_PREDICTIONS, MOCK_TRIVIA } from '../constants/arenaData';
import { useSettingsStore } from '../store/settingsStore';
import {
  refreshOracleMarketsIfStale,
  placeBetOnMarket,
  settleExpiredMarketsForUser,
  recalculateMultipliers,
  getOptionProbabilities,
  MIN_BET,
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

export default function Arena() {
  const { profile } = useAuthStore();
  const settings = useSettingsStore(s => s.settings) || {};

  const oracleOn  = settings.arenaOracleEnabled  ?? true;
  const triviaOn  = settings.arenaTriviaEnabled  ?? true;
  const spinOn    = settings.arenaSpinEnabled    ?? true;
  const stakingOn = settings.arenaStakingEnabled ?? true;

  const TABS = [
    ...(oracleOn  ? [{ id: 'oracle',   label: 'The Oracle',       icon: Target  }] : []),
    ...(triviaOn  ? [{ id: 'trivia',   label: 'Trivia',           icon: Brain   }] : []),
    ...(spinOn    ? [{ id: 'spin',     label: 'Spin to Win',      icon: Zap     }] : []),
    ...(stakingOn ? [{ id: 'staking',  label: 'Staking Pool',     icon: Sprout  }] : []),
    ...(oracleOn  ? [{ id: 'history',  label: 'Bets & History',   icon: History }] : []),
  ];

  const [activeTab, setActiveTab] = useState(TABS[0]?.id || 'spin');

  // Oracle
  const [betAmounts, setBetAmounts]     = useState({});
  const [predictions, setPredictions]   = useState([]);
  const [loadingOracle, setLoadingOracle] = useState(false);
  const [oracleError, setOracleError]   = useState(null);
  const [selectedOption, setSelectedOption] = useState({});
  const [settling, setSettling]         = useState(false);

  // Trivia
  const [triviaActive, setTriviaActive]     = useState(false);
  const [currentQIndex, setCurrentQIndex]   = useState(0);
  const [triviaScore, setTriviaScore]       = useState(0);
  const [triviaFinished, setTriviaFinished] = useState(false);
  const [triviaQuestions, setTriviaQuestions] = useState([]);
  const [loadingTrivia, setLoadingTrivia]   = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showFact, setShowFact]             = useState(false);

  // Spin — track actual cumulative degrees for correct landing
  const [spinRotation, setSpinRotation] = useState(0);
  const [isSpinning, setIsSpinning]     = useState(false);
  const [lastWin, setLastWin]           = useState(null);
  const spinRotationRef = useRef(0); // keep ref in sync so we can read latest value

  // Staking
  const [stakeAmount, setStakeAmount]   = useState('');
  const [resolvingBetId, setResolvingBetId] = useState(null);

  // Load oracle on tab switch
  useEffect(() => {
    if (activeTab === 'oracle' && predictions.length === 0) loadPredictions();
  }, [activeTab]);

  // Auto-settle expired bets when visiting history tab
  useEffect(() => {
    if (activeTab === 'history' && profile && !settling) {
      setSettling(true);
      settleExpiredMarketsForUser(profile.id, profile)
        .then(({ settled, pointsAwarded }) => {
          if (settled.length > 0) {
            toast.success(
              pointsAwarded > 0
                ? `🎉 ${settled.length} market(s) settled! You won ${pointsAwarded.toLocaleString()} pts`
                : `${settled.length} market(s) settled. Better luck next time!`,
              { duration: 5000 }
            );
          }
        })
        .catch(err => console.error('[Oracle] Auto-settle failed:', err))
        .finally(() => setSettling(false));
    }
  }, [activeTab]);

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
  const loadPredictions = async () => {
    setLoadingOracle(true);
    setOracleError(null);
    try {
      const markets = await refreshOracleMarketsIfStale();
      setPredictions(markets);
    } catch (err) {
      console.error('[Oracle] Load failed:', err);
      // Use eco-focused fallbacks
      setPredictions(MOCK_PREDICTIONS);
      setOracleError('Using cached markets — live refresh failed.');
    } finally {
      setLoadingOracle(false);
    }
  };

  const handlePlaceBet = async (prediction) => {
    const optId = selectedOption[prediction.id];
    if (!optId) { toast.error('Select YES or NO first'); return; }
    const amount = parseInt(betAmounts[prediction.id] || 0);
    if (amount < MIN_BET) { toast.error(`Minimum bet is ${MIN_BET} pts`); return; }
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
      // Refresh market odds locally
      setPredictions(prev => prev.map(p => {
        if (p.id !== prediction.id) return p;
        const newOptions = p.options.map(o =>
          o.id === optId ? { ...o, totalStaked: (o.totalStaked || 0) + amount } : o
        );
        return { ...p, options: newOptions, totalStaked: (p.totalStaked || 0) + amount, betCount: (p.betCount || 0) + 1 };
      }));
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

  // ── TRIVIA ───────────────────────────────────────────────────────────────────
  const startTrivia = async () => {
    const ok = await deductPoints(100);
    if (!ok) return;
    setLoadingTrivia(true);
    toast.loading('AI is generating fresh eco questions...', { id: 'trivia' });
    try {
      const questions = await generateArenaTrivia();
      setTriviaQuestions(questions);
    } catch {
      setTriviaQuestions(MOCK_TRIVIA);
    } finally {
      toast.dismiss('trivia');
      setLoadingTrivia(false);
      setTriviaActive(true);
      setCurrentQIndex(0);
      setTriviaScore(0);
      setTriviaFinished(false);
      setSelectedAnswer(null);
      setShowFact(false);
    }
  };

  const handleTriviaAnswer = (selectedIndex) => {
    if (selectedAnswer !== null) return; // already answered
    setSelectedAnswer(selectedIndex);
    const q = triviaQuestions[currentQIndex];
    const isCorrect = selectedIndex === q.correctIndex;
    if (isCorrect) setTriviaScore(prev => prev + 1);
    setShowFact(true);

    setTimeout(() => {
      setSelectedAnswer(null);
      setShowFact(false);
      if (currentQIndex + 1 < triviaQuestions.length) {
        setCurrentQIndex(prev => prev + 1);
      } else {
        finishTrivia(triviaScore + (isCorrect ? 1 : 0));
      }
    }, isCorrect ? 1800 : 2200);
  };

  const finishTrivia = async (finalScore) => {
    setTriviaFinished(true);
    const reward = finalScore * 50;
    if (reward > 0) {
      await addPoints(reward);
      toast.success(`Tournament Done! +${reward} pts 🏆`);
    } else {
      toast('Better luck next time!', { icon: '🌱' });
    }
    setTimeout(() => setTriviaActive(false), 3500);
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

          {/* ═══════════════ ORACLE ═══════════════ */}
          {activeTab === 'oracle' && (
            loadingOracle ? (
              <div className={styles.loadingPanel}>
                <div className={styles.loadingOrb} />
                <h3>Consulting the Oracle...</h3>
                <p>Fetching live eco prediction markets.</p>
              </div>
            ) : (
              <div>
                {/* Oracle Header */}
                <div className={styles.oracleHeader}>
                  <div className={styles.oracleHeaderLeft}>
                    <span className={styles.oracleLiveBadge}>
                      <span className={styles.oracleLiveDot} />
                      LIVE MARKETS
                    </span>
                    <span className={styles.oracleSubtitle}>
                      AI-powered eco prediction markets · Settle automatically
                    </span>
                  </div>
                  <button className={styles.oracleRefreshBtn} onClick={loadPredictions}>
                    <RefreshCw size={14} />
                    Refresh
                  </button>
                </div>

                {oracleError && (
                  <div className={styles.oracleAlert}>
                    <AlertCircle size={14} />
                    {oracleError}
                  </div>
                )}

                <div className={styles.marketsGrid}>
                  {predictions.map(pred => {
                    const liveOptions = recalculateMultipliers(pred.options || []);
                    const probs = getOptionProbabilities(pred.options || []);
                    const msLeft = new Date(pred.endTime) - new Date();
                    const daysLeft = Math.max(0, Math.floor(msLeft / 86400000));
                    const hoursLeft = Math.max(0, Math.floor((msLeft % 86400000) / 3600000));
                    const closingSoon = msLeft < 86400000 * 2;
                    const selOpt = selectedOption[pred.id];

                    return (
                      <motion.div
                        key={pred.id}
                        className={styles.marketCard}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        {/* Card glow */}
                        <div className={styles.marketCardGlow} />

                        {/* Top row: category + timer */}
                        <div className={styles.marketCardTop}>
                          <span className={styles.marketCategory}>
                            {pred.emoji || '🔮'} {pred.category}
                          </span>
                          <span className={`${styles.marketTimer} ${closingSoon ? styles.marketTimerUrgent : ''}`}>
                            <Clock size={12} />
                            {daysLeft > 0 ? `${daysLeft}d ${hoursLeft}h` : `${hoursLeft}h`} left
                          </span>
                        </div>

                        {/* Title */}
                        <h3 className={styles.marketTitle}>{pred.title}</h3>
                        <p className={styles.marketDesc}>{pred.description}</p>

                        {/* Probability bars */}
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
                          <Users size={12} />
                          {(pred.betCount || 0)} bets ·
                          <Coins size={12} style={{ marginLeft: 4 }} />
                          {(pred.totalStaked || 0).toLocaleString()} pts vol
                        </div>

                        {/* Option selector */}
                        <div className={styles.optionSelector}>
                          {liveOptions.map(opt => (
                            <button
                              key={opt.id}
                              className={`${styles.optionBtn} ${selOpt === opt.id ? styles.optionBtnSelected : ''} ${opt.id === 'yes' ? styles.optionBtnYes : styles.optionBtnNo}`}
                              onClick={() => setSelectedOption(p => ({ ...p, [pred.id]: opt.id }))}
                            >
                              <span className={styles.optionLabel}>{opt.label}</span>
                              <span className={styles.optionMult}>{opt.multiplier}x</span>
                            </button>
                          ))}
                        </div>

                        {/* Bet input + place */}
                        <div className={styles.betRow}>
                          <input
                            type="number"
                            placeholder={`Min ${MIN_BET} pts...`}
                            min={MIN_BET}
                            value={betAmounts[pred.id] || ''}
                            onChange={e => setBetAmounts(p => ({ ...p, [pred.id]: e.target.value }))}
                            className={styles.stakeInput}
                          />
                          <button
                            className={styles.betPlaceBtn}
                            onClick={() => handlePlaceBet(pred)}
                            disabled={!selOpt || !betAmounts[pred.id]}
                          >
                            Stake
                            {selOpt && betAmounts[pred.id] >= MIN_BET && (
                              <span className={styles.betPotential}>
                                → {Math.round(parseInt(betAmounts[pred.id] || 0) * (liveOptions.find(o => o.id === selOpt)?.multiplier || 1)).toLocaleString()} pts
                              </span>
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )
          )}


          {/* ═══════════════ TRIVIA ═══════════════ */}
          {activeTab === 'trivia' && (
            <div className={styles.triviaLobby}>
              <div className={styles.triviaLobbyGlow} />
              <div className={styles.triviaLobbyIcon}>
                <PremiumIcon icon={Brain} color="sapphire" size={72} />
              </div>
              <h2 className={styles.triviaLobbyTitle}>Eco Brain Brawl</h2>
              <p className={styles.triviaLobbyDesc}>
                Test your environmental knowledge with AI-generated questions about sustainability, climate change, and eco news — fresh questions every round!
              </p>
              <div className={styles.triviaRules}>
                <div className={styles.triviaRule}>
                  <Coins size={20} style={{ color: '#f59e0b' }} />
                  <span>100 pts entry fee</span>
                </div>
                <div className={styles.triviaRule}>
                  <Star size={20} style={{ color: '#8b5cf6' }} />
                  <span>50 pts per correct answer</span>
                </div>
                <div className={styles.triviaRule}>
                  <Leaf size={20} style={{ color: '#10b981' }} />
                  <span>Eco facts after each answer</span>
                </div>
              </div>
              <button
                className={styles.primaryBtn}
                onClick={startTrivia}
                disabled={loadingTrivia}
              >
                {loadingTrivia ? (
                  <><span className={styles.btnSpinner} /> Generating questions...</>
                ) : (
                  <>Start Tournament <ChevronRight size={20} /></>
                )}
              </button>
            </div>
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
                          <span>{bet.amount} pts · {bet.multiplier}x · Potential: {bet.potentialWin} pts</span>
                          <span style={{ color: 'var(--color-text-tertiary)', fontSize: '0.8rem' }}>{new Date(bet.date).toLocaleString()}</span>
                        </div>
                        {bet.resultReason && <p className={styles.betReason}>{bet.resultReason}</p>}
                      </div>
                      <div className={styles.betCardRight}>
                        {bet.status === 'pending' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                            <span className={styles.pendingBadge}>PENDING</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', fontStyle: 'italic' }}>
                              Auto-settles upon expiry
                            </span>
                          </div>
                        ) : (
                          <span className={bet.status === 'won' ? styles.wonBadge : styles.lostBadge}>
                            {bet.status === 'won' ? 'WON' : 'LOST'}
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

      {/* ═══════════ TRIVIA MODAL ═══════════ */}
      <AnimatePresence>
        {triviaActive && (
          <motion.div
            className={styles.triviaOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={styles.triviaModal}
              initial={{ scale: 0.9, y: 40 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: 'spring', bounce: 0.3 }}
            >
              {triviaFinished ? (
                <div className={styles.triviaFinished}>
                  <PremiumIcon icon={Trophy} color="gold" size={72} />
                  <h2>Tournament Complete!</h2>
                  <p className={styles.triviaScore}>{triviaScore} / {triviaQuestions.length} correct</p>
                  <p style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.3rem' }}>
                    +{triviaScore * 50} pts earned!
                  </p>
                </div>
              ) : triviaQuestions.length > 0 ? (
                <>
                  <div className={styles.triviaProgress}>
                    <div className={styles.triviaProgressBar} style={{ width: `${((currentQIndex) / triviaQuestions.length) * 100}%` }} />
                  </div>
                  <div className={styles.triviaHeader}>
                    <span className={styles.triviaQCount}>Question {currentQIndex + 1} of {triviaQuestions.length}</span>
                    <span className={styles.triviaScoreDisp}><Trophy size={14} /> {triviaScore} pts</span>
                    {triviaQuestions[currentQIndex]?.topic && (
                      <span className={styles.triviaTopic}><Leaf size={12} /> {triviaQuestions[currentQIndex].topic}</span>
                    )}
                  </div>

                  <h2 className={styles.triviaQuestion}>
                    {triviaQuestions[currentQIndex].question}
                  </h2>

                  <div className={styles.triviaOptions}>
                    {triviaQuestions[currentQIndex].options.map((opt, idx) => {
                      const isCorrect = idx === triviaQuestions[currentQIndex].correctIndex;
                      const isSelected = selectedAnswer === idx;
                      let btnClass = styles.triviaOptionBtn;
                      if (selectedAnswer !== null) {
                        if (isCorrect) btnClass = `${styles.triviaOptionBtn} ${styles.optionCorrect}`;
                        else if (isSelected) btnClass = `${styles.triviaOptionBtn} ${styles.optionWrong}`;
                      }
                      return (
                        <button
                          key={idx}
                          className={btnClass}
                          onClick={() => handleTriviaAnswer(idx)}
                          disabled={selectedAnswer !== null}
                        >
                          <span className={styles.optionLetter}>{String.fromCharCode(65 + idx)}</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {showFact && triviaQuestions[currentQIndex]?.fact && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={styles.ecoFact}
                    >
                      <Leaf size={16} style={{ color: '#10b981', flexShrink: 0 }} />
                      <span>{triviaQuestions[currentQIndex].fact}</span>
                    </motion.div>
                  )}
                </>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
