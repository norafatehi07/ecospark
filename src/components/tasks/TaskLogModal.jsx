// src/components/tasks/TaskLogModal.jsx
// Full async verification flow: photo → Base64 compress → Firestore → AI verify → onSnapshot status updates
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { compressImageToBase64 } from '../../lib/imageUtils';
import { useAuthStore } from '../../store/authStore';
import { createSubmission, subscribeSubmission, awardPointsAndUpdateStreak } from '../../services/firestoreService';
import { verifyTaskPhoto } from '../../services/aiService';
import toast from 'react-hot-toast';
import PremiumIcon from '../common/PremiumIcon';
import { Timer, Search, CheckSquare, XCircle, Flag, Camera, Sparkles, Leaf } from 'lucide-react';
import styles from './TaskLogModal.module.css';

const VERIFICATION_STAGES = {
  pending: { icon: <PremiumIcon icon={Timer} color="gold" size={24} />, msg: 'Submitted — verifying your photo...', pct: 30 },
  checking: { icon: <PremiumIcon icon={Search} color="sapphire" size={24} />, msg: 'Still checking — AI is analysing the image...', pct: 60 },
  approved: { icon: <PremiumIcon icon={CheckSquare} color="emerald" size={24} />, msg: 'Verified! Great eco-action!', pct: 100 },
  rejected: { icon: <PremiumIcon icon={XCircle} color="ruby" size={24} />, msg: 'Not verified — the photo didn\'t clearly show the task.', pct: 100 },
  flagged: { icon: <PremiumIcon icon={Flag} color="ruby" size={24} />, msg: 'Flagged for manual review — a teacher will check it.', pct: 100 },
};

export default function TaskLogModal({ task, onClose, onSuccess }) {
  const { user, profile } = useAuthStore();
  const [photo, setPhoto] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [stage, setStage] = useState(null); // null | 'pending' | 'checking' | 'approved' | 'rejected' | 'flagged'
  const [reason, setReason] = useState('');
  const [submissionId, setSubmissionId] = useState(null);
  const [finalData, setFinalData] = useState(null);
  const fileRef = useRef();
  const stageTimerRef = useRef(null);
  const timeoutTimerRef = useRef(null);
  const unsubRef = useRef(null);

  const HARD_TIMEOUT = 25000; // 25s total UI timeout → shows "flag for review"
  const STILL_CHECKING_DELAY = 5000;

  useEffect(() => {
    return () => {
      clearTimeout(stageTimerRef.current);
      clearTimeout(timeoutTimerRef.current);
      unsubRef.current?.();
    };
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Photo must be under 10MB');
      return;
    }
    setPhoto(file);
    setPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!photo || !user) return;
    setUploading(true);

    try {
      // 1. Compress image to Base64 (bypasses Firebase Storage entirely)
      const imageUrl = await compressImageToBase64(photo);

      // 2. Create Firestore submission doc (status: pending)
      const subId = await createSubmission(user.uid, task.id, imageUrl, {
        points: task.points || 50,
        co2: task.co2 || 0,
        water: task.water || 0,
        waste: task.waste || 0,
        verificationPrompt: task.verificationPrompt || task.description || null,
      });
      setSubmissionId(subId);
      setStage('pending');
      setUploading(false);

      // 3. Trigger AI verification (202 immediately, AI runs async)
      verifyTaskPhoto(subId, imageUrl, task.verificationPrompt || task.description).catch(async (err) => {
        console.error('[verify API error]', err);
        // The API call completely failed to reach the server (e.g. running Vite without backend).
        // Update Firestore directly so it doesn't get stuck in 'pending'.
        try {
          const { updateSubmissionStatus } = await import('../../services/firestoreService');
          await updateSubmissionStatus(subId, 'flagged', { reason: 'AI Verification service unreachable.' });
        } catch (e) {
          console.error(e);
        }
      });

      // 4. "Still checking" message after 5 seconds
      stageTimerRef.current = setTimeout(() => {
        setStage((s) => s === 'pending' ? 'checking' : s);
      }, STILL_CHECKING_DELAY);

      // 5. Hard timeout: show flagged state if no result in 25s
      timeoutTimerRef.current = setTimeout(async () => {
        setStage((s) => {
          if (s === 'pending' || s === 'checking') {
            import('../../services/firestoreService').then(({ updateSubmissionStatus }) => {
              updateSubmissionStatus(subId, 'flagged', { reason: 'AI Verification timed out locally.' });
            });
            return 'flagged';
          }
          return s;
        });
      }, HARD_TIMEOUT);

      // 6. Listen for Firestore doc updates (onSnapshot)
      unsubRef.current = subscribeSubmission(subId, async (data) => {
        if (!data) return;
        const { status, reason: r } = data;

        if (['approved', 'rejected', 'flagged'].includes(status)) {
          clearTimeout(stageTimerRef.current);
          clearTimeout(timeoutTimerRef.current);
          setStage(status);
          setReason(r || '');

          // Award points on approval via client
          if (status === 'approved' && profile) {
            try {
              const earned = task.points || 50;
              await awardPointsAndUpdateStreak(user.uid, task.id, earned, {
                co2Saved: task.co2 || 0,
                waterSaved: task.water || 0,
                treesEquivalent: task.waste || 0,
              });
              toast.success(<span>+{earned} points earned! <PremiumIcon icon={Leaf} color="emerald" size={16} /></span>);
            } catch (err) {
              console.error('[TaskLogModal] award failed', err);
              toast.error(err.message || "Failed to award points.");
            }
          }

          if (status === 'approved' || status === 'rejected' || status === 'flagged') {
            setFinalData(data);
            if (unsubRef.current) {
              unsubRef.current();
              unsubRef.current = null;
            }
          }
        }
      });
    } catch (err) {
      setUploading(false);
      console.error('[TaskLogModal]', err);
      toast.error('Upload failed. Please try again.');
    }
  };

  const stageCfg = stage ? VERIFICATION_STAGES[stage] : null;
  const isDone = ['approved', 'rejected', 'flagged'].includes(stage);

  return (
    <>
      <motion.div
        className={styles.backdrop}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={!uploading && !stage ? onClose : undefined}
      />
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
        animate={{ opacity: 1, scale: 1, x: "-50%", y: "-50%" }}
        exit={{ opacity: 0, scale: 0.95, x: "-50%", y: "-45%" }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        role="dialog"
      >
        <div className={styles.header}>
          <div>
            <h2 className={styles.title}>{task.title}</h2>
            <span className={styles.points}>+{task.points} pts</span>
          </div>
          {!uploading && (
            <button className={styles.closeBtn} onClick={onClose}>✕</button>
          )}
        </div>

        <div className={styles.body}>
          {!stage ? (
            <>
              <p className={styles.instruction} style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                <PremiumIcon icon={Camera} color="sapphire" size={20} /> Take or upload a photo that clearly shows you completing this task:
              </p>
              <div className={styles.taskPrompt}>
                <strong>What to show:</strong> {task.verificationPrompt || task.description}
              </div>

              {preview ? (
                <div className={styles.previewWrapper}>
                  <img src={preview} alt="Preview" className={styles.preview} />
                  <button
                    className={styles.changePhoto}
                    onClick={() => { setPhoto(null); setPreview(null); }}
                  >
                    Change photo
                  </button>
                </div>
              ) : (
                <div
                  className={styles.uploadZone}
                  onClick={() => fileRef.current?.click()}
                  onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
                  tabIndex={0}
                  role="button"
                >
                  <span className={styles.uploadIcon}><PremiumIcon icon={Camera} color="slate" size={48} /></span>
                  <p>Tap to take a photo or choose from gallery</p>
                  <span className={styles.uploadHint}>Max 10MB · JPG, PNG, WEBP</span>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className={styles.hiddenInput}
                onChange={handleFileChange}
              />
            </>
          ) : (
            <div className={styles.verificationState}>
              {/* Progress bar */}
              <div className={styles.progressBar}>
                <motion.div
                  className={styles.progressFill}
                  initial={{ width: 0 }}
                  animate={{ width: `${stageCfg?.pct || 0}%` }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  style={{
                    '--fill-color': stage === 'approved'
                      ? 'var(--color-success)'
                      : stage === 'rejected' || stage === 'flagged'
                      ? 'var(--color-warning)'
                      : 'var(--color-primary)'
                  }}
                />
              </div>

              <motion.div
                className={styles.stageIcon}
                key={stage}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                {stageCfg?.icon}
              </motion.div>

              <p className={styles.stageMsg}>{stageCfg?.msg}</p>

              {reason && (
                <div className={styles.reasonBox}>
                  <strong>AI reasoning:</strong> {reason}
                </div>
              )}

              {/* Photo preview */}
              {preview && (
                <img src={preview} alt="Submitted" className={styles.submittedPhoto} />
              )}

              {!isDone && (
                <p className={styles.waitNote}>
                  This usually takes 5–15 seconds. You can leave this screen — we'll update your tasks automatically.
                </p>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
          {!stage ? (
            <button
              className={styles.submitBtn}
              onClick={handleSubmit}
              disabled={!photo || uploading}
              style={{display:'flex', alignItems:'center', gap:'0.5rem', justifyContent:'center'}}
            >
              {uploading ? 'Uploading...' : <>Submit for Verification <PremiumIcon icon={Search} size={16} /></>}
            </button>
          ) : isDone ? (
            <div className={styles.doneActions}>
              <button 
                className={styles.doneBtn} 
                onClick={stage === 'approved' ? () => onSuccess?.(finalData) : onClose} 
                style={{display:'flex', alignItems:'center', gap:'0.5rem', justifyContent:'center'}}
              >
                {stage === 'approved' ? <><PremiumIcon icon={Sparkles} color="white" size={16} /> Awesome!</> : 'OK, got it'}
              </button>
              {stage !== 'approved' && (
                <button
                  className={styles.retryBtn}
                  onClick={() => { setStage(null); setPhoto(null); setPreview(null); setSubmissionId(null); }}
                >
                  Try again
                </button>
              )}
            </div>
          ) : null}
        </div>
      </motion.div>
    </>
  );
}
