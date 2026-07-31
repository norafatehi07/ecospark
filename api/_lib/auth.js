// api/_lib/auth.js
// Caller authentication + role resolution for the trusted API surface.
//
// The rule for this whole layer: an identity is only ever taken from a verified
// Firebase ID token. Never from a request body, a query param, or an email
// string the client sent us.

import { authAdmin, db } from './firebaseAdmin.js';

/** The single owner account. Also mirrored as a custom claim (source of truth). */
export const OWNER_EMAIL = 'amiteshyadav.yt@gmail.com';

export class HttpError extends Error {
  constructor(status, publicMessage, internal) {
    super(internal || publicMessage);
    this.status = status;
    this.publicMessage = publicMessage;
  }
}

/**
 * Verify the Bearer token on a request and resolve the caller.
 *
 * Role precedence: custom claims win over the Firestore mirror. A claim can
 * only be set with the Admin SDK, whereas a Firestore field is just a document
 * among many — so for anything security-sensitive the claim is authoritative.
 *
 * @returns {Promise<{uid, email, role, isOwner, isAdmin, isStaff, claims}>}
 */
export async function requireUser(req) {
  const header = req.headers.authorization || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) throw new HttpError(401, 'Sign in to continue.', 'missing bearer token');

  let decoded;
  try {
    // checkRevoked: a banned or signed-out user must not keep acting on a
    // token that is still within its hour-long validity window.
    decoded = await authAdmin.verifyIdToken(match[1], true);
  } catch (err) {
    throw new HttpError(401, 'Your session expired. Sign in again.', err.message);
  }

  const uid = decoded.uid;

  // Firestore mirror, used for the ban check and as a fallback for role.
  let profile = null;
  try {
    const snap = await db.collection('users').doc(uid).get();
    profile = snap.exists ? snap.data() : null;
  } catch {
    profile = null;
  }

  if (profile?.banned) {
    throw new HttpError(403, 'This account has been suspended.', `banned uid ${uid}`);
  }

  const claimRole = decoded.role;
  const mirrorRole = profile?.role;

  // The owner claim is the trusted signal. The email comparison is a
  // bootstrap-only fallback so the very first owner can be provisioned before
  // any claim exists; it requires a Firebase-verified email.
  const isOwner =
    claimRole === 'owner' ||
    (decoded.email_verified === true && decoded.email === OWNER_EMAIL);

  const role = isOwner ? 'owner' : claimRole || mirrorRole || 'student';

  return {
    uid,
    email: decoded.email || profile?.email || null,
    role,
    isOwner,
    isAdmin: isOwner || role === 'admin',
    // Teachers and admins both moderate; owner supersedes both.
    isStaff: isOwner || role === 'admin' || role === 'teacher',
    claims: decoded,
  };
}

/** Owner-only gate. Used for points adjustment and role changes. */
export async function requireOwner(req) {
  const caller = await requireUser(req);
  if (!caller.isOwner) {
    throw new HttpError(403, 'This action is restricted to the owner account.', `uid ${caller.uid} role ${caller.role}`);
  }
  return caller;
}

/** Admin-or-owner gate. */
export async function requireAdmin(req) {
  const caller = await requireUser(req);
  if (!caller.isAdmin) {
    throw new HttpError(403, 'You do not have admin access.', `uid ${caller.uid} role ${caller.role}`);
  }
  return caller;
}

/** Staff gate (teacher, admin, owner) for moderation work. */
export async function requireStaff(req) {
  const caller = await requireUser(req);
  if (!caller.isStaff) {
    throw new HttpError(403, 'You do not have permission to do that.', `uid ${caller.uid} role ${caller.role}`);
  }
  return caller;
}
