// api/_lib/arena.js
// Server-authoritative Arena actions.
//
// These exist in Phase 2 (a security phase) to move AUTHORITY, not to redesign
// the games — Phase 7 does that. Behaviour is preserved except where the
// existing behaviour was itself the vulnerability.
//
// What is now genuinely authoritative:
//   · the spin outcome (crypto RNG here; was Math.random() in the browser)
//   · the growth-pool unlock time (was bypassable via import.meta.env.DEV)
//   · every balance change (idempotent + ledgered)
//
// What is NOT yet authoritative, and is documented as such:
//   · the trivia score. The questions are still generated in the browser, so
//     the server cannot verify an answer. The award is therefore capped at the
//     maximum a perfect run could earn and rate-limited per session. Phase 7
//     moves question ownership server-side, which is the real fix.

import { randomInt } from 'node:crypto';
import { db, FieldValue } from './firebaseAdmin.js';
import { HttpError } from './auth.js';
import { applyBalanceChange } from './ledger.js';

// Mirrors the wheel drawn in Arena.jsx. Server-owned so the client cannot
// choose its own segment.
const SPIN_FEE = 250;
const SPIN_SEGMENTS = [500, 0, 1000, 50, 0, 200, 100, 0];

const TRIVIA_FEE = 100;
const TRIVIA_POINTS_PER_ANSWER = 50;
const TRIVIA_MAX_QUESTIONS = 10;

const POOL_MIN = 100;
const POOL_MAX = 100_000;
const POOL_YIELD = 1.5;
const POOL_LOCK_DAYS = 5;

/** Spin the wheel. Fee and outcome both decided here. */
export async function spin(caller, body) {
  const key = String(body.idempotencyKey || '').slice(0, 120);
  if (!key) throw new HttpError(400, 'Invalid request.', 'idempotencyKey required');

  const segment = randomInt(SPIN_SEGMENTS.length);
  const won = SPIN_SEGMENTS[segment];
  const net = won - SPIN_FEE;

  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `spin:${caller.uid}:${key}`,
    type: 'spin_reward',
    delta: net,
    description: won > 0 ? `Spin to Win: +${won} pts` : 'Spin to Win: no prize',
    sourceType: 'arena_spin',
    metadata: { segment, won, fee: SPIN_FEE },
    actor: { uid: caller.uid, role: caller.role },
    // The fee must be affordable even when the payout would cover it.
    requireSufficient: true,
  });

  // Balance check against the fee alone, since a large win could otherwise mask
  // an unaffordable entry.
  if (!result.duplicate && result.balanceBefore < SPIN_FEE) {
    throw new HttpError(400, 'You do not have enough points to spin.');
  }

  return { ...result, segment, won, fee: SPIN_FEE };
}

/** Pay the trivia entry fee. */
export async function triviaStart(caller, body) {
  const key = String(body.idempotencyKey || '').slice(0, 120);
  if (!key) throw new HttpError(400, 'Invalid request.', 'idempotencyKey required');

  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `trivia_start:${caller.uid}:${key}`,
    type: 'oracle_stake',
    delta: -TRIVIA_FEE,
    description: 'Trivia tournament entry',
    sourceType: 'arena_trivia',
    sourceId: key,
    actor: { uid: caller.uid, role: caller.role },
  });

  // Record the session so the payout can be tied to a real, paid-for entry.
  await db.collection('arenaTriviaSessions').doc(`${caller.uid}_${key}`).set(
    {
      userId: caller.uid,
      sessionKey: key,
      status: 'open',
      fee: TRIVIA_FEE,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ...result, fee: TRIVIA_FEE, sessionKey: key };
}

/**
 * Award the trivia payout.
 *
 * The score is client-reported (see the header note), so this defends the only
 * way it currently can: the session must exist, must be unclaimed, and the
 * score is clamped to a perfect run. An inflated score cannot mint unbounded
 * points, and it cannot be claimed twice.
 */
export async function triviaFinish(caller, body) {
  const key = String(body.sessionKey || '').slice(0, 120);
  if (!key) throw new HttpError(400, 'Invalid request.', 'sessionKey required');

  const sessionRef = db.collection('arenaTriviaSessions').doc(`${caller.uid}_${key}`);
  const snap = await sessionRef.get();
  if (!snap.exists) {
    throw new HttpError(400, 'No open tournament found. Start a new one.', `no session ${key}`);
  }
  if (snap.data().status === 'claimed') {
    throw new HttpError(400, 'That tournament has already been scored.');
  }

  const reported = Number(body.score);
  if (!Number.isInteger(reported) || reported < 0) {
    throw new HttpError(400, 'Invalid score.', `score ${body.score}`);
  }
  const score = Math.min(reported, TRIVIA_MAX_QUESTIONS);
  const reward = score * TRIVIA_POINTS_PER_ANSWER;

  await sessionRef.update({
    status: 'claimed',
    reportedScore: reported,
    awardedScore: score,
    reward,
    claimedAt: FieldValue.serverTimestamp(),
  });

  if (reward <= 0) return { duplicate: false, reward: 0, score };

  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `trivia_finish:${caller.uid}:${key}`,
    type: 'trivia_reward',
    delta: reward,
    description: `Trivia tournament: ${score} correct`,
    sourceType: 'arena_trivia',
    sourceId: key,
    metadata: { score, reportedScore: reported, clientAsserted: true },
    mirrorToProgress: true,
    actor: { uid: caller.uid, role: caller.role },
  });

  return { ...result, reward, score };
}

/** Lock points into the growth pool. */
export async function poolLock(caller, body) {
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount < POOL_MIN) {
    throw new HttpError(400, `The minimum is ${POOL_MIN} points.`);
  }
  if (amount > POOL_MAX) {
    throw new HttpError(400, `The maximum is ${POOL_MAX.toLocaleString()} points per lock.`);
  }
  const key = String(body.idempotencyKey || '').slice(0, 120);
  if (!key) throw new HttpError(400, 'Invalid request.', 'idempotencyKey required');

  const stakeId = `${caller.uid}_${key}`;
  const unlockAt = new Date(Date.now() + POOL_LOCK_DAYS * 86400000);

  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `pool_lock:${stakeId}`,
    type: 'growth_pool_lock',
    delta: -amount,
    description: `Locked ${amount} pts in the Growth Pool`,
    sourceType: 'growth_pool',
    sourceId: stakeId,
    actor: { uid: caller.uid, role: caller.role },
  });

  // Server owns the unlock time and the return — the client cannot shorten it.
  await db.collection('growthPoolStakes').doc(stakeId).set(
    {
      id: stakeId,
      userId: caller.uid,
      amount,
      returnAmount: Math.round(amount * POOL_YIELD),
      status: 'locked',
      unlockAt,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ...result, stakeId, amount, unlockAt: unlockAt.toISOString() };
}

/** Claim a matured growth-pool stake. */
export async function poolClaim(caller, body) {
  const stakeId = String(body.stakeId || '');
  if (!stakeId) throw new HttpError(400, 'Invalid request.', 'stakeId required');

  const ref = db.collection('growthPoolStakes').doc(stakeId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'That stake does not exist.');
  const stake = snap.data();

  if (stake.userId !== caller.uid) {
    throw new HttpError(403, 'That stake is not yours.', `${caller.uid} vs ${stake.userId}`);
  }
  if (stake.status === 'claimed') {
    throw new HttpError(400, 'You have already claimed that stake.');
  }

  // Server clock only. The previous client check could be skipped in dev builds.
  const unlockAt = stake.unlockAt?.toDate?.() || new Date(stake.unlockAt);
  if (unlockAt > new Date()) {
    throw new HttpError(400, 'That stake is still locked.', `unlocks ${unlockAt.toISOString()}`);
  }

  await ref.update({ status: 'claimed', claimedAt: FieldValue.serverTimestamp() });

  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `pool_claim:${stakeId}`,
    type: 'growth_pool_release',
    delta: stake.returnAmount,
    description: `Growth Pool matured: +${stake.returnAmount} pts`,
    sourceType: 'growth_pool',
    sourceId: stakeId,
    mirrorToProgress: true,
    actor: { uid: caller.uid, role: caller.role },
  });

  return { ...result, returnAmount: stake.returnAmount };
}

/** Place an Oracle stake. Recorded server-side; settled separately. */
export async function oracleStake(caller, body) {
  const amount = Number(body.amount);
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new HttpError(400, 'Enter a valid amount to stake.');
  }
  // Responsible-engagement cap, per the brief.
  if (amount > 5000) throw new HttpError(400, 'The maximum stake is 5,000 points per market.');

  const key = String(body.idempotencyKey || '').slice(0, 120);
  const marketId = String(body.marketId || '').slice(0, 200);
  const option = String(body.option || '').slice(0, 80);
  if (!key || !marketId || !option) {
    throw new HttpError(400, 'Invalid request.', 'marketId, option, idempotencyKey required');
  }

  const multiplier = Number(body.multiplier);
  if (!Number.isFinite(multiplier) || multiplier < 1 || multiplier > 10) {
    throw new HttpError(400, 'Invalid odds.', `multiplier ${body.multiplier}`);
  }

  const betId = `${caller.uid}_${key}`;
  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `oracle_stake:${betId}`,
    type: 'oracle_stake',
    delta: -amount,
    description: `Oracle stake: ${String(body.title || marketId).slice(0, 80)}`,
    sourceType: 'oracle_market',
    sourceId: marketId,
    actor: { uid: caller.uid, role: caller.role },
  });

  await db.collection('oracleBets').doc(betId).set(
    {
      id: betId,
      userId: caller.uid,
      marketId,
      title: String(body.title || '').slice(0, 300),
      option,
      amount,
      // Server records the payout it would honour, so it cannot be inflated later.
      multiplier,
      potentialWin: Math.round(amount * multiplier),
      status: 'pending',
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { ...result, betId, amount, potentialWin: Math.round(amount * multiplier) };
}

/**
 * Close out a pending Oracle bet by VOIDING it and refunding the stake in full.
 *
 * Deliberate decision, and the one place this phase changes product behaviour:
 * the existing resolver asks an LLM to invent an outcome for an event that may
 * not have happened (confirmed bug #4). Porting that into the trusted layer
 * would make fabricated results authoritative and paid-out, which is worse than
 * leaving it in the browser.
 *
 * Refusing to settle at all would instead leave users with permanently stuck
 * stakes, which §10 forbids. So until Phase 7 supplies grounded resolution from
 * real coverage, closing a market returns the stake — no invented win, no loss,
 * nobody stuck.
 */
export async function oracleVoid(caller, body) {
  const betId = String(body.betId || '');
  if (!betId) throw new HttpError(400, 'Invalid request.', 'betId required');

  const ref = db.collection('oracleBets').doc(betId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'That stake does not exist.');
  const bet = snap.data();

  if (bet.userId !== caller.uid && !caller.isStaff) {
    throw new HttpError(403, 'That stake is not yours.');
  }
  if (bet.status !== 'pending') {
    throw new HttpError(400, 'That stake has already been settled.');
  }

  await ref.update({
    status: 'voided',
    resolution: 'refunded_pending_grounded_oracle',
    resolvedAt: FieldValue.serverTimestamp(),
  });

  const result = await applyBalanceChange({
    userId: bet.userId,
    idempotencyKey: `oracle_void:${betId}`,
    type: 'reversal',
    delta: bet.amount,
    description: 'Oracle market voided — stake refunded',
    sourceType: 'oracle_market',
    sourceId: bet.marketId,
    metadata: { reason: 'awaiting_grounded_resolution' },
    actor: { uid: caller.uid, role: caller.role },
  });

  return { ...result, refunded: bet.amount };
}
