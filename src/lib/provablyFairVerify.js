// src/lib/provablyFairVerify.js
// Browser-side re-implementation of api/_lib/provablyFair.js using Web Crypto
// instead of node:crypto — so a user can verify a REVEALED round (one whose
// server seed has already been published via seed rotation) independently,
// without asking this server to grade its own homework. Only usable after
// reveal: while a seed is active its raw value never leaves the server.

import { crashPointFromHash, rollFromFloat } from './provablyFairMath.js';

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

function bytesToHex(bytes) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// The server seed is a hex STRING, but node:crypto's createHmac(algo, key)
// treats a string key as raw UTF-8 text, not as hex-decoded bytes — it never
// runs Buffer.from(key, 'hex'). So the HMAC key here must be the UTF-8 bytes
// of the hex characters themselves, matching api/_lib/provablyFair.js exactly.
async function hmacSha256Hex(serverSeedHex, message) {
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(serverSeedHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return bytesToHex(new Uint8Array(sig));
}

export async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return bytesToHex(new Uint8Array(digest));
}

/** Confirms the revealed server seed matches the hash committed before play. */
export async function verifySeedCommitment(serverSeed, expectedHash) {
  const isHex = /^[0-9a-f]+$/i.test(serverSeed);
  const actual = isHex ? await sha256Hex(serverSeed) : null;
  return actual === expectedHash;
}

async function floatAt(serverSeed, clientSeed, nonce, cursor) {
  const hex = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}:${cursor}`);
  const bytes = hexToBytes(hex.slice(0, 8));
  return bytes[0] / 256 + bytes[1] / 256 ** 2 + bytes[2] / 256 ** 3 + bytes[3] / 256 ** 4;
}

/** Re-derive a Dice roll for one revealed (serverSeed, clientSeed, nonce). */
export async function verifyDiceRoll(serverSeed, clientSeed, nonce) {
  const float = await floatAt(serverSeed, clientSeed, nonce, 0);
  return rollFromFloat(float);
}

/** Re-derive a Crash point (in x, e.g. 2.35) for one revealed round. */
export async function verifyCrashPoint(serverSeed, clientSeed, nonce) {
  const hex = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}`);
  return crashPointFromHash(hex) / 100;
}

/** Re-derive the Fisher-Yates mine layout for one revealed Mines round. */
export async function verifyMinePositions(serverSeed, clientSeed, nonce, gridSize, mineCount) {
  const floats = [];
  for (let cursor = 0; cursor < gridSize; cursor++) {
    floats.push(await floatAt(serverSeed, clientSeed, nonce, cursor));
  }
  const arr = Array.from({ length: gridSize }, (_, i) => i);
  for (let i = gridSize - 1; i > 0; i--) {
    const j = Math.floor(floats[gridSize - 1 - i] * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, mineCount).sort((a, b) => a - b);
}
