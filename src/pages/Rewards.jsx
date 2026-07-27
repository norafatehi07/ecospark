// src/pages/Rewards.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { redeemReward, equipReward, unequipReward, subscribeUserTransactions } from '../services/firestoreService';
import { BronzeFrame, SilverFrame, GoldFrame, PlatinumFrame, GodFrame, GaiaFrame, SupernovaFrame, PrimeFrame } from '../components/common/Frames';
import { REWARDS_DB, TIER_CONFIG } from '../constants/rewards';
import toast from 'react-hot-toast';
import { useSettingsStore } from '../store/settingsStore';
import styles from './Rewards.module.css';

const FRAME_COMPONENTS = {
  'frame-bronze': BronzeFrame,
  'frame-silver': SilverFrame,
  'frame-gold': GoldFrame,
  'frame-platinum': PlatinumFrame,
  'frame-god': GodFrame,
  'frame-gaia': GaiaFrame,
  'frame-supernova': SupernovaFrame,
  'frame-prime': PrimeFrame,
};

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

function RewardCard({ reward, userPoints, owned, onRedeem, onEquip, onUnequip, isEquipped }) {
  const cfg = TIER_CONFIG[reward.tier] || TIER_CONFIG.bronze;
  const canAfford = userPoints >= reward.pointCost;
  const isFrame = reward.type === 'frame';
  const FrameComponent = isFrame ? FRAME_COMPONENTS[reward.id] : null;

  return (
    <motion.div
      className={`${styles.card} ${owned ? styles.owned : ''} ${!canAfford && !owned ? styles.locked : ''}`}
      whileHover={canAfford && !owned ? { y: -4, boxShadow: cfg.glow } : {}}
      transition={{ duration: 0.2 }}
      style={{ '--reward-color': cfg.color, border: isEquipped ? `2px solid ${cfg.color}` : undefined }}
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
            border: '2px solid rgba(255,255,255,0.8)'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'linear-gradient(135deg, rgba(255,255,255,0.6) 0%, transparent 50%)', borderRadius: '6px', pointerEvents: 'none' }} />
          </div>
        ) : reward.type === 'companion' ? (
          reward.imageUrl ? (
            <img src={reward.imageUrl} alt={reward.name} style={{ width: '60%', height: '60%', objectFit: 'contain', zIndex: 2, position: 'relative', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.2))' }} />
          ) : (
            <span style={{ fontSize: '3rem', zIndex: 2, position: 'relative' }}>{reward.icon}</span>
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
    </motion.div>
  );
}

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
      await equipReward(user.uid, type, rewardId);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} equipped!`);
    } catch (err) {
      toast.error('Failed to equip');
    }
  };

  const handleUnequip = async (type) => {
    if (!user) return;
    try {
      await unequipReward(user.uid, type);
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} unequipped!`);
    } catch (err) {
      toast.error('Failed to unequip');
    }
  };

  const handleRedeem = async (reward) => {
    if (!user || !profile) return;
    setUnlocking(reward.id);
    try {
      await redeemReward(user.uid, reward.id, reward.pointCost);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 2000);
      toast.success(`🎉 ${reward.name} unlocked!`);
    } catch (err) {
      toast.error(err.message || 'Could not redeem reward');
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

  const LOOT_CASES = [
    { id: 'bronze_case', name: 'Bronze Case', cost: 1000, icon: '📦', color: '#CD7F32' },
    { id: 'silver_case', name: 'Silver Case', cost: 2500, icon: '🧰', color: '#C0C0C0' },
    { id: 'gold_case', name: 'Gold Case', cost: 5000, icon: '💼', color: '#FFD700' }
  ];

  const [lootboxActive, setLootboxActive] = useState(false);
  const [spinningCase, setSpinningCase] = useState(null);
  const [wonReward, setWonReward] = useState(null);
  const [scrollerItems, setScrollerItems] = useState([]);
  
  const generateLoot = (cost) => {
    // Generate a weighted random reward based on case cost
    // Bronze: up to silver tier. Silver: up to platinum. Gold: up to god/gaia
    let pool = [];
    if (cost === 1000) pool = REWARDS_DB.filter(r => ['bronze', 'silver', 'gold'].includes(r.tier));
    if (cost === 2500) pool = REWARDS_DB.filter(r => ['silver', 'gold', 'platinum'].includes(r.tier));
    if (cost === 5000) pool = REWARDS_DB.filter(r => ['gold', 'platinum', 'god', 'gaia', 'supernova'].includes(r.tier));
    
    // Add weights (cheaper items have higher chance)
    const weightedPool = [];
    pool.forEach(r => {
      let weight = 10;
      if (r.tier === 'bronze' || r.tier === 'silver') weight = 50;
      if (r.tier === 'gold') weight = 20;
      if (r.tier === 'platinum') weight = 10;
      if (r.tier === 'god') weight = 3;
      if (r.tier === 'gaia' || r.tier === 'supernova') weight = 1;
      for (let i=0; i<weight; i++) weightedPool.push(r);
    });

    return weightedPool[Math.floor(Math.random() * weightedPool.length)];
  };

  const handleOpenLootbox = async (caseConfig) => {
    if (userPoints < caseConfig.cost) {
      toast.error('Not enough points!');
      return;
    }

    const wonItem = generateLoot(caseConfig.cost);
    
    // Generate 30 random items for the visual scroller
    const scroller = Array.from({length: 30}).map(() => REWARDS_DB[Math.floor(Math.random() * REWARDS_DB.length)]);
    // Set the 25th item to be the winning item
    scroller[25] = wonItem;
    
    setScrollerItems(scroller);
    setSpinningCase(caseConfig);
    setLootboxActive(true);
    setWonReward(null);

    // After animation (4 seconds), reveal
    setTimeout(async () => {
      setWonReward(wonItem);
      try {
        await redeemReward(user.uid, wonItem.id, caseConfig.cost);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2000);
      } catch (err) {
        toast.error('Failed to claim reward: ' + err.message);
      }
    }, 4000);
  };

  return (
    <div className={styles.page}>
      {/* Confetti */}
      <AnimatePresence>
        {showConfetti && Array.from({ length: 30 }).map((_, i) => (
          <ConfettiParticle key={i} delay={i * 0.04} />
        ))}
      </AnimatePresence>

      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Rewards</h1>
          <p className={styles.subtitle}>You have <strong>{userPoints.toLocaleString()} pts</strong> to spend</p>
        </div>
        <span className={styles.headerIcon}>🎁</span>
      </div>

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
            {LOOT_CASES.map(c => (
              <div key={c.id} className={styles.caseCard} style={{ '--case-color': c.color }}>
                <div className={styles.caseIcon}>{c.icon}</div>
                <h3 className={styles.caseTitle}>{c.name}</h3>
                <div className={styles.caseCost}>{c.cost.toLocaleString()} pts</div>
                <button 
                  className={styles.caseBtn} 
                  disabled={userPoints < c.cost}
                  onClick={() => handleOpenLootbox(c)}
                >
                  {userPoints >= c.cost ? 'Unlock Case' : `Need ${(c.cost - userPoints).toLocaleString()} more`}
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.cardSkeleton}`} />
          ))}
        </div>
      ) : error ? (
        <div style={{ padding: '48px 24px', gap: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }}>⚠️</span>
          <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Failed to load rewards</p>
          <code style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 8, maxWidth: '100%', wordBreak: 'break-all', display: 'block' }}>
            {error}
          </code>
          <button
            onClick={loadRewards}
            style={{ background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-full)', padding: '10px 24px', fontWeight: 600, cursor: 'pointer', fontSize: 'var(--text-sm)' }}
          >
            Retry
          </button>
        </div>
      ) : (
        <div className={styles.grid}>
          {filteredRewards.map((r) => (
            <RewardCard
              key={r.id}
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
        <div className={styles.scrollerOverlay}>
          <div style={{ marginBottom: '20px', textAlign: 'center' }}>
            <h2 style={{ fontFamily: 'var(--font-display)', margin: 0, fontSize: '2.5rem', textTransform: 'uppercase', letterSpacing: '2px', color: spinningCase?.color }}>
              Opening {spinningCase?.name}...
            </h2>
          </div>
          
          <div className={styles.scrollerWindow}>
            <div className={styles.scrollerLine}></div>
            <motion.div 
              className={styles.scrollerTrack}
              initial={{ x: '50%' }}
              animate={{ x: wonReward ? `calc(50% - ${25 * 210}px)` : '50%' }}
              transition={{ duration: 5, ease: [0.05, 0.9, 0.1, 1] }}
            >
              {scrollerItems.map((item, idx) => {
                const cfg = TIER_CONFIG[item.tier];
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
            {wonReward && (
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
                  <div style={{ fontSize: '120px', marginBottom: '20px', filter: `drop-shadow(0 0 50px ${TIER_CONFIG[wonReward.tier].color})`, position: 'relative', zIndex: 2 }}>
                    {wonReward.icon || '🏅'}
                  </div>
                  <h2 style={{ fontFamily: 'var(--font-display)', margin: '0 0 10px 0', fontSize: '3rem', position: 'relative', zIndex: 2 }}>{wonReward.name}</h2>
                  <p style={{ color: TIER_CONFIG[wonReward.tier].color, textTransform: 'uppercase', fontWeight: '900', letterSpacing: '4px', fontSize: '1.2rem', position: 'relative', zIndex: 2 }}>
                    {TIER_CONFIG[wonReward.tier].label} Tier
                  </p>
                  <button 
                    onClick={() => setLootboxActive(false)} 
                    style={{ marginTop: '40px', padding: '16px 40px', background: 'var(--color-primary)', color: 'white', border: 'none', borderRadius: '100px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', position: 'relative', zIndex: 2, boxShadow: '0 10px 20px rgba(139, 92, 246, 0.4)' }}
                  >
                    Claim Reward
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
