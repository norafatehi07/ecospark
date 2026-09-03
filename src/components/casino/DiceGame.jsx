// src/components/casino/DiceGame.jsx
// Dice — pick a target and a direction (over/under), one HMAC draw settles
// the round instantly. The slider is drawn live from diceMultiplier/diceWinChance
// so the payout shown always matches the server-side formula it will actually
// pay (src/lib/provablyFairMath.js), never a locally-invented approximation.
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { diceRoll } from '../../services/casinoService';
import { diceMultiplier, diceWinChance } from '../../lib/provablyFairMath';
import { CASINO_MIN_BET, CASINO_MAX_BET, DICE_MIN_TARGET, DICE_MAX_TARGET } from '../../constants/casino';
import BetControls from './BetControls';
import FairnessBadge from './FairnessBadge';
import styles from './DiceGame.module.css';

export default function DiceGame({ balance, onBalanceChange }) {
  const [bet, setBet] = useState(100);
  const [target, setTarget] = useState(50);
  const [direction, setDirection] = useState('under');
  const [busy, setBusy] = useState(false);
  const [lastRoll, setLastRoll] = useState(null); // { roll, win, multiplier, payout }
  const [history, setHistory] = useState([]);

  const multiplier = diceMultiplier(target, direction);
  const winChance = diceWinChance(target, direction);

  const handleRoll = useCallback(async () => {
    if (busy || bet > balance) return;
    setBusy(true);
    try {
      const res = await diceRoll(bet, target, direction);
      onBalanceChange(res.balanceAfter);
      setLastRoll(res);
      setHistory((prev) => [res, ...prev].slice(0, 12));
      if (res.win) toast.success(`Rolled ${res.roll} — +${res.payout.toLocaleString()} pts`);
      else toast.error(`Rolled ${res.roll} — bet lost`);
    } catch (err) {
      toast.error(err.message || 'Roll failed.');
    } finally {
      setBusy(false);
    }
  }, [bet, target, direction, busy, balance, onBalanceChange]);

  const markerPct = target;

  return (
    <div className={styles.wrap}>
      <div className={styles.board}>
        <div className={styles.rollDisplay}>
          <AnimatePresence mode="wait">
            {lastRoll ? (
              <motion.div
                key={lastRoll.roll + '-' + history.length}
                initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                className={lastRoll.win ? styles.rollValueWin : styles.rollValueLoss}
              >
                {lastRoll.roll.toFixed(2)}
              </motion.div>
            ) : (
              <div className={styles.rollValuePlaceholder}>--.--</div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.sliderTrack}>
          <div
            className={styles.sliderZone}
            style={
              direction === 'under'
                ? { left: 0, width: `${markerPct}%`, background: 'linear-gradient(90deg, #10b981, #059669)' }
                : { left: `${markerPct}%`, width: `${100 - markerPct}%`, background: 'linear-gradient(90deg, #059669, #10b981)' }
            }
          />
          <input
            type="range"
            min={DICE_MIN_TARGET}
            max={DICE_MAX_TARGET}
            step={1}
            value={target}
            disabled={busy}
            onChange={(e) => setTarget(Number(e.target.value))}
            className={styles.rangeInput}
          />
          {lastRoll && (
            <div className={styles.rollMarker} style={{ left: `${lastRoll.roll}%` }} />
          )}
        </div>
        <div className={styles.sliderLabels}>
          <span>0</span>
          <span>{target}</span>
          <span>100</span>
        </div>

        <div className={styles.directionRow}>
          <button
            className={direction === 'under' ? styles.dirBtnActive : styles.dirBtn}
            onClick={() => setDirection('under')}
            disabled={busy}
          >
            Roll Under {target}
          </button>
          <button
            className={direction === 'over' ? styles.dirBtnActive : styles.dirBtn}
            onClick={() => setDirection('over')}
            disabled={busy}
          >
            Roll Over {target}
          </button>
        </div>

        {history.length > 0 && (
          <div className={styles.historyStrip}>
            {history.map((h, i) => (
              <span key={i} className={h.win ? styles.historyChipWin : styles.historyChipLoss}>
                {h.roll.toFixed(2)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.sidebar}>
        <BetControls
          bet={bet}
          setBet={setBet}
          balance={balance}
          disabled={busy}
          min={CASINO_MIN_BET}
          max={CASINO_MAX_BET}
        />

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Multiplier</span>
            <span className={styles.statValue}>{multiplier}x</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Win Chance</span>
            <span className={styles.statValueMuted}>{winChance.toFixed(1)}%</span>
          </div>
        </div>

        <button className={styles.primaryBtn} onClick={handleRoll} disabled={busy || bet > balance}>
          {busy ? 'Rolling…' : `Roll — win ${Math.round(bet * multiplier).toLocaleString()} pts`}
        </button>

        <FairnessBadge />
      </div>
    </div>
  );
}
