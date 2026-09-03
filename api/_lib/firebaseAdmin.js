// api/_lib/firebaseAdmin.js
// Single Firebase Admin initialisation shared by every serverless function.
// Files under api/_lib/ are prefixed with `_` so Vercel does not route them.
//
// firebase-admin v14 removed the legacy `admin.*` namespace entirely (only the
// modular `firebase-admin/*` entry points remain) — this file must use those,
// not `admin.apps` / `admin.firestore()` / `admin.auth()` / `admin.credential`,
// which are all `undefined` on this version and throw at import time.

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    // Fail loudly at cold start rather than producing confusing per-request
    // permission errors later.
    throw new Error(
      'Firebase Admin credentials missing. Set FIREBASE_PROJECT_ID, ' +
        'FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.'
    );
  }

  initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  });
}

export const db = getFirestore();
export const authAdmin = getAuth();
export { FieldValue };
