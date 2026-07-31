// api/admin.js
// Privileged administration surface.
//
// The role split the brief asks for is enforced HERE, because a check in
// Admin.jsx is a suggestion, not a boundary:
//   admin  → moderation, catalog, settings, bans
//   owner  → all of the above, PLUS points adjustment and role changes
//
// Every action writes to auditLog so the owner's audit view has real data.

import { db, authAdmin, FieldValue } from './_lib/firebaseAdmin.js';
import { requireAdmin, requireOwner, requireStaff, HttpError, OWNER_EMAIL } from './_lib/auth.js';
import { applyBalanceChange, writeAuditLog } from './_lib/ledger.js';

const ASSIGNABLE_ROLES = new Set(['student', 'teacher', 'admin']);

/** OWNER ONLY — adjust a user's points. */
async function adjustPoints(caller, body) {
  const { userId, amount, reason } = body;
  if (!userId) throw new HttpError(400, 'Pick a user first.');

  const delta = Number(amount);
  if (!Number.isInteger(delta) || delta === 0) {
    throw new HttpError(400, 'Enter a whole number of points.');
  }
  if (Math.abs(delta) > 1_000_000) {
    throw new HttpError(400, 'Adjustments are capped at 1,000,000 points per action.');
  }
  if (!reason || String(reason).trim().length < 3) {
    // An adjustment without a stated reason is unauditable in practice.
    throw new HttpError(400, 'Give a short reason for this adjustment.');
  }

  const result = await applyBalanceChange({
    userId,
    // Timestamped: repeated deliberate adjustments are legitimate, so this key
    // only collapses genuine retries of one submit.
    idempotencyKey: `owner_adj:${userId}:${body.idempotencyKey || Date.now()}`,
    type: 'owner_adjustment',
    delta,
    description: `Owner adjustment: ${String(reason).trim().slice(0, 140)}`,
    sourceType: 'owner',
    sourceId: caller.uid,
    actor: { uid: caller.uid, role: caller.role },
    // Positive adjustments count toward progress; negative ones only reduce
    // spendable balance, so history is never rewritten downward.
    mirrorToProgress: delta > 0,
    requireSufficient: delta < 0,
  });

  await writeAuditLog({
    actor: caller,
    action: 'points.adjust',
    targetUserId: userId,
    summary: `${delta > 0 ? '+' : ''}${delta} pts — ${String(reason).trim().slice(0, 140)}`,
    metadata: { delta, balanceAfter: result.balanceAfter, entryId: result.entryId },
  });

  return result;
}

/** OWNER ONLY — change a role, via custom claim + Firestore mirror. */
async function setRole(caller, body) {
  const { userId, role } = body;
  if (!userId || !role) throw new HttpError(400, 'Pick a user and a role.');
  if (!ASSIGNABLE_ROLES.has(role)) {
    throw new HttpError(400, 'That is not a role you can assign.', `role ${role}`);
  }
  if (userId === caller.uid) {
    throw new HttpError(400, 'You cannot change your own role.');
  }

  const target = await authAdmin.getUser(userId).catch(() => null);
  if (!target) throw new HttpError(404, 'That account does not exist.');
  if (target.email === OWNER_EMAIL) {
    throw new HttpError(400, 'The owner account role cannot be changed.');
  }

  const existing = target.customClaims || {};
  await authAdmin.setCustomUserClaims(userId, { ...existing, role });
  // Force re-auth so a demoted admin cannot keep acting on their old token.
  await authAdmin.revokeRefreshTokens(userId);
  await db.collection('users').doc(userId).update({
    role,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog({
    actor: caller,
    action: 'role.set',
    targetUserId: userId,
    summary: `role → ${role}`,
    metadata: { previousRole: existing.role || null, role },
  });

  return { userId, role };
}

/** ADMIN — ban / unban. */
async function setBanned(caller, body) {
  const { userId, banned } = body;
  if (!userId) throw new HttpError(400, 'Pick a user first.');

  const target = await authAdmin.getUser(userId).catch(() => null);
  if (target?.email === OWNER_EMAIL) {
    throw new HttpError(400, 'The owner account cannot be banned.');
  }
  // An admin must not be able to ban their way past the role hierarchy.
  const targetRole = target?.customClaims?.role;
  if (!caller.isOwner && (targetRole === 'admin' || targetRole === 'owner')) {
    throw new HttpError(403, 'Only the owner can suspend an admin account.');
  }

  const isBanned = banned !== false;
  await db.collection('users').doc(userId).update({
    banned: isBanned,
    updatedAt: FieldValue.serverTimestamp(),
  });
  if (isBanned) {
    await authAdmin.revokeRefreshTokens(userId);
  }

  await writeAuditLog({
    actor: caller,
    action: isBanned ? 'user.ban' : 'user.unban',
    targetUserId: userId,
    summary: isBanned ? 'account suspended' : 'suspension lifted',
  });

  return { userId, banned: isBanned };
}

/** STAFF — resolve a flagged submission. Approving pays out through the ledger. */
async function reviewSubmission(caller, body) {
  const { submissionId, decision, note } = body;
  if (!submissionId || !['approved', 'rejected'].includes(decision)) {
    throw new HttpError(400, 'Invalid request.', `decision ${decision}`);
  }

  const subRef = db.collection('submissions').doc(String(submissionId));
  const snap = await subRef.get();
  if (!snap.exists) throw new HttpError(404, 'Submission not found.');
  const sub = snap.data();

  await subRef.update({
    status: decision,
    reviewedBy: caller.uid,
    reviewNote: note ? String(note).slice(0, 500) : null,
    [decision === 'approved' ? 'approvedAt' : 'rejectedAt']: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  let payout = null;
  if (decision === 'approved') {
    const points = Number.isInteger(sub.points) ? sub.points : 50;
    // Same key as the self-serve award path, so a student claim and a staff
    // approval cannot both pay for one submission.
    payout = await applyBalanceChange({
      userId: sub.userId,
      idempotencyKey: `task_award:${submissionId}`,
      type: 'task_award',
      delta: points,
      description: 'Task approved by staff',
      sourceType: 'submission',
      sourceId: String(submissionId),
      mirrorToProgress: true,
      actor: { uid: caller.uid, role: caller.role },
      extraUpdates: {
        totalTasksCompleted: FieldValue.increment(1),
        totalCO2Saved: FieldValue.increment(sub.co2 || 0),
        totalWaterSaved: FieldValue.increment(sub.water || 0),
        totalWasteSaved: FieldValue.increment(sub.waste || 0),
      },
    });
  }

  await writeAuditLog({
    actor: caller,
    action: 'submission.review',
    targetUserId: sub.userId,
    summary: `submission ${submissionId} → ${decision}`,
    metadata: { submissionId, decision, paid: payout ? !payout.duplicate : false },
  });

  return { submissionId, decision, payout };
}

/** OWNER — read the audit log. */
async function listAuditLog(caller, body) {
  const limit = Math.min(Number(body.limit) || 100, 500);
  const snap = await db
    .collection('auditLog')
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();
  return {
    entries: snap.docs.map((d) => {
      const v = d.data();
      return {
        id: d.id,
        ...v,
        createdAt: v.createdAt?.toDate?.()?.toISOString() || null,
      };
    }),
  };
}

/** Who am I, per the server? Lets the UI gate on a verified role. */
async function whoami(caller) {
  return {
    uid: caller.uid,
    email: caller.email,
    role: caller.role,
    isOwner: caller.isOwner,
    isAdmin: caller.isAdmin,
    isStaff: caller.isStaff,
  };
}

const ACTIONS = {
  whoami: { gate: 'user', fn: whoami },
  adjust_points: { gate: 'owner', fn: adjustPoints },
  set_role: { gate: 'owner', fn: setRole },
  list_audit_log: { gate: 'owner', fn: listAuditLog },
  set_banned: { gate: 'admin', fn: setBanned },
  review_submission: { gate: 'staff', fn: reviewSubmission },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const entry = ACTIONS[body.action];
    if (!entry) throw new HttpError(400, 'Unknown action.', `action=${body.action}`);

    const { requireUser } = await import('./_lib/auth.js');
    const gates = {
      user: requireUser,
      staff: requireStaff,
      admin: requireAdmin,
      owner: requireOwner,
    };
    const caller = await gates[entry.gate](req);

    const result = await entry.fn(caller, body);
    return res.status(200).json({ ok: true, ...result });
  } catch (err) {
    if (err instanceof HttpError) {
      console.warn('[admin]', err.status, err.message);
      return res.status(err.status).json({ error: err.publicMessage });
    }
    const errorId = `adm_${Date.now().toString(36)}`;
    console.error('[admin] unhandled', errorId, err);
    return res.status(500).json({ error: 'Something went wrong. Please try again.', errorId });
  }
}
