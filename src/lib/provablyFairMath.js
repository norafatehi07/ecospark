// src/lib/provablyFairMath.js
// Pure math shared by the server (which holds the secret seed) and the browser
// (which renders live odds/curves and re-verifies revealed rounds). Nothing in
// this file touches a secret — HMAC generation lives in api/_lib/provablyFair.js
// server-side and src/lib/provablyFairVerify.js client-side (Web Crypto, used
// only once a seed has already been revealed).

export const MINES_GRID_SIZE = 25;
export const MINES_HOUSE_EDGE = 0.99; // pays 99% of fair odds, matches the 1% edge disclosed in the UI
export const DICE_HOUSE_EDGE = 0.99;
export const CRASH_HOUSE_EDGE_PCT = 1; // 1-in-101 instant-crash chance, bustabit's original formula

/** nCk without factorials, so intermediate values never leave safe-integer range. */
export function combinations(n, k) {
  if (k < 0 || k > n) return 0;
  if (k > n - k) k = n - k;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = (result * (n - i)) / (i + 1);
  }
  return result;
}

/**
 * Mines payout multiplier after revealing `gems` safe tiles with `mines` bombs
 * on a 25-tile board: 0.99 * C(25,gems) / C(25-mines,gems) — the fair odds of
 * having dodged every bomb so far, discounted by the house edge.
 */
export function minesMultiplier(mines, gems, gridSize = MINES_GRID_SIZE) {
  if (gems <= 0) return 1;
  const fair = combinations(gridSize, gems) / combinations(gridSize - mines, gems);
  return Math.round(fair * MINES_HOUSE_EDGE * 10000) / 10000;
}

/** Probability of safely revealing `gems` tiles with `mines` bombs present. */
export function minesWinChance(mines, gems, gridSize = MINES_GRID_SIZE) {
  if (gems <= 0) return 1;
  return combinations(gridSize - mines, gems) / combinations(gridSize, gems);
}

/** Dice: win chance is just the size of the winning side of the target. */
export function diceWinChance(target, direction) {
  return direction === 'under' ? target : 100 - target;
}

export function diceMultiplier(target, direction) {
  const chance = diceWinChance(target, direction);
  if (chance <= 0) return 0;
  return Math.round(((DICE_HOUSE_EDGE * 100) / chance) * 10000) / 10000;
}

/**
 * Bustabit's published crash formula: read the top 52 bits of a hash as an
 * integer `h`, then crashPoint = floor((100·e − h) / (e − h)) in integer
 * cents, where e = 2^52. A hash divisible by 101 is a forced instant-crash at
 * 1.00x — that's where the ~1% house edge lives, baked into the hash itself
 * rather than into the payout table.
 * @param {string} hashHex - HMAC-SHA256 hex digest (64 chars)
 */
export function crashPointFromHash(hashHex) {
  if (divisibleBy(hashHex, 101)) return 100; // instant crash, 1.00x in integer cents
  const h = parseInt(hashHex.slice(0, 13), 16); // top 52 bits
  const e = Math.pow(2, 52);
  const cents = Math.floor((100 * e - h) / (e - h));
  return Math.max(100, cents); // floor of 1.00x
}

/** Reads a hex hash in 4-hex-char chunks to test divisibility without BigInt. */
function divisibleBy(hashHex, mod) {
  let val = 0;
  const offset = hashHex.length % 4;
  for (let i = offset > 0 ? offset - 4 : 0; i < hashHex.length; i += 4) {
    const chunk = hashHex.slice(Math.max(i, 0), i + 4);
    val = ((val << 16) + parseInt(chunk, 16)) % mod;
  }
  return val === 0;
}

// ── Crash curve ──────────────────────────────────────────────────────────────
// multiplier(t) = e^(r·t). r is tuned so the curve reaches 2x at ~5s and 3x at
// ~8.6s — the same "slow start, accelerating" feel every crash game uses.
// Client and server both compute this from a shared elapsed-time clock, so a
// live multiplier never needs a socket: it's a pure function of wall time.
export const CRASH_GROWTH_PER_MS = Math.log(2) / 5000;

export function multiplierAtElapsedMs(ms, growthPerMs = CRASH_GROWTH_PER_MS) {
  if (ms <= 0) return 1;
  return Math.exp(growthPerMs * ms);
}

export function elapsedMsForMultiplier(multiplier, growthPerMs = CRASH_GROWTH_PER_MS) {
  return Math.log(Math.max(1, multiplier)) / growthPerMs;
}

/** Standard Stake-style dice roll from one [0,1) float: 0.00–100.00, 2dp. */
export function rollFromFloat(float) {
  return Math.floor(float * 10001) / 100;
}
