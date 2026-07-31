// src/store/offlineStore.js
import { create } from 'zustand';

const QUEUE_KEY = 'ecospark-offline-queue';

const loadQueue = () => {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
  } catch { return []; }
};

const saveQueue = (queue) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
};

export const useOfflineStore = create((set, get) => ({
  isOnline: navigator.onLine,
  pendingTasks: loadQueue(),
  syncing: false,

  setOnline: (val) => set({ isOnline: val }),

  queueTask: (task) => {
    const queue = [...get().pendingTasks, { ...task, queuedAt: Date.now() }];
    saveQueue(queue);
    set({ pendingTasks: queue });
  },

  removeFromQueue: (id) => {
    const queue = get().pendingTasks.filter((t) => t.id !== id);
    saveQueue(queue);
    set({ pendingTasks: queue });
  },

  clearQueue: () => {
    saveQueue([]);
    set({ pendingTasks: [] });
  },

  setSyncing: (val) => set({ syncing: val }),
}));
