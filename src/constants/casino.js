// src/constants/casino.js
// Shared numeric bounds for Mines/Dice/Crash — imported by both the client UI
// (for instant validation + display) and api/_lib/casino.js (server, the only
// copy that is actually authoritative). Mirrors the existing MIN_BET/MAX_BET
// pattern in src/services/oracleService.js.

export const CASINO_MIN_BET = 10;
export const CASINO_MAX_BET = 10000;

export const MINES_GRID_SIZE = 25;
export const MINES_MIN_COUNT = 1;
export const MINES_MAX_COUNT = 24;

export const DICE_MIN_TARGET = 2;
export const DICE_MAX_TARGET = 98;

export const CRASH_MIN_AUTO_MULTIPLIER = 1.01;
export const CRASH_MAX_AUTO_MULTIPLIER = 1000;
