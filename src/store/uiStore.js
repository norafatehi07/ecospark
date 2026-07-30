// src/store/uiStore.js
import { create } from 'zustand';

const getPreferredTheme = () => {
  try {
    return localStorage.getItem('ecospark-theme') || 'regalia';
  } catch { return 'regalia'; }
};

const getPreferredMotion = () => {
  try {
    if (localStorage.getItem('ecospark-reduced-motion') === 'true') return true;
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
  } catch { return false; }
};

export const useUiStore = create((set, get) => ({
  // AI Coach
  coachOpen: false,
  coachMessages: [
    {
      role: 'assistant',
      content: "Hi! I'm your EcoSpark AI Coach 🌱 I can help you with eco tips, explain tasks, or motivate your streak. What's on your mind?",
    },
  ],
  coachHasNewTip: false,

  // Theme & Accessibility
  activeTheme: getPreferredTheme(),
  reducedMotion: getPreferredMotion(),
  textSize: localStorage.getItem('ecospark-text-size') || 'normal',
  highContrast: localStorage.getItem('ecospark-high-contrast') === 'true',

  // Notifications
  notifications: [],
  unreadCount: 0,

  // Actions
  toggleCoach: () => set((s) => ({ coachOpen: !s.coachOpen, coachHasNewTip: false })),
  openCoach: () => set({ coachOpen: true, coachHasNewTip: false }),
  closeCoach: () => set({ coachOpen: false }),

  appendCoachMessage: (message) =>
    set((s) => ({ coachMessages: [...s.coachMessages, message] })),

  updateLastCoachMessage: (content) =>
    set((s) => {
      const msgs = [...s.coachMessages];
      if (msgs.length > 0) msgs[msgs.length - 1] = { ...msgs[msgs.length - 1], content };
      return { coachMessages: msgs };
    }),

  setCoachHasNewTip: (val) => set({ coachHasNewTip: val }),

  clearCoachHistory: () =>
    set({
      coachMessages: [
        {
          role: 'assistant',
          content: "Hi! I'm your EcoSpark AI Coach 🌱 How can I help you today?",
        },
      ],
    }),

  setTheme: (theme) => {
    localStorage.setItem('ecospark-theme', theme);
    // Map theme name to data-theme attribute value.
    // A theme missing from this map falls through to its raw name, which only
    // works by coincidence — register new themes here explicitly.
    const attrMap = {
      forest: '',
      ocean: 'ocean',
      dark: 'dark',
      midnight: 'midnight',
      sunset: 'sunset',
      metallic: 'metallic',
      regalia: 'regalia',
    };
    document.documentElement.setAttribute('data-theme', attrMap[theme] ?? theme);
    set({ activeTheme: theme });
  },

  setReducedMotion: (val) => {
    localStorage.setItem('ecospark-reduced-motion', val);
    document.documentElement.setAttribute('data-reduced-motion', val);
    set({ reducedMotion: val });
  },

  setTextSize: (size) => {
    localStorage.setItem('ecospark-text-size', size);
    document.documentElement.setAttribute('data-text-size', size === 'normal' ? '' : size);
    set({ textSize: size });
  },

  setHighContrast: (val) => {
    localStorage.setItem('ecospark-high-contrast', val);
    document.documentElement.setAttribute('data-contrast', val ? 'high' : '');
    set({ highContrast: val });
  },

  setNotifications: (notifications) =>
    set({ notifications, unreadCount: notifications.filter((n) => !n.read).length }),
}));
