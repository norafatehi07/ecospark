// src/components/casino/BetControls.jsx
// Shared stake input + quick-bet buttons for Mines/Dice/Crash. One component
// so "half/double/max" behave identically across every game.
import styles from './BetControls.module.css';

export default function BetControls({ bet, setBet, balance, disabled, min, max }) {
  const clamp = (v) => Math.max(min, Math.min(max, Math.min(balance, Math.round(v))));

  return (
    <div className={styles.field}>
      <label className={styles.fieldLabel}>Bet amount</label>
      <div className={styles.inputRow}>
        <input
          type="number"
          className={styles.input}
          value={bet}
          disabled={disabled}
          min={min}
          max={max}
          onChange={(e) => setBet(clamp(Number(e.target.value) || min))}
        />
        <div className={styles.quickBtns}>
          <button type="button" disabled={disabled} onClick={() => setBet(clamp(bet / 2))}>½</button>
          <button type="button" disabled={disabled} onClick={() => setBet(clamp(bet * 2))}>2×</button>
          <button type="button" disabled={disabled} onClick={() => setBet(clamp(balance))}>Max</button>
        </div>
      </div>
      <span className={styles.balanceHint}>Balance: {balance.toLocaleString()} pts</span>
    </div>
  );
}
