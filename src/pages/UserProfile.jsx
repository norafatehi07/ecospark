import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useUser } from '../lib/useUser';
import { createOrGetChat } from '../services/firestoreService';
import Avatar from '../components/common/Avatar';
import { MessageCircle, ArrowLeft, Image as ImageIcon, Award, Activity } from 'lucide-react';
import { REWARDS_DB } from '../constants/rewards';
import styles from './UserProfile.module.css';

export default function UserProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = useUser(id);
  const { profile: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('impact');
  const [messaging, setMessaging] = useState(false);

  if (!profile) {
    return (
      <div className={styles.page} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <div className="skeleton" style={{ width: '100px', height: '100px', borderRadius: '50%' }} />
      </div>
    );
  }

  const handleMessage = async () => {
    if (!currentUser?.id || messaging) return;
    setMessaging(true);
    try {
      const chatId = await createOrGetChat(currentUser.id, profile.id);
      navigate(`/messages/${chatId}`);
    } catch (err) {
      console.error('Failed to create chat:', err);
      setMessaging(false);
    }
  };

  const getGradientFromId = (id) => {
    if (!id) return 'linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8), rgba(236, 72, 153, 0.8))';
    
    const gradients = [
      'linear-gradient(135deg, rgba(59, 130, 246, 0.8), rgba(139, 92, 246, 0.8), rgba(236, 72, 153, 0.8))', // Blue-Purple-Pink
      'linear-gradient(135deg, rgba(16, 185, 129, 0.8), rgba(52, 211, 153, 0.8), rgba(6, 182, 212, 0.8))',   // Emerald-Cyan
      'linear-gradient(135deg, rgba(245, 158, 11, 0.8), rgba(239, 68, 68, 0.8), rgba(217, 70, 239, 0.8))',  // Amber-Red-Fuchsia
      'linear-gradient(135deg, rgba(14, 165, 233, 0.8), rgba(99, 102, 241, 0.8), rgba(168, 85, 247, 0.8))',   // Sky-Indigo-Purple
      'linear-gradient(135deg, rgba(234, 179, 8, 0.8), rgba(249, 115, 22, 0.8), rgba(239, 68, 68, 0.8))',    // Yellow-Orange-Red
      'linear-gradient(135deg, rgba(236, 72, 153, 0.8), rgba(244, 63, 94, 0.8), rgba(251, 146, 60, 0.8))',   // Pink-Rose-Orange
      'linear-gradient(135deg, rgba(139, 92, 246, 0.8), rgba(217, 70, 239, 0.8), rgba(14, 165, 233, 0.8))'  // Purple-Fuchsia-Sky
    ];
    
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % gradients.length;
    return gradients[index];
  };

  const userGradient = profile ? getGradientFromId(profile.id) : '';

  const equippedGlow = profile?.equipped?.glow;
  const equippedCompanion = profile?.equipped?.companion;
  const equippedBg = profile?.equipped?.background;

  const glowReward = REWARDS_DB.find(r => r.id === equippedGlow);
  const companionReward = REWARDS_DB.find(r => r.id === equippedCompanion);
  const bgReward = REWARDS_DB.find(r => r.id === equippedBg);

  return (
    <div className={`${styles.page} ${bgReward ? bgReward.cssClass : ''}`}>
      {/* Premium Banner */}
      <div className={styles.banner} style={{ background: bgReward ? 'transparent' : userGradient, backgroundSize: '200% 200%' }}>
        <div className={styles.bannerOverlay}></div>
        <Link to={-1} className={styles.backBtn}>
          <ArrowLeft size={24} />
        </Link>
      </div>

      {/* Main Profile Card (Glassmorphism) */}
      <div className={styles.profileCard}>
        <div className={styles.avatarContainer} style={{ position: 'relative' }}>
          <Avatar src={profile.photoURL} activeFrame={profile.activeFrame} size={120} alt={profile.displayName} />
          {companionReward && (
            <div className="companion-wrapper" style={{ 
              position: 'absolute', 
              bottom: -20, 
              left: (companionReward.id === 'comp-terrabot' || companionReward.id === 'comp-waterwisp') ? -55 : undefined,
              right: (companionReward.id === 'comp-terrabot' || companionReward.id === 'comp-waterwisp') ? undefined : -55, 
              pointerEvents: 'none' 
            }}>
              {companionReward.imageUrl ? (
                <img src={companionReward.imageUrl} alt="companion" style={{ width: '100px', height: '100px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }} />
              ) : (
                <span style={{ fontSize: '3rem' }}>{companionReward.icon}</span>
              )}
            </div>
          )}
        </div>

        <div className={styles.profileInfo}>
          <div className={styles.nameSection}>
            <h1 className={`${styles.title} ${glowReward ? glowReward.cssClass : ''}`}>{profile.displayName || 'EcoUser'}</h1>
            <p className={styles.subtitle}>{profile.bio || (profile.role === 'admin' ? '✨ Platform Admin' : 'Sustainability Advocate')}</p>
          </div>

          <div className={styles.actionSection}>
            {currentUser?.id !== profile.id && (
              <>
                <button 
                  className={styles.messageBtn} 
                  onClick={handleMessage} 
                  disabled={messaging}
                >
                  <MessageCircle size={18} />
                  {messaging ? 'Opening...' : 'Message'}
                </button>
              </>
            )}
          </div>
        </div>

        <div className={styles.highlightStats}>
          <div className={styles.statBox}>
            <span className={styles.statBoxVal}>
              {profile.streak || 0}
              <motion.span 
                animate={{ scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                style={{ display: 'inline-block', color: '#ff6b6b', marginLeft: '6px' }}
              >
                🔥
              </motion.span>
            </span>
            <span className={styles.statBoxLabel}>Day Streak</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statBoxVal}>{(profile.lifetimePoints || 0).toLocaleString()}</span>
            <span className={styles.statBoxLabel}>Lifetime Points</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statBoxVal}>{profile.totalTasksCompleted || 0}</span>
            <span className={styles.statBoxLabel}>Tasks</span>
          </div>
          <div className={styles.statBox}>
            <span className={styles.statBoxVal}>{profile.badges?.length || 0}</span>
            <span className={styles.statBoxLabel}>Badges</span>
          </div>
        </div>
      </div>

      {/* Profile Tabs */}
      <div className={styles.tabsContainer}>
        <button 
          className={`${styles.tab} ${activeTab === 'impact' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('impact')}
        >
          <Activity size={18} /> Impact
        </button>
        <button 
          className={`${styles.tab} ${activeTab === 'badges' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('badges')}
        >
          <Award size={18} /> Badges
        </button>
      </div>

      {/* Tab Content */}
      <div className={styles.tabContent}>
        {activeTab === 'impact' && (
          <div className={styles.impactGrid}>
            <div className={styles.impactCard}>
              <div className={styles.impactIconWrap} style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
                <span className={styles.impactIcon}>🌍</span>
              </div>
              <div className={styles.impactData}>
                <p className={styles.impactValue}>{profile.totalCO2Saved || 0}<small>g</small></p>
                <p className={styles.impactLabel}>CO₂ Saved</p>
              </div>
            </div>
            <div className={styles.impactCard}>
              <div className={styles.impactIconWrap} style={{ background: 'rgba(14, 165, 233, 0.1)' }}>
                <span className={styles.impactIcon}>💧</span>
              </div>
              <div className={styles.impactData}>
                <p className={styles.impactValue}>{profile.totalWaterSaved || 0}<small>L</small></p>
                <p className={styles.impactLabel}>Water Saved</p>
              </div>
            </div>
            <div className={styles.impactCard}>
              <div className={styles.impactIconWrap} style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                <span className={styles.impactIcon}>♻️</span>
              </div>
              <div className={styles.impactData}>
                <p className={styles.impactValue}>{profile.totalWasteSaved || 0}<small>g</small></p>
                <p className={styles.impactLabel}>Waste Recycled</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'badges' && (
          <div className={styles.badgesGrid}>
            {profile.badges && profile.badges.length > 0 ? (
              profile.badges.map((badge) => (
                <div key={badge} className={styles.badgeCard}>
                  <div className={styles.badgeIcon}>🏅</div>
                  <div style={{ fontSize: 'var(--text-xs)', marginTop: '8px', color: 'var(--color-text)', textAlign: 'center' }}>
                    {badge}
                  </div>
                </div>
              ))
            ) : (
              <div className={styles.emptyState}>
                <Award size={48} />
                <p>No badges unlocked yet.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
