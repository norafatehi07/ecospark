// src/services/firestoreService.js
// All Firestore reads/writes go through here — no direct db.* in components.

import {
  doc, collection, getDoc, getDocs, setDoc, updateDoc, addDoc,
  deleteDoc, query, where, orderBy, limit, onSnapshot,
  serverTimestamp, increment, arrayUnion, arrayRemove,
  Timestamp, runTransaction, writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// ─── USER PROFILES ──────────────────────────────────────────────────────────

export async function incrementGlobalUserCount() {
  try {
    const statsRef = doc(db, 'settings', 'stats');
    await updateDoc(statsRef, {
      totalUsers: increment(1)
    }).catch(async (err) => {
      if (err.code === 'not-found') {
        await setDoc(statsRef, { totalUsers: 1 });
      }
    });
  } catch (e) {
    console.error('Failed to increment global user count', e);
  }
}

export async function getGlobalUserCount() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'stats'));
    if (snap.exists()) return snap.data().totalUsers || 25;
    return 25;
  } catch (e) {
    return 25;
  }
}

export async function createUserProfile(uid, data) {
  await setDoc(doc(db, 'users', uid), {
    ...data,
    points: 0,
    lifetimePoints: 0,
    weeklyPoints: 0,
    spendableBalance: 0,
    streak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    badges: [],
    unlockedFrames: [],
    activeFrame: null,
    role: 'student',
    groupId: null,
    referralCode: `ECO-${uid.slice(0, 6).toUpperCase()}`,
    referredBy: null,
    referralCount: 0,
    totalTasksCompleted: 0,
    totalCO2Saved: 0,
    totalWaterSaved: 0,
    totalWasteSaved: 0,
    inventory: {
      frames: [],
      glows: [],
      companions: [],
      backgrounds: [],
      entries: []
    },
    equipped: {
      frame: null,
      glow: null,
      companion: null,
      background: null,
      entry: null
    },
    notificationsEnabled: true,
    theme: 'midnight',
    textSize: 'normal',
    reducedMotion: false,
    highContrast: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  
  await incrementGlobalUserCount();
}

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export function subscribeUserProfile(uid, callback) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    const data = snap.data();
    callback({
      id: snap.id,
      ...data,
      inventory: data.inventory || { frames: [], glows: [], companions: [], backgrounds: [], entries: [] },
      equipped: data.equipped || { frame: null, glow: null, companion: null, background: null, entry: null },
    });
  });
}

export async function updateUserProfile(uid, updates) {
  await updateDoc(doc(db, 'users', uid), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  
  // Sync profile data and points to leaderboard doc if changed
  const lbUpdates = { updatedAt: serverTimestamp() };
  let needsSync = false;
  
  const syncFields = ['displayName', 'photoURL', 'showOnLeaderboard', 'points', 'weeklyPoints', 'streak'];
  for (const field of syncFields) {
    if (updates[field] !== undefined) {
      lbUpdates[field] = updates[field];
      needsSync = true;
    }
  }

  if (needsSync) {
    try {
      await updateDoc(doc(db, 'leaderboard', uid), lbUpdates);
    } catch { 
      // leaderboard doc may not exist yet, set it instead
      try {
        await setDoc(doc(db, 'leaderboard', uid), { userId: uid, ...lbUpdates }, { merge: true });
      } catch (e) {
        console.error("Failed to sync leaderboard doc:", e);
      }
    }
  }
}

export function subscribeGlobalSettings(callback) {
  return onSnapshot(doc(db, 'settings', 'global'), (snap) => {
    callback(snap.exists() ? snap.data() : { maintenanceMode: false, allowSignups: true, pointsMultiplier: 1 });
  });
}

// ─── TASKS ───────────────────────────────────────────────────────────────────

export async function getTasks() {
  // Single orderBy avoids requiring a composite Firestore index
  const snap = await getDocs(
    query(collection(db, 'tasks'), orderBy('category'))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function subscribeTasks(callback) {
  return onSnapshot(
    query(collection(db, 'tasks'), orderBy('category')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export async function createTask(taskData) {
  const ref = doc(collection(db, 'tasks'));
  await setDoc(ref, {
    id: ref.id,
    ...taskData,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

// ─── SUBMISSIONS ──────────────────────────────────────────────────────────────

export async function createSubmission(userId, taskId, imageUrl, taskMeta = {}) {
  const ref = doc(collection(db, 'submissions'));
  await setDoc(ref, {
    id: ref.id,
    userId,
    taskId,
    imageUrl,
    status: 'pending',
    points: taskMeta.points || 50,
    co2: taskMeta.co2 || 0,
    water: taskMeta.water || 0,
    waste: taskMeta.waste || 0,
    aiVerdict: null,
    confidence: null,
    reason: null,
    flaggedAt: null,
    approvedAt: null,
    rejectedAt: null,
    reviewedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeSubmission(submissionId, callback) {
  return onSnapshot(doc(db, 'submissions', submissionId), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

export async function getUserSubmissions(userId, limitCount = 20) {
  const snap = await getDocs(
    query(
      collection(db, 'submissions'),
      where('userId', '==', userId)
    )
  );
  
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  
  // Sort descending by createdAt in memory to avoid Firestore composite index error
  results.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
  
  return results.slice(0, limitCount);
}

export async function getFlaggedSubmissions(groupId = null) {
  let q = query(
    collection(db, 'submissions'),
    where('status', 'in', ['flagged', 'pending'])
  );
  if (groupId) {
    q = query(
      collection(db, 'submissions'),
      where('status', 'in', ['flagged', 'pending']),
      where('groupId', '==', groupId)
    );
  }
  const snap = await getDocs(q);
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  
  results.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
  
  return results;
}

export async function updateSubmissionStatus(submissionId, status, extra = {}) {
  await updateDoc(doc(db, 'submissions', submissionId), {
    status,
    ...extra,
    updatedAt: serverTimestamp(),
  });
}

// ─── STREAKS & POINTS ─────────────────────────────────────────────────────────

export async function awardPointsAndUpdateStreak(userId, taskId, points, impact = {}) {
  const userRef = doc(db, 'users', userId);
  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error('User not found');

    const user = userSnap.data();
    const today = new Date().toDateString();
    const lastDate = user.lastActivityDate?.toDate?.()?.toDateString?.() || null;

    let newStreak = user.streak || 0;
    let longestStreak = user.longestStreak || 0;

    if (lastDate === today) {
      // Already active today — don't increment streak
    } else if (lastDate === new Date(Date.now() - 86400000).toDateString()) {
      // Consecutive day
      newStreak += 1;
      longestStreak = Math.max(longestStreak, newStreak);
    } else {
      // Streak broken or first ever
      newStreak = 1;
    }

    tx.update(userRef, {
      points: increment(points),
      lifetimePoints: increment(points),
      weeklyPoints: increment(points),
      spendableBalance: increment(points),
      streak: newStreak,
      longestStreak,
      lastActivityDate: serverTimestamp(),
      totalTasksCompleted: increment(1),
      totalCO2Saved: increment(impact.co2 || 0),
      totalWaterSaved: increment(impact.water || 0),
      totalWasteSaved: increment(impact.waste || 0),
      updatedAt: serverTimestamp(),
    });

    // Update global leaderboard entry with current profile data
    const lbRef = doc(db, 'leaderboard', userId);
    tx.set(lbRef, {
      userId,
      displayName: user.displayName,
      photoURL: user.photoURL || null,
      showOnLeaderboard: user.showOnLeaderboard ?? true,
      points: increment(points),
      weeklyPoints: increment(points),
      streak: newStreak,
      groupId: user.groupId || null,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    const txRef = doc(collection(db, 'transactions'));
    tx.set(txRef, {
      userId,
      type: 'earned',
      amount: points,
      description: 'Completed a task',
      createdAt: serverTimestamp(),
    });
  });
}

// ─── LEADERBOARD ──────────────────────────────────────────────────────────────

export async function getLeaderboard(type = 'global', groupId = null, limitCount = 50) {
  let q = query(
    collection(db, 'leaderboard'),
    orderBy('points', 'desc'),
    limit(limitCount)
  );
  if (type === 'group' && groupId) {
    q = query(
      collection(db, 'leaderboard'),
      where('groupId', '==', groupId),
      orderBy('points', 'desc'),
      limit(limitCount)
    );
  }
  const snap = await getDocs(q);
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  results = results.filter(u => u.showOnLeaderboard !== false);
  return results.map((u, i) => ({ rank: i + 1, ...u }));
}

export function subscribeLeaderboard(type = 'weekly', groupId = null, callback, onError) {
  let sortField = type === 'streak' ? 'streak' : 'weeklyPoints';
  let q = query(collection(db, 'leaderboard'), orderBy(sortField, 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    let users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    users = users.filter(u => u.showOnLeaderboard !== false);
    callback(users.map((u, i) => ({ rank: i + 1, ...u })));
  }, onError);
}

// Get a single user's public profile data
export async function getPublicProfile(userId) {
  const snap = await getDoc(doc(db, 'users', userId));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    displayName: data.displayName,
    photoURL: data.photoURL,
    lifetimePoints: data.lifetimePoints || data.points || 0,
    spendableBalance: data.spendableBalance ?? data.points ?? 0,
    weeklyPoints: data.weeklyPoints || 0,
    streak: data.streak || 0,
    longestStreak: data.longestStreak || 0,
    totalTasksCompleted: data.totalTasksCompleted || 0,
    totalCO2Saved: data.totalCO2Saved || 0,
    totalWaterSaved: data.totalWaterSaved || 0,
    badges: data.badges || [],
    unlockedFrames: data.unlockedFrames || [],
    activeFrame: data.activeFrame || null,
    followersCount: data.followersCount || 0,
    followingCount: data.followingCount || 0,
    blockedUsers: data.blockedUsers || [],
    inventory: data.inventory || { frames: [], glows: [], companions: [], backgrounds: [], entries: [] },
    equipped: data.equipped || { frame: null, glow: null, companion: null, background: null, entry: null },
    createdAt: data.createdAt,
    lastActivityDate: data.lastActivityDate || null,
  };
}

export async function toggleBlockUser(currentUserId, targetUserId, isBlocking) {
  const userRef = doc(db, 'users', currentUserId);
  if (isBlocking) {
    await updateDoc(userRef, {
      blockedUsers: arrayUnion(targetUserId)
    });
  } else {
    await updateDoc(userRef, {
      blockedUsers: arrayRemove(targetUserId)
    });
  }
}

// ─── REWARDS ──────────────────────────────────────────────────────────────────

export async function getRewards() {
  const snap = await getDocs(query(collection(db, 'rewards'), orderBy('pointCost')));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function redeemReward(userId, rewardId, pointCost) {
  const userRef = doc(db, 'users', userId);
  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef);
    if (!userSnap.exists()) throw new Error('User not found');
    const user = userSnap.data();
    const balance = user.spendableBalance ?? user.points ?? 0;
    if (balance < pointCost) throw new Error('Insufficient points');

    let typeKey;
    if (rewardId.startsWith('frame-')) typeKey = 'frames';
    else if (rewardId.startsWith('glow-')) typeKey = 'glows';
    else if (rewardId.startsWith('comp-')) typeKey = 'companions';
    else if (rewardId.startsWith('bg-')) typeKey = 'backgrounds';
    else if (rewardId.startsWith('entry-')) typeKey = 'entries';
    else typeKey = 'misc';

    const isFrame = typeKey === 'frames';

    tx.update(userRef, {
      spendableBalance: increment(-pointCost),
      [isFrame ? 'unlockedFrames' : `inventory.${typeKey}`]: arrayUnion(rewardId),
      updatedAt: serverTimestamp(),
    });

    const redemptionRef = doc(collection(db, 'redemptions'));
    tx.set(redemptionRef, {
      userId,
      rewardId,
      pointCost,
      redeemedAt: serverTimestamp(),
    });

    const txRef = doc(collection(db, 'transactions'));
    tx.set(txRef, {
      userId,
      type: 'spent',
      amount: -pointCost,
      description: `Redeemed ${rewardId.replace('frame-', '').replace(/-/g, ' ')}`,
      createdAt: serverTimestamp(),
    });
  });
}

export async function equipReward(userId, type, rewardId) {
  const userRef = doc(db, 'users', userId);
  const lbRef = doc(db, 'leaderboard', userId);
  
  const updateData = { updatedAt: serverTimestamp() };
  if (type === 'frame') {
    updateData.activeFrame = rewardId;
    updateData['equipped.frame'] = rewardId;
  } else {
    updateData[`equipped.${type}`] = rewardId;
  }

  await updateDoc(userRef, updateData);
  
  try {
    await updateDoc(lbRef, updateData);
  } catch {
    // Leaderboard doc might not exist yet, that's fine
  }
}

export async function unequipReward(userId, type) {
  const userRef = doc(db, 'users', userId);
  const lbRef = doc(db, 'leaderboard', userId);
  
  const updateData = { updatedAt: serverTimestamp() };
  if (type === 'frame') {
    updateData.activeFrame = null;
    updateData['equipped.frame'] = null;
  } else {
    updateData[`equipped.${type}`] = null;
  }

  await updateDoc(userRef, updateData);
  
  try {
    await updateDoc(lbRef, updateData);
  } catch {
    // Leaderboard doc might not exist yet
  }
}

export async function requestAdminFrame(userId, frameId, displayName) {
  await addDoc(collection(db, 'frameRequests'), {
    userId,
    displayName,
    frameId,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

// ─── COMMUNITY ────────────────────────────────────────────────────────────────

export async function getCommunityPosts(limitCount = 30) {
  const snap = await getDocs(
    query(collection(db, 'community'), orderBy('createdAt', 'desc'), limit(limitCount))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export function subscribeCommunityPosts(callback, onError) {
  return onSnapshot(
    query(collection(db, 'community'), orderBy('createdAt', 'desc'), limit(30)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    onError
  );
}

export async function createCommunityPost(userId, displayName, photoURL, content, imageUrl = null) {
  await addDoc(collection(db, 'community'), {
    userId,
    displayName,
    photoURL: photoURL || null,
    content,
    imageUrl,
    likes: [],
    commentCount: 0,
    createdAt: serverTimestamp(),
  });
}

// ─── COMMENTS ─────────────────────────────────────────────────────────────────

export async function addComment(postId, userId, displayName, photoURL, content) {
  await addDoc(collection(db, 'community', postId, 'comments'), {
    userId,
    displayName,
    photoURL: photoURL || null,
    content,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'community', postId), {
    commentCount: increment(1),
  });
}

export function subscribeComments(postId, callback) {
  return onSnapshot(
    query(collection(db, 'community', postId, 'comments'), orderBy('createdAt', 'asc')),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────

export async function reportPost(postId, reporterId, reason) {
  await addDoc(collection(db, 'reports'), {
    postId,
    reporterId,
    reason,
    status: 'pending',
    createdAt: serverTimestamp(),
  });
}

export async function getPendingReports() {
  const snap = await getDocs(
    query(collection(db, 'reports'), where('status', '==', 'pending'))
  );
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  results.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
  return results;
}

export async function resolveReport(reportId, action) {
  await updateDoc(doc(db, 'reports', reportId), {
    status: action, // 'resolved' | 'dismissed'
    resolvedAt: serverTimestamp(),
  });
}

export async function toggleLike(postId, userId) {
  const ref = doc(db, 'community', postId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const likes = snap.data().likes || [];
  const hasLiked = likes.includes(userId);
  await updateDoc(ref, {
    likes: hasLiked ? arrayRemove(userId) : arrayUnion(userId),
  });
}

// ─── GROUPS (Class Challenges) ────────────────────────────────────────────────

export async function createGroup(name, creatorId) {
  const ref = doc(collection(db, 'groups'));
  await setDoc(ref, {
    id: ref.id,
    name,
    creatorId,
    members: [creatorId],
    totalPoints: 0,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, 'users', creatorId), { groupId: ref.id });
  return ref.id;
}

export async function joinGroup(groupId, userId) {
  await updateDoc(doc(db, 'groups', groupId), {
    members: arrayUnion(userId),
  });
  await updateDoc(doc(db, 'users', userId), { groupId });
  await updateDoc(doc(db, 'leaderboard', userId), { groupId }, { merge: true });
}

export async function getGroup(groupId) {
  const snap = await getDoc(doc(db, 'groups', groupId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────

export async function createNotification(userId, type, payload) {
  await addDoc(collection(db, 'notifications'), {
    userId,
    type, // 'follow', 'message', 'streak', 'system'
    read: false,
    payload,
    createdAt: serverTimestamp(),
  });
}

export function subscribeUserNotifications(userId, callback) {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snap) => {
    let notifs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    notifs.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : Date.now();
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : Date.now();
      return timeB - timeA;
    });
    callback(notifs.slice(0, 30));
  });
}

export async function getUserNotifications(userId) {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    )
  );
  
  let results = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  results.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
  
  return results.slice(0, 20);
}

export async function markNotificationRead(notifId) {
  await updateDoc(doc(db, 'notifications', notifId), { read: true });
}

// ─── REFERRALS & FOLLOWS ──────────────────────────────────────────────────────

export async function followUser(currentUserId, targetUserId, currentUserName) {
  const followRef = doc(db, 'follows', `${currentUserId}_${targetUserId}`);
  const snap = await getDoc(followRef);
  if (snap.exists()) return; // Already following

  await setDoc(followRef, {
    followerId: currentUserId,
    followingId: targetUserId,
    createdAt: serverTimestamp(),
  });

  // Update counts
  await updateDoc(doc(db, 'users', currentUserId), { followingCount: increment(1) });
  await updateDoc(doc(db, 'users', targetUserId), { followersCount: increment(1) });

  // Send notification
  await createNotification(targetUserId, 'follow', {
    followerId: currentUserId,
    followerName: currentUserName,
    message: 'started following you.'
  });
}

export async function unfollowUser(currentUserId, targetUserId) {
  const followRef = doc(db, 'follows', `${currentUserId}_${targetUserId}`);
  const snap = await getDoc(followRef);
  if (!snap.exists()) return; // Not following

  await deleteDoc(followRef);

  // Update counts
  await updateDoc(doc(db, 'users', currentUserId), { followingCount: increment(-1) });
  await updateDoc(doc(db, 'users', targetUserId), { followersCount: increment(-1) });
}

export async function checkFollowStatus(currentUserId, targetUserId) {
  if (!currentUserId || !targetUserId) return false;
  const followRef = doc(db, 'follows', `${currentUserId}_${targetUserId}`);
  const snap = await getDoc(followRef);
  return snap.exists();
}

export async function processReferral(newUserId, referralCode) {
  // Find referrer by code
  const snap = await getDocs(
    query(collection(db, 'users'), where('referralCode', '==', referralCode), limit(1))
  );
  if (snap.empty) return;
  const referrer = snap.docs[0];

  await updateDoc(doc(db, 'users', newUserId), { referredBy: referrer.id });
  await updateDoc(doc(db, 'users', referrer.id), {
    referralCount: increment(1),
    points: increment(50), 
    lifetimePoints: increment(50),
    weeklyPoints: increment(50),
    spendableBalance: increment(50),
  });

  await addDoc(collection(db, 'transactions'), {
    userId: referrer.id,
    type: 'earned',
    amount: 50,
    description: 'Referral bonus',
    createdAt: serverTimestamp(),
  });
}

// ─── WEEKLY IMPACT REPORT ────────────────────────────────────────────────────

export async function getWeeklyImpact(userId) {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).getTime();
  
  const snap = await getDocs(
    query(
      collection(db, 'submissions'),
      where('userId', '==', userId)
    )
  );
  
  // Filter in memory for status and date to avoid composite index error
  const approved = snap.docs
    .map((d) => d.data())
    .filter((a) => {
      if (a.status !== 'approved') return false;
      const time = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      return time >= oneWeekAgo;
    });

  return {
    count: approved.length,
    co2Saved: approved.reduce((s, a) => s + (a.co2 || 0), 0),
    waterSaved: approved.reduce((s, a) => s + (a.water || 0), 0),
    wasteSaved: approved.reduce((s, a) => s + (a.waste || 0), 0),
  };
}

// ─── DIRECT MESSAGING ───────────────────────────────────────────────────────

export async function createOrGetChat(userAId, userBId) {
  // Try to find existing chat
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userAId)
  );
  const snap = await getDocs(q);
  const existingChat = snap.docs.find(doc => doc.data().participants.includes(userBId));
  
  if (existingChat) {
    return existingChat.id;
  }
  
  // Create new chat
  const ref = doc(collection(db, 'chats'));
  await setDoc(ref, {
    participants: [userAId, userBId],
    lastMessage: null,
    unreadBy: [],
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeConversations(userId, callback) {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', userId)
  );
  return onSnapshot(q, (snap) => {
    let results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    // Sort in memory to avoid requiring a composite index in Firestore
    results.sort((a, b) => {
      const timeA = a.updatedAt?.toMillis ? a.updatedAt.toMillis() : 0;
      const timeB = b.updatedAt?.toMillis ? b.updatedAt.toMillis() : 0;
      return timeB - timeA;
    });
    callback(results);
  });
}

export function subscribeMessages(chatId, callback) {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  });
}

export async function sendMessage(chatId, senderId, text, mediaUrl = null, mediaType = null) {
  const msgRef = doc(collection(db, 'chats', chatId, 'messages'));
  const payload = {
    senderId,
    text,
    createdAt: serverTimestamp(),
  };
  if (mediaUrl) {
    payload.mediaUrl = mediaUrl;
    payload.mediaType = mediaType;
  }
  
  await setDoc(msgRef, payload);
  
  // Find other participants to mark as unread and notify
  const chatSnap = await getDoc(doc(db, 'chats', chatId));
  let unreadBy = [];
  if (chatSnap.exists()) {
    const participants = chatSnap.data().participants || [];
    unreadBy = participants.filter(p => p !== senderId);
    
    // Send notifications to receivers
    for (const receiverId of unreadBy) {
      createNotification(receiverId, 'message', {
        chatId,
        senderId,
        message: 'sent you a new message.'
      }).catch(console.error);
    }
  }
  
  await updateDoc(doc(db, 'chats', chatId), {
    lastMessage: text || (mediaType === 'video' ? 'Sent a video' : 'Sent an image'),
    unreadBy,
    updatedAt: serverTimestamp(),
  });
}

export async function markChatAsRead(chatId, userId) {
  const chatRef = doc(db, 'chats', chatId);
  try {
    await updateDoc(chatRef, {
      unreadBy: arrayRemove(userId)
    });
  } catch (err) {
    console.error('Failed to mark chat as read:', err);
  }
}

// ─── TRANSACTIONS ─────────────────────────────────────────────────────────────

export function subscribeUserTransactions(userId, callback) {
  const q = query(
    collection(db, 'transactions'),
    where('userId', '==', userId)
  );
  return onSnapshot(q, (snap) => {
    const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    results.sort((a, b) => {
      const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
      const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
      return timeB - timeA;
    });
    callback(results.slice(0, 50));
  }, (err) => {
    console.error("Error loading transactions:", err);
    callback([]);
  });
}
