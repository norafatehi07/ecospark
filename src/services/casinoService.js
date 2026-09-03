// src/services/casinoService.js
// Client wrapper for the server-authoritative casino actions in
// api/_lib/casino.js. Follows the same pattern as adminService.js's calls
// into api/admin.js: verified ID token in the Authorization header, one
// action-discriminated POST to api/economy.js.
//
// Nothing here decides a game outcome — every function just forwards a bet
// and returns whatever the trusted server computed.

import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

async function callEconomy(action, body = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('Sign in to play.');
  const token = await user.getIdToken();

  const res = await fetch('/api/economy.js', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ action, ...body }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.');
  return data;
}

export function newRoundKey(prefix) {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

// ── Fairness ─────────────────────────────────────────────────────────────────
export const getSeedInfo = () => callEconomy('casino_seed_info');
export const rotateSeed = (clientSeed) => callEconomy('casino_seed_rotate', { clientSeed });

/** Live-updating view of the user's own casinoRounds doc (for Crash's peek/poll UI). */
export function subscribeRound(roundId, callback, onError) {
  return onSnapshot(doc(db, 'casinoRounds', roundId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  }, onError);
}

// ── Mines ────────────────────────────────────────────────────────────────────
export const minesStart = (bet, minesCount) =>
  callEconomy('casino_mines_start', { bet, minesCount, idempotencyKey: newRoundKey('mines') });
export const minesReveal = (roundId, tile) => callEconomy('casino_mines_reveal', { roundId, tile });
export const minesCashout = (roundId) => callEconomy('casino_mines_cashout', { roundId });

// ── Dice ─────────────────────────────────────────────────────────────────────
export const diceRoll = (bet, target, direction) =>
  callEconomy('casino_dice_roll', { bet, target, direction, idempotencyKey: newRoundKey('dice') });

// ── Crash ────────────────────────────────────────────────────────────────────
export const crashStart = (bet, autoCashoutMultiplier) =>
  callEconomy('casino_crash_start', { bet, autoCashoutMultiplier, idempotencyKey: newRoundKey('crash') });
export const crashPeek = (roundId) => callEconomy('casino_crash_peek', { roundId });
export const crashCashout = (roundId) => callEconomy('casino_crash_cashout', { roundId });
