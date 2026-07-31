// src/pages/Leaderboard.jsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import Avatar from '../components/common/Avatar';
import { subscribeLeaderboard } from '../services/firestoreService';
import { useUser } from '../lib/useUser';
import { GoldMedal, SilverMedal, BronzeMedal } from '../components/common/Medals';
import PremiumIcon from '../components/common/PremiumIcon';
import { REWARDS_DB } from '../constants/rewards';
import { Flame, Zap, Trophy, AlertTriangle, Leaf, ShieldAlert, BadgeInfo } from 'lucide-react';
import styles from './Leaderboard.module.css';

const RANK_STYLE = {
  1: { bg: 'linear-gradient(135deg, #F59E0B, #FBBF24)', glow: 'var(--glow-gold)', icon: <GoldMedal size={32} /> },
  2: { bg: 'linear-gradient(135deg, #9CA3AF, #D1D5DB)', glow: '0 0 16px rgba(156,163,175,0.5)', icon: <SilverMedal size={28} /> },
  3: { bg: 'linear-gradient(135deg, #CD7F32, #B8864E)', glow: '0 0 16px rgba(205,127,50,0.5)', icon: <BronzeMedal size={28} /> },
};

function LeaderboardRow({ entry, myId, index, tab }) {
  const liveUser = useUser(entry.userId);
  const isMe = entry.userId === myId;
  const style = RANK_STYLE[entry.rank];
  
  const streak = liveUser ? liveUser.streak : entry.streak;
  const weeklyPoints = liveUser ? liveUser.weeklyPoints : entry.weeklyPoints;
  const photoURL = liveUser ? liveUser.photoURL : entry.photoURL;
  const displayName = liveUser ? liveUser.displayName : entry.displayName;
  const equippedGlow = liveUser?.equipped?.glow;
  const equippedCompanion = liveUser?.equipped?.companion;

  const glowReward = REWARDS_DB.find(r => r.id === equippedGlow);
  const companionReward = REWARDS_DB.find(r => r.id === equippedCompanion);

  const displayValue = tab === 'streak'
    ? <><PremiumIcon icon={Flame} color="ruby" size={16} className="mr-1" /> {streak || 0} Days</>
    : `${(weeklyPoints || 0).toLocaleString()} pts`;

  return (
    <Link to={`/user/${entry.userId}`} style={{ textDecoration: 'none' }}>
      <motion.div
        className={`${styles.row} ${isMe ? styles.myRow : ''} ${entry.rank <= 3 ? styles[`topRow${entry.rank}`] : ''}`}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.04 }}
        layout
        style={isMe && entry.rank > 3 ? { boxShadow: 'var(--glow-primary)' } : {}}
      >
        {/* Rank */}
        <div
          className={styles.rank}
          style={style && entry.rank > 3 ? { background: style.bg, boxShadow: style.glow } : {}}
        >
          {entry.rank <= 3 ? (
            RANK_STYLE[entry.rank].icon
          ) : (
            style ? style.icon : entry.rank
          )}
        </div>

        {/* Avatar */}
        <div className={styles.avatar} style={{ position: 'relative' }}>
          <Avatar 
            src={photoURL} 
            activeFrame={liveUser?.activeFrame || entry.activeFrame} 
            size={entry.rank === 1 ? 64 : entry.rank <= 3 ? 56 : 40} 
            alt={displayName} 
          />
          {companionReward && (
            <div className="companion-wrapper" style={{ fontSize: '1.2rem', position: 'absolute', bottom: -5, right: -5 }}>
              {companionReward.icon}
            </div>
          )}
        </div>

        {/* Name */}
        <div className={styles.nameBlock}>
          <p className={`${styles.name} ${glowReward ? glowReward.cssClass : ''}`}>
            {displayName || 'EcoUser'}
            {isMe && <span className={styles.youBadge}>You</span>}
          </p>
          <p className={styles.streak} style={{display:'flex', alignItems:'center', gap:'4px'}}><PremiumIcon icon={Flame} color="ruby" size={12} /> {streak || 0} day streak</p>
        </div>

        {/* Points / Streak value */}
        <div className={styles.pointsBlock}>
          <span className={`${styles.points} ${entry.rank <= 3 ? styles.topPoints : ''}`}>
            {displayValue}
          </span>
        </div>
      </motion.div>
    </Link>
  );
}

function PodiumSlot({ entry, index, tab }) {
  const liveUser = useUser(entry.userId);
  const streak = liveUser ? liveUser.streak : entry.streak;
  const weeklyPoints = liveUser ? liveUser.weeklyPoints : entry.weeklyPoints;
  const photoURL = liveUser ? liveUser.photoURL : entry.photoURL;
  const displayName = liveUser ? liveUser.displayName : entry.displayName;
  const equippedGlow = liveUser?.equipped?.glow;
  const equippedCompanion = liveUser?.equipped?.companion;

  const glowReward = REWARDS_DB.find(r => r.id === equippedGlow);
  const companionReward = REWARDS_DB.find(r => r.id === equippedCompanion);

  return (
    <Link to={`/user/${entry.userId}`} style={{ textDecoration: 'none' }}>
      <motion.div
        className={`${styles.podiumSlot} ${index === 1 ? styles.podiumFirst : ''}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
      >
        <div className={styles.podiumAvatar} style={{ position: 'relative' }}>
          <Avatar 
            src={photoURL} 
            activeFrame={liveUser?.activeFrame || entry.activeFrame} 
            size={index === 1 ? 72 : 56} 
            alt={displayName} 
          />
          {companionReward && (
            <div className="companion-wrapper" style={{ fontSize: index === 1 ? '2rem' : '1.5rem', position: 'absolute', bottom: 0, right: 0 }}>
              {companionReward.icon}
            </div>
          )}
        </div>
        
        <div className={styles.podiumInfo}>
          <div className={styles.podiumMedal}>
            {entry.rank === 1 ? <GoldMedal size={64} /> : 
             entry.rank === 2 ? <SilverMedal size={52} /> : 
             <BronzeMedal size={52} />}
          </div>
          <div className={`${styles.podiumName} ${glowReward ? glowReward.cssClass : ''}`}>
            {displayName || 'EcoUser'}
          </div>
          <div className={styles.podiumPts}>
            {tab === 'streak'
              ? <span style={{display:'flex', alignItems:'center', gap:'4px', justifyContent:'center'}}><PremiumIcon icon={Flame} color="ruby" size={14} /> {streak || 0} Days</span>
              : `${(weeklyPoints || 0).toLocaleString()} pts`}
          </div>
        </div>
        
        <div className={styles.podiumBar} style={{ height: index === 1 ? 140 : 100 }}></div>
      </motion.div>
    </Link>
  );
}

export default function Leaderboard() {
  const { user } = useAuthStore();
  const { settings } = useSettingsStore();
  const [tab, setTab] = useState('weekly');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = subscribeLeaderboard(tab, null, (data) => {
      setEntries(data);
      setLoading(false);
    }, (err) => {
      console.error('[Leaderboard] Failed to load:', err);
      setError(err?.message || 'Unknown error loading leaderboard');
      setLoading(false);
    });
    return unsub;
  }, [tab]);

  const bannedUsers = settings?.bannedUsers || [];
  const displayEntries = entries
    .filter(e => !bannedUsers.includes(e.userId))
    .map((e, idx) => ({ ...e, rank: idx + 1 }));

  const myRank = displayEntries.findIndex((e) => e.userId === user?.uid) + 1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Leaderboard</h1>
          {myRank > 0 && (
            <p className={styles.myRank}>Your rank: <strong>#{myRank}</strong></p>
          )}
        </div>
        <div className={styles.trophy}><PremiumIcon icon={Trophy} color="gold" size={48} /></div>
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        {[
          { key: 'weekly', label: <span style={{display:'flex', alignItems:'center', gap:'6px'}}><PremiumIcon icon={Zap} color="gold" size={16} /> Weekly Points</span> },
          { key: 'streak', label: <span style={{display:'flex', alignItems:'center', gap:'6px'}}><PremiumIcon icon={Flame} color="ruby" size={16} /> Highest Streak</span> },
        ].map((t) => (
          <button
            key={t.key}
            className={`${styles.tab} ${tab === t.key ? styles.tabActive : ''}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Top 3 podium (desktop) */}
      {!loading && displayEntries.length >= 3 && (
        <div className={styles.podium}>
          {[displayEntries[1], displayEntries[0], displayEntries[2]].map((e, i) => e && (
            <PodiumSlot key={e.id} entry={e} index={i} tab={tab} />
          ))}
        </div>
      )}

      {/* Full list */}
      <div className={styles.list}>
        {loading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={`skeleton ${styles.rowSkeleton}`} />
            ))
          : error 
          ? (
            <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
              <PremiumIcon icon={AlertTriangle} color="ruby" size={48} />
              <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Failed to load leaderboard</p>
              <code style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 8, wordBreak: 'break-all' }}>
                {error}
              </code>
            </div>
          )
          : displayEntries.length === 0
          ? (
            <div className={styles.empty}>
              <PremiumIcon icon={Leaf} color="emerald" size={32} />
              <p>No entries yet — be the first!</p>
            </div>
          )
          : displayEntries.map((e, i) => {
              const isThirdPlace = e.rank === 3;
              return (
                <React.Fragment key={e.id}>
                  <LeaderboardRow entry={e} myId={user?.uid} index={i} tab={tab} />
                  {isThirdPlace && <div className={styles.listDivider} />}
                </React.Fragment>
              );
            })
        }
      </div>
    </div>
  );
}
