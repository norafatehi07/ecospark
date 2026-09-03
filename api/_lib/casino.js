// api/_lib/casino.js
// Server-authoritative Mines / Dice / Crash — the trusted half of the
// provably-fair scheme (api/_lib/provablyFair.js holds the crypto; this file
// holds the game rules, bet validation, and ledger wiring).
//
// Design, in one paragraph: every user has ONE server-seed/client-seed/nonce
// triple (src/lib/provablyFairMath.js has the shared formulas). A bet consumes
// the next nonce inside a transaction, derives its outcome from
// HMAC(serverSeed, clientSeed:nonce[:cursor]) — never from Math.random() — and
// only THEN calls the same ledger primitive every other Arena feature uses
// (applyBalanceChange). Secrets never enter a Firestore document a client can
// read: the active server seed lives only in provablyFairSecrets/{uid}
// (allow read: if false), and per-round secrets (Mines' mine layout, Crash's
// crash point) are re-derived on demand from that seed rather than ever being
// persisted while the round is live — so there is nothing for a client to
// read early even if it inspects its own casinoRounds doc mid-round.
//
// Crash is deliberately single-player (you vs. the house), not the
// multiplayer shared-round mode Stake runs — that mode needs a live ticking
// server pushing the same clock to every spectator, which this stack has no
// infrastructure for (no websockets, Vercel Hobby cron is once-per-day). A
// single-player round is still genuinely provably fair and still has the same
// rising-curve tension: the crash instant is fixed cryptographically the
// moment the bet is placed, this server just answers "has real time passed
// that fixed instant yet?" whenever asked (crashPeek/crashCashout), which
// needs no background process.

import { randomBytes } from 'node:crypto';
import { db, FieldValue } from './firebaseAdmin.js';
import { HttpError } from './auth.js';
import { applyBalanceChange } from './ledger.js';
import {
  generateServerSeed,
  generateClientSeed,
  hashServerSeed,
  deriveMinePositions,
  deriveDiceRoll,
  deriveCrashPointCents,
} from './provablyFair.js';
import {
  minesMultiplier,
  diceMultiplier,
  diceWinChance,
  multiplierAtElapsedMs,
} from '../../src/lib/provablyFairMath.js';
import {
  CASINO_MIN_BET,
  CASINO_MAX_BET,
  MINES_GRID_SIZE,
  MINES_MIN_COUNT,
  MINES_MAX_COUNT,
  DICE_MIN_TARGET,
  DICE_MAX_TARGET,
  CRASH_MAX_AUTO_MULTIPLIER,
} from '../../src/constants/casino.js';

// Real bustabit rounds have no ceiling because a shared round costs nothing
// extra to run long. Ours is single-player, so an unbounded tail means one
// user occasionally waits minutes for a ~0.5%-likely round to resolve. Capped
// here, in the code that creates rounds, not in the shared formula — so the
// formula stays byte-for-byte the published one and the verifier can
// reproduce exactly what we clamped, and why.
const CRASH_MAX_CENTS = 10000; // 100.00x ceiling, ~33s of real time to reach

const SECRETS_COL = 'provablyFairSecrets';
const PUBLIC_COL = 'provablyFairPublic';
const ROUNDS_COL = 'casinoRounds';

function requireBetAmount(amount) {
  if (!Number.isInteger(amount) || amount < CASINO_MIN_BET || amount > CASINO_MAX_BET) {
    throw new HttpError(
      400,
      `Bet must be between ${CASINO_MIN_BET} and ${CASINO_MAX_BET.toLocaleString()} points.`,
      `bad bet amount ${amount}`
    );
  }
}

function requireIdempotencyKey(body) {
  const key = String(body.idempotencyKey || '').slice(0, 120);
  if (!key) throw new HttpError(400, 'Invalid request.', 'idempotencyKey required');
  return key;
}

/** Ensure the user has a seed pair, creating one on first use. Returns the secret doc. */
async function ensureSeedPair(uid) {
  const secretRef = db.collection(SECRETS_COL).doc(uid);
  const publicRef = db.collection(PUBLIC_COL).doc(uid);

  const snap = await secretRef.get();
  if (snap.exists) return snap.data();

  const serverSeed = generateServerSeed();
  const clientSeed = generateClientSeed();
  const serverSeedHash = hashServerSeed(serverSeed);
  const secret = { userId: uid, serverSeed, serverSeedHash, clientSeed, nonce: 0 };

  await db.runTransaction(async (tx) => {
    const again = await tx.get(secretRef);
    if (again.exists) return; // lost the race to another concurrent request
    tx.set(secretRef, { ...secret, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    tx.set(publicRef, {
      userId: uid,
      serverSeedHash,
      clientSeed,
      nonce: 0,
      revealedSeeds: [],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  const finalSnap = await secretRef.get();
  return finalSnap.data();
}

/** Atomically consume the next nonce. Returns the seed state the bet is derived from. */
async function consumeNonce(uid) {
  const secretRef = db.collection(SECRETS_COL).doc(uid);
  const publicRef = db.collection(PUBLIC_COL).doc(uid);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(secretRef);
    if (!snap.exists) throw new HttpError(400, 'Provably-fair seed not initialized.', `no secret doc for ${uid}`);
    const secret = snap.data();
    const nonce = secret.nonce || 0;
    tx.update(secretRef, { nonce: nonce + 1, updatedAt: FieldValue.serverTimestamp() });
    tx.update(publicRef, { nonce: nonce + 1, updatedAt: FieldValue.serverTimestamp() });
    return { serverSeed: secret.serverSeed, serverSeedHash: secret.serverSeedHash, clientSeed: secret.clientSeed, nonce };
  });
}

/** Read-only: the info the client needs to place bets and show the fairness panel. */
export async function seedInfo(caller) {
  const secret = await ensureSeedPair(caller.uid);
  const publicSnap = await db.collection(PUBLIC_COL).doc(caller.uid).get();
  const pub = publicSnap.data() || {};
  return {
    serverSeedHash: secret.serverSeedHash,
    clientSeed: secret.clientSeed,
    nonce: secret.nonce || 0,
    revealedSeeds: pub.revealedSeeds || [],
  };
}

/**
 * Rotate the seed pair: reveal the retiring server seed (now safe — every
 * round played on it is over) and start a fresh one. Refuses while any round
 * is still active/running so a mid-round secret can never change out from
 * under a bet that already derived its outcome from it.
 */
export async function seedRotate(caller, body) {
  const uid = caller.uid;
  const active = await db.collection(ROUNDS_COL)
    .where('userId', '==', uid)
    .where('status', 'in', ['active', 'running'])
    .limit(1)
    .get();
  if (!active.empty) {
    throw new HttpError(400, 'Finish or cash out your current round before rotating seeds.');
  }

  const newClientSeed = body.clientSeed ? String(body.clientSeed).slice(0, 64) : null;
  const secretRef = db.collection(SECRETS_COL).doc(caller.uid);
  const publicRef = db.collection(PUBLIC_COL).doc(caller.uid);

  await ensureSeedPair(uid);

  const nextServerSeed = generateServerSeed();
  const nextServerSeedHash = hashServerSeed(nextServerSeed);

  return db.runTransaction(async (tx) => {
    const secretSnap = await tx.get(secretRef);
    const secret = secretSnap.data();
    const revealed = {
      serverSeed: secret.serverSeed,
      serverSeedHash: secret.serverSeedHash,
      clientSeed: secret.clientSeed,
      nonceCount: secret.nonce || 0,
      revealedAt: new Date().toISOString(),
    };
    const nextClientSeed = newClientSeed || secret.clientSeed;

    tx.set(secretRef, {
      userId: uid,
      serverSeed: nextServerSeed,
      serverSeedHash: nextServerSeedHash,
      clientSeed: nextClientSeed,
      nonce: 0,
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.update(publicRef, {
      serverSeedHash: nextServerSeedHash,
      clientSeed: nextClientSeed,
      nonce: 0,
      revealedSeeds: FieldValue.arrayUnion(revealed),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return { serverSeedHash: nextServerSeedHash, clientSeed: nextClientSeed, nonce: 0, revealed };
  });
}

function roundId(uid, kind, nonce) {
  return `${uid}_${kind}_${nonce}`;
}

// ── Mines ────────────────────────────────────────────────────────────────────

/** Start a Mines round: deduct the bet, commit (but do not reveal) mine layout. */
export async function minesStart(caller, body) {
  const bet = Number(body.bet);
  const minesCount = Number(body.minesCount);
  requireBetAmount(bet);
  if (!Number.isInteger(minesCount) || minesCount < MINES_MIN_COUNT || minesCount > MINES_MAX_COUNT) {
    throw new HttpError(400, `Mines must be between ${MINES_MIN_COUNT} and ${MINES_MAX_COUNT}.`);
  }
  const key = requireIdempotencyKey(body);

  await ensureSeedPair(caller.uid);
  const existingActive = await db.collection(ROUNDS_COL)
    .where('userId', '==', caller.uid).where('status', 'in', ['active', 'running']).limit(1).get();
  if (!existingActive.empty) {
    throw new HttpError(400, 'Finish your current round before starting a new one.');
  }

  const { clientSeed, nonce } = await consumeNonce(caller.uid);

  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `casino_bet:${caller.uid}:${key}`,
    type: 'casino_bet',
    delta: -bet,
    description: `Mines: ${minesCount} mines, ${bet} pts`,
    sourceType: 'casino_mines',
    metadata: { minesCount, nonce },
    actor: { uid: caller.uid, role: caller.role },
  });

  const id = roundId(caller.uid, 'mines', nonce);
  await db.collection(ROUNDS_COL).doc(id).set({
    id, userId: caller.uid, kind: 'mines', status: 'active',
    bet, minesCount, gridSize: MINES_GRID_SIZE, revealed: [],
    nonce, clientSeed, serverSeedHash: (await db.collection(SECRETS_COL).doc(caller.uid).get()).data().serverSeedHash,
    multiplier: 1, createdAt: FieldValue.serverTimestamp(), settledAt: null, result: null,
  });

  return { ...result, roundId: id, minesCount, gridSize: MINES_GRID_SIZE };
}

async function loadOwnedActiveRound(uid, roundId, expectedKind) {
  const ref = db.collection(ROUNDS_COL).doc(roundId);
  const snap = await ref.get();
  if (!snap.exists) throw new HttpError(404, 'Round not found.');
  const round = snap.data();
  if (round.userId !== uid) throw new HttpError(403, 'That round is not yours.');
  if (round.kind !== expectedKind) throw new HttpError(400, 'Wrong game for this round.');
  return { ref, round };
}

/** Reveal one tile. Settles the round as busted if it's a mine. */
export async function minesReveal(caller, body) {
  const tile = Number(body.tile);
  const { ref, round } = await loadOwnedActiveRound(caller.uid, String(body.roundId || ''), 'mines');
  if (round.status !== 'active') throw new HttpError(400, 'That round has already ended.');
  if (!Number.isInteger(tile) || tile < 0 || tile >= round.gridSize) {
    throw new HttpError(400, 'Invalid tile.');
  }
  if (round.revealed.includes(tile)) throw new HttpError(400, 'That tile is already revealed.');

  const secret = await db.collection(SECRETS_COL).doc(caller.uid).get();
  const serverSeed = secret.data().serverSeed;
  const minePositions = deriveMinePositions(serverSeed, round.clientSeed, round.nonce, round.gridSize, round.minesCount);

  if (minePositions.has(tile)) {
    await ref.update({
      status: 'busted',
      settledAt: FieldValue.serverTimestamp(),
      result: { minePositions: [...minePositions].sort((a, b) => a - b), bustedTile: tile, payout: 0 },
    });
    return { safe: false, roundId: round.id, minePositions: [...minePositions].sort((a, b) => a - b) };
  }

  const revealed = [...round.revealed, tile];
  const multiplier = minesMultiplier(round.minesCount, revealed.length, round.gridSize);
  const maxSafeTiles = round.gridSize - round.minesCount;

  if (revealed.length >= maxSafeTiles) {
    // Every safe tile found — auto cash-out at the max multiplier for this board.
    return finalizeMinesCashout(caller, ref, round, revealed, multiplier, minePositions);
  }

  await ref.update({ revealed, multiplier });
  return { safe: true, roundId: round.id, revealed, multiplier };
}

async function finalizeMinesCashout(caller, ref, round, revealed, multiplier, minePositions) {
  const payout = Math.round(round.bet * multiplier);
  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `casino_payout:${round.id}`,
    type: 'casino_payout',
    delta: payout,
    description: `Mines cash-out: ${revealed.length} tiles @ ${multiplier}x`,
    sourceType: 'casino_mines',
    sourceId: round.id,
    mirrorToProgress: true,
    actor: { uid: caller.uid, role: caller.role },
  });

  await ref.update({
    status: 'cashed_out',
    revealed,
    multiplier,
    settledAt: FieldValue.serverTimestamp(),
    result: { minePositions: [...minePositions].sort((a, b) => a - b), multiplier, payout },
  });

  return { safe: true, roundId: round.id, revealed, multiplier, cashedOut: true, payout, ...result };
}

/** Cash out a Mines round at its current multiplier. */
export async function minesCashout(caller, body) {
  const { ref, round } = await loadOwnedActiveRound(caller.uid, String(body.roundId || ''), 'mines');
  if (round.status !== 'active') throw new HttpError(400, 'That round has already ended.');
  if (round.revealed.length === 0) throw new HttpError(400, 'Reveal at least one tile before cashing out.');

  const secret = await db.collection(SECRETS_COL).doc(caller.uid).get();
  const minePositions = deriveMinePositions(
    secret.data().serverSeed, round.clientSeed, round.nonce, round.gridSize, round.minesCount
  );
  const multiplier = minesMultiplier(round.minesCount, round.revealed.length, round.gridSize);
  const out = await finalizeMinesCashout(caller, ref, round, round.revealed, multiplier, minePositions);
  return out;
}

// ── Dice ─────────────────────────────────────────────────────────────────────

/** One-shot dice roll: bet, target, direction — settles immediately. */
export async function diceRoll(caller, body) {
  const bet = Number(body.bet);
  const target = Number(body.target);
  const direction = body.direction === 'under' ? 'under' : body.direction === 'over' ? 'over' : null;
  requireBetAmount(bet);
  if (!direction) throw new HttpError(400, 'Direction must be "over" or "under".');
  if (!Number.isFinite(target) || target < DICE_MIN_TARGET || target > DICE_MAX_TARGET) {
    throw new HttpError(400, `Target must be between ${DICE_MIN_TARGET} and ${DICE_MAX_TARGET}.`);
  }
  const key = requireIdempotencyKey(body);
  await ensureSeedPair(caller.uid);

  const { clientSeed, nonce, serverSeed, serverSeedHash } = await consumeNonce(caller.uid).then(async (n) => {
    const secret = await db.collection(SECRETS_COL).doc(caller.uid).get();
    return { ...n, serverSeed: secret.data().serverSeed, serverSeedHash: secret.data().serverSeedHash };
  });

  const roll = deriveDiceRoll(serverSeed, clientSeed, nonce);
  const win = direction === 'over' ? roll > target : roll < target;
  const multiplier = diceMultiplier(target, direction);
  const payout = win ? Math.round(bet * multiplier) : 0;

  const betResult = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `casino_bet:${caller.uid}:${key}`,
    type: 'casino_bet',
    delta: -bet,
    description: `Dice: roll ${direction} ${target}`,
    sourceType: 'casino_dice',
    metadata: { target, direction, nonce },
    actor: { uid: caller.uid, role: caller.role },
  });

  let payoutResult = null;
  if (payout > 0) {
    payoutResult = await applyBalanceChange({
      userId: caller.uid,
      idempotencyKey: `casino_payout:${caller.uid}:${key}`,
      type: 'casino_payout',
      delta: payout,
      description: `Dice win: rolled ${roll} (${direction} ${target}) @ ${multiplier}x`,
      sourceType: 'casino_dice',
      mirrorToProgress: true,
      actor: { uid: caller.uid, role: caller.role },
    });
  }

  const id = roundId(caller.uid, 'dice', nonce);
  await db.collection(ROUNDS_COL).doc(id).set({
    id, userId: caller.uid, kind: 'dice', status: 'settled',
    bet, target, direction, nonce, clientSeed, serverSeedHash,
    createdAt: FieldValue.serverTimestamp(), settledAt: FieldValue.serverTimestamp(),
    result: { roll, win, multiplier, payout },
  });

  return {
    roundId: id, roll, win, multiplier, payout,
    winChance: diceWinChance(target, direction),
    balanceAfter: payoutResult?.balanceAfter ?? betResult.balanceAfter,
  };
}

// ── Crash ────────────────────────────────────────────────────────────────────

/** Start a single-player Crash round. The crash point is fixed now, revealed only when reached. */
export async function crashStart(caller, body) {
  const bet = Number(body.bet);
  requireBetAmount(bet);
  let autoCashoutMultiplier = null;
  if (body.autoCashoutMultiplier != null) {
    autoCashoutMultiplier = Number(body.autoCashoutMultiplier);
    if (!Number.isFinite(autoCashoutMultiplier) || autoCashoutMultiplier < 1.01 || autoCashoutMultiplier > CRASH_MAX_AUTO_MULTIPLIER) {
      throw new HttpError(400, 'Invalid auto cash-out multiplier.');
    }
  }
  const key = requireIdempotencyKey(body);
  await ensureSeedPair(caller.uid);

  const existingActive = await db.collection(ROUNDS_COL)
    .where('userId', '==', caller.uid).where('status', 'in', ['active', 'running']).limit(1).get();
  if (!existingActive.empty) {
    throw new HttpError(400, 'Finish your current round before starting a new one.');
  }

  const { clientSeed, nonce } = await consumeNonce(caller.uid);
  const secret = await db.collection(SECRETS_COL).doc(caller.uid).get();

  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `casino_bet:${caller.uid}:${key}`,
    type: 'casino_bet',
    delta: -bet,
    description: `Crash bet: ${bet} pts`,
    sourceType: 'casino_crash',
    metadata: { nonce, autoCashoutMultiplier },
    actor: { uid: caller.uid, role: caller.role },
  });

  const id = roundId(caller.uid, 'crash', nonce);
  const startedAtMs = Date.now();
  await db.collection(ROUNDS_COL).doc(id).set({
    id, userId: caller.uid, kind: 'crash', status: 'running',
    bet, autoCashoutMultiplier, nonce, clientSeed, serverSeedHash: secret.data().serverSeedHash,
    startedAtMs, createdAt: FieldValue.serverTimestamp(), settledAt: null, result: null,
  });

  return { ...result, roundId: id, startedAtMs };
}

/** True crash instant for this round, derived fresh from the secret seed each time (never persisted). */
async function crashPointForRound(uid, round) {
  const secret = await db.collection(SECRETS_COL).doc(uid).get();
  const raw = deriveCrashPointCents(secret.data().serverSeed, round.clientSeed, round.nonce);
  return Math.min(raw, CRASH_MAX_CENTS);
}

/**
 * Resolve "as of right now" — settles the round the first time real elapsed
 * time reaches the (still-secret) crash instant. `mode: 'cashout'` locks in a
 * win at the live multiplier if the round hasn't crashed yet; `mode: 'peek'`
 * only ever settles a crash, never a win, so idle polling can't cash you out.
 */
async function resolveCrashRound(caller, roundIdStr, mode) {
  const { ref, round } = await loadOwnedActiveRound(caller.uid, roundIdStr, 'crash');
  if (round.status !== 'running') {
    return { status: round.status, result: round.result, roundId: round.id };
  }

  const crashCents = await crashPointForRound(caller.uid, round);
  const elapsedMs = Date.now() - round.startedAtMs;
  const liveMultiplier = multiplierAtElapsedMs(elapsedMs);
  const liveCents = Math.round(liveMultiplier * 100);

  if (liveCents >= crashCents) {
    await ref.update({
      status: 'crashed',
      settledAt: FieldValue.serverTimestamp(),
      result: { crashMultiplier: crashCents / 100, payout: 0 },
    });
    return { status: 'crashed', crashMultiplier: crashCents / 100, roundId: round.id, payout: 0 };
  }

  if (mode === 'peek') {
    return { status: 'running', liveMultiplier, roundId: round.id };
  }

  // Manual (or client auto-triggered) cash-out, strictly before the crash instant.
  const payout = Math.round(round.bet * liveMultiplier);
  const result = await applyBalanceChange({
    userId: caller.uid,
    idempotencyKey: `casino_payout:${round.id}`,
    type: 'casino_payout',
    delta: payout,
    description: `Crash cash-out @ ${liveMultiplier.toFixed(2)}x`,
    sourceType: 'casino_crash',
    sourceId: round.id,
    mirrorToProgress: true,
    actor: { uid: caller.uid, role: caller.role },
  });

  await ref.update({
    status: 'cashed_out',
    settledAt: FieldValue.serverTimestamp(),
    result: { cashoutMultiplier: liveMultiplier, payout },
  });

  return { status: 'cashed_out', cashoutMultiplier: liveMultiplier, payout, roundId: round.id, ...result };
}

export async function crashPeek(caller, body) {
  return resolveCrashRound(caller, String(body.roundId || ''), 'peek');
}

export async function crashCashout(caller, body) {
  return resolveCrashRound(caller, String(body.roundId || ''), 'cashout');
}
