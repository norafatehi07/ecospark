// src/lib/useUser.js
import { useState, useEffect } from 'react';
import { subscribeUserProfile } from '../services/firestoreService';

const userCache = new Map();
const userSubscribers = new Map();
const unsubscribes = new Map();

export function useUser(userId) {
  const [user, setUser] = useState(() => userCache.get(userId) || null);

  useEffect(() => {
    if (!userId) return;

    const handleChange = (data) => {
      setUser(data);
    };

    if (!userSubscribers.has(userId)) {
      userSubscribers.set(userId, new Set());
      
      // Start Firestore subscription
      const unsub = subscribeUserProfile(userId, (data) => {
        userCache.set(userId, data);
        const subs = userSubscribers.get(userId);
        if (subs) {
          subs.forEach((fn) => fn(data));
        }
      });
      unsubscribes.set(userId, unsub);
    }

    const subs = userSubscribers.get(userId);
    subs.add(handleChange);

    if (userCache.has(userId)) {
      setUser(userCache.get(userId));
    }

    return () => {
      const currentSubs = userSubscribers.get(userId);
      if (currentSubs) {
        currentSubs.delete(handleChange);
      }
    };
  }, [userId]);

  return user;
}
