// src/services/economyService.js
// Client bridge to the trusted economy/admin endpoints.
//
// Nothing in this file decides an outcome — it asks the server and renders what
// it is told. Any function here that appears to "compute" a reward is only
// forwarding a server decision.

import { auth } from '../lib/firebase';

const BASE_URL = import.meta.env.DEV ? 'http://localhost:3000' : '';

/**
 * Stable per-attempt key so a double-click, a flaky connection, or a platform
 * retry cannot charge a user twice.
 */
export function newIdempotencyKey(prefix = 'act') {
  const rand =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}_${rand}`;
}

async function callApi(path, payload) {
  const user = auth.currentUser;
  if (!user) throw new Error('Please sign in and try again.');

  const token = await user.getIdToken();
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Distinguish "never reached the server" from "server said no": on this
    // path the action definitely did not happen, so a retry is safe.
    throw new Error('Could not reach the server. Check your connection and try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const err = new Error(data?.error || 'Something went wrong. Please try again.');
    err.status = response.status;
    err.errorId = data?.errorId;
    throw err;
  }
  return data;
}

const economy = (payload) => callApi('/api/economy', payload);
const adminApi = (payload) => callApi('/api/admin', payload);

// ─── economy ────────────────────────────────────────────────────────────────

/** Claim points for an approved submission. Safe to call more than once. */
export function awardTaskPoints(submissionId) {
  return economy({ action: 'award_task_points', submissionId });
}

/** Buy a catalog item. Price and ownership are validated server-side. */
export function redeemReward(rewardId) {
  return economy({ action: 'redeem_reward', rewardId });
}

/**
 * Open a loot case. The server rolls the outcome; pass the same
 * idempotencyKey if you retry the same open.
 */
export function openCase(caseId, idempotencyKey) {
  return economy({ action: 'open_case', caseId, idempotencyKey });
}

/** Equip an owned cosmetic, or pass null to clear the slot. */
export function equipCosmetic(slot, rewardId) {
  return economy({ action: 'equip_cosmetic', slot, rewardId });
}

export function unequipCosmetic(slot) {
  return economy({ action: 'equip_cosmetic', slot, rewardId: null });
}

// ─── arena ──────────────────────────────────────────────────────────────────
// The server decides every outcome and every balance change. The client
// animates what it is told.

/** Spin the wheel. Returns {segment, won, fee} decided server-side. */
export function arenaSpin(idempotencyKey) {
  return economy({ action: 'arena_spin', idempotencyKey });
}

/** Pay the trivia entry fee. Returns the sessionKey to finish with. */
export function arenaTriviaStart(idempotencyKey) {
  return economy({ action: 'arena_trivia_start', idempotencyKey });
}

/** Claim the trivia payout. Score is clamped to a perfect run server-side. */
export function arenaTriviaFinish(sessionKey, score) {
  return economy({ action: 'arena_trivia_finish', sessionKey, score });
}

export function arenaPoolLock(amount, idempotencyKey) {
  return economy({ action: 'arena_pool_lock', amount, idempotencyKey });
}

export function arenaPoolClaim(stakeId) {
  return economy({ action: 'arena_pool_claim', stakeId });
}

export function arenaOracleStake({ marketId, title, option, amount, multiplier, idempotencyKey }) {
  return economy({
    action: 'arena_oracle_stake',
    marketId,
    title,
    option,
    amount,
    multiplier,
    idempotencyKey,
  });
}

/**
 * Close a pending Oracle stake and refund it.
 * Until Phase 7 grounds resolution in real coverage, the server refuses to
 * invent a win/loss and refunds instead — see api/_lib/arena.js.
 */
export function arenaOracleVoid(betId) {
  return economy({ action: 'arena_oracle_void', betId });
}

// ─── admin / owner ──────────────────────────────────────────────────────────

/** Server-verified identity. The UI gates on this, never on a local email check. */
export function whoami() {
  return adminApi({ action: 'whoami' });
}

export function adminAdjustPoints({ userId, amount, reason, idempotencyKey }) {
  return adminApi({ action: 'adjust_points', userId, amount, reason, idempotencyKey });
}

export function adminSetRole(userId, role) {
  return adminApi({ action: 'set_role', userId, role });
}

export function adminSetBanned(userId, banned) {
  return adminApi({ action: 'set_banned', userId, banned });
}

export function adminReviewSubmission({ submissionId, decision, note }) {
  return adminApi({ action: 'review_submission', submissionId, decision, note });
}

export function adminListAuditLog(limit = 100) {
  return adminApi({ action: 'list_audit_log', limit });
}
