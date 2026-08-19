// src/App.jsx
import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './lib/firebase';
import { useAuthStore } from './store/authStore';
import { useUiStore } from './store/uiStore';
import { subscribeUserProfile, subscribeGlobalSettings } from './services/firestoreService';
import { useSettingsStore } from './store/settingsStore';
import toast from 'react-hot-toast';

import AppShell from './components/layout/AppShell';
import ProtectedRoute from './components/common/ProtectedRoute';
import { RingSpinner } from './components/common/GrowthRings';

// Pages (lazy-loaded)
const Home = React.lazy(() => import('./pages/Home'));
const Auth = React.lazy(() => import('./pages/Auth'));
const Tasks = React.lazy(() => import('./pages/Tasks'));
const Leaderboard = React.lazy(() => import('./pages/Leaderboard'));
const Rewards = React.lazy(() => import('./pages/Rewards'));
const Arena = React.lazy(() => import('./pages/Arena'));
const Community = React.lazy(() => import('./pages/Community'));
const Profile = React.lazy(() => import('./pages/Profile'));
const UserProfile = React.lazy(() => import('./pages/UserProfile'));
const Messages = React.lazy(() => import('./pages/Messages'));
const Settings = React.lazy(() => import('./pages/Settings'));
const Notifications = React.lazy(() => import('./pages/Notifications'));
const Admin = React.lazy(() => import('./pages/Admin'));
const About = React.lazy(() => import('./pages/About'));
const Landing = React.lazy(() => import('./pages/Landing'));
const Landing3D = React.lazy(() => import('./pages/Landing3D'));
const News = React.lazy(() => import('./pages/News'));

function LoadingScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--color-bg)',
      flexDirection: 'column',
      gap: '20px',
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '12px',
        animation: 'float 3s ease-in-out infinite',
      }}>
        <img 
          src="/logo-8k.jpeg" 
          alt="EcoSpark Logo" 
          style={{ 
            width: '72px', 
            height: '72px', 
            borderRadius: '16px', 
            objectFit: 'cover',
            boxShadow: 'var(--elevation-2)'
          }} 
        />
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--font-extrabold)',
          background: 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          letterSpacing: '-0.02em',
        }}>
          EcoSpark
        </span>
      </div>
      <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', fontSize: 'var(--text-sm)' }}>
        Loading experience...
      </p>
      {/* Ring pulse rather than a generic spinner — the Regalia motif, and the
          only ornament on this screen. */}
      <RingSpinner size={36} color="var(--color-primary)" label="Loading EcoSpark" />
    </div>
  );
}

function MaintenanceScreen() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'var(--color-bg)',
      flexDirection: 'column',
      gap: '24px',
      textAlign: 'center',
      padding: '24px'
    }}>
      <div style={{ fontSize: '64px' }}>🚧</div>
      <h1 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-text)', margin: 0 }}>System Under Maintenance</h1>
      <p style={{ color: 'var(--color-text-secondary)', fontFamily: 'var(--font-body)', maxWidth: '400px' }}>
        EcoSpark is currently undergoing scheduled maintenance. Please check back later! We are working hard to improve your experience.
      </p>
      <button 
        onClick={() => { import('firebase/auth').then(({ signOut }) => signOut(auth)); }}
        style={{ padding: '12px 24px', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
      >
        Return to Home
      </button>
    </div>
  );
}

export default function App() {
  const { user, setUser, setProfile, setLoading, loading, profile } = useAuthStore();
  const { setTheme, setReducedMotion, setTextSize, setHighContrast } = useUiStore();
  const { settings, setSettings } = useSettingsStore();
  const location = useLocation();

  // Apply saved preferences on mount
  useEffect(() => {
    // Regalia is the flagship default for new installs. Anyone who has already
    // picked a theme keeps it — this only changes the no-preference fallback.
    const theme = localStorage.getItem('ecospark-theme') || 'regalia';
    const reducedMotion = localStorage.getItem('ecospark-reduced-motion') === 'true'
      || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const textSize = localStorage.getItem('ecospark-text-size') || 'normal';
    const highContrast = localStorage.getItem('ecospark-high-contrast') === 'true';
    const themeContrast = localStorage.getItem('ecospark-theme-contrast') || 'default';

    setTheme(theme);
    setReducedMotion(reducedMotion);
    setTextSize(textSize);
    setHighContrast(highContrast);
    useUiStore.getState().setThemeContrast(themeContrast);
  }, []);

  // Firebase Auth listener
  useEffect(() => {
    let unsubProfile = null;

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        // Subscribe to live profile updates
        unsubProfile = subscribeUserProfile(firebaseUser.uid, (profile) => {
          if (profile?.banned) {
            // Kick banned user out instantly
            signOut(auth);
            toast.error('This account has been banned by an administrator.');
            return;
          }

          // Kick non-admin users out instantly if they sign in during maintenance mode
          const settings = useSettingsStore.getState().settings;
          const OWNER_EMAIL = 'amiteshyadav.yt@gmail.com';
          const isPrivileged = (profile?.role && ['admin', 'teacher', 'owner'].includes(profile.role)) || 
                               (firebaseUser.email === OWNER_EMAIL);
          if (settings?.maintenanceMode && !isPrivileged) {
            signOut(auth);
            toast('System maintenance in progress. You cannot log in right now.', { icon: '🚧', duration: 5000 });
            return;
          }
          
          // Sync email if it was changed via Firebase Auth
          if (profile && firebaseUser.email && profile.email !== firebaseUser.email) {
            import('./services/firestoreService').then(({ updateUserProfile }) => {
              updateUserProfile(firebaseUser.uid, { email: firebaseUser.email }).catch(console.error);
            });
          }

          setProfile(profile);
          setLoading(false);
        });
      } else {
        unsubProfile?.();
        setProfile(null);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
    };
  }, []);

  // Listen to global settings — and kick non-admin users if maintenance activates
  useEffect(() => {
    return subscribeGlobalSettings((s) => {
      setSettings(s);

      // If maintenance just turned on, sign out any non-admin user instantly
      if (s.maintenanceMode) {
        const currentUser = useAuthStore.getState().user;
        const currentProfile = useAuthStore.getState().profile;
        const OWNER_EMAIL = 'amiteshyadav.yt@gmail.com';
        const role = currentProfile?.role;
        console.log('[MAINTENANCE] Mode is ON. User:', currentUser?.email, 'Role:', role, 'Profile:', currentProfile);
        
        // Only skip signout if user is positively confirmed as admin/teacher/owner OR is the owner email
        const isPrivileged = (role && ['admin', 'teacher', 'owner'].includes(role)) || 
                             (currentUser?.email === OWNER_EMAIL);
        
        if (currentUser && !isPrivileged) {
          console.log('[MAINTENANCE] Signing out user:', currentUser.email);
          signOut(auth);
          toast('System maintenance in progress. You have been signed out.', { icon: '🚧', duration: 5000 });
        } else {
          console.log('[MAINTENANCE] User is admin/staff, skipping signout');
        }
      } else {
        console.log('[MAINTENANCE] Mode is OFF');
      }
    });
  }, []);

  if (loading || !settings) return <LoadingScreen />;

  // If maintenance mode is active and user is logged in as a normal student, sign them out instantly
  // so they land on the Landing page (and Auth page will show the maintenance banner)
  const isMaintenanceActiveForUser = settings.maintenanceMode && profile && !['admin', 'teacher', 'owner'].includes(profile.role);

  return (
    <React.Suspense fallback={<LoadingScreen />}>
      <Routes location={location} key={location.pathname}>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/*"
          element={
            user && !isMaintenanceActiveForUser ? (
              <ProtectedRoute>
                <AppShell>
                  <Routes location={location} key={location.pathname}>
                    <Route path="/" element={<Home />} />
                    <Route path="/news" element={<News />} />
                    <Route path="/tasks" element={<Tasks />} />
                    <Route path="/leaderboard" element={<Leaderboard />} />
                    <Route path="/rewards" element={<Rewards />} />
                    {(settings.arenaEnabled ?? true) && (
                      <Route path="/arena" element={<Arena />} />
                    )}
                    <Route path="/community" element={<Community />} />
                    <Route path="/profile" element={<Profile />} />
                    <Route path="/user/:id" element={<UserProfile />} />
                    <Route path="/messages" element={<Messages />} />
                    <Route path="/messages/:chatId" element={<Messages />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="/about" element={<About />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </AppShell>
              </ProtectedRoute>
            ) : (
              settings?.landingPageStyle === '3d' ? <Landing3D /> : <Landing />
            )
          }
        />
      </Routes>
    </React.Suspense>
  );
}
