// src/store/authStore.js
import { create } from 'zustand';

export const useAuthStore = create((set) => ({
  user: null,        // Firebase Auth user
  profile: null,     // Firestore user doc
  loading: true,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  logout: () => {
    sessionStorage.removeItem('entryPlayed');
    set({ user: null, profile: null, loading: false });
  },
}));
