// src/constants/rewards.js

export const TIER_CONFIG = {
  bronze: { color: '#CD7F32', glow: '0 0 20px rgba(205,127,50,0.4)', label: 'Bronze' },
  silver: { color: '#9CA3AF', glow: '0 0 20px rgba(156,163,175,0.5)', label: 'Silver' },
  gold: { color: '#F59E0B', glow: 'var(--glow-gold)', label: 'Gold' },
  platinum: { color: '#7C3AED', glow: '0 0 20px rgba(124,58,237,0.5)', label: 'Platinum' },
  god: { color: '#FACC15', glow: '0 0 30px rgba(250,204,21,0.8)', label: 'God' },
  gaia: { color: '#10B981', glow: '0 0 35px rgba(16,185,129,0.6)', label: 'Legendary' },
  supernova: { color: '#8B5CF6', glow: '0 0 40px rgba(139,92,246,0.7)', label: 'Legendary' },
  prime: { color: '#FFD700', glow: '0 0 50px rgba(255,215,0,1)', label: 'Prime' },
  // ── ULTRA TIERS — Eco-Tech / Cyber-Sustainability line ──
  quantum: { color: '#22D3EE', glow: '0 0 40px rgba(34,211,238,0.7)', label: 'Quantum' },
  helix: { color: '#4ADE80', glow: '0 0 45px rgba(74,222,128,0.75)', label: 'Mythic' },
  singularity: { color: '#F0ABFC', glow: '0 0 55px rgba(240,171,252,0.85)', label: 'Singularity' },
};

// ─── GROWTH RINGS ─────────────────────────────────────────────────────────────
// Ring count for the Regalia signature motif (see components/common/GrowthRings).
// More rings = grown further. This encodes rarity structurally, so tier is still
// distinguishable without relying on colour alone.
export const TIER_RINGS = {
  bronze: 1,
  silver: 2,
  gold: 3,
  platinum: 4,
  god: 5,
  gaia: 6,
  supernova: 7,
  quantum: 7,
  helix: 8,
  singularity: 8,
  prime: 9, // Celestial — uniquely the densest, and the only aurora bearer
};

// All hardcoded rewards that the user can unlock
export const REWARDS_DB = [
  // --- FRAMES ---
  { id: 'frame-bronze', type: 'frame', name: 'Bronze Frame', description: 'A sturdy bronze frame for your avatar.', pointCost: 500, tier: 'bronze', icon: '🥉' },
  { id: 'frame-silver', type: 'frame', name: 'Silver Frame', description: 'An elegant silver frame.', pointCost: 1000, tier: 'silver', icon: '🥈' },
  { id: 'frame-gold', type: 'frame', name: 'Gold Frame', description: 'A luxurious gold frame.', pointCost: 2500, tier: 'gold', icon: '🥇' },
  { id: 'frame-platinum', type: 'frame', name: 'Platinum Frame', description: 'A shining platinum frame.', pointCost: 5000, tier: 'platinum', icon: '💎' },
  { id: 'frame-god', type: 'frame', name: 'Supreme God Frame', description: 'The ultimate celestial frame.', pointCost: 10000, tier: 'god', icon: '👑' },
  { id: 'frame-gaia', type: 'frame', name: 'Gaia Crown', description: 'Earth\'s Guardian — a legendary emerald aura with golden shimmer.', pointCost: 25000, tier: 'gaia', icon: '🌿' },
  { id: 'frame-supernova', type: 'frame', name: 'Supernova', description: 'Cosmic Energy — a legendary deep-space frame with rotating neon gradients.', pointCost: 50000, tier: 'supernova', icon: '🌌' },
  { id: 'frame-prime', type: 'frame', name: 'Prime Frame', description: 'The Ascended Aura — the ultimate, reality-bending celestial frame.', pointCost: 999999, tier: 'prime', icon: '✨' },

  // --- ULTRA FRAMES (Eco-Tech / Cyber-Sustainability line) ---
  { id: 'frame-biocircuit', type: 'frame', name: 'Bio-Circuit Weave', description: 'Living circuitry grown from photosynthetic silicon — data-sap pulses through every glowing trace.', pointCost: 75000, tier: 'quantum', icon: '🧫' },
  { id: 'frame-helix', type: 'frame', name: 'Genesis Helix', description: 'Twin strands of terraforming light orbit your avatar — the blueprint of a reborn biosphere.', pointCost: 120000, tier: 'helix', icon: '🧬' },
  { id: 'frame-singularity', type: 'frame', name: 'Verdant Singularity', description: 'A collapsed star of pure life-energy. Reality bends, and forests bloom along the event horizon.', pointCost: 250000, tier: 'singularity', icon: '🌌' },

  // --- NAME GLOWS ---
  { id: 'glow-emerald', type: 'glow', name: 'Emerald Aura', description: 'A soft green glow surrounding your name in the community.', pointCost: 1500, tier: 'silver', icon: '🟩', cssClass: 'glow-emerald' },
  { id: 'glow-aurora', type: 'glow', name: 'Aurora Borealis', description: 'A mesmerizing, shifting green and blue gradient applied to your name.', pointCost: 5000, tier: 'platinum', icon: '🌌', cssClass: 'glow-aurora' },
  { id: 'glow-goldfoil', type: 'glow', name: 'Gold Foil', description: 'A highly sought-after metallic golden shimmer for your name.', pointCost: 10000, tier: 'god', icon: '🪙', cssClass: 'glow-goldfoil' },
  { id: 'glow-glitch', type: 'glow', name: 'Cyber Glitch', description: 'An ultra-rare cyberpunk neon glitch effect for your name.', pointCost: 15000, tier: 'gaia', icon: '👾', cssClass: 'glow-glitch' },
  { id: 'glow-photon', type: 'glow', name: 'Photon Stream', description: 'A current of quantized cyan light flows endlessly through your name.', pointCost: 25000, tier: 'quantum', icon: '🔷', cssClass: 'glow-photon' },
  { id: 'glow-chlorophyll', type: 'glow', name: 'Chlorophyll Surge', description: 'Raw bio-energy — your name photosynthesizes light in real time.', pointCost: 40000, tier: 'helix', icon: '🍃', cssClass: 'glow-chlorophyll' },
  { id: 'glow-eventbloom', type: 'glow', name: 'Event Bloom', description: 'Your letters warp around a micro-singularity of blooming antimatter.', pointCost: 60000, tier: 'singularity', icon: '🌸', cssClass: 'glow-eventbloom' },

  // --- COMPANIONS ---
  { id: 'comp-sprout', type: 'companion', name: 'Baby Sprout', description: 'A tiny animated sprout that floats next to your avatar.', pointCost: 2000, tier: 'gold', imageUrl: '/companions/sprout_trans.png' },
  { id: 'comp-waterwisp', type: 'companion', name: 'Water Wisp', description: 'A glowing blue droplet of pure energy orbiting your profile.', pointCost: 6000, tier: 'platinum', imageUrl: '/companions/waterwisp_trans.png' },
  { id: 'comp-terrabot', type: 'companion', name: 'Terra Bot', description: 'A high-tech floating sci-fi drone that accompanies you.', pointCost: 12000, tier: 'god', imageUrl: '/companions/terrabot_trans.png' },
  { id: 'comp-phoenix', type: 'companion', name: 'Solar Phoenix', description: 'A legendary creature of fire and light floating beside you.', pointCost: 25000, tier: 'supernova', imageUrl: '/companions/phoenix_trans.png' },
  { id: 'comp-nanosprite', type: 'companion', name: 'Nano Sprite', description: 'A swarm-intelligence of pollinator microbots compressed into one shimmering sprite.', pointCost: 40000, tier: 'quantum', icon: '🛸' },

  // --- BACKGROUNDS ---
  { id: 'bg-royalvelvet', type: 'background', name: 'Royal Velvet', description: 'A luxurious crimson and gold animated backdrop fit for royalty.', pointCost: 3000, tier: 'gold', icon: '👑', cssClass: 'bg-royalvelvet' },
  { id: 'bg-cosmicnebula', type: 'background', name: 'Cosmic Nebula', description: 'A mesmerizing deep space premium swirling nebula.', pointCost: 8000, tier: 'platinum', icon: '🌌', cssClass: 'bg-cosmicnebula' },
  { id: 'bg-neonmatrix', type: 'background', name: 'Eco Matrix', description: 'Falling green digital eco-code across your profile.', pointCost: 15000, tier: 'god', icon: '💻', cssClass: 'bg-neonmatrix' },
  { id: 'bg-diamondglint', type: 'background', name: 'Diamond Glint', description: 'A sophisticated dark slate with shining silver diamond facets.', pointCost: 30000, tier: 'supernova', icon: '💎', cssClass: 'bg-diamondglint' },
  { id: 'bg-solargrid', type: 'background', name: 'Solar Grid Array', description: 'An orbital solar farm — panel constellations catching sweeping flares.', pointCost: 45000, tier: 'quantum', icon: '🔆', cssClass: 'bg-solargrid' },
  { id: 'bg-terraform', type: 'background', name: 'Terraform Horizon', description: 'Dawn over a freshly seeded exo-forest, scanned by drone light.', pointCost: 60000, tier: 'helix', icon: '🌄', cssClass: 'bg-terraform' },
  { id: 'bg-eventhorizon', type: 'background', name: 'Verdant Event Horizon', description: 'An emerald accretion disk swirling around a heart of living dark.', pointCost: 100000, tier: 'singularity', icon: '🌀', cssClass: 'bg-eventhorizon' },

  // --- APP ENTRIES ---
  { id: 'entry-portal', type: 'entry', name: 'Cosmic Portal', description: 'A breathtaking cosmic portal that warps you into the app with golden sparks.', pointCost: 15000, tier: 'god', icon: '🌀' },
  { id: 'entry-cyber', type: 'entry', name: 'Cyber Genesis', description: 'An ultra-premium cyberpunk booting sequence that glitches reality.', pointCost: 50000, tier: 'prime', icon: '⚡' }
];

// ─── LOOT CASES ───────────────────────────────────────────────────────────────
// Shared by the Rewards UI, the drop-rate disclosure, and the server-side
// opener in api/economy.js. One definition, so displayed odds cannot drift from
// the odds actually rolled.
//
// Drop weight per tier. Higher weight = more common.
export const TIER_WEIGHTS = {
  bronze: 50,
  silver: 50,
  gold: 20,
  platinum: 10,
  god: 3,
  gaia: 1,
  supernova: 1,
  quantum: 3,
  helix: 2,
  singularity: 1,
  prime: 1,
};

// Every tier in TIER_CONFIG must appear in at least one pool, or it is
// unobtainable. `prime` and the three ultra tiers were previously in none —
// that was the "reward gets excluded" bug.
export const LOOT_CASES = [
  {
    id: 'bronze_case',
    name: 'Bronze Case',
    cost: 1000,
    icon: '📦',
    color: '#CD7F32',
    pool: ['bronze', 'silver', 'gold'],
  },
  {
    id: 'silver_case',
    name: 'Silver Case',
    cost: 2500,
    icon: '🧰',
    color: '#C0C0C0',
    pool: ['silver', 'gold', 'platinum'],
  },
  {
    id: 'gold_case',
    name: 'Gold Case',
    cost: 5000,
    icon: '💼',
    color: '#FFD700',
    pool: ['gold', 'platinum', 'god', 'gaia', 'supernova'],
  },
  {
    id: 'celestial_case',
    name: 'Celestial Case',
    cost: 15000,
    icon: '🌌',
    color: '#7C3AED',
    pool: ['platinum', 'god', 'gaia', 'supernova', 'quantum', 'helix', 'singularity', 'prime'],
  },
];

export const LOOT_CASES_BY_ID = LOOT_CASES.reduce((acc, c) => {
  acc[c.id] = c;
  return acc;
}, {});

/** Items a case can actually yield. */
export function poolForCase(caseId) {
  const cfg = LOOT_CASES_BY_ID[caseId];
  if (!cfg) return [];
  return REWARDS_DB.filter((r) => cfg.pool.includes(r.tier));
}

/**
 * Per-tier drop probability for a case, derived from the same weights the
 * server rolls against. Used by the Drop Rates disclosure.
 *
 * @returns {Array<{tier, label, color, count, probability}>} descending
 */
export function computeDropRates(caseId) {
  const items = poolForCase(caseId);
  if (!items.length) return [];

  const totalsByTier = {};
  let grandTotal = 0;
  for (const item of items) {
    const w = TIER_WEIGHTS[item.tier] ?? 1;
    totalsByTier[item.tier] = (totalsByTier[item.tier] || 0) + w;
    grandTotal += w;
  }

  return Object.entries(totalsByTier)
    .map(([tier, weight]) => ({
      tier,
      label: TIER_CONFIG[tier]?.label || tier,
      color: TIER_CONFIG[tier]?.color || '#888',
      count: items.filter((i) => i.tier === tier).length,
      probability: weight / grandTotal,
    }))
    .sort((a, b) => b.probability - a.probability);
}

