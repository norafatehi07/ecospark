// api/_lib/ledger.js
// Append-only point ledger + the single atomic path by which a balance changes.
//
// Every mutation is:
//   idempotent   — keyed, so a double-click / retry / Vercel replay cannot
//                  charge twice or pay out twice
//   atomic       — balance change and ledger entry commit in one transaction
//   auditable    — balanceBefore/After recorded on every entry
//   authoritative— returns the canonical post-state for the client to render
//
// Balance model: `spendableBalance` is what can be spent. `points`,
// `lifetimePoints` and `weeklyPoints` are progress totals and are only ever
// incremented on genuine earnings, never decremented by a purchase — spending
// must not erase achievement history.

import { db, FieldValue } from './firebaseAdmin.js';
import { HttpError } from './auth.js';

/** Firestore doc ids: no slashes, max 1500 bytes, and must not be . or .. */
function toDocId(key) {
  const safe = String(key).replace(/[^A-Za-z0-9_.:-]/g, '_').slice(0, 200);
  if (!safe || safe === '.' || safe === '..') {
    throw new HttpError(400, 'Invalid request.', `bad idempotency key: ${key}`);
  }
  return safe;
}

export const LEDGER_TYPES = new Set([
  'task_award',
  'reward_purchase',
  'loot_case_open',
  'oracle_stake',
  'oracle_payout',
  'growth_pool_lock',
  'growth_pool_release',
  'spin_reward',
  'trivia_reward',
  'referral_bonus',
  'weekly_reward',
  'owner_adjustment',
  'reversal',
  'bonus',
]);

/**
 * Apply a balance change atomically.
 *
 * @param {string}  userId
 * @param {string}  idempotencyKey  stable across retries of the same logical action
 * @param {string}  type            one of LEDGER_TYPES
 * @param {number}  delta           signed; negative spends
 * @param {boolean} mirrorToProgress also bump points/lifetimePoints/weeklyPoints
 * @param {object}  extraUpdates    further user-doc updates applied in the same transaction
 * @param {object}  actor           {uid, role} — who caused this
 * @returns {Promise<{duplicate, balanceBefore, balanceAfter, entryId}>}
 */
export async function applyBalanceChange({
  userId,
  idempotencyKey,
  type,
  delta,
  description = '',
  sourceType = null,
  sourceId = null,
  metadata = {},
  actor = null,
  mirrorToProgress = false,
  extraUpdates = {},
  requireSufficient = null,
}) {
  if (!userId) throw new HttpError(400, 'Invalid request.', 'userId required');
  if (!LEDGER_TYPES.has(type)) {
    throw new HttpError(400, 'Invalid request.', `unknown ledger type ${type}`);
  }
  if (!Number.isFinite(delta) || !Number.isInteger(delta)) {
    throw new HttpError(400, 'Invalid amount.', `delta must be an integer, got ${delta}`);
  }
  // Bound the blast radius of any single call, including owner adjustments.
  if (Math.abs(delta) > 10_000_000) {
    throw new HttpError(400, 'That amount is too large.', `delta ${delta} out of range`);
  }

  const mustAfford = requireSufficient ?? delta < 0;
  const entryId = toDocId(idempotencyKey);
  const entryRef = db.collection('pointTransactions').doc(entryId);
  const userRef = db.collection('users').doc(userId);

  return db.runTransaction(async (tx) => {
    // ── reads first (Firestore requires this ordering) ──
    const existing = await tx.get(entryRef);
    if (existing.exists) {
      const d = existing.data();
      return {
        duplicate: true,
        balanceBefore: d.balanceBefore,
        balanceAfter: d.balanceAfter,
        entryId,
      };
    }

    const userSnap = await tx.get(userRef);
    if (!userSnap.exists) throw new HttpError(404, 'Account not found.', `no user ${userId}`);
    const user = userSnap.data();

    const balanceBefore = user.spendableBalance ?? user.points ?? 0;
    const balanceAfter = balanceBefore + delta;

    if (mustAfford && balanceAfter < 0) {
      throw new HttpError(
        400,
        'You do not have enough points for that.',
        `balance ${balanceBefore} delta ${delta}`
      );
    }

    // ── writes ──
    const userUpdates = {
      spendableBalance: FieldValue.increment(delta),
      updatedAt: FieldValue.serverTimestamp(),
      ...extraUpdates,
    };
    if (mirrorToProgress && delta > 0) {
      userUpdates.points = FieldValue.increment(delta);
      userUpdates.lifetimePoints = FieldValue.increment(delta);
      userUpdates.weeklyPoints = FieldValue.increment(delta);
    }
    tx.update(userRef, userUpdates);

    tx.create(entryRef, {
      id: entryId,
      userId,
      type,
      delta,
      balanceBefore,
      balanceAfter,
      sourceType,
      sourceId,
      idempotencyKey: String(idempotencyKey),
      actorId: actor?.uid ?? userId,
      actorRole: actor?.role ?? 'self',
      description,
      metadata,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Legacy mirror: the Rewards history UI reads `transactions`. Written in the
    // same transaction so the two can never disagree. Remove only once that UI
    // has been migrated to pointTransactions.
    const legacyRef = db.collection('transactions').doc();
    tx.set(legacyRef, {
      userId,
      type: delta >= 0 ? 'earned' : 'spent',
      amount: delta,
      description: description || type,
      ledgerEntryId: entryId,
      createdAt: FieldValue.serverTimestamp(),
    });

    // Keep the leaderboard mirror consistent for progress-affecting earnings.
    if (mirrorToProgress && delta > 0) {
      const lbRef = db.collection('leaderboard').doc(userId);
      tx.set(
        lbRef,
        {
          userId,
          points: FieldValue.increment(delta),
          weeklyPoints: FieldValue.increment(delta),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    return { duplicate: false, balanceBefore, balanceAfter, entryId };
  });
}

/**
 * Record a sensitive action for the owner's audit view.
 * Never throws into the caller's path — a failed audit write must not roll back
 * a completed action, but it must be visible in logs.
 */
export async function writeAuditLog({ actor, action, targetUserId = null, summary = '', metadata = {} }) {
  try {
    await db.collection('auditLog').add({
      actorId: actor?.uid ?? null,
      actorEmail: actor?.email ?? null,
      actorRole: actor?.role ?? null,
      action,
      targetUserId,
      summary,
      metadata,
      createdAt: FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('[auditLog] write failed', { action, targetUserId, err: err.message });
  }
}
