// src/pages/Profile.jsx
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { getWeeklyImpact, updateUserProfile } from '../services/firestoreService';
import { compressImageToBase64 } from '../lib/imageUtils';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Avatar from '../components/common/Avatar';
import { Settings, Edit2, Image as ImageIcon, Camera } from 'lucide-react';
import { REWARDS_DB } from '../constants/rewards';
import styles from './Profile.module.css';

function WeeklyImpactCard({ profile }) {
  const [impact, setImpact] = useState(null);

  useEffect(() => {
    if (!profile?.id) return;
    getWeeklyImpact(profile.id).then(setImpact).catch(console.error);
  }, [profile?.id]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.5 }}
      className={styles.dashboardCard} 
      style={{ marginTop: '0', padding: '32px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '24px' }}>
        <h3 className={styles.badgesTitle}>📊 Weekly Impact</h3>
        <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.1)', padding: '4px 12px', borderRadius: '100px', fontWeight: 'bold' }}>This week</span>
      </div>
      <div className={styles.hologramStats} style={{ marginTop: '0' }}>
        <div className={styles.holoBox}>
          <span className={styles.holoVal}>{profile?.weeklyPoints ?? 0}</span>
          <span className={styles.holoLabel}>Points</span>
        </div>
        <div className={styles.holoBox}>
          <span className={styles.holoVal}>{impact?.co2 ? `${impact.co2}g` : '–'}</span>
          <span className={styles.holoLabel}>CO₂ saved</span>
        </div>
      </div>
      <p style={{ marginTop: '24px', fontSize: '12px', color: '#94a3b8', fontStyle: 'italic' }}>📸 Screenshot to share your weekly impact!</p>
    </motion.div>
  );
}

function ReferralCard({ profile }) {
  const link = `${window.location.origin}/auth?ref=${profile?.referralCode}`;
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy');
    }
  };

  const share = async () => {
    try {
      await navigator.share({ title: 'Join EcoSpark!', text: 'Join me on EcoSpark and earn bonus points!', url: link });
    } catch {
      copy();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.5 }}
      className={styles.dashboardCard} 
      style={{ marginTop: '0', padding: '32px' }}
    >
      <h3 className={styles.badgesTitle}>🤝 Invite a Classmate</h3>
      <p style={{ color: '#cbd5e1', marginBottom: '24px', fontSize: '16px' }}>
        Earn <strong style={{ color: '#4ADE80' }}>50 bonus points</strong> when a friend joins and completes their first task.
      </p>
      
      <div style={{ background: 'rgba(0,0,0,0.4)', border: '1px dashed rgba(255,255,255,0.2)', padding: '20px', borderRadius: '16px', marginBottom: '16px', width: '100%', textAlign: 'center' }}>
        <span style={{ fontFamily: 'monospace', fontSize: '28px', fontWeight: '900', letterSpacing: '0.2em', color: '#4ADE80' }}>
          {profile?.referralCode}
        </span>
      </div>
      
      <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '24px', fontWeight: 'bold' }}>
        {profile?.referralCount || 0} friends invited
      </p>
      
      <motion.button
        className={styles.saveBtn}
        onClick={share}
        whileTap={{ scale: 0.95 }}
        style={{ width: '100%', padding: '16px', fontSize: '18px' }}
      >
        {copied ? '✅ Copied!' : '📤 Share Invite Link'}
      </motion.button>
    </motion.div>
  );
}

export default function Profile() {
  const { user, profile } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (!editing && profile) {
      setName(profile.displayName || '');
      setBio(profile.bio || '');
    }
  }, [profile, editing]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    setUploadingPhoto(true);
    try {
      const base64Photo = await compressImageToBase64(file);
      await updateUserProfile(user.uid, { photoURL: base64Photo });
      toast.success('Profile photo updated!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !user) return;
    setSaving(true);
    try {
      await updateUserProfile(user.uid, { 
        displayName: name.trim(),
        bio: bio.trim()
      });
      setEditing(false);
      toast.success('Profile updated!');
    } catch {
      toast.error('Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!profile) return null;

  const equippedGlow = profile?.equipped?.glow;
  const equippedCompanion = profile?.equipped?.companion;
  const equippedBg = profile?.equipped?.background;

  const glowReward = REWARDS_DB.find(r => r.id === equippedGlow);
  const companionReward = REWARDS_DB.find(r => r.id === equippedCompanion);
  const bgReward = REWARDS_DB.find(r => r.id === equippedBg);

  return (
    <div className={`${styles.page} ${bgReward ? bgReward.cssClass : ''}`}>
      
      {/* Epic Hero Background */}
      <div className={styles.heroBanner} style={bgReward ? { background: 'transparent' } : undefined} />
      
      {/* Top Bar */}
      <div className={styles.topControls}>
        <Link to="/settings" className={styles.settingsLink}>
          <Settings size={18} /> Settings
        </Link>
      </div>

      {/* Main Dashboard Card */}
      <motion.div 
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, cubicBezier: [0.16, 1, 0.3, 1] }}
        className={styles.dashboardCard}
      >
        {/* Floating Avatar Showcase */}
        <div className={styles.avatarShowcase}>
          <div className={styles.avatarOrbit} />
          <div className={styles.avatarContainer} onClick={() => !uploadingPhoto && fileInputRef.current?.click()} style={{ position: 'relative' }}>
            {uploadingPhoto ? (
              <span className={styles.spinner} style={{ fontSize: '32px', margin: '32px' }}>⏳</span>
            ) : (
              <Avatar
                src={profile?.photoURL}
                activeFrame={profile?.activeFrame}
                size={100}
                alt={profile?.displayName}
              />
            )}
            {companionReward && (
              <div className="companion-wrapper" style={{ 
                position: 'absolute', 
                bottom: -15, 
                left: (companionReward.id === 'comp-terrabot' || companionReward.id === 'comp-waterwisp') ? -45 : undefined,
                right: (companionReward.id === 'comp-terrabot' || companionReward.id === 'comp-waterwisp') ? undefined : -45, 
                pointerEvents: 'none' 
              }}>
                {companionReward.imageUrl ? (
                  <img src={companionReward.imageUrl} alt="companion" style={{ width: '90px', height: '90px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.3))' }} />
                ) : (
                  <span style={{ fontSize: '2.5rem' }}>{companionReward.icon}</span>
                )}
              </div>
            )}
            <div className={styles.avatarOverlay}>
              <Camera size={32} color="white" />
            </div>
          </div>
          <input type="file" accept="image/*" ref={fileInputRef} style={{ display: 'none' }} onChange={handlePhotoUpload} />
        </div>

        {/* Identity & Editing */}
        {editing ? (
          <div className={styles.editContainer}>
            <input
              className={styles.glassInput}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Display Name"
              autoFocus
            />
            <textarea
              className={styles.glassInput}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Write a short bio..."
              rows={2}
              maxLength={100}
              style={{ resize: 'none' }}
            />
            <div className={styles.editControls}>
              <button className={styles.saveBtn} onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Profile'}
              </button>
              <button className={styles.cancelBtn} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <div className={styles.identity}>
            <h1 className={`${styles.profileName} ${glowReward ? glowReward.cssClass : ''}`}>{profile?.displayName || 'EcoUser'}</h1>
            <p className={styles.profileBio}>
              {profile?.bio || (profile?.role === 'admin' ? '✨ Platform Admin' : 'Sustainability Advocate')}
            </p>
            <p className={styles.profileEmail}>{user?.email}</p>
            <button className={styles.editBtn} onClick={() => setEditing(true)}>
              <Edit2 size={14} style={{ display: 'inline', marginRight: '6px' }} /> Edit Profile
            </button>
          </div>
        )}

        {/* Holographic Top Stats */}
        {!editing && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className={styles.hologramStats}
          >
            <div className={styles.holoBox}>
              <span className={styles.holoVal}>
                {profile?.streak || 0}
                <motion.span 
                  animate={{ scale: [1, 1.3, 1], rotate: [0, -10, 10, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  style={{ display: 'inline-block', color: '#ff6b6b', marginLeft: '6px' }}
                >
                  🔥
                </motion.span>
              </span>
              <span className={styles.holoLabel}>Day Streak</span>
            </div>
            <div className={styles.holoBox}>
              <span className={styles.holoVal}>{(profile?.lifetimePoints || profile?.points || 0).toLocaleString()}</span>
              <span className={styles.holoLabel}>Lifetime Pts</span>
            </div>
            <div className={styles.holoBox}>
              <span className={styles.holoVal}>{profile?.totalTasksCompleted || 0}</span>
              <span className={styles.holoLabel}>Tasks Done</span>
            </div>
            <div className={styles.holoBox}>
              <span className={styles.holoVal}>{profile?.badges?.length || 0}</span>
              <span className={styles.holoLabel}>Badges</span>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Advanced Stats Grid */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        className={styles.advancedGrid}
      >
        {[
          { icon: '⚡', val: (profile?.spendableBalance ?? profile?.points ?? 0).toLocaleString(), label: 'Points' },
          { icon: '🔥', val: profile?.streak || 0, label: 'Current Streak' },
          { icon: '🏆', val: profile?.longestStreak || 0, label: 'Longest Streak' },
          { icon: '✅', val: profile?.totalTasksCompleted || 0, label: 'Completed' },
          { icon: '🌿', val: `${((profile?.totalCO2Saved || 0) / 1000).toFixed(1)}kg`, label: 'CO₂ Saved' },
          { icon: '💧', val: `${profile?.totalWaterSaved || 0}L`, label: 'Water Saved' },
        ].map((s, i) => (
          <motion.div 
            key={s.label} 
            className={styles.gridCard}
            whileHover={{ y: -5, scale: 1.02 }}
          >
            <span className={styles.gridIcon}>{s.icon}</span>
            <span className={styles.gridVal}>{s.val}</span>
            <span className={styles.gridLabel}>{s.label}</span>
          </motion.div>
        ))}
      </motion.div>

      {/* Badges Showcase */}
      {profile?.badges?.length > 0 && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className={styles.badgesShowcase}
        >
          <h3 className={styles.badgesTitle}>🏅 Badges Earned</h3>
          <div className={styles.badgesGrid}>
            {profile.badges.map((b) => (
              <div key={b} className={styles.premiumBadge}>
                <span className={styles.badgeIcon}>🏅</span>
                <span className={styles.badgeLabel}>{b}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Weekly impact */}
      <WeeklyImpactCard profile={profile} />

      {/* Referral */}
      <ReferralCard profile={profile} />

    </div>
  );
}
