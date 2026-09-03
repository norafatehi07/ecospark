// api/_lib/provablyFair.js
// Server-held half of the provably-fair scheme: generates and hashes seeds,
// derives an HMAC-SHA256 byte stream, and turns those bytes into game
// outcomes. The client-side mirror is src/lib/provablyFairVerify.js — same
// message format, same downstream math (shared from
// src/lib/provablyFairMath.js), a different crypto primitive (Web Crypto
// instead of node:crypto) so a revealed seed can be independently
// re-verified in the browser without trusting this server again.
//
// Scheme: one server seed + client seed pair per user, shared across every
// game (Mines/Dice/Crash), with a nonce that increments once per bet. The
// server commits to the seed by publishing only its SHA-256 hash up front;
// the raw seed is never sent to the client until the user rotates it, at
// which point every past round on that seed becomes independently checkable.
//
// Draw format: HMAC_SHA256(key = serverSeed, message = `${clientSeed}:${nonce}:${cursor}`).
// `cursor` starts at 0 and increments only when a single draw needs more
// entropy than one HMAC digest's first 4 bytes provide (Mines' 25-tile shuffle).

import { randomBytes, createHash, createHmac } from 'node:crypto';
import { rollFromFloat, crashPointFromHash } from '../../src/lib/provablyFairMath.js';

export function generateServerSeed() {
  return randomBytes(32).toString('hex');
}

export function generateClientSeed() {
  return randomBytes(8).toString('hex');
}

export function hashServerSeed(serverSeed) {
  return createHash('sha256').update(serverSeed).digest('hex');
}

function hmacDigest(serverSeed, message) {
  return createHmac('sha256', serverSeed).update(message).digest();
}

/** First 4 bytes of one HMAC draw as a float in [0, 1). */
function floatAt(serverSeed, clientSeed, nonce, cursor) {
  const b = hmacDigest(serverSeed, `${clientSeed}:${nonce}:${cursor}`);
  return b[0] / 256 + b[1] / 256 ** 2 + b[2] / 256 ** 3 + b[3] / 256 ** 4;
}

/** `count` independent floats in [0,1), one HMAC draw (cursor) each. */
export function deriveFloats(serverSeed, clientSeed, nonce, count) {
  const floats = [];
  for (let cursor = 0; cursor < count; cursor++) {
    floats.push(floatAt(serverSeed, clientSeed, nonce, cursor));
  }
  return floats;
}

/**
 * Fisher-Yates shuffle of tile indices [0..gridSize) driven by the HMAC float
 * stream; the first `mineCount` entries of the shuffled order are mines.
 * Every tile's fate is fixed the instant the round is created — no mine ever
 * moves in response to which tiles get clicked.
 */
export function deriveMinePositions(serverSeed, clientSeed, nonce, gridSize, mineCount) {
  const floats = deriveFloats(serverSeed, clientSeed, nonce, gridSize);
  const arr = Array.from({ length: gridSize }, (_, i) => i);
  for (let i = gridSize - 1; i > 0; i--) {
    const j = Math.floor(floats[gridSize - 1 - i] * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return new Set(arr.slice(0, mineCount));
}

/** Dice: one HMAC draw → one roll in [0.00, 100.00]. */
export function deriveDiceRoll(serverSeed, clientSeed, nonce) {
  const [float] = deriveFloats(serverSeed, clientSeed, nonce, 1);
  return rollFromFloat(float);
}

/** Crash: the round's crash point in integer cents (100 = 1.00x). */
export function deriveCrashPointCents(serverSeed, clientSeed, nonce) {
  const hex = hmacDigest(serverSeed, `${clientSeed}:${nonce}`).toString('hex');
  return crashPointFromHash(hex);
}
