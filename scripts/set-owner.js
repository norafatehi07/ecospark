// scripts/set-owner.js
// Provisions the single owner account by setting a Firebase Auth custom claim.
//
//   npm run set-owner                      # uses the default owner email
//   npm run set-owner -- someone@else.com  # explicit target
//   npm run set-owner -- --dry-run
//   npm run set-owner -- --revoke user@x   # demote back to admin
//
// Why a custom claim and not just a Firestore field:
// a `role: 'owner'` value in a user document is one document among many, and is
// only as safe as the rules protecting it. A custom claim can be written *only*
// with the Admin SDK, travels inside the signed ID token, and is verified
// server-side on every request (api/_lib/auth.js). That is the right level of
// trust for the most powerful account in the system.
//
// The Firestore `role` field is still mirrored, because the UI reads it for
// convenience — but it is a mirror, never the source of truth.

import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Keep in sync with OWNER_EMAIL in api/_lib/auth.js
const DEFAULT_OWNER_EMAIL = 'amiteshyadav.yt@gmail.com';

const argv = process.argv.slice(2);
const dryRun = argv.includes('--dry-run');
const revokeIdx = argv.indexOf('--revoke');
const revoking = revokeIdx !== -1;

// First non-flag argument, if any.
const explicitEmail = argv.find((a, i) => !a.startsWith('--') && i !== revokeIdx - 1) || null;
const email = (revoking ? argv[revokeIdx + 1] : explicitEmail) || DEFAULT_OWNER_EMAIL;

function fail(message) {
  console.error(`\n  ✖ ${message}\n`);
  process.exit(1);
}

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !privateKey) {
  fail(
    'Firebase Admin credentials missing. Copy .env.example to .env and set\n' +
      '    FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.'
  );
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function main() {
  const targetRole = revoking ? 'admin' : 'owner';

  console.log(`\n  EcoSpark — owner provisioning`);
  console.log(`  ─────────────────────────────`);
  console.log(`  project : ${process.env.FIREBASE_PROJECT_ID}`);
  console.log(`  account : ${email}`);
  console.log(`  action  : ${revoking ? 'REVOKE owner → admin' : 'GRANT owner'}`);
  if (dryRun) console.log(`  mode    : DRY RUN — nothing will be written`);
  console.log('');

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      fail(
        `No Firebase Auth user with email ${email}.\n` +
          `    The account must sign in to the app at least once before it can be\n` +
          `    promoted — this script grants a claim, it does not create accounts.`
      );
    }
    throw err;
  }

  const existing = user.customClaims || {};
  console.log(`  uid            : ${user.uid}`);
  console.log(`  email verified : ${user.emailVerified}`);
  console.log(`  current claims : ${JSON.stringify(existing)}`);

  if (!revoking && !user.emailVerified) {
    // The bootstrap fallback in api/_lib/auth.js requires a verified email, so
    // an unverified owner would be unable to use the email-based path at all.
    console.warn(
      `\n  ! This account's email is not verified. The claim will still be set and\n` +
        `    is authoritative, but the email-based bootstrap fallback will not apply.`
    );
  }

  if (existing.role === targetRole) {
    console.log(`\n  ✓ Already ${targetRole}. Nothing to do.\n`);
    return;
  }

  if (dryRun) {
    console.log(`\n  Would set custom claim role="${targetRole}" and mirror to users/${user.uid}.\n`);
    return;
  }

  // Preserve any unrelated claims rather than clobbering the object.
  await auth.setCustomUserClaims(user.uid, { ...existing, role: targetRole });

  // Mirror for the UI. Source of truth remains the claim.
  await db
    .collection('users')
    .doc(user.uid)
    .set(
      { role: targetRole, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
      { merge: true }
    );

  await db.collection('auditLog').add({
    actorId: 'script:set-owner',
    actorEmail: null,
    actorRole: 'system',
    action: revoking ? 'revoke_owner' : 'grant_owner',
    targetUserId: user.uid,
    summary: `${email} → ${targetRole} via scripts/set-owner.js`,
    metadata: { email, previousClaims: existing },
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`\n  ✓ ${email} is now "${targetRole}".`);
  console.log(
    `\n  The claim rides in the ID token, which is cached for up to an hour.\n` +
      `  Sign out and back in (or call getIdToken(true)) to pick it up immediately.\n`
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('\n  ✖ Failed:', err.message);
    process.exit(1);
  });
