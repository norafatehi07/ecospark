// src/services/economyService.js
// Rewritten to hit Firestore directly to support local Vite dev server without Vercel backend.

import { auth, db } from '../lib/firebase';
import { doc, getDoc, updateDoc, arrayUnion, increment, setDoc, collection, serverTimestamp, deleteField } from 'firebase/firestore';
import { REWARDS_DB, LOOT_CASES, TIER_WEIGHTS } from '../constants/rewards';
import { awardPointsAndUpdateStreak } from './firestoreService';

export function newIdempotencyKey(prefix = 'act') {
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

// ─── economy ────────────────────────────────────────────────────────────────

export async function awardTaskPoints(submissionId) {
  // We use the direct firestore service now. The ID is not needed as it's passed from Tasks.
  throw new Error('Use awardPointsAndUpdateStreak directly instead.');
}

export async function redeemReward(rewardId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const reward = REWARDS_DB.find(r => r.id === rewardId);
  if (!reward) throw new Error('Reward not found');

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User not found');

  const profile = snap.data();
  const bal = profile.spendableBalance ?? profile.points ?? 0;
  
  if (bal < reward.pointCost) throw new Error('Not enough points');
  if (profile.inventory?.includes(reward.id)) throw new Error('Already owned');

  const updates = {
    spendableBalance: increment(-reward.pointCost),
    updatedAt: serverTimestamp()
  };

  const nestedType = reward.type === 'entry' ? 'entries' : `${reward.type}s`;
  
  if (Array.isArray(profile.inventory)) {
    updates.inventory = arrayUnion(reward.id);
    if (reward.type === 'frame') {
      updates.unlockedFrames = arrayUnion(reward.id);
    }
  } else {
    updates[`inventory.${nestedType}`] = arrayUnion(reward.id);
    if (reward.type === 'frame') {
      updates.unlockedFrames = arrayUnion(reward.id);
    }
  }

  await updateDoc(userRef, updates);

  const txRef = doc(collection(db, 'redemptions'));
  await setDoc(txRef, {
    userId: user.uid,
    rewardId: reward.id,
    cost: reward.pointCost,
    createdAt: serverTimestamp()
  });

  return { success: true };
}

export async function openCase(caseId, idempotencyKey) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const lootCase = LOOT_CASES.find(c => c.id === caseId);
  if (!lootCase) throw new Error('Case not found');

  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) throw new Error('User not found');
  
  const profile = snap.data();
  const bal = profile.spendableBalance ?? profile.points ?? 0;
  
  if (bal < lootCase.cost) throw new Error('Not enough points');

  // Build weighted pool from the case's tier list
  const poolItems = REWARDS_DB.filter(r => lootCase.pool.includes(r.tier));
  if (poolItems.length === 0) throw new Error('No items in this case pool');

  // Calculate weighted chances
  const weighted = poolItems.map(item => ({
    reward: item,
    weight: TIER_WEIGHTS[item.tier] ?? 1
  }));
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);

  // Roll
  const roll = Math.random() * totalWeight;
  let cumulative = 0;
  let wonReward = weighted[0].reward;
  for (const entry of weighted) {
    cumulative += entry.weight;
    if (roll <= cumulative) {
      wonReward = entry.reward;
      break;
    }
  }

  const wonRewardId = wonReward.id;
  
  // Check if user already owns it (check both flat array and nested inventory)
  const flatInventory = Array.isArray(profile.inventory) ? profile.inventory : [];
  const nestedType = wonReward.type === 'entry' ? 'entries' : `${wonReward.type}s`;
  const nestedInventory = (!Array.isArray(profile.inventory) && profile.inventory?.[nestedType]) || [];
  const unlockedFrames = profile.unlockedFrames || [];
  
  const isDuplicate = flatInventory.includes(wonRewardId) || 
                      nestedInventory.includes(wonRewardId) ||
                      (wonReward.type === 'frame' && unlockedFrames.includes(wonRewardId));

  // Build updates: deduct points and add item to both inventory formats
  const updates = {
    spendableBalance: increment(-lootCase.cost),
    updatedAt: serverTimestamp()
  };

  if (!isDuplicate) {
    if (Array.isArray(profile.inventory)) {
      updates.inventory = arrayUnion(wonRewardId);
      if (wonReward.type === 'frame') {
        updates.unlockedFrames = arrayUnion(wonRewardId);
      }
    } else {
      updates[`inventory.${nestedType}`] = arrayUnion(wonRewardId);
      if (wonReward.type === 'frame') {
        updates.unlockedFrames = arrayUnion(wonRewardId);
      }
    }
  }

  await updateDoc(userRef, updates);

  return { wonRewardId, duplicate: isDuplicate, cost: lootCase.cost };
}

export async function equipCosmetic(slot, rewardId) {
  const user = auth.currentUser;
  if (!user) throw new Error('Not logged in');

  const userRef = doc(db, 'users', user.uid);
  const updates = { updatedAt: serverTimestamp() };
  
  if (rewardId === null) {
    updates[`equipped.${slot}`] = deleteField();
    if (slot === 'frame') updates.activeFrame = deleteField();
  } else {
    updates[`equipped.${slot}`] = rewardId;
    if (slot === 'frame') updates.activeFrame = rewardId;
  }

  await updateDoc(userRef, updates);
  return { success: true };
}

export async function unequipCosmetic(slot) {
  return equipCosmetic(slot, null);
}

// ─── admin ──────────────────────────────────────────────────────────────────
export async function adminAdjustPoints(params) {
  throw new Error('Use direct firestore updates instead');
}

export async function adminSetRole(userId, role) {
  throw new Error('Use direct firestore updates instead');
}

export async function adminSetBanned(userId, banned) {
  throw new Error('Use direct firestore updates instead');
}

export async function adminReviewSubmission(params) {
  throw new Error('Use direct firestore updates instead');
}

export async function adminListAuditLog(limit = 100) {
  throw new Error('Use direct firestore updates instead');
}
