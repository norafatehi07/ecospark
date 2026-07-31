// api/economy.js
// The trusted economy surface. Every action that moves points or grants an item
// goes through here, authenticated by a verified Firebase ID token.
//
// One function with an `action` discriminator rather than one route per action:
// keeps Vercel's function count low and puts the auth + idempotency guarantees
// in a single place that is hard to bypass by accident.
//
// Rules enforced here, not in the client:
//   · prices come from the server catalog, never from the request body
//   · you cannot buy what you already own
//   · you cannot equip what you do not own
//   · every mutation is idempotency-keyed
//   · outcomes that award value use crypto RNG, never Math.random()

import { randomInt } from 'node:crypto';
import { db, FieldValue } from './_lib/firebaseAdmin.js';
import { requireUser, HttpError } from './_lib/auth.js';
import { applyBalanceChange } from './_lib/ledger.js';
import {
  REWARDS_DB,
  LOOT_CASES_BY_ID,
  TIER_WEIGHTS,
  poolForCase,
} from '../src/constants/rewards.js';
import {
  spin,
  triviaStart,
  triviaFinish,
  poolLock,
  poolClaim,
  oracleStake,
  oracleVoid,
} from './_lib/arena.js';

const REWARD_BY_ID = REWARDS_DB.reduce((acc, r) => ((acc[r.id] = r), acc), {});

const INVENTORY_KEY = {
  frame: 'frames',
  glow: 'glows',
  companion: 'companions',
  background: 'backgrounds',
  entry: 'entries',
};

/** Ownership is stored in two shapes for frames; check both. */
function owns(user, reward) {
  if (reward.type === 'frame') {
    return (
      (user.unlockedFrames || []).includes(reward.id) ||
      (user.inventory?.frames || []).includes(reward.id)
    );
  }
  const key = INVENTORY_KEY[reward.type];
  return (user.inventory?.[key] || []).includes(reward.id);
}

/** User-doc updates that grant a reward, matching existing storage shape. */
function grantUpdates(reward) {
  if (reward.type === 'frame') {
    return {
      unlockedFrames: FieldValue.arrayUnion(reward.id),
      [`inventory.frames`]: FieldValue.arrayUnion(reward.id),
    };
  }
  return { [`inventory.${INVENTORY_KEY[reward.type]}`]: FieldValue.arrayUnion(reward.id) };
}

/** Uniform weighted pick using crypto RNG over the cumulative weight range. */
function weightedPick(items) {
  const total = items.reduce((s, i) => s + (TIER_WEIGHTS[i.tier] ?? 1), 0);
  if (total <= 0) throw new HttpError(500, 'This case is misconfigured.', 'zero total weight');
  let roll = randomInt(total); // [0, total)
  for (const item of items) {
    roll -= TIER_WEIGHTS[item.tier] ?? 1;
    if (roll < 0) return item;
  }
  return items[items.length - 1];
}

// ── actions ────────────────────────────────────────────────────────────────

/**
 * Award points for an approved submission.
 * The submission must exist, belong to the caller, be approved, and not have
 * paid out before — the submission id is the idempotency key, so a retry or a
 * second onSnapshot firing cannot double-award.
 */
async function awardTaskPoints(caller, body) {
  const { submissionId } = body;
  if (!submissionId) throw new HttpError(400, 'Invalid request.', 'submissionId required');

  const subRef = db.collection('submissions').doc(String(submissionId));
  const subSnap = await subRef.get();
  if (!subSnap.exists) throw new HttpError(404, 'Submission not found.');
  const sub = subSnap.data();

  if (sub.userId !== caller.uid) {
    throw new HttpError(403, 'That submission is not yours.', `${caller.uid} vs ${sub.userId}`);
  }
  if (sub.status !== 'approved') {
    throw new HttpError(400, 'That submission has not been approved yet.', `status ${sub.status}`);
  }

  // Points come from the submission record written at creation, not the client.
  const points = Number.isInteger(sub.points) ? sub.points : 50;
  if (points <= 0) throw new HttpError(400, 'This task awards no points.');

  const streak = await computeStreakUpdate(caller.uid);

  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `task_award:${submissionId}`,
    type: 'task_award',
    delta: points,
    description: 'Completed a task',
    sourceType: 'submission',
    sourceId: String(submissionId),
    mirrorToProgress: true,
    actor: { uid: caller.uid, role: caller.role },
    extraUpdates: {
      streak: streak.newStreak,
      longestStreak: streak.longestStreak,
      lastActivityDate: FieldValue.serverTimestamp(),
      totalTasksCompleted: FieldValue.increment(1),
      totalCO2Saved: FieldValue.increment(sub.co2 || 0),
      totalWaterSaved: FieldValue.increment(sub.water || 0),
      totalWasteSaved: FieldValue.increment(sub.waste || 0),
    },
  });

  return { ...result, points, streak: streak.newStreak };
}

/** Streak maths, read before the ledger transaction so it can be passed in. */
async function computeStreakUpdate(uid) {
  const snap = await db.collection('users').doc(uid).get();
  const user = snap.exists ? snap.data() : {};
  const today = new Date().toDateString();
  const last = user.lastActivityDate?.toDate?.()?.toDateString?.() || null;
  const yesterday = new Date(Date.now() - 86400000).toDateString();

  let newStreak = user.streak || 0;
  let longestStreak = user.longestStreak || 0;

  if (last === today) {
    // already counted today
  } else if (last === yesterday) {
    newStreak += 1;
  } else {
    newStreak = 1;
  }
  longestStreak = Math.max(longestStreak, newStreak);
  return { newStreak, longestStreak };
}

/** Direct catalog purchase. Price is server-side. */
async function redeemReward(caller, body) {
  const reward = REWARD_BY_ID[body.rewardId];
  if (!reward) throw new HttpError(404, 'That reward does not exist.', `id ${body.rewardId}`);

  const userSnap = await db.collection('users').doc(caller.uid).get();
  if (!userSnap.exists) throw new HttpError(404, 'Account not found.');
  if (owns(userSnap.data(), reward)) {
    throw new HttpError(400, 'You already own that.', `dup purchase ${reward.id}`);
  }

  // Respect the admin kill-switch for disabled rewards.
  const settings = (await db.collection('settings').doc('global').get()).data() || {};
  if ((settings.disabledRewards || []).includes(reward.id)) {
    throw new HttpError(400, 'That reward is currently unavailable.');
  }

  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `purchase:${caller.uid}:${reward.id}`,
    type: 'reward_purchase',
    delta: -reward.pointCost,
    description: `Redeemed ${reward.name}`,
    sourceType: 'reward',
    sourceId: reward.id,
    actor: { uid: caller.uid, role: caller.role },
    extraUpdates: grantUpdates(reward),
  });

  await db.collection('redemptions').add({
    userId: caller.uid,
    rewardId: reward.id,
    pointCost: reward.pointCost,
    ledgerEntryId: result.entryId,
    redeemedAt: FieldValue.serverTimestamp(),
  });

  return { ...result, reward };
}

/**
 * Open a loot case. The roll happens here with crypto RNG; the client only
 * animates a result it is told.
 *
 * Duplicate protection: `arrayUnion` is idempotent, so winning something you
 * already own would previously charge full price for nothing. Duplicates are
 * now converted to a points refund worth half the item, which is disclosed in
 * the response so the UI can say so.
 */
async function openCase(caller, body) {
  const cfg = LOOT_CASES_BY_ID[body.caseId];
  if (!cfg) throw new HttpError(404, 'That case does not exist.', `id ${body.caseId}`);

  const clientKey = String(body.idempotencyKey || '').slice(0, 120);
  if (!clientKey) throw new HttpError(400, 'Invalid request.', 'idempotencyKey required');

  const userSnap = await db.collection('users').doc(caller.uid).get();
  if (!userSnap.exists) throw new HttpError(404, 'Account not found.');
  const user = userSnap.data();

  const balance = user.spendableBalance ?? user.points ?? 0;
  if (balance < cfg.cost) throw new HttpError(400, 'You do not have enough points for that case.');

  const pool = poolForCase(cfg.id);
  if (!pool.length) throw new HttpError(500, 'This case is misconfigured.', `empty pool ${cfg.id}`);

  const won = weightedPick(pool);
  const isDuplicate = owns(user, won);
  const refund = isDuplicate ? Math.floor(won.pointCost / 2) : 0;
  const net = -cfg.cost + refund;

  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `case:${caller.uid}:${clientKey}`,
    type: 'loot_case_open',
    delta: net,
    description: isDuplicate
      ? `${cfg.name}: duplicate ${won.name} converted to ${refund} pts`
      : `${cfg.name}: won ${won.name}`,
    sourceType: 'loot_case',
    sourceId: cfg.id,
    metadata: { rewardId: won.id, tier: won.tier, duplicate: isDuplicate, refund },
    actor: { uid: caller.uid, role: caller.role },
    // Grant only when it is genuinely new.
    extraUpdates: isDuplicate ? {} : grantUpdates(won),
    requireSufficient: true,
  });

  return { ...result, reward: won, duplicate: isDuplicate, refund, cost: cfg.cost };
}

/** Equip / unequip. Validates ownership — the client cannot equip arbitrary ids. */
async function equipCosmetic(caller, body) {
  const { slot, rewardId } = body;
  if (!INVENTORY_KEY[slot]) throw new HttpError(400, 'Invalid request.', `bad slot ${slot}`);

  const userRef = db.collection('users').doc(caller.uid);
  const updates = { updatedAt: FieldValue.serverTimestamp() };

  if (rewardId === null || rewardId === undefined || rewardId === '') {
    // Unequip
    updates[`equipped.${slot}`] = null;
    if (slot === 'frame') updates.activeFrame = null;
  } else {
    const reward = REWARD_BY_ID[rewardId];
    if (!reward) throw new HttpError(404, 'That item does not exist.', `id ${rewardId}`);
    if (reward.type !== slot) {
      throw new HttpError(400, 'That item does not go in that slot.', `${reward.type} into ${slot}`);
    }
    const userSnap = await userRef.get();
    if (!userSnap.exists) throw new HttpError(404, 'Account not found.');
    if (!owns(userSnap.data(), reward)) {
      throw new HttpError(403, 'You do not own that item.', `${caller.uid} lacks ${rewardId}`);
    }
    updates[`equipped.${slot}`] = reward.id;
    if (slot === 'frame') updates.activeFrame = reward.id;
  }

  await userRef.update(updates);

  // Mirror onto the leaderboard row so podium/list rendering stays in sync.
  try {
    await db.collection('leaderboard').doc(caller.uid).set(updates, { merge: true });
  } catch {
    // Row may not exist yet; harmless.
  }

  return { slot, rewardId: rewardId || null };
}

const ACTIONS = {
  award_task_points: awardTaskPoints,
  redeem_reward: redeemReward,
  open_case: openCase,
  equip_cosmetic: equipCosmetic,
  // Arena — authority moved server-side in Phase 2; games redesigned in Phase 7.
  arena_spin: spin,
  arena_trivia_start: triviaStart,
  arena_trivia_finish: triviaFinish,
  arena_pool_lock: poolLock,
  arena_pool_claim: poolClaim,
  arena_oracle_stake: oracleStake,
  arena_oracle_void: oracleVoid,
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const caller = await requireUser(req);
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const handlerFn = ACTIONS[body.action];
    if (!handlerFn) {
      throw new HttpError(400, 'Unknown action.', `action=${body.action}`);
    }

    const result = await handlerFn(caller, body);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof HttpError) {
      // Public message only; internals stay in the log.
      console.warn('[economy]', err.status, err.message);
      return res.status(err.status).json({ error: err.publicMessage });
    }
    const errorId = `eco_${Date.now().toString(36)}`;
    console.error('[economy] unhandled', errorId, err);
    return res
      .status(500)
      .json({ error: 'Something went wrong. Please try again.', errorId });
  }
}
