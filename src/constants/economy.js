export const TRANSACTION_REASONS = new Set([
  'task_verified',
  'task_bonus',
  'streak_bonus',
  'case_purchase',
  'reward_purchase',
  'bet_stake',
  'bet_payout',
  'bet_refund',
  'market_stake',
  'market_payout',
  'market_refund',
  'pool_contribution',
  'pool_payout',
  'admin_grant',
  'admin_revoke',
  'migration_baseline'
]);

export function tierFromLifetime(points) {
  if (points < 1000) return 0; // Seedling
  if (points < 5000) return 1; // Sapling
  if (points < 15000) return 2; // Grove
  if (points < 50000) return 3; // Canopy
  if (points < 150000) return 4; // Heartwood
  return 5; // Old Growth
}

// Indexed by the number tierFromLifetime returns, so tier 0 is TIER_NAMES[0].
// Zero-based on purpose: the tier the API writes to Firestore is the index.
export const TIER_NAMES = ['Seedling', 'Sapling', 'Grove', 'Canopy', 'Heartwood', 'Old Growth'];

// Lifetime points at which each tier begins, mirroring the boundaries above.
// tierFromLifetime stays authoritative — it is what the API writes — so a
// boundary moves there first and is followed here.
export const TIER_THRESHOLDS = [0, 1000, 5000, 15000, 50000, 150000];

