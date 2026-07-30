// src/hooks/useEquippedCosmetics.js
// ═══════════════════════════════════════════════════════════════════════════════
// One resolver for equipped cosmetics, used by every surface that renders an
// identity.
//
// Why this exists: the frame/glow lookup was copy-pasted near-identically into
// Leaderboard, Community, Profile and UserProfile — and silently omitted from
// Messages, which is exactly the failure mode a shared resolver prevents. A
// fifth surface added later gets it for free.
//
// Reads BOTH storage shapes for frames (legacy `activeFrame` and newer
// `equipped.frame`, likewise `unlockedFrames` vs `inventory.frames`) because
// both are live in production data. Do not "clean this up" to one without a
// migration.
//
// NOTE ON TRUST: this does not verify the user owns what they have equipped.
// It cannot — leaderboard docs carry `equipped` without `inventory`, so an
// ownership check here would blank out frames for everyone on the leaderboard.
// Ownership is enforced server-side at equip time; this layer only decides what
// to paint, and falls back to nothing when an id is unrecognised.
// ═══════════════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { REWARDS_DB, TIER_CONFIG, TIER_RINGS } from '../constants/rewards';

/** id → reward, built once. */
const REWARD_BY_ID = REWARDS_DB.reduce((acc, r) => {
  acc[r.id] = r;
  return acc;
}, {});

const EMPTY = Object.freeze({
  frameId: null,
  frameReward: null,
  glowId: null,
  glowClass: '',
  backgroundId: null,
  backgroundClass: '',
  companionId: null,
  companionReward: null,
  entryId: null,
  tier: null,
  tierConfig: null,
  ringCount: 1,
  isCelestial: false,
});

function lookup(id, expectedType) {
  if (!id) return null;
  const reward = REWARD_BY_ID[id];
  if (!reward) return null;
  // Guard against an id equipped into the wrong slot.
  if (expectedType && reward.type !== expectedType) return null;
  return reward;
}

/**
 * Pure resolver. Safe to call outside React (list rendering, tests, workers).
 *
 * @param {object|null} profile a user doc, public profile, or leaderboard row
 * @returns {object} a render model with defaults for every field
 */
export function resolveEquippedCosmetics(profile) {
  if (!profile) return EMPTY;

  // Frames live in two places depending on when the account was created.
  const frameId = profile.activeFrame || profile.equipped?.frame || null;
  const frameReward = lookup(frameId, 'frame');

  const glowId = profile.equipped?.glow || null;
  const glowReward = lookup(glowId, 'glow');

  const backgroundId = profile.equipped?.background || null;
  const backgroundReward = lookup(backgroundId, 'background');

  const companionId = profile.equipped?.companion || null;
  const companionReward = lookup(companionId, 'companion');

  const entryId = profile.equipped?.entry || null;

  // The frame is what confers visible rank, so it drives ring density.
  const tier = frameReward?.tier || null;

  return {
    frameId: frameReward ? frameId : null,
    frameReward,
    glowId: glowReward ? glowId : null,
    glowClass: glowReward?.cssClass || '',
    backgroundId: backgroundReward ? backgroundId : null,
    backgroundClass: backgroundReward?.cssClass || '',
    companionId: companionReward ? companionId : null,
    companionReward,
    entryId,
    tier,
    tierConfig: tier ? TIER_CONFIG[tier] || null : null,
    ringCount: tier ? TIER_RINGS[tier] ?? 1 : 1,
    isCelestial: tier === 'prime',
  };
}

/**
 * Memoized hook form. Recomputes only when an equipped id actually changes,
 * so a live profile subscription firing on unrelated fields (points, streak)
 * does not churn the render model.
 */
export function useEquippedCosmetics(profile) {
  return useMemo(
    () => resolveEquippedCosmetics(profile),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      profile?.activeFrame,
      profile?.equipped?.frame,
      profile?.equipped?.glow,
      profile?.equipped?.background,
      profile?.equipped?.companion,
      profile?.equipped?.entry,
    ]
  );
}

/**
 * Does this profile own the reward? Returns null when ownership is
 * indeterminate (e.g. a leaderboard row with no inventory), so callers can
 * distinguish "no" from "cannot tell" instead of treating both as false.
 */
export function ownsReward(profile, reward) {
  if (!profile || !reward) return false;
  const hasInventory = !!profile.inventory || Array.isArray(profile.unlockedFrames);
  if (!hasInventory) return null;

  if (reward.type === 'frame') {
    return (
      profile.unlockedFrames?.includes(reward.id) ||
      profile.inventory?.frames?.includes(reward.id) ||
      false
    );
  }
  const pluralType = reward.type === 'entry' ? 'entries' : `${reward.type}s`;
  return profile.inventory?.[pluralType]?.includes(reward.id) || false;
}

export default useEquippedCosmetics;
