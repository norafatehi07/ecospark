// src/services/oracleService.js
// Polymarket-style prediction market service backed by Firestore.
// All users share the same live markets; bets are per-user on their profile.

import { db } from '../lib/firebase';
import {
  collection, getDocs, doc, getDoc, setDoc, updateDoc, query,
  where, orderBy, limit, writeBatch, serverTimestamp, increment
} from 'firebase/firestore';
import { generateOracleMarkets, settleOracleMarket } from './aiService';

const MARKETS_COL = 'oracleMarkets';
const USERS_COL = 'users';
const HOUSE_EDGE = 0.95; // 5% take
export const MIN_BET = 50;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Recalculate dynamic multipliers based on current staking distribution.
 * Formula mirrors basic prediction market AMM:
 *   multiplier = (totalPool / optionStaked) * HOUSE_EDGE
 * Floored at 1.05x; capped at 10x.
 */
export function recalculateMultipliers(options) {
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

/**
 * Get probability % for each option based on staked amounts (sums to 100).
 */
export function getOptionProbabilities(options) {
  const total = options.reduce((s, o) => s + (o.totalStaked || 0), 0);
  if (total === 0) {
    const pct = Math.round(100 / options.length);
    return options.map(() => pct);
  }
  return options.map(opt => Math.round(((opt.totalStaked || 0) / total) * 100));
}

// ─── Market CRUD ────────────────────────────────────────────────────────────

export async function getActiveOracleMarkets() {
  const q = query(
    collection(db, MARKETS_COL),
    where('status', '==', 'active'),
    orderBy('endTime', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getRecentSettledMarkets() {
  const q = query(
    collection(db, MARKETS_COL),
    where('status', '==', 'settled'),
    orderBy('settledAt', 'desc'),
    limit(10)
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/**
 * Check if today's markets already exist. If not, generate them via Gemini AI
 * and write to Firestore. Returns the list of active markets.
 */
export async function refreshOracleMarketsIfStale() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const existingQ = query(
    collection(db, MARKETS_COL),
    where('status', '==', 'active'),
    where('generatedDate', '==', today)
  );
  const existingSnap = await getDocs(existingQ);

  let markets = existingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (markets.length > 0) return markets;

  // Generate fresh markets via Gemini
  console.log('[Oracle] Generating new AI markets for', today);
  const generated = await generateOracleMarkets();
  const batch = writeBatch(db);
  markets = [];

  for (const m of generated) {
    const mId = `market_${today}_${m.id || Math.random().toString(36).slice(2, 8)}`;
    const mRef = doc(db, MARKETS_COL, mId);
    const endTime = m.endTime || new Date(Date.now() + 86400000 * (Math.floor(Math.random() * 6) + 2)).toISOString();
    const market = {
      id: mId,
      title: m.title,
      description: m.description || '',
      category: m.category || 'Eco',
      emoji: m.emoji || '🌿',
      tags: m.tags || [],
      options: (m.options || []).map(o => ({
        id: o.id,
        label: o.label,
        totalStaked: 0,
        initialMultiplier: o.multiplier || 2.0,
        multiplier: o.multiplier || 2.0,
      })),
      totalStaked: 0,
      betCount: 0,
      status: 'active',
      winner: null,
      settleReason: null,
      endTime,
      generatedDate: today,
      settlementAttempted: false,
      settledAt: null,
      source: 'AI — Gemini Flash eco news',
    };
    batch.set(mRef, market);
    markets.push(market);
  }

  await batch.commit();
  console.log(`[Oracle] Created ${markets.length} new markets`);
  return markets;
}

// ─── Betting ─────────────────────────────────────────────────────────────────

export async function placeBetOnMarket({ userId, profile, marketId, optionId, amount }) {
  if (!profile || !userId) throw new Error('Not authenticated');
  if (amount < MIN_BET) throw new Error(`Minimum bet is ${MIN_BET} pts`);
  if ((profile.spendableBalance || 0) < amount) throw new Error('Not enough spendable points');

  const marketRef = doc(db, MARKETS_COL, marketId);
  const marketSnap = await getDoc(marketRef);
  if (!marketSnap.exists()) throw new Error('Market not found');

  const market = { id: marketSnap.id, ...marketSnap.data() };
  if (market.status !== 'active') throw new Error('Market is no longer accepting bets');
  if (new Date(market.endTime) <= new Date()) throw new Error('Market has closed for new bets');

  const option = market.options.find(o => o.id === optionId);
  if (!option) throw new Error('Invalid option');

  // Calculate current multiplier using live odds
  const updatedOptions = recalculateMultipliers(market.options);
  const currentOpt = updatedOptions.find(o => o.id === optionId);
  const multiplier = currentOpt?.multiplier || option.initialMultiplier || 2.0;
  const potentialWin = Math.round(amount * multiplier);

  const batch = writeBatch(db);

  // Update market: increment the chosen option's totalStaked
  const optionUpdates = {};
  market.options.forEach((o, idx) => {
    if (o.id === optionId) {
      optionUpdates[`options.${idx}.totalStaked`] = increment(amount);
    }
  });
  batch.update(marketRef, {
    ...optionUpdates,
    totalStaked: increment(amount),
    betCount: increment(1),
  });

  // Prepare new bet record
  const newBet = {
    id: `bet_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    marketId,
    title: market.title,
    category: market.category,
    emoji: market.emoji || '🔮',
    optionId,
    option: option.label,
    amount,
    multiplierAtBet: multiplier,
    potentialWin,
    status: 'pending',
    date: new Date().toISOString(),
    settledAt: null,
    resultReason: null,
    endTime: market.endTime,
  };

  // Deduct points + append bet to user profile
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

/**
 * Find all of the current user's pending bets on expired markets,
 * settle those markets via Gemini AI, and update their bet outcomes.
 * Returns an object with settled markets and points awarded.
 */
export async function settleExpiredMarketsForUser(userId, profile) {
  if (!profile || !userId) return { settled: [], pointsAwarded: 0 };

  const now = new Date();
  const pendingBets = (profile.arenaBets || []).filter(b => b.status === 'pending');
  if (pendingBets.length === 0) return { settled: [], pointsAwarded: 0 };

  // Find unique expired market IDs from pending bets
  const expiredMarketIds = [...new Set(
    pendingBets
      .filter(b => b.endTime && new Date(b.endTime) <= now)
      .map(b => b.marketId)
  )];

  if (expiredMarketIds.length === 0) return { settled: [], pointsAwarded: 0 };

  const settled = [];

  for (const marketId of expiredMarketIds) {
    try {
      const marketRef = doc(db, MARKETS_COL, marketId);
      const marketSnap = await getDoc(marketRef);
      if (!marketSnap.exists()) continue;

      const market = { id: marketSnap.id, ...marketSnap.data() };

      let winner = market.winner;
      let settleReason = market.settleReason;

      if (market.status !== 'settled' && !market.settlementAttempted) {
        // Mark as attempted to prevent double-settle races
        await updateDoc(marketRef, { settlementAttempted: true });

        const result = await settleOracleMarket(
          market.title,
          market.category,
          market.options.map(o => ({ id: o.id, label: o.label }))
        );
        winner = result.winnerId;
        settleReason = result.reason;

        await updateDoc(marketRef, {
          status: 'settled',
          winner,
          settleReason,
          settledAt: serverTimestamp(),
        });
      }

      if (!winner) continue;

      const winnerOption = market.options.find(o => o.id === winner);
      settled.push({
        marketId,
        title: market.title,
        winner,
        winnerLabel: winnerOption?.label || winner,
        settleReason,
      });
    } catch (err) {
      console.error('[Oracle] Settlement failed for market', marketId, err);
    }
  }

  if (settled.length === 0) return { settled: [], pointsAwarded: 0 };

  const settledMap = {};
  settled.forEach(s => { settledMap[s.marketId] = s; });

  let pointsToAdd = 0;
  const updatedBets = (profile.arenaBets || []).map(bet => {
    const s = settledMap[bet.marketId];
    if (!s || bet.status !== 'pending') return bet;

    const won = bet.optionId === s.winner;
    if (won) pointsToAdd += bet.potentialWin;

    return {
      ...bet,
      status: won ? 'won' : 'lost',
      resultReason: s.settleReason,
      settledAt: new Date().toISOString(),
    };
  });

  const userRef = doc(db, USERS_COL, userId);
  const updates = { arenaBets: updatedBets };
  if (pointsToAdd > 0) {
    updates.points = increment(pointsToAdd);
    updates.lifetimePoints = increment(pointsToAdd);
    updates.weeklyPoints = increment(pointsToAdd);
    updates.spendableBalance = increment(pointsToAdd);
  }
  await updateDoc(userRef, updates);

  return { settled, pointsAwarded: pointsToAdd };
}

