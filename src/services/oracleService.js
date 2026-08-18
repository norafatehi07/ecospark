// src/services/oracleService.js
// Polymarket-style prediction markets backed by Firestore, with REAL data:
//
//   · Crypto markets are built from LIVE CoinGecko prices — the strike level
//     is derived from the actual price at generation time, and settlement is
//     the actual CoinGecko price at close. No AI involved, nothing invented.
//   · Event markets are generated from Gemini WITH live web search grounding
//     and settled by re-searching the resolution question at expiry. Only
//     high-confidence, source-backed verdicts settle; anything else voids the
//     market and refunds every stake.
//   · Everything is realtime: markets, odds and volumes arrive via onSnapshot,
//     so the board updates the moment anyone anywhere places a bet.
//
// All users share the same live markets; bets live on each user's profile.

import { db } from '../lib/firebase';
import {
  collection, getDocs, doc, getDoc, setDoc, updateDoc, query,
  where, orderBy, limit, writeBatch, runTransaction, onSnapshot,
  serverTimestamp, increment
} from 'firebase/firestore';
import { generateOracleMarkets, settleOracleMarket } from './aiService';

const MARKETS_COL = 'oracleMarkets';
const USERS_COL = 'users';
const HOUSE_EDGE = 0.95; // 5% platform take baked into payouts
export const MIN_BET = 50;
export const MAX_BET = 5000;
// CoinGecko free tier is rate limited — cap how many crypto markets we mint.
const CRYPTO_POOL_CAP = 4;

// ─── Odds engine ─────────────────────────────────────────────────────────────

/**
 * Recalculate dynamic multipliers based on current staking distribution.
 * Formula mirrors a basic prediction-market AMM:
 *   multiplier = (totalPool / optionStaked) * HOUSE_EDGE
 * Floored at 1.05x; capped at 10x. As more money backs one side, its
 * multiplier falls and the other side's rises — odds move live with the bets.
 */
export function recalculateMultipliers(options) {
  if (!Array.isArray(options)) return [];
  const total = options.reduce((s, o) => s + (o.totalStaked || 0), 0);
  if (total === 0) {
    return options.map(o => ({ ...o, multiplier: o.initialMultiplier || 2.0 }));
  }
  return options.map(opt => {
    const staked = opt.totalStaked || 0;
    if (staked === 0) return { ...opt, multiplier: (opt.initialMultiplier || 2.0) };
    const raw = (total / staked) * HOUSE_EDGE;
    const mult = Math.max(1.05, Math.min(10, Math.round(raw * 100) / 100));
    return { ...opt, multiplier: mult };
  });
}

/** Implied probability % per option based on staked amounts (sums ≈ 100). */
export function getOptionProbabilities(options) {
  if (!Array.isArray(options)) return [];
  const total = options.reduce((s, o) => s + (o.totalStaked || 0), 0);
  if (total === 0) {
    const pct = Math.round(100 / options.length);
    return options.map(() => pct);
  }
  return options.map(opt => Math.round(((opt.totalStaked || 0) / total) * 100));
}

// ─── Live subscriptions (realtime) ──────────────────────────────────────────

/** Subscribe to all active markets — fires whenever odds/volumes change.
 *  No composite index: equality filter only, sorted in memory. */
export function subscribeActiveMarkets(callback, onError) {
  const q = query(collection(db, MARKETS_COL), where('status', '==', 'active'));
  return onSnapshot(q, (snap) => {
    const markets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    markets.sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
    callback(markets);
  }, onError);
}

/** Subscribe to the most recently settled/voided markets.
 *  orderBy on a single field needs no composite index; docs without a
 *  settledAt (still active) are excluded by the query itself. */
export function subscribeRecentMarkets(callback, onError, count = 8) {
  const q = query(collection(db, MARKETS_COL), orderBy('settledAt', 'desc'), limit(count));
  return onSnapshot(q, (snap) => {
    callback(snap.docs
      .filter(d => ['settled', 'voided'].includes(d.data().status))
      .map(d => ({ id: d.id, ...d.data() })));
  }, onError);
}

/** One-shot read of active markets (used by refresh logic). */
export async function getActiveOracleMarkets() {
  const snap = await getDocs(query(collection(db, MARKETS_COL), where('status', '==', 'active')));
  const markets = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  markets.sort((a, b) => new Date(a.endTime) - new Date(b.endTime));
  return markets;
}

// ─── Live crypto prices (CoinGecko, free, no key) ───────────────────────────

const COINS = [
  { id: 'bitcoin',  sym: 'BTC', emoji: '₿' },
  { id: 'ethereum', sym: 'ETH', emoji: 'Ξ' },
  { id: 'solana',   sym: 'SOL', emoji: '◎' },
  { id: 'ripple',   sym: 'XRP', emoji: '✕' },
];

/** Fetch live USD prices + 24h change for the tracked coins. */
export async function fetchCryptoPrices() {
  const ids = COINS.map(c => c.id).join(',');
  const res = await fetch(
    `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);
  return res.json();
}

function fmtUsd(v) {
  if (v >= 1000) return '$' + Math.round(v).toLocaleString('en-US');
  if (v >= 1) return '$' + v.toFixed(2);
  return '$' + v.toFixed(4);
}

/**
 * Strike level for a crypto market. Positioned NEAR the current price so the
 * outcome is genuinely uncertain — not 25% below (which would make every ABOVE
 * market a guaranteed win). We pick a small random offset in [-3.5%, +3.5%]
 * of the current price and lay the strike on one side, so YES/NO are roughly
 * 50/50 at generation and price moves decide the result.
 */
function cryptoLevel(price) {
  const pct = (Math.random() * 7 - 3.5) / 100; // signed, range -3.5% … +3.5%
  const raw = price * (1 + pct);
  if (raw < 1) return Math.round(raw * 1000) / 1000;
  if (raw >= 1000) return Math.round(raw);
  return Math.round(raw * 100) / 100;
}

/** Next daily close from the fixed UTC hours [3, 11, 19], at least 12h out. */
function cryptoEndTime() {
  const d = new Date(Date.now() + 12 * 3600 * 1000);
  for (let add = 0; add < 3; add++) {
    const day = new Date(d.getTime() + add * 86400 * 1000);
    const hours = [3, 11, 19];
    for (const h of hours) {
      const t = new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h, 59, 59));
      if (t.getTime() > Date.now() + 12 * 3600 * 1000) return t;
    }
  }
  return new Date(Date.now() + 2 * 86400 * 1000);
}

function baseOptions() {
  return [
    { id: 'yes', label: 'YES', totalStaked: 0, initialMultiplier: 2.0, multiplier: 2.0 },
    { id: 'no', label: 'NO', totalStaked: 0, initialMultiplier: 2.0, multiplier: 2.0 },
  ];
}

function fmtCloseLabel(endTime) {
  const d = new Date(endTime);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', timeZoneName: 'short'
  });
}

/** Build crypto market documents from live prices. Pure data — no AI. */
function buildCryptoMarkets(prices) {
  const now = Date.now();
  const markets = [];
  for (const coin of COINS) {
    const p = prices?.[coin.id];
    if (!p || typeof p.usd !== 'number') continue;
    const price = p.usd;
    const chg = p.usd_24h_change || 0;
    const level = cryptoLevel(price);
    const above = price >= level;
    const endTime = cryptoEndTime();
    const closeLabel = fmtCloseLabel(endTime);
    const endStr = endTime.toISOString().slice(0, 16).replace(/[-:]/g, '').slice(0, 12);

    markets.push({
      id: `crypto_${coin.id}_${above ? 'above' : 'below'}_${level}_${endStr}`,
      kind: 'crypto',
      title: `Will ${coin.sym} trade ${above ? 'ABOVE' : 'BELOW'} ${fmtUsd(level)} at ${closeLabel}?`,
      description: `${coin.sym} is live at ${fmtUsd(price)} (24h ${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%). Settles on the real CoinGecko price at close — strike fixed at ${fmtUsd(level)} from today's price.`,
      category: 'Crypto Prices',
      emoji: coin.emoji,
      endTime: endTime.toISOString(),
      crypto: {
        coinId: coin.id,
        symbol: coin.sym,
        level,
        above,
        basePrice: price,
        base24h: Math.round(chg * 10) / 10,
        feed: 'coingecko',
      },
      options: baseOptions(),
      totalStaked: 0,
      betCount: 0,
      status: 'active',
      winner: null,
      settleReason: null,
      settlementAttempted: false,
      settlementAttempts: 0,
      settledAt: null,
      generatedDate: new Date().toISOString().slice(0, 10),
      source: 'CoinGecko live prices',
    });
  }
  return markets.slice(0, CRYPTO_POOL_CAP);
}

/**
 * Settle a crypto market from the ACTUAL CoinGecko price at/after close.
 * Uses the hourly chart so we read the price at the deadline itself, not
 * whatever it is when settlement happens to run. Zero AI, zero guessing.
 *
 * @returns {Promise<{result:'yes'|'no'|'undecided', price?:number, reason:string, sources:string[]}>}
 */
export async function settleCryptoMarket(market) {
  const { coinId, symbol, level, above } = market.crypto || {};
  if (!coinId) return { result: 'undecided', reason: 'Market is missing its price feed metadata', sources: [] };

  const endMs = new Date(market.endTime).getTime();
  const days = Math.max(2, Math.ceil((Date.now() - endMs) / 86400000) + 1);
  const res = await fetch(
    `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=hourly`,
    { signal: AbortSignal.timeout(15000) }
  );
  if (!res.ok) return { result: 'undecided', reason: `Price feed error (HTTP ${res.status})`, sources: [] };

  const data = await res.json();
  const prices = data.prices || []; // [[ts, price], ...] hourly, ascending
  if (!prices.length) return { result: 'undecided', reason: 'Price feed returned no data', sources: [] };

  // Latest sample at or before the deadline.
  let sample = null;
  for (const [ts, price] of prices) {
    if (ts <= endMs + 10 * 60 * 1000) sample = { ts, price };
    else break;
  }
  if (!sample) return { result: 'undecided', reason: 'No price data at the deadline yet', sources: [] };

  const met = above ? sample.price > level : sample.price < level;
  return {
    result: met ? 'yes' : 'no',
    price: sample.price,
    confidence: 1,
    reason: `${symbol} was ${fmtUsd(sample.price)} at close — ${met ? 'on the winning side of' : 'short of'} the ${fmtUsd(level)} strike.`,
    sources: [`https://www.coingecko.com/en/coins/${coinId}`],
  };
}

// ─── Market refresh ─────────────────────────────────────────────────────────

const normalizeTitle = (t) => (t || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Keep the board populated with REAL markets:
 *  · ≥2 crypto markets from live CoinGecko prices whenever the feed answers
 *  · ≥2 event markets from search-grounded Gemini (topped up when thin)
 * Never returns fakes: if both sources fail, the board simply stays as-is.
 * Realtime listeners then surface everything the moment docs are written.
 */
export async function refreshOracleMarketsIfStale() {
  const existing = await getActiveOracleMarkets();
  const existingIds = new Set(existing.map(m => m.id));
  const existingTitles = new Set(existing.map(m => normalizeTitle(m.title)));

  const cryptoActive = existing.filter(m => m.kind === 'crypto').length;
  const eventActive = existing.filter(m => m.kind !== 'crypto').length;

  const batch = writeBatch(db);
  let added = 0;

  // 1. Crypto markets from live prices (primary, deterministic).
  if (cryptoActive < 2) {
    try {
      const prices = await fetchCryptoPrices();
      for (const market of buildCryptoMarkets(prices)) {
        if (existingIds.has(market.id)) continue;
        batch.set(doc(db, MARKETS_COL, market.id), market);
        existingIds.add(market.id);
        added++;
      }
    } catch (err) {
      console.warn('[Oracle] Live price feed unavailable:', err.message);
    }
  }

  // 2. Event markets from live-web-grounded Gemini (only when the board is thin).
  if (eventActive < 2) {
    try {
      const generated = await generateOracleMarkets([...existing].map(m => m.title));
      for (const g of generated) {
        const key = normalizeTitle(g.title);
        if (!key || existingTitles.has(key)) continue;
        const mId = `event_${Date.now().toString(36)}_${g.id}_${Math.random().toString(36).slice(2, 6)}`;
        batch.set(doc(db, MARKETS_COL, mId), {
          ...g,
          id: mId,
          options: baseOptions(),
          totalStaked: 0,
          betCount: 0,
          status: 'active',
          winner: null,
          settleReason: null,
          settlementAttempted: false,
          settlementAttempts: 0,
          settledAt: null,
          generatedDate: new Date().toISOString().slice(0, 10),
          source: 'Gemini live search',
        });
        existingTitles.add(key);
        added++;
      }
    } catch (err) {
      console.warn('[Oracle] Grounded event generation unavailable:', err.message);
    }
  }

  if (added > 0) {
    await batch.commit();
    console.log(`[Oracle] ${added} new real market(s) published`);
  }
}

// ─── Betting ─────────────────────────────────────────────────────────────────

export async function placeBetOnMarket({ userId, profile, marketId, optionId, amount }) {
  if (!profile || !userId) throw new Error('Not authenticated');
  if (amount < MIN_BET) throw new Error(`Minimum bet is ${MIN_BET} pts`);
  if (amount > MAX_BET) throw new Error(`Maximum bet is ${MAX_BET.toLocaleString()} pts per market`);
  if ((profile.spendableBalance || 0) < amount) throw new Error('Not enough spendable points');

  const marketRef = doc(db, MARKETS_COL, marketId);
  const marketSnap = await getDoc(marketRef);
  if (!marketSnap.exists()) throw new Error('Market not found');

  const market = { id: marketSnap.id, ...marketSnap.data() };
  if (market.status !== 'active') throw new Error('Market is no longer accepting bets');
  if (new Date(market.endTime) <= new Date()) throw new Error('Market has closed for new bets');
  
  // Ensure options is an array
  if (!Array.isArray(market.options)) throw new Error('Market options data is corrupted');
  
  const option = market.options.find(o => o.id === optionId);
  if (!option) throw new Error('Invalid option');

  // Live odds at the moment of betting.
  const updatedOptions = recalculateMultipliers(market.options);
  const currentOpt = updatedOptions.find(o => o.id === optionId);
  const multiplier = currentOpt?.multiplier || option.initialMultiplier || 2.0;
  const potentialWin = Math.round(amount * multiplier);

  const batch = writeBatch(db);

  const optionUpdates = {};
  market.options.forEach((o, idx) => {
    if (o.id === optionId) optionUpdates[`options.${idx}.totalStaked`] = increment(amount);
  });
  batch.update(marketRef, {
    ...optionUpdates,
    totalStaked: increment(amount),
    betCount: increment(1),
  });

  const newBet = {
    id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    marketId,
    title: market.title,
    category: market.category,
    emoji: market.emoji || '🔮',
    kind: market.kind || 'event',
    optionId,
    option: option.label,
    amount,
    multiplier,
    potentialWin,
    status: 'pending',
    date: new Date().toISOString(),
    settledAt: null,
    resultReason: null,
    endTime: market.endTime,
  };

  const userRef = doc(db, USERS_COL, userId);
  const existingBets = profile.arenaBets || [];
  batch.update(userRef, {
    spendableBalance: increment(-amount),
    arenaBets: [newBet, ...existingBets],
  });

  await batch.commit();
  return { bet: newBet, multiplier, potentialWin };
}

// ─── Settlement ──────────────────────────────────────────────────────────────

const MAX_SETTLE_ATTEMPTS = 5;
const SETTLE_RETRY_GAP_MS = 60 * 60 * 1000; // don't re-hit APIs more than once/hour

/**
 * Resolve this user's pending bets on expired markets.
 *
 * Each market is settled from real data at expiry:
 *  · crypto  → actual CoinGecko price at the deadline
 *  · event   → search-grounded Gemini verdict with cited sources
 *
 * Only a high-confidence verdict pays out. Insufficient evidence voids the
 * market and refunds every stake in full — a bet is never settled by guessing.
 * Returns { settled: [...], pointsAwarded, refunded, outcomes }.
 */
export async function settleExpiredMarketsForUser(userId, profile) {
  if (!profile || !userId) return { settled: [], pointsAwarded: 0, refunded: 0, outcomes: {} };

  const now = new Date();
  const pendingBets = (profile.arenaBets || []).filter(b => b.status === 'pending');
  if (pendingBets.length === 0) return { settled: [], pointsAwarded: 0, refunded: 0, outcomes: {} };

  const expiredMarketIds = [...new Set(
    pendingBets
      .filter(b => b.endTime && new Date(b.endTime) <= now)
      .map(b => b.marketId)
  )];
  if (expiredMarketIds.length === 0) return { settled: [], pointsAwarded: 0, refunded: 0, outcomes: {} };

  // marketId → { status: 'settled'|'voided', winner, reason, sources, price }
  const outcomes = {};

  for (const marketId of expiredMarketIds) {
    try {
      const marketRef = doc(db, MARKETS_COL, marketId);
      const marketSnap = await getDoc(marketRef);

      if (!marketSnap.exists()) {
        outcomes[marketId] = { status: 'voided', reason: 'Market no longer exists — stakes refunded' };
        continue;
      }

      const market = { id: marketSnap.id, ...marketSnap.data() };

      if (market.status === 'settled') {
        outcomes[marketId] = {
          status: 'settled', winner: market.winner,
          reason: market.settleReason || '', sources: market.settleSources || [],
          price: market.settlePrice ?? null,
        };
        continue;
      }
      if (market.status === 'voided') {
        outcomes[marketId] = { status: 'voided', reason: market.settleReason || 'Market voided — stakes refunded' };
        continue;
      }

      // Rate-limit settlement attempts; after MAX tries, void + refund.
      const attempts = market.settlementAttempts || 0;
      const lastAttempt = market.lastSettleAttemptAt?.toMillis?.() || 0;
      if (attempts >= MAX_SETTLE_ATTEMPTS) {
        await updateDoc(marketRef, {
          status: 'voided',
          settleReason: `Could not establish a verified outcome after ${attempts} attempts — all stakes refunded`,
          settledAt: serverTimestamp(),
        });
        outcomes[marketId] = { status: 'voided', reason: 'Outcome could not be verified — stakes refunded' };
        continue;
      }
      if (attempts > 0 && Date.now() - lastAttempt < SETTLE_RETRY_GAP_MS) {
        continue; // wait out the retry gap
      }

      await updateDoc(marketRef, {
        settlementAttempted: true,
        settlementAttempts: attempts + 1,
        lastSettleAttemptAt: serverTimestamp(),
      });

      const verdict = market.kind === 'crypto'
        ? await settleCryptoMarket(market)
        : await settleOracleMarket(market);

      if (verdict.result === 'undecided') {
        await updateDoc(marketRef, {
          status: 'voided',
          settleReason: verdict.reason || 'Outcome could not be verified at expiry — stakes refunded',
          settleSources: verdict.sources || [],
          settledAt: serverTimestamp(),
        });
        outcomes[marketId] = { status: 'voided', reason: verdict.reason || 'Outcome not verified — stakes refunded', sources: verdict.sources || [] };
      } else {
        await updateDoc(marketRef, {
          status: 'settled',
          winner: verdict.result,
          settleReason: verdict.reason,
          settleSources: verdict.sources || [],
          settlePrice: verdict.price ?? null,
          settledAt: serverTimestamp(),
        });
        outcomes[marketId] = {
          status: 'settled', winner: verdict.result,
          reason: verdict.reason, sources: verdict.sources || [], price: verdict.price ?? null,
        };
      }
    } catch (err) {
      console.error('[Oracle] Settlement failed for market', marketId, err);
    }
  }

  if (Object.keys(outcomes).length === 0) return { settled: [], pointsAwarded: 0, refunded: 0, outcomes };

  // Apply this user's winnings/refunds atomically so a retry can't double-pay.
  const userRef = doc(db, USERS_COL, userId);
  const result = await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists()) throw new Error('Account not found');
    const current = snap.data();

    const bets = current.arenaBets || [];
    let pointsAwarded = 0;
    let refunded = 0;
    const settledMarkets = [];

    const updated = bets.map(bet => {
      const out = outcomes[bet.marketId];
      if (!out || bet.status !== 'pending' || !bet.endTime || new Date(bet.endTime) > now) return bet;

      if (out.status === 'voided') {
        refunded += bet.amount;
        settledMarkets.push({ marketId: bet.marketId, title: bet.title, outcome: 'voided', reason: out.reason });
        return { ...bet, status: 'voided', resultReason: out.reason, settledAt: new Date().toISOString() };
      }

      const won = bet.optionId === out.winner;
      if (won) pointsAwarded += bet.potentialWin;
      settledMarkets.push({
        marketId: bet.marketId, title: bet.title,
        outcome: won ? 'won' : 'lost', reason: out.reason,
        price: out.price,
      });
      return {
        ...bet,
        status: won ? 'won' : 'lost',
        resultReason: out.reason,
        settlePrice: out.price ?? null,
        settledAt: new Date().toISOString(),
      };
    });

    const updates = { arenaBets: updated, updatedAt: serverTimestamp() };
    if (pointsAwarded > 0) {
      updates.points = increment(pointsAwarded);
      updates.lifetimePoints = increment(pointsAwarded);
      updates.weeklyPoints = increment(pointsAwarded);
      updates.spendableBalance = increment(pointsAwarded);
    } else if (refunded > 0) {
      updates.spendableBalance = increment(refunded);
    }
    tx.update(userRef, updates);
    return { pointsAwarded, refunded, settledMarkets };
  });

  // History mirrors (best effort; not part of the atomic block).
  try {
    if (result.pointsAwarded > 0) {
      await setDoc(doc(collection(db, 'transactions')), {
        userId, type: 'earned', amount: result.pointsAwarded,
        description: `Oracle market winnings (${result.settledMarkets.length} market${result.settledMarkets.length > 1 ? 's' : ''})`,
        createdAt: serverTimestamp(),
      });
    }
    if (result.refunded > 0) {
      await setDoc(doc(collection(db, 'transactions')), {
        userId, type: 'refund', amount: result.refunded,
        description: 'Oracle market voided — stakes refunded',
        createdAt: serverTimestamp(),
      });
    }
  } catch { /* history mirror is cosmetic */ }

  return {
    settled: result.settledMarkets,
    pointsAwarded: result.pointsAwarded,
    refunded: result.refunded,
    outcomes,
  };
}
