import { db } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, increment, deleteDoc, getDoc, query, where, orderBy, getCountFromServer, serverTimestamp, Timestamp, setDoc, arrayUnion, limit } from 'firebase/firestore';

export async function getAdminUsers() {
  const usersSnap = await getDocs(collection(db, 'users'));
  const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return users.sort((a, b) => {
    const tA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const tB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return tB - tA;
  });
}

export async function adminUpdateUserProfile(userId, updates) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  return { success: true };
}

export async function adminUpdateUserPoints(userId, pointsToAdd) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    points: increment(pointsToAdd),
    lifetimePoints: pointsToAdd > 0 ? increment(pointsToAdd) : increment(0),
    spendableBalance: increment(pointsToAdd),
    updatedAt: serverTimestamp()
  });

  const txRef = doc(collection(db, 'transactions'));
  await setDoc(txRef, {
    userId,
    type: 'admin',
    amount: pointsToAdd,
    description: 'Points modified by Admin',
    createdAt: serverTimestamp(),
  });

  return { success: true };
}

export async function adminAwardFrame(userId, frameId) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    unlockedFrames: arrayUnion(frameId),
    updatedAt: serverTimestamp()
  });
  return { success: true };
}

export async function getFrameRequests() {
  const snap = await getDocs(query(collection(db, 'frameRequests'), where('status', '==', 'pending')));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function resolveFrameRequest(requestId, status, userId, frameId) {
  if (status === 'approved') {
    // Award the frame to the user
    await adminAwardFrame(userId, frameId);
  }
  // Delete the request entirely after resolving to keep it clean, or mark as resolved
  await deleteDoc(doc(db, 'frameRequests', requestId));
  return { success: true };
}

export async function adminBanUser(userId, ban) {
  const userRef = doc(db, 'users', userId);
  await updateDoc(userRef, {
    banned: ban,
    updatedAt: serverTimestamp()
  });

  const settingsRef = doc(db, 'settings', 'global');
  if (ban) {
    await setDoc(settingsRef, { bannedUsers: arrayUnion(userId) }, { merge: true });
  } else {
    // We need arrayRemove from firestore
    const { arrayRemove } = await import('firebase/firestore');
    await setDoc(settingsRef, { bannedUsers: arrayRemove(userId) }, { merge: true });
  }

  return { success: true, banned: ban };
}

export async function adminDeletePost(postId, reportId = null) {
  // Delete the post from the 'community' collection (not 'posts')
  await deleteDoc(doc(db, 'community', postId));
  
  // Resolve the report if provided
  if (reportId) {
    await updateDoc(doc(db, 'reports', reportId), {
      status: 'resolved',
      actionTaken: 'post_deleted',
      resolvedAt: serverTimestamp()
    });
  }
  return { success: true };
}

export async function getReportedPosts() {
  const reportsSnap = await getDocs(query(collection(db, 'reports'), where('status', '==', 'pending')));
  const reports = [];
  
  for (const reportDoc of reportsSnap.docs) {
    const reportData = reportDoc.data();
    let postData = null;
    
    // Fetch associated post data from 'community' collection
    if (reportData.postId) {
      const postSnap = await getDoc(doc(db, 'community', reportData.postId));
      if (postSnap.exists()) {
        postData = { id: postSnap.id, ...postSnap.data() };
      }
    }
    
    reports.push({
      id: reportDoc.id,
      ...reportData,
      post: postData
    });
  }
  return reports;
}

export async function getAdminStats() {
  try {
    const totalUsersSnap = await getCountFromServer(collection(db, 'users'));
    const totalPostsSnap = await getCountFromServer(collection(db, 'community'));
    const approvedSubmissionsSnap = await getCountFromServer(query(collection(db, 'submissions'), where('status', '==', 'approved')));
    
    return {
      totalUsers: totalUsersSnap.data().count,
      totalPosts: totalPostsSnap.data().count,
      approvedSubmissions: approvedSubmissionsSnap.data().count
    };
  } catch (error) {
    console.error("Error fetching stats:", error);
    // Fallback if getCountFromServer fails due to older firebase versions or permissions
    return { totalUsers: 0, totalPosts: 0, approvedSubmissions: 0 };
  }
}

export async function getResolvedSubmissions() {
  const q = query(collection(db, 'submissions'), where('status', 'in', ['approved', 'rejected']));
  const snap = await getDocs(q);
  const results = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Sort descending by createdAt
  results.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
    return timeB - timeA;
  });
  
  return results;
}

export async function adminDeleteSubmission(submissionId) {
  await deleteDoc(doc(db, 'submissions', submissionId));
  return { success: true };
}

export async function getAdminChartData() {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  
  // Format dates for the last 7 days
  const last7Days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    last7Days.push({ dateStr, signups: 0, posts: 0, actions: 0 });
  }

  try {
    // 1. Fetch Users
    const usersSnap = await getDocs(query(collection(db, 'users'), where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))));
    usersSnap.forEach(doc => {
      const data = doc.data();
      if (data.createdAt && data.createdAt.toDate) {
        const d = data.createdAt.toDate();
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayMatch = last7Days.find(day => day.dateStr === dateStr);
        if (dayMatch) dayMatch.signups++;
      }
    });

    // 2. Fetch Posts
    const postsSnap = await getDocs(query(collection(db, 'community'), where('createdAt', '>=', Timestamp.fromDate(sevenDaysAgo))));
    postsSnap.forEach(doc => {
      const data = doc.data();
      if (data.createdAt && data.createdAt.toDate) {
        const d = data.createdAt.toDate();
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const dayMatch = last7Days.find(day => day.dateStr === dateStr);
        if (dayMatch) dayMatch.posts++;
      }
    });

    // 3. Fetch Approved Actions
    // Using a simpler query to avoid composite index error for status + createdAt
    const subsSnap = await getDocs(query(collection(db, 'submissions'), where('status', '==', 'approved'))); 
    subsSnap.forEach(doc => {
      const data = doc.data();
      if (data.createdAt && data.createdAt.toDate) {
        const d = data.createdAt.toDate();
        if (d >= sevenDaysAgo) {
          const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const dayMatch = last7Days.find(day => day.dateStr === dateStr);
          if (dayMatch) dayMatch.actions++;
        }
      }
    });
    
    // Map to array for Recharts
    return last7Days.map(d => ({
      name: d.dateStr,
      Signups: d.signups,
      Posts: d.posts,
      Actions: d.actions
    }));
  } catch (error) {
    console.error("Error fetching chart data:", error);
    return last7Days.map(d => ({ name: d.dateStr, Signups: 0, Posts: 0, Actions: 0 }));
  }
}

// --- TASKS ---
export async function adminCreateTask(taskData) {
  const newTaskRef = doc(collection(db, 'tasks'));
  const data = { ...taskData, id: newTaskRef.id, createdAt: serverTimestamp() };
  await setDoc(newTaskRef, data);
  return data;
}

export async function adminUpdateTask(taskId, updates) {
  await updateDoc(doc(db, 'tasks', taskId), { ...updates, updatedAt: serverTimestamp() });
  return { success: true };
}

export async function adminDeleteTask(taskId) {
  await deleteDoc(doc(db, 'tasks', taskId));
  return { success: true };
}

// --- REWARDS ---
export async function adminCreateReward(rewardData) {
  const newRewardRef = doc(collection(db, 'rewards'));
  const data = { ...rewardData, id: newRewardRef.id, createdAt: serverTimestamp() };
  await setDoc(newRewardRef, data);
  return data;
}

export async function adminUpdateReward(rewardId, updates) {
  await updateDoc(doc(db, 'rewards', rewardId), { ...updates, updatedAt: serverTimestamp() });
  return { success: true };
}

export async function adminDeleteReward(rewardId) {
  await deleteDoc(doc(db, 'rewards', rewardId));
  return { success: true };
}

// --- SETTINGS ---
export async function getGlobalSettings() {
  const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
  if (settingsDoc.exists()) {
    return settingsDoc.data();
  }
  // Default settings
  return {
    maintenanceMode: false,
    allowSignups: true,
    pointsMultiplier: 1,
  };
}

export async function updateGlobalSettings(updates) {
  const settingsRef = doc(db, 'settings', 'global');
  // Use setDoc with merge to create it if it doesn't exist
  await setDoc(settingsRef, { ...updates, updatedAt: serverTimestamp() }, { merge: true });
  return { success: true };
}

export async function adminForceWeeklyReset() {
  // 1. Fetch top 3 users by weeklyPoints
  const topQ = query(collection(db, 'leaderboard'), orderBy('weeklyPoints', 'desc'), limit(3));
  const topSnap = await getDocs(topQ);
  
  const rewards = [10000, 5000, 2500];
  const promises = [];
  
  topSnap.docs.forEach((docSnap, index) => {
    const userId = docSnap.id;
    const rewardPoints = rewards[index];
    if (!rewardPoints) return;
    
    // Update the main user document
    const userRef = doc(db, 'users', userId);
    let updates = {
      points: increment(rewardPoints),
      lifetimePoints: increment(rewardPoints),
      spendableBalance: increment(rewardPoints),
    };
    if (index === 0) {
      updates.unlockedFrames = arrayUnion('frame-champion');
    }
    
    promises.push(updateDoc(userRef, updates));
    
    // Add transaction history
    const txRef = doc(collection(db, 'transactions'));
    promises.push(setDoc(txRef, {
      userId: userId,
      type: 'earned',
      amount: rewardPoints,
      description: `Weekly Leaderboard Reward (Rank #${index + 1})`,
      createdAt: serverTimestamp(),
    }));
    
    // Create notification
    const notifRef = doc(collection(db, 'notifications'));
    promises.push(setDoc(notifRef, {
      userId: userId,
      type: 'weekly_reward',
      title: `🏆 You placed #${index + 1} this week!`,
      body: `You've been awarded ${rewardPoints} bonus points${index === 0 ? ' and an exclusive Champion Frame' : ''} for your amazing eco-efforts!`,
      read: false,
      createdAt: serverTimestamp(),
    }));
  });
  
  // Wait for rewards to be applied
  await Promise.all(promises);
  
  // 2. Reset weeklyPoints for all users
  const usersSnap = await getDocs(collection(db, 'users'));
  const userUpdates = usersSnap.docs.map(d => updateDoc(d.ref, { weeklyPoints: 0 }));
  await Promise.all(userUpdates);
  
  // 3. Reset weeklyPoints for leaderboard collection
  const lbSnap = await getDocs(collection(db, 'leaderboard'));
  const lbUpdates = lbSnap.docs.map(d => updateDoc(d.ref, { weeklyPoints: 0 }));
  await Promise.all(lbUpdates);
  
  return { success: true };
}
