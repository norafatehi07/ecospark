// src/components/casino/MinesGame.jsx
// Mines — 5x5 grid, pick a mine count, reveal tiles, cash out any time.
// Every mine position is committed server-side (api/_lib/casino.js) before the
// first tile is revealed; this component only ever renders what the server
// already decided, it never guesses at a layout.
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { Bomb, Gem, RotateCcw } from 'lucide-react';
import { minesStart, minesReveal, minesCashout } from '../../services/casinoService';
import { minesMultiplier, minesWinChance, MINES_GRID_SIZE } from '../../lib/provablyFairMath';
import { CASINO_MIN_BET, CASINO_MAX_BET, MINES_MIN_COUNT, MINES_MAX_COUNT } from '../../constants/casino';
import BetControls from './BetControls';
import FairnessBadge from './FairnessBadge';
import styles from './MinesGame.module.css';

const TILE_COUNT = MINES_GRID_SIZE;

export default function MinesGame({ balance, onBalanceChange }) {
  const [bet, setBet] = useState(100);
  const [minesCount, setMinesCount] = useState(3);
  const [round, setRound] = useState(null); // { roundId, revealed:[], multiplier, minesCount }
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState(null); // final board reveal after bust/cashout

  const inRound = !!round && !reveal;

  const nextMultiplier = round
    ? minesMultiplier(round.minesCount, round.revealed.length + 1)
    : minesMultiplier(minesCount, 1);
  const currentMultiplier = round?.multiplier ?? 1;
  const winChance = round ? minesWinChance(round.minesCount, round.revealed.length + 1) : null;

  const handleStart = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await minesStart(bet, minesCount);
      onBalanceChange(res.balanceAfter);
      setRound({ roundId: res.roundId, revealed: [], multiplier: 1, minesCount: res.minesCount });
      setReveal(null);
    } catch (err) {
      toast.error(err.message || 'Could not start Mines.');
    } finally {
      setBusy(false);
    }
  }, [bet, minesCount, busy, onBalanceChange]);

  const handleTile = useCallback(async (tile) => {
    if (!round || busy || round.revealed.includes(tile)) return;
    setBusy(true);
    try {
      const res = await minesReveal(round.roundId, tile);
      if (!res.safe) {
        setReveal({ minePositions: res.minePositions, bustedTile: tile, payout: 0 });
        toast.error('Boom — you hit a mine.');
        return;
      }
      setRound((prev) => ({ ...prev, revealed: res.revealed, multiplier: res.multiplier }));
      if (res.cashedOut) {
        onBalanceChange(res.balanceAfter);
        setReveal({ minePositions: [], multiplier: res.multiplier, payout: res.payout, allCleared: true });
        toast.success(`Board cleared! +${res.payout.toLocaleString()} pts`);
      }
    } catch (err) {
      toast.error(err.message || 'That move failed.');
    } finally {
      setBusy(false);
    }
  }, [round, busy, onBalanceChange]);

  const handleCashout = useCallback(async () => {
    if (!round || busy || round.revealed.length === 0) return;
    setBusy(true);
    try {
      const res = await minesCashout(round.roundId);
      onBalanceChange(res.balanceAfter);
      setReveal({ minePositions: res.minePositions ?? [], multiplier: res.multiplier, payout: res.payout });
      toast.success(`Cashed out ${res.payout.toLocaleString()} pts @ ${res.multiplier}x`);
    } catch (err) {
      toast.error(err.message || 'Cash-out failed.');
    } finally {
      setBusy(false);
    }
  }, [round, busy, onBalanceChange]);

  const handleReset = () => {
    setRound(null);
    setReveal(null);
  };

  const tiles = Array.from({ length: TILE_COUNT }, (_, i) => i);
  const revealedSet = new Set(round?.revealed || []);
  const mineSet = new Set(reveal?.minePositions || []);

  return (
    <div className={styles.wrap}>
      <div className={styles.board}>
        <div className={styles.grid}>
          {tiles.map((tile) => {
            const isRevealed = revealedSet.has(tile);
            const isMine = mineSet.has(tile);
            const isBusted = reveal?.bustedTile === tile;
            const showFace = reveal ? (isRevealed || isMine) : isRevealed;
            return (
              <button
                key={tile}
                className={[
                  styles.tile,
                  isRevealed ? styles.tileGem : '',
                  isMine && !isRevealed ? styles.tileMine : '',
                  isBusted ? styles.tileBusted : '',
                ].join(' ')}
                onClick={() => handleTile(tile)}
                disabled={!inRound || busy || isRevealed}
              >
                <AnimatePresence mode="wait">
                  {showFace && (
                    <motion.span
                      key={isRevealed ? 'gem' : 'mine'}
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                      className={styles.tileIcon}
                    >
                      {isRevealed ? <Gem size={22} /> : <Bomb size={22} />}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
        </div>

        {reveal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={reveal.payout > 0 ? styles.resultWin : styles.resultLoss}
          >
            {reveal.payout > 0 ? (
              <>Cleared @ {reveal.multiplier}x — <strong>+{reveal.payout.toLocaleString()} pts</strong></>
            ) : (
              <>Mine hit — bet lost</>
            )}
            <button className={styles.playAgainBtn} onClick={handleReset}>
              <RotateCcw size={14} /> Play again
            </button>
          </motion.div>
        )}
      </div>

      <div className={styles.sidebar}>
        <BetControls
          bet={bet}
          setBet={setBet}
          balance={balance}
          disabled={inRound || busy}
          min={CASINO_MIN_BET}
          max={CASINO_MAX_BET}
        />

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Mines</label>
          <input
            type="range"
            min={MINES_MIN_COUNT}
            max={MINES_MAX_COUNT}
            value={minesCount}
            disabled={inRound || busy}
            onChange={(e) => setMinesCount(Number(e.target.value))}
            className={styles.slider}
          />
          <div className={styles.sliderReadout}>
            <span>{minesCount} mine{minesCount > 1 ? 's' : ''}</span>
            <span className={styles.sliderMuted}>{TILE_COUNT - minesCount} gems</span>
          </div>
        </div>

        <div className={styles.statsRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Multiplier</span>
            <span className={styles.statValue}>{currentMultiplier}x</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>{inRound ? 'Next tile' : 'First tile'}</span>
            <span className={styles.statValueMuted}>{nextMultiplier}x</span>
          </div>
        </div>
        {winChance != null && (
          <p className={styles.winChanceHint}>{(winChance * 100).toFixed(1)}% chance the next gem is safe</p>
        )}

        {!inRound ? (
          <button className={styles.primaryBtn} onClick={handleStart} disabled={busy || bet > balance}>
            {busy ? 'Starting…' : `Bet ${bet.toLocaleString()} pts`}
          </button>
        ) : (
          <button
            className={styles.cashoutBtn}
            onClick={handleCashout}
            disabled={busy || round.revealed.length === 0}
          >
            Cash Out {Math.round(bet * currentMultiplier).toLocaleString()} pts
          </button>
        )}

        <FairnessBadge />
      </div>
    </div>
  );
}
