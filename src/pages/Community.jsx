// src/pages/Community.jsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { subscribeCommunityPosts, createCommunityPost, toggleLike, reportPost, subscribeComments, addComment } from '../services/firestoreService';
import { useUser } from '../lib/useUser';
import Avatar from '../components/common/Avatar';
import { convertFileToBase64 } from '../lib/fileUtils';
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import styles from './Community.module.css';

import { Heart, MessageCircle, Flag, Paperclip, X, FileText, Globe, AlertTriangle, Leaf } from 'lucide-react';
import PremiumIcon from '../components/common/PremiumIcon';
import { REWARDS_DB } from '../constants/rewards';

function PostCard({ post, myId, myProfile }) {
  const liveUser = useUser(post.userId);
  const photoURL = liveUser ? liveUser.photoURL : post.photoURL;
  const displayName = liveUser ? liveUser.displayName : post.displayName;
  const hasLiked = post.likes?.includes(myId);
  const equippedGlow = liveUser?.equipped?.glow;
  const equippedCompanion = liveUser?.equipped?.companion;

  const glowReward = REWARDS_DB.find(r => r.id === equippedGlow);
  const companionReward = REWARDS_DB.find(r => r.id === equippedCompanion);
  
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('Spam');
  const [customReason, setCustomReason] = useState('');
  const [isReporting, setIsReporting] = useState(false);
  
  const predefinedReasons = ['Spam', 'Inappropriate', 'Pornography/Nudity', 'Harassment', 'Other'];

  useEffect(() => {
    if (!showComments) return;
    const unsub = subscribeComments(post.id, setComments);
    return unsub;
  }, [showComments, post.id]);

  const handleAddComment = async () => {
    if (!newComment.trim() || !myId) return;
    setPostingComment(true);
    try {
      await addComment(post.id, myId, myProfile?.displayName || 'EcoUser', myProfile?.photoURL, newComment.trim());
      setNewComment('');
    } catch {
      toast.error('Could not post comment');
    } finally {
      setPostingComment(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!myId) return;
    const finalReason = reportReason === 'Other' ? customReason.trim() : reportReason;
    if (!finalReason) {
      toast.error('Please provide a reason');
      return;
    }
    
    setIsReporting(true);
    try {
      await reportPost(post.id, myId, finalReason);
      toast.success('Post reported to admins.');
      setShowReportModal(false);
      setReportReason('Spam');
      setCustomReason('');
    } catch (err) {
      toast.error('Could not report post');
    } finally {
      setIsReporting(false);
    }
  };

  const timeAgo = post.createdAt?.toDate ? (() => {
    const diff = Date.now() - post.createdAt.toDate().getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  })() : '';

  return (
    <motion.article
      className={styles.post}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <div className={styles.postHeader}>
        <Link to={`/user/${post.userId}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className={styles.postAvatar} style={{ position: 'relative' }}>
            <Avatar src={photoURL} activeFrame={liveUser?.activeFrame || post.activeFrame} size={40} alt={displayName} />
            {companionReward && (
              <div className="companion-wrapper" style={{ fontSize: '1.2rem', position: 'absolute', bottom: -5, right: -5 }}>
                {companionReward.icon}
              </div>
            )}
          </div>
          <div>
            <p className={`${styles.postName} ${glowReward ? glowReward.cssClass : ''}`} style={{ color: glowReward ? undefined : 'var(--color-text)' }}>
              {displayName || 'EcoUser'}
            </p>
            <p className={styles.postTime} style={{ color: 'var(--color-text-tertiary)' }}>{timeAgo}</p>
          </div>
        </Link>
      </div>

      {post.imageUrl && post.imageUrl.startsWith('data:image/') && (
        <>
          <img 
            src={post.imageUrl} 
            alt="Post" 
            className={styles.postImage} 
            loading="lazy" 
            style={{ width: '100%', marginTop: '12px', borderRadius: '12px', cursor: 'zoom-in' }} 
            onClick={() => setIsZoomed(true)}
          />
          <AnimatePresence>
            {isZoomed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsZoomed(false)}
                style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', cursor: 'zoom-out' }}
              >
                <motion.img 
                  src={post.imageUrl} 
                  alt="Zoomed Post"
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  exit={{ scale: 0.8 }}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', cursor: 'default' }}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  onClick={() => setIsZoomed(false)}
                  style={{ position: 'absolute', top: '24px', right: '24px', background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', cursor: 'pointer' }}
                >
                  <X size={24} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {post.imageUrl && post.imageUrl.startsWith('data:video/') && (
        <video 
          src={post.imageUrl} 
          controls 
          style={{ width: '100%', marginTop: '12px', borderRadius: '12px', maxHeight: '400px', backgroundColor: '#000' }} 
        />
      )}

      {post.imageUrl && post.imageUrl.startsWith('data:audio/') && (
        <audio 
          src={post.imageUrl} 
          controls 
          style={{ width: '100%', marginTop: '12px' }} 
        />
      )}

      {post.imageUrl && post.imageUrl.startsWith('data:application/pdf') && (
        <div style={{ marginTop: '12px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--color-border)' }}>
          <object data={post.imageUrl} type="application/pdf" width="100%" height="400px">
            <div style={{ padding: '24px', textAlign: 'center', background: 'var(--color-surface)' }}>
              <FileText size={48} style={{ color: 'var(--color-text-tertiary)', marginBottom: '12px' }} />
              <p style={{ margin: 0, color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)' }}>
                Your browser does not support inline PDFs. 
                <a href={post.imageUrl} download="document.pdf" style={{ color: 'var(--color-primary)', marginLeft: '4px' }}>Download PDF</a>
              </p>
            </div>
          </object>
        </div>
      )}

      <div className={styles.postActions} style={{ marginTop: '12px', paddingBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <button
            onClick={() => myId && toggleLike(post.id, myId)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: hasLiked ? 'var(--color-primary)' : 'var(--color-text)', transition: 'color 0.2s ease' }}
          >
            <Heart size={20} fill={hasLiked ? 'var(--color-primary)' : 'none'} color={hasLiked ? 'var(--color-primary)' : 'currentColor'} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{post.likes?.length || 0}</span>
          </button>

          <button 
            onClick={() => setShowComments(!showComments)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text)', transition: 'color 0.2s ease' }}
          >
            <MessageCircle size={20} />
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600 }}>{post.commentCount || 0}</span>
          </button>
        </div>
        
        {myId && (
          <button
            onClick={() => setShowReportModal(true)}
            style={{ display: 'flex', alignItems: 'center', background: 'none', border: 'none', color: 'var(--color-text-tertiary)', cursor: 'pointer', padding: '4px' }}
            title="Report Post"
          >
            <Flag size={18} />
          </button>
        )}
      </div>

      <p className={styles.postContent} style={{ margin: 0, fontSize: 'var(--text-sm)' }}>
        <strong style={{ color: 'var(--color-text)', marginRight: '6px' }}>{displayName || 'EcoUser'}</strong>
        {post.content}
      </p>

      <AnimatePresence>
        {showComments && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }} 
            animate={{ opacity: 1, height: 'auto' }} 
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: 'hidden', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}
          >
            {comments.length > 0 ? comments.map(c => (
              <div key={c.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: 'var(--text-sm)' }}>
                <strong style={{ color: 'var(--color-text)' }}>{c.displayName}</strong>
                <span style={{ color: 'var(--color-text-secondary)' }}>{c.content}</span>
              </div>
            )) : (
              <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', margin: 0 }}>No comments yet.</p>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px', borderTop: '1px solid var(--color-border)', paddingTop: '12px' }}>
              <input 
                type="text" 
                placeholder="Add a comment..." 
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddComment()}
                style={{ flex: 1, padding: '8px 0', border: 'none', background: 'transparent', fontSize: 'var(--text-sm)', outline: 'none', color: 'var(--color-text)' }}
              />
              {newComment.trim() && (
                <button 
                  onClick={handleAddComment}
                  disabled={postingComment}
                  style={{ background: 'none', color: 'var(--color-primary)', border: 'none', padding: '0 8px', fontSize: 'var(--text-sm)', fontWeight: 'bold', cursor: 'pointer', opacity: postingComment ? 0.5 : 1 }}
                >
                  Post
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              style={{ background: 'var(--color-bg-card)', padding: '24px', borderRadius: '16px', width: '100%', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', position: 'relative' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 style={{ margin: '0 0 16px', color: 'var(--color-text)', fontSize: 'var(--text-lg)' }}>Report Post</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
                {predefinedReasons.map((reason) => (
                  <label key={reason} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--color-text)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                    <input 
                      type="radio" 
                      name="reportReason" 
                      value={reason} 
                      checked={reportReason === reason} 
                      onChange={(e) => setReportReason(e.target.value)} 
                    />
                    {reason}
                  </label>
                ))}
                {reportReason === 'Other' && (
                  <input
                    type="text"
                    placeholder="Please specify..."
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--color-border)', background: 'var(--color-bg)', color: 'var(--color-text)', fontSize: 'var(--text-sm)', outline: 'none' }}
                  />
                )}
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  onClick={() => setShowReportModal(false)}
                  style={{ background: 'none', border: '1px solid var(--color-border)', padding: '8px 16px', borderRadius: '20px', color: 'var(--color-text)', cursor: 'pointer', fontSize: 'var(--text-sm)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportSubmit}
                  disabled={isReporting || (reportReason === 'Other' && !customReason.trim())}
                  style={{ background: 'var(--color-primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', fontSize: 'var(--text-sm)', fontWeight: 'bold', opacity: (isReporting || (reportReason === 'Other' && !customReason.trim())) ? 0.5 : 1 }}
                >
                  {isReporting ? 'Submitting...' : 'Submit Report'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  );
}

export default function Community() {
  const { user, profile } = useAuthStore();
  const { settings } = useSettingsStore();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPost, setNewPost] = useState('');
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const unsub = subscribeCommunityPosts((data) => {
      setPosts(data);
      setLoading(false);
    }, (err) => {
      console.error('[Community] Failed to load:', err);
      setError(err?.message || 'Unknown error loading posts');
      setLoading(false);
    });
    return unsub;
  }, []);

  const handlePost = async () => {
    const text = newPost.trim();
    if ((!text && !photo) || !user || posting) return;
    setPosting(true);
    try {
      let imageUrl = null;
      if (photo) {
        imageUrl = await convertFileToBase64(photo);
      }
      await createCommunityPost(user.uid, profile?.displayName || 'EcoUser', profile?.photoURL, text, imageUrl);
      setNewPost('');
      setPhoto(null);
      setPreview(null);
      toast.success(<span>Posted! <PremiumIcon icon={Globe} color="emerald" size={16} /></span>);
    } catch {
      toast.error('Could not post');
    } finally {
      setPosting(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // Quick frontend check before reading
    const isImage = file.type.startsWith('image/');
    const MAX_SIZE_BYTES = 700 * 1024;
    
    if (!isImage && file.size > MAX_SIZE_BYTES) {
      toast.error(`File is too large (${(file.size / 1024).toFixed(1)} KB). Max is 700 KB.`);
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File must be under 10MB');
      return;
    }
    
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div className={styles.headerBadge}>
          <PremiumIcon icon={Leaf} color="emerald" size={12} />
          Eco Community
        </div>
        <h1 className={styles.title}>Community Feed</h1>
        <p className={styles.subtitle}>Share your eco-wins with classmates and inspire change together.</p>
      </div>


      {/* Post composer */}
      <div className={styles.composer}>
        <div className={styles.composerAvatar}>
          <Avatar 
            src={profile?.photoURL} 
            activeFrame={profile?.activeFrame} 
            size={48} 
            alt={profile?.displayName} 
          />
        </div>
        <div className={styles.composerInput}>
          <textarea
            className={styles.textarea}
            placeholder="Share an eco-action you completed..."
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            rows={2}
          />
          {preview && (
            <div style={{ position: 'relative', marginTop: 8, marginBottom: 8 }}>
              {photo?.type.startsWith('image/') && (
                <img src={preview} alt="Upload preview" style={{ maxHeight: 120, borderRadius: 8, objectFit: 'cover' }} />
              )}
              {photo?.type.startsWith('video/') && (
                <video src={preview} style={{ maxHeight: 120, borderRadius: 8, backgroundColor: '#000' }} />
              )}
              {photo?.type.startsWith('audio/') && (
                <audio src={preview} controls style={{ width: '100%', marginTop: '8px' }} />
              )}
              {photo?.type === 'application/pdf' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px', background: 'var(--color-surface)', borderRadius: '8px', border: '1px solid var(--color-border)' }}>
                  <FileText size={24} style={{ color: 'var(--color-text-secondary)' }} />
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text)' }}>{photo.name}</span>
                </div>
              )}
              <button 
                onClick={() => { setPhoto(null); setPreview(null); }}
                style={{ position: 'absolute', top: photo?.type.startsWith('audio/') || photo?.type === 'application/pdf' ? -8 : 4, right: photo?.type.startsWith('audio/') || photo?.type === 'application/pdf' ? -8 : 'auto', left: photo?.type.startsWith('audio/') || photo?.type === 'application/pdf' ? 'auto' : 4, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', zIndex: 10 }}
              >
                ✕
              </button>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
            <button 
              className={styles.photoBtn} 
              onClick={() => fileRef.current?.click()}
              style={{ background: 'none', border: '1px solid var(--color-border)', borderRadius: 20, padding: '6px 12px', fontSize: 'var(--text-sm)', cursor: 'pointer', display: 'flex', gap: 6, alignItems: 'center' }}
            >
              <Paperclip size={16} /> Attach File
            </button>
            <input 
              type="file" 
              accept="image/*,video/*,audio/*,application/pdf" 
              ref={fileRef} 
              style={{ display: 'none' }} 
              onChange={handleFileChange} 
            />
            <motion.button
              className={styles.postBtn}
              onClick={handlePost}
              disabled={(!newPost.trim() && !photo) || posting}
              whileTap={{ scale: 0.96 }}
              style={{display:'flex', alignItems:'center', gap:'0.5rem'}}
            >
              {posting ? '...' : <>Share <PremiumIcon icon={Leaf} color="white" size={16} /></>}
            </motion.button>
          </div>
        </div>
      </div>

      {/* Feed */}
      <div className={styles.feed}>
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className={`skeleton ${styles.postSkeleton}`} />
            ))
          : error
          ? (
            <div style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '16px' }}>
              <PremiumIcon icon={AlertTriangle} color="ruby" size={48} />
              <p style={{ fontWeight: 600, color: 'var(--color-text)', margin: 0 }}>Failed to load community posts</p>
              <code style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', background: 'var(--color-surface)', padding: '8px 12px', borderRadius: 8, wordBreak: 'break-all' }}>
                {error}
              </code>
            </div>
          )
          : posts.length === 0 || posts.filter(p => !settings?.bannedUsers?.includes(p.userId)).length === 0
          ? (
            <div className={styles.empty}>
              <PremiumIcon icon={Leaf} color="emerald" size={32} />
              <p>Be the first to share an eco-win!</p>
            </div>
          )
          : posts
              .filter(p => !settings?.bannedUsers?.includes(p.userId))
              .map((p) => (
                <PostCard key={p.id} post={p} myId={user?.uid} myProfile={profile} />
              ))
        }
      </div>
    </div>
  );
}
