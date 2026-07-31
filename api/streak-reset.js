// api/streak-reset.js — Nightly cron job (runs at midnight UTC via Vercel Cron)
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Verify this is a legitimate cron call from Vercel
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const now = new Date();
    const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);

    const usersSnap = await db.collection('users').get();
    const batch = db.batch();
    let resetCount = 0;
    let atRiskCount = 0;

    for (const doc of usersSnap.docs) {
      const user = doc.data();
      const lastActivity = user.lastActivityDate?.toDate?.();

      if (!lastActivity || user.streak === 0) continue;

      // Reset streak if inactive for 2+ days
      if (lastActivity < twoDaysAgo) {
        batch.update(doc.ref, {
          streak: 0,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        resetCount++;
      }
      // Send "at risk" notification if inactive yesterday
      else if (lastActivity < oneDayAgo && user.streak > 0) {
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
          userId: doc.id,
          type: 'streak_at_risk',
          title: '🔥 Your streak is at risk!',
          body: `You haven't logged a task today. Your ${user.streak}-day streak will reset at midnight!`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        atRiskCount++;
      }

      // Reset weekly points on Sunday (day 0) handled below after top 3 rewards
    }

    // Weekly Sunday reset logic
    if (now.getDay() === 0) {
      // 1. Get Top 3 users by weekly points
      const topUsersSnap = await db.collection('users')
        .orderBy('weeklyPoints', 'desc')
        .limit(3)
        .get();

      const topUsers = topUsersSnap.docs;
      const rewards = [500, 250, 100]; // 1st, 2nd, 3rd place rewards

      topUsers.forEach((docSnap, index) => {
        const rewardPoints = rewards[index];
        const user = docSnap.data();
        let updates = {
          points: admin.firestore.FieldValue.increment(rewardPoints),
          lifetimePoints: admin.firestore.FieldValue.increment(rewardPoints),
          spendableBalance: admin.firestore.FieldValue.increment(rewardPoints),
        };
        if (index === 0) {
          // Give 1st place a Weekly Champion badge
          updates.badges = admin.firestore.FieldValue.arrayUnion('Weekly Champion');
        }
        batch.update(docSnap.ref, updates);

        // Send a notification
        const notifRef = db.collection('notifications').doc();
        batch.set(notifRef, {
          userId: docSnap.id,
          type: 'weekly_reward',
          title: `🏆 You placed #${index + 1} this week!`,
          body: `You've been awarded ${rewardPoints} bonus points for your amazing eco-efforts!`,
          read: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // 2. Reset weeklyPoints for all users
      for (const doc of usersSnap.docs) {
        batch.update(doc.ref, { weeklyPoints: 0 });
      }

      // 3. Reset weeklyPoints on leaderboard collection
      const lbSnap = await db.collection('leaderboard').get();
      for (const lbDoc of lbSnap.docs) {
        batch.update(lbDoc.ref, { weeklyPoints: 0 });
      }
    }

    await batch.commit();

    console.log(`[streak-reset] Reset ${resetCount} streaks, ${atRiskCount} at-risk notifications sent`);
    res.json({ reset: resetCount, atRisk: atRiskCount });
  } catch (err) {
    console.error('[streak-reset] Error:', err);
    res.status(500).json({ error: err.message });
  }
}
