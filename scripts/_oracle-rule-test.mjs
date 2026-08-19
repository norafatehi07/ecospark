// scripts/_oracle-rule-test.mjs — temporary: write one oracleMarket with the
// test user's ID token and surface the real Firestore error.
import dotenv from 'dotenv';
dotenv.config();
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);

const cred = await signInWithEmailAndPassword(auth, '916jami@emalupe.com', '916jami@emalupe.com');
console.log('signed in as', cred.user.uid);

const mkt = {
  id: 'rule_test_' + Date.now(),
  status: 'active',
  options: [
    { id: 'yes', label: 'YES', totalStaked: 0, initialMultiplier: 2.0, multiplier: 2.0 },
    { id: 'no', label: 'NO', totalStaked: 0, initialMultiplier: 2.0, multiplier: 2.0 },
  ],
  endTime: new Date(Date.now() + 86400000).toISOString(),
  totalStaked: 0,
  betCount: 0,
  winner: null,
  settleReason: null,
  title: 'RULE TEST',
  category: 'Test',
  source: 'manual',
};

try {
  await setDoc(doc(db, 'oracleMarkets', mkt.id), mkt);
  console.log('OK — write succeeded:', mkt.id);
} catch (e) {
  console.log('FAIL code=' + e.code);
  console.log('  message:', e.message);
}
process.exit(0);
