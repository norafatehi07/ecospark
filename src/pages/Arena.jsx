import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { updateUserProfile } from '../services/firestoreService';
import { generateArenaPredictions, generateArenaTrivia, resolvePredictionAI } from '../services/aiService';
import { increment } from 'firebase/firestore';
import toast from 'react-hot-toast';
import styles from './Arena.module.css';
import { Flame, Brain, Target, Zap, Clock, Coins, CheckCircle2, History, Sprout } from 'lucide-react';
import PremiumIcon from '../components/common/PremiumIcon';
import { MOCK_PREDICTIONS, MOCK_TRIVIA } from '../constants/arenaData'; // Fallbacks
import { useSettingsStore } from '../store/settingsStore';

const ALL_TABS = [
  { id: 'oracle', label: 'The Oracle', icon: Target },
  { id: 'trivia', label: 'Trivia Tournaments', icon: Brain },
  { id: 'spin', label: 'Spin to Win', icon: Zap },
  { id: 'staking', label: 'Staking Pool', icon: Sprout },
  { id: 'history', label: 'My Bets & History', icon: History }
];

export default function Arena() {
  const { profile } = useAuthStore();
  const settings = useSettingsStore(s => s.settings) || {};
  
  const TABS = ALL_TABS.filter(t => {
    if (t.id === 'oracle') return settings.arenaOracleEnabled ?? true;
    if (t.id === 'trivia') return settings.arenaTriviaEnabled ?? true;
    if (t.id === 'spin') return settings.arenaSpinEnabled ?? true;
    if (t.id === 'staking') return settings.arenaStakingEnabled ?? true;
    return true; // history is always visible
  });

  const [activeTab, setActiveTab] = useState(TABS.length > 0 ? TABS[0].id : 'history');
  
  // Oracle State
  const [betAmounts, setBetAmounts] = useState({});
  const [predictions, setPredictions] = useState([]);
  const [loadingOracle, setLoadingOracle] = useState(true);

  // Trivia State
  const [triviaActive, setTriviaActive] = useState(false);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [triviaScore, setTriviaScore] = useState(0);
  const [triviaFinished, setTriviaFinished] = useState(false);
  const [triviaQuestions, setTriviaQuestions] = useState([]);
  const [loadingTrivia, setLoadingTrivia] = useState(false);

  // Spin State
  const [isSpinning, setIsSpinning] = useState(false);
  const [spinDeg, setSpinDeg] = useState(0);
  const wheelRef = useRef(null);

  // Staking & Resolution State
  const [stakeAmount, setStakeAmount] = useState('');
  const [resolvingBetId, setResolvingBetId] = useState(null);

  useEffect(() => {
    if (activeTab === 'oracle' && predictions.length === 0) {
      loadPredictions();
    }
  }, [activeTab]);

  const loadPredictions = async () => {
    setLoadingOracle(true);
    try {
      const data = await generateArenaPredictions();
      // Add fake end times to make it look realistic
      const withTimes = data.map(d => ({
        ...d,
        endTime: new Date(Date.now() + 86400000 * (Math.floor(Math.random() * 5) + 1)).toISOString(),
      }));
      setPredictions(withTimes);
    } catch (e) {
      console.warn("Using fallback predictions");
      setPredictions(MOCK_PREDICTIONS);
    } finally {
      setLoadingOracle(false);
    }
  };

  const deductPoints = async (amount) => {
    if (!profile || (profile.spendableBalance || 0) < amount) {
      toast.error('Not enough points!');
      return false;
    }
    await updateUserProfile(profile.id, {
      spendableBalance: increment(-amount)
    });
    return true;
  };

  const addPoints = async (amount) => {
    if (!profile) return;
    await updateUserProfile(profile.id, {
      points: increment(amount),
      lifetimePoints: increment(amount),
      weeklyPoints: increment(amount),
      spendableBalance: increment(amount)
    });
  };

  // --- ORACLE LOGIC ---
  const handlePlaceBet = async (prediction, optId, multiplier) => {
    const amount = parseInt(betAmounts[prediction.id] || 0);
    if (amount <= 0) {
      toast.error('Enter a valid amount to stake.');
      return;
    }
    const success = await deductPoints(amount);
    if (!success) return;
    
    // Simulate betting delay
    toast.loading('Placing stake...', { id: 'bet' });
    
    const newBet = {
      id: Date.now().toString(),
      predictionId: prediction.id,
      title: prediction.title,
      option: prediction.options.find(o => o.id === optId)?.label || optId,
      amount: amount,
      multiplier: multiplier,
      potentialWin: Math.round(amount * multiplier),
      status: 'pending',
      date: new Date().toISOString()
    };

    setTimeout(async () => {
      // Save to profile
      const currentBets = profile.arenaBets || [];
      await updateUserProfile(profile.id, {
        arenaBets: [newBet, ...currentBets]
      });

      toast.success(`Staked ${amount} pts! Potential win: ${newBet.potentialWin} pts`, { id: 'bet' });
      setBetAmounts(prev => ({ ...prev, [prediction.id]: '' }));
    }, 1000);
  };

  const handleResolveBet = async (bet) => {
    if (resolvingBetId) return;
    setResolvingBetId(bet.id);
    toast.loading('Oracle is analyzing the outcome...', { id: 'resolve' });

    try {
      const result = await resolvePredictionAI(bet.title);
      const won = result.winnerOption?.toLowerCase() === bet.option.toLowerCase();
      
      const updatedBets = profile.arenaBets.map(b => {
        if (b.id === bet.id) {
          return { ...b, status: won ? 'won' : 'lost', resultReason: result.reason };
        }
        return b;
      });

      if (won) {
        await addPoints(bet.potentialWin);
        toast.success(`You WON! ${result.reason} (+${bet.potentialWin} pts)`, { id: 'resolve', duration: 5000 });
      } else {
        toast.error(`You LOST! ${result.reason}`, { id: 'resolve', duration: 5000 });
      }
      await updateUserProfile(profile.id, { arenaBets: updatedBets });
    } catch (e) {
      toast.error('Oracle could not resolve the market right now.', { id: 'resolve' });
    } finally {
      setResolvingBetId(null);
    }
  };

  // --- STAKING POOL LOGIC ---
  const handlePlaceStake = async () => {
    const amount = parseInt(stakeAmount);
    if (!amount || amount < 100) {
      toast.error('Minimum stake is 100 points.');
      return;
    }
    const success = await deductPoints(amount);
    if (!success) return;

    toast.loading('Locking funds...', { id: 'stake' });
    
    // 5 days from now
    const unlockDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const newStake = {
      id: Date.now().toString(),
      amount: amount,
      potentialReturn: Math.round(amount * 1.5), // 50% yield
      unlockDate: unlockDate,
      status: 'locked',
      date: new Date().toISOString()
    };

    setTimeout(async () => {
      const currentStakes = profile.arenaStakes || [];
      await updateUserProfile(profile.id, { arenaStakes: [newStake, ...currentStakes] });
      toast.success(`Staked ${amount} pts! Yielding 50% in 5 days.`, { id: 'stake' });
      setStakeAmount('');
    }, 800);
  };

  const handleClaimStake = async (stake) => {
    const now = new Date();
    const unlock = new Date(stake.unlockDate);
    
    // allow claiming if time passed OR if debug fast-forward
    if (unlock > now && !import.meta.env.DEV) {
      toast.error('Stake is still locked!');
      return;
    }
    
    toast.loading('Claiming yield...', { id: 'claim' });
    const updatedStakes = profile.arenaStakes.map(s => {
      if (s.id === stake.id) return { ...s, status: 'claimed' };
      return s;
    });

    await addPoints(stake.potentialReturn);
    await updateUserProfile(profile.id, { arenaStakes: updatedStakes });
    toast.success(`Claimed ${stake.potentialReturn} pts!`, { id: 'claim' });
  };

  // --- TRIVIA LOGIC ---
  const startTrivia = async () => {
    const entryFee = 100;
    const success = await deductPoints(entryFee);
    if (!success) return;
    
    setLoadingTrivia(true);
    toast.loading('AI is generating fresh tournament questions...', { id: 'trivia' });
    
    try {
      const questions = await generateArenaTrivia();
      setTriviaQuestions(questions);
    } catch(e) {
      console.warn("Using fallback trivia");
      setTriviaQuestions(MOCK_TRIVIA);
    } finally {
      toast.dismiss('trivia');
      setLoadingTrivia(false);
      setTriviaActive(true);
      setCurrentQIndex(0);
      setTriviaScore(0);
      setTriviaFinished(false);
    }
  };

  const handleTriviaAnswer = (selectedIndex) => {
    const q = triviaQuestions[currentQIndex];
    if (selectedIndex === q.correctIndex) {
      setTriviaScore(prev => prev + 1);
      toast.success('+1 Correct!', { duration: 1000 });
    } else {
      toast.error('Incorrect!', { duration: 1000 });
    }

    if (currentQIndex + 1 < triviaQuestions.length) {
      setCurrentQIndex(prev => prev + 1);
    } else {
      finishTrivia(triviaScore + (selectedIndex === q.correctIndex ? 1 : 0));
    }
  };

  const finishTrivia = async (finalScore) => {
    setTriviaFinished(true);
    const reward = finalScore * 50; // 50 pts per correct answer
    if (reward > 0) {
      await addPoints(reward);
      toast.success(`Tournament Finished! You earned ${reward} points!`, { icon: '🏆' });
    } else {
      toast('Better luck next time!', { icon: '😢' });
    }
    setTimeout(() => {
      setTriviaActive(false);
    }, 3000);
  };

  // --- SPIN LOGIC ---
  const handleSpin = async () => {
    if (isSpinning) return;
    const entryFee = 250;
    const success = await deductPoints(entryFee);
    if (!success) return;

    setIsSpinning(true);
    
    const randomSegment = Math.floor(Math.random() * 8);
    const rewards = [500, 0, 1000, 50, 0, 200, 100, 0]; 
    const won = rewards[randomSegment];

    // Absolute angle logic to prevent offset issues on multiple spins
    // current absolute rotations:
    const currentRotations = Math.floor(spinDeg / 360);
    const extraSpins = 8 * 360; 
    const segmentCenter = (randomSegment * 45) + 22.5;
    // The flapper is at the top (-90 degrees, which is equivalent to 270 degrees in CSS rotation from the right)
    const newTargetDeg = (currentRotations * 360) + extraSpins + (270 - segmentCenter);
    
    setSpinDeg(newTargetDeg);

    setTimeout(async () => {
      setIsSpinning(false);
      if (won > 0) {
        await addPoints(won);
        toast.success(`You won ${won} points! 🎉`, { style: { background: '#10b981', color: '#fff' } });
      } else {
        toast.error(`Ouch! Better luck next time.`, { style: { background: '#ef4444', color: '#fff' } });
      }
    }, 4500); 
  };

  const wheelSegments = [
    { value: 500, label: '500' },
    { value: 0, label: 'MISS' },
    { value: 1000, label: '1000' },
    { value: 50, label: '50' },
    { value: 0, label: 'MISS' },
    { value: 200, label: '200' },
    { value: 100, label: '100' },
    { value: 0, label: 'MISS' }
  ];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}><PremiumIcon icon={Flame} color="ruby" size={56} /> The Arena</h1>
        <p className={styles.subtitle}>High stakes, massive rewards. Compete in tournaments and predictions.</p>
        {profile && (
          <div style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', padding: '10px 20px', borderRadius: '100px', border: '1px solid var(--color-border)', backdropFilter: 'blur(10px)' }}>
            <PremiumIcon icon={Coins} color="gold" size={20} />
            <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--color-text)' }}>{profile.spendableBalance?.toLocaleString() || 0} pts</span>
          </div>
        )}
      </div>

      <div className={styles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.active : ''}`}
          >
            <tab.icon size={20} style={{ marginRight: '10px', display: 'inline-block', verticalAlign: 'text-bottom' }} />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ duration: 0.4, type: 'spring', bounce: 0.4 }}
        >
          {/* ORACLE TAB */}
          {activeTab === 'oracle' && (
            loadingOracle ? (
              <div style={{ padding: '60px', textAlign: 'center', color: 'var(--color-text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <PremiumIcon icon={Target} color="sapphire" size={64} style={{ animation: 'spin 2s linear infinite', marginBottom: '20px' }} />
                <h3 style={{ fontSize: '1.5rem', margin: 0, color: 'var(--color-text)' }}>Consulting the AI Oracle...</h3>
                <p>Generating the latest 2026 predictions for you.</p>
              </div>
            ) : (
              <div className={styles.grid}>
                {predictions.map(pred => (
                  <div key={pred.id} className={styles.card}>
                    <div className={styles.cardCategory}>{pred.category}</div>
                    <h3 className={styles.cardTitle}>{pred.title}</h3>
                    <p className={styles.cardDesc}>{pred.description}</p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-primary)', fontSize: '0.9rem', marginBottom: '24px', fontWeight: 'bold' }}>
                      <Clock size={16} /> Ends in {Math.round((new Date(pred.endTime) - new Date()) / (1000 * 60 * 60 * 24))} days
                    </div>

                    <div className={styles.optionsGrid}>
                      {pred.options.map(opt => (
                        <div key={opt.id} className={styles.optionBtn} onClick={() => handlePlaceBet(pred, opt.id, opt.multiplier)}>
                          <span style={{ color: opt.color, fontSize: '1.2rem' }}>{opt.label}</span>
                          <span style={{ fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>{opt.multiplier}x Payout</span>
                        </div>
                      ))}
                    </div>
                    
                    <div style={{ marginTop: '20px' }}>
                      <input 
                        type="number"
                        placeholder="Amount to stake..."
                        value={betAmounts[pred.id] || ''}
                        onChange={(e) => setBetAmounts(prev => ({ ...prev, [pred.id]: e.target.value }))}
                        style={{ width: '100%', padding: '16px', background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '1.1rem', outline: 'none' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {/* TRIVIA TAB */}
          {activeTab === 'trivia' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px', background: 'linear-gradient(145deg, rgba(30,30,40,0.8), rgba(15,15,20,0.9))', padding: '80px 20px', borderRadius: '32px', border: '1px solid rgba(139,92,246,0.2)', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.4)' }}>
              <PremiumIcon icon={Brain} color="sapphire" size={80} />
              <h2 style={{ fontSize: '3rem', color: '#fff', margin: 0, fontFamily: 'var(--font-display)', filter: 'drop-shadow(0 0 10px rgba(59,130,246,0.5))' }}>Brain Brawl Tournaments</h2>
              <p style={{ color: 'var(--color-text-secondary)', maxWidth: '600px', fontSize: '1.2rem', lineHeight: '1.6' }}>Test your knowledge against the clock with fresh AI-generated questions. Entry fee is 100 points. Earn 50 points for every correct answer!</p>
              
              <button className={`${styles.btn} ${styles.btnPrimary}`} style={{ maxWidth: '350px', marginTop: '30px', padding: '20px', fontSize: '1.2rem' }} onClick={startTrivia} disabled={loadingTrivia}>
                {loadingTrivia ? 'Generating Live Questions...' : 'Start Tournament (100 pts)'}
              </button>
            </div>
          )}

          {/* SPIN TAB */}
          {activeTab === 'spin' && (
            <div className={styles.wheelContainer}>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '3rem', color: '#fff', margin: '0 0 10px 0', fontFamily: 'var(--font-display)', filter: 'drop-shadow(0 0 15px rgba(245, 158, 11, 0.5))' }}>Wheel of Fortune</h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.2rem' }}>Spin the metallic 3D wheel for 250 points to win up to 1,000 points instantly!</p>
              </div>

              <div className={styles.wheelOuterFrame}>
                <div className={styles.wheelPointerContainer}>
                  <div className={`${styles.wheelPointer} ${isSpinning ? styles.flapperSpinning : ''}`}></div>
                </div>
                <div className={styles.wheelWrapper}>
                  <div 
                    className={styles.wheel} 
                    ref={wheelRef}
                    style={{ transform: `rotate(${spinDeg}deg)`, transitionDuration: isSpinning ? '4.5s' : '0s' }}
                  >
                    <div className={styles.wheelOverlayLines}></div>
                    <div className={styles.wheelValues}>
                      {wheelSegments.map((seg, idx) => (
                        <div key={idx} className={styles.wheelValue} style={{ transform: `rotate(${idx * 45 + 22.5}deg) translateY(-50%)` }}>
                          {seg.label}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className={styles.wheelCenter}>
                    <div className={styles.wheelCenterInner}></div>
                  </div>
                </div>
              </div>

              <button 
                className={`${styles.btn} ${styles.btnPrimary}`} 
                style={{ maxWidth: '250px', padding: '20px', fontSize: '1.3rem', marginTop: '20px' }} 
                onClick={handleSpin}
                disabled={isSpinning}
              >
                {isSpinning ? 'Spinning...' : 'Spin (250 pts)'}
              </button>
            </div>
          )}

          {/* STAKING POOL TAB */}
          {activeTab === 'staking' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ background: 'linear-gradient(135deg, rgba(16,185,129,0.1), rgba(6,182,212,0.1))', padding: '40px', borderRadius: '32px', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <PremiumIcon icon={Sprout} color="emerald" size={64} style={{ marginBottom: '20px' }} />
                <h2 style={{ fontSize: '2.5rem', color: '#fff', margin: '0 0 10px 0', fontFamily: 'var(--font-display)' }}>Yield Farming Pool</h2>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: '1.2rem', maxWidth: '600px' }}>
                  Lock your points in the EcoSpark treasury for exactly <strong>5 Days</strong> to earn a guaranteed <strong>50% Return</strong> on your stake!
                </p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '30px', width: '100%', maxWidth: '400px' }}>
                  <input 
                    type="number" 
                    placeholder="Amount to stake..." 
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    style={{ flex: 1, padding: '16px', background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', fontSize: '1.1rem', outline: 'none' }}
                  />
                  <button onClick={handlePlaceStake} className={`${styles.btn} ${styles.btnPrimary}`} style={{ width: 'auto', padding: '16px 30px' }}>
                    Stake
                  </button>
                </div>
              </div>

              {profile?.arenaStakes?.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h3 style={{ color: '#fff', margin: '0 0 20px 0', fontSize: '1.5rem' }}>My Active Stakes</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {profile.arenaStakes.map(stake => (
                      <div key={stake.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '20px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '1rem', color: 'var(--color-text)' }}>
                            <span><strong>Staked:</strong> {stake.amount} pts</span>
                            <span><strong>Yielding:</strong> <span style={{ color: '#10b981', fontWeight: 'bold' }}>{stake.potentialReturn} pts</span></span>
                          </div>
                          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
                            Unlocks on: {new Date(stake.unlockDate).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          {stake.status === 'claimed' ? (
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}><CheckCircle2 size={20} style={{ verticalAlign: 'middle', marginRight: '5px' }}/> Claimed</span>
                          ) : (
                            <button 
                              onClick={() => handleClaimStake(stake)}
                              disabled={new Date(stake.unlockDate) > new Date() && !import.meta.env.DEV}
                              style={{ padding: '10px 20px', borderRadius: '100px', border: 'none', background: new Date(stake.unlockDate) <= new Date() || import.meta.env.DEV ? '#10b981' : 'rgba(255,255,255,0.1)', color: '#fff', fontWeight: 'bold', cursor: new Date(stake.unlockDate) <= new Date() || import.meta.env.DEV ? 'pointer' : 'not-allowed' }}
                            >
                              {new Date(stake.unlockDate) <= new Date() || import.meta.env.DEV ? 'Claim Yield' : 'Locked'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HISTORY TAB */}
          {activeTab === 'history' && (
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '40px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)', minHeight: '400px' }}>
              <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                <h2 style={{ fontSize: '2.5rem', color: '#fff', margin: '0 0 10px 0', fontFamily: 'var(--font-display)' }}>My Prediction History</h2>
                <p style={{ color: 'var(--color-text-secondary)' }}>Track your active stakes and past prediction results.</p>
              </div>

              {!profile?.arenaBets || profile.arenaBets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--color-text-tertiary)' }}>
                  <History size={64} style={{ margin: '0 auto 20px auto', opacity: 0.5 }} />
                  <p style={{ fontSize: '1.2rem' }}>You haven't placed any prediction stakes yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {profile.arenaBets.map(bet => (
                    <div key={bet.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '20px 30px', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                      <div>
                        <h4 style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '1.1rem' }}>{bet.title}</h4>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                          <span><strong>Staked on:</strong> <span style={{ color: 'var(--color-primary)' }}>{bet.option}</span></span>
                          <span><strong>Stake:</strong> {bet.amount} pts</span>
                          <span><strong>Potential Win:</strong> <span style={{ color: '#10b981' }}>{bet.potentialWin} pts</span> ({bet.multiplier}x)</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-tertiary)', marginTop: '8px' }}>
                          Placed on: {new Date(bet.date).toLocaleString()}
                        </div>
                      </div>
                      <div>
                        {bet.status === 'pending' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end' }}>
                            <span style={{ padding: '8px 16px', background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.9rem', border: '1px solid rgba(245, 158, 11, 0.2)' }}>
                              PENDING
                            </span>
                            <button 
                              onClick={() => handleResolveBet(bet)}
                              disabled={resolvingBetId === bet.id}
                              style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: '100px', cursor: 'pointer', fontSize: '0.85rem' }}
                            >
                              {resolvingBetId === bet.id ? 'Oracle Analyzing...' : 'Consult Oracle'}
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px' }}>
                            <span style={{ padding: '8px 16px', background: bet.status === 'won' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', color: bet.status === 'won' ? '#10b981' : '#ef4444', borderRadius: '100px', fontWeight: 'bold', fontSize: '0.9rem', border: `1px solid ${bet.status === 'won' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                              {bet.status === 'won' ? 'WON' : 'LOST'}
                            </span>
                            {bet.resultReason && (
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)', maxWidth: '200px', textAlign: 'right' }}>
                                {bet.resultReason}
                              </span>
                            )}
                          </div>
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

      {/* TRIVIA MODAL OVERLAY */}
      {triviaActive && !triviaFinished && triviaQuestions.length > 0 && (
        <div className={styles.triviaModal}>
          <div className={styles.triviaBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', color: 'var(--color-text-secondary)' }}>
              <span>Question {currentQIndex + 1} of {triviaQuestions.length}</span>
              <span>Score: {triviaScore}</span>
            </div>
            
            <h2 className={styles.triviaQuestion}>{triviaQuestions[currentQIndex].question}</h2>
            
            <div className={styles.triviaOptions}>
              {triviaQuestions[currentQIndex].options.map((opt, idx) => (
                <button 
                  key={idx} 
                  className={styles.triviaOptionBtn}
                  onClick={() => handleTriviaAnswer(idx)}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {triviaFinished && (
        <div className={styles.triviaModal}>
          <div className={styles.triviaBox}>
            <PremiumIcon icon={CheckCircle2} color="emerald" size={64} style={{ margin: '0 auto 20px auto' }} />
            <h2 className={styles.triviaQuestion}>Tournament Complete!</h2>
            <p style={{ fontSize: '1.2rem', color: 'var(--color-text-secondary)' }}>You scored {triviaScore} out of {triviaQuestions.length}</p>
          </div>
        </div>
      )}
    </div>
  );
}
