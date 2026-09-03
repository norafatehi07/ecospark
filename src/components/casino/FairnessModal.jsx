// src/components/casino/FairnessModal.jsx
// The actual "provably fair" surface: shows the committed server-seed hash,
// the active client seed, and the nonce count, lets the user set their own
// client seed and rotate (which reveals the retiring seed), and lets them
// re-verify a past round's outcome entirely in their own browser using
// src/lib/provablyFairVerify.js — no server call involved in the check itself.
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { X, RefreshCw, ShieldCheck } from 'lucide-react';
import { getSeedInfo, rotateSeed } from '../../services/casinoService';
import { verifyDiceRoll, verifyCrashPoint, verifyMinePositions, verifySeedCommitment } from '../../lib/provablyFairVerify';
import styles from './FairnessModal.module.css';

export default function FairnessModal({ onClose }) {
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newClientSeed, setNewClientSeed] = useState('');
  const [rotating, setRotating] = useState(false);

  const [verifyGame, setVerifyGame] = useState('dice');
  const [verifyForm, setVerifyForm] = useState({ serverSeed: '', expectedHash: '', clientSeed: '', nonce: '0', minesCount: '3' });
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    getSeedInfo().then(setInfo).catch((err) => toast.error(err.message)).finally(() => setLoading(false));
  }, []);

  const handleRotate = async () => {
    setRotating(true);
    try {
      const res = await rotateSeed(newClientSeed || undefined);
      toast.success('Seed rotated — your previous seed is now revealed below for verification.');
      setInfo({ serverSeedHash: res.serverSeedHash, clientSeed: res.clientSeed, nonce: res.nonce, revealedSeeds: [...(info?.revealedSeeds || []), res.revealed] });
      setNewClientSeed('');
    } catch (err) {
      toast.error(err.message || 'Could not rotate seed.');
    } finally {
      setRotating(false);
    }
  };

  const handleVerify = async () => {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const { serverSeed, expectedHash, clientSeed, nonce } = verifyForm;
      const commitOk = expectedHash ? await verifySeedCommitment(serverSeed, expectedHash) : null;
      let outcome;
      if (verifyGame === 'dice') outcome = await verifyDiceRoll(serverSeed, clientSeed, Number(nonce));
      else if (verifyGame === 'crash') outcome = await verifyCrashPoint(serverSeed, clientSeed, Number(nonce));
      else outcome = await verifyMinePositions(serverSeed, clientSeed, Number(nonce), 25, Number(verifyForm.minesCount));
      setVerifyResult({ commitOk, outcome });
    } catch (err) {
      toast.error(err.message || 'Verification failed — check the seed values.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <motion.div
        className={styles.modal}
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <h3><ShieldCheck size={18} /> Provably Fair</h3>
          <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
        </div>

        <p className={styles.intro}>
          Every round's outcome is <code>HMAC-SHA256(serverSeed, clientSeed:nonce)</code>. The server commits
          to its seed by publishing only this hash <em>before</em> you bet; the raw seed is revealed only once
          you rotate it, after which every round on it can be recomputed and checked right here in your browser.
        </p>

        {loading ? (
          <p className={styles.muted}>Loading your seed pair…</p>
        ) : (
          <>
            <div className={styles.seedGrid}>
              <div>
                <span className={styles.seedLabel}>Active server seed (hash)</span>
                <code className={styles.seedValue}>{info?.serverSeedHash}</code>
              </div>
              <div>
                <span className={styles.seedLabel}>Your client seed</span>
                <code className={styles.seedValue}>{info?.clientSeed}</code>
              </div>
              <div>
                <span className={styles.seedLabel}>Rounds played on this seed</span>
                <code className={styles.seedValue}>{info?.nonce ?? 0}</code>
              </div>
            </div>

            <div className={styles.rotateRow}>
              <input
                className={styles.input}
                placeholder="New client seed (optional)"
                value={newClientSeed}
                onChange={(e) => setNewClientSeed(e.target.value)}
              />
              <button className={styles.rotateBtn} onClick={handleRotate} disabled={rotating}>
                <RefreshCw size={14} /> {rotating ? 'Rotating…' : 'Rotate seed'}
              </button>
            </div>
            <p className={styles.hint}>Rotating reveals your current server seed below and starts a fresh one. Blocked while a round is in progress.</p>

            {(info?.revealedSeeds || []).length > 0 && (
              <div className={styles.revealedList}>
                <span className={styles.seedLabel}>Revealed seeds (verifiable)</span>
                {info.revealedSeeds.slice().reverse().map((r, i) => (
                  <div key={i} className={styles.revealedRow}>
                    <code>{r.serverSeed}</code>
                    <span className={styles.muted}>{r.nonceCount} round(s)</span>
                  </div>
                ))}
              </div>
            )}

            <div className={styles.verifySection}>
              <span className={styles.seedLabel}>Verify a past round</span>
              <div className={styles.verifyGameTabs}>
                {['dice', 'crash', 'mines'].map((g) => (
                  <button
                    key={g}
                    className={g === verifyGame ? styles.verifyTabActive : styles.verifyTab}
                    onClick={() => setVerifyGame(g)}
                  >
                    {g[0].toUpperCase() + g.slice(1)}
                  </button>
                ))}
              </div>
              <input className={styles.input} placeholder="Revealed server seed" value={verifyForm.serverSeed}
                onChange={(e) => setVerifyForm((f) => ({ ...f, serverSeed: e.target.value }))} />
              <input className={styles.input} placeholder="Committed hash shown before you played (optional)" value={verifyForm.expectedHash}
                onChange={(e) => setVerifyForm((f) => ({ ...f, expectedHash: e.target.value }))} />
              <input className={styles.input} placeholder="Client seed" value={verifyForm.clientSeed}
                onChange={(e) => setVerifyForm((f) => ({ ...f, clientSeed: e.target.value }))} />
              <div className={styles.verifyRow2}>
                <input className={styles.input} placeholder="Nonce" type="number" value={verifyForm.nonce}
                  onChange={(e) => setVerifyForm((f) => ({ ...f, nonce: e.target.value }))} />
                {verifyGame === 'mines' && (
                  <input className={styles.input} placeholder="Mines count" type="number" value={verifyForm.minesCount}
                    onChange={(e) => setVerifyForm((f) => ({ ...f, minesCount: e.target.value }))} />
                )}
              </div>
              <button className={styles.rotateBtn} onClick={handleVerify} disabled={verifying}>
                {verifying ? 'Verifying…' : 'Recompute in my browser'}
              </button>

              {verifyResult && (
                <div className={styles.verifyResult}>
                  {verifyResult.commitOk !== null && (
                    <p>Hash commitment: <strong>{verifyResult.commitOk ? '✓ matches' : '✗ does not match'}</strong></p>
                  )}
                  <p>
                    Recomputed {verifyGame === 'mines' ? 'mine positions' : verifyGame === 'crash' ? 'crash point' : 'dice roll'}:{' '}
                    <strong>{Array.isArray(verifyResult.outcome) ? verifyResult.outcome.join(', ') : verifyResult.outcome}</strong>
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
