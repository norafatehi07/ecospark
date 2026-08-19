// scripts/_oracle-flow-test.mjs — temporary: run the exact refresh path the
// browser would run, but with full error capture.
import dotenv from 'dotenv';
dotenv.config();
import { initializeApp } from 'firebase/app';
import {
  getFirestore, collection, getDocs, query, where,
  writeBatch, doc,
} from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const app = initializeApp({
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = getFirestore(app);
await signInWithEmailAndPassword(auth, '916jami@emalupe.com', '916jami@emalupe.com');
console.log('signed in as', auth.currentUser.uid);

// Step 1: read active markets
const existing = await getDocs(query(collection(db, 'oracleMarkets'), where('status', '==', 'active')));
const existingIds = new Set(existing.docs.map(d => d.id));
console.log('existing active markets:', existing.size);

// Step 2: fetch prices
const pricesRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,ripple&vs_currencies=usd&include_24hr_change=true');
const prices = await pricesRes.json();
console.log('BTC price:', prices.bitcoin?.usd);

const COINS = [
  { id: 'bitcoin', sym: 'BTC' }, { id: 'ethereum', sym: 'ETH' },
  { id: 'solana', sym: 'SOL' }, { id: 'ripple', sym: 'XRP' },
];

function cryptoLevel(price) {
  const pct = (Math.random() * 7 - 3.5) / 100;
  const raw = price * (1 + pct);
  if (raw < 1) return Math.round(raw * 1000) / 1000;
  if (raw >= 1000) return Math.round(raw);
  return Math.round(raw * 100) / 100;
}
function cryptoEndTime() {
  const d = new Date(Date.now() + 12 * 3600 * 1000);
  for (let add = 0; add < 3; add++) {
    const day = new Date(d.getTime() + add * 86400 * 1000);
    for (const h of [3, 11, 19]) {
      const t = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, 59, 59));
      if (t.getTime() > Date.now() + 12 * 3600 * 1000) return t;
    }
  }
  return new Date(Date.now() + 2 * 86400 * 1000);
}

const batch = writeBatch(db);
let added = 0;
for (const coin of COINS) {
  const p = prices[coin.id];
  if (!p?.usd) continue;
  const level = cryptoLevel(p.usd);
  const above = p.usd >= level;
  const endTime = cryptoEndTime();
  const endStr = endTime.toISOString().slice(0, 16).replace(/[-:]/g, '').slice(0, 12);
  const id = `crypto_${coin.id}_${above ? 'above' : 'below'}_${level}_${endStr}`;
  if (existingIds.has(id)) continue;
  const market = {
    id, kind: 'crypto', title: `Will ${coin.sym} trade ${above ? 'ABOVE' : 'BELOW'} ${level}?`,
    endTime: endTime.toISOString(), options: [
      { id: 'yes', label: 'YES', totalStaked: 0, initialMultiplier: 2.0, multiplier: 2.0 },
      { id: 'no', label: 'NO', totalStaked: 0, initialMultiplier: 2.0, multiplier: 2.0 },
    ],
    totalStaked: 0, betCount: 0, status: 'active',
    winner: null, settleReason: null, settlementAttempted: false,
    generatedDate: new Date().toISOString().slice(0, 10),
    source: 'test',
  };
  batch.set(doc(db, 'oracleMarkets', id), market);
  added++;
}
console.log('to add:', added);
if (added > 0) {
  try {
    await batch.commit();
    console.log('OK — batch committed');
  } catch (e) {
    console.log('FAIL code=' + e.code, '|', e.message);
  }
} else {
  console.log('nothing new to add (existing covered it)');
}
process.exit(0);
