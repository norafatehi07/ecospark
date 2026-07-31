// src/pages/Auth.jsx
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
} from 'firebase/auth';
import { auth, googleProvider } from '../lib/firebase';
import { createUserProfile, processReferral } from '../services/firestoreService';
import { useSettingsStore } from '../store/settingsStore';
import toast from 'react-hot-toast';
import styles from './Auth.module.css';

export default function Auth() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const [form, setForm] = useState({ name: '', email: '', password: '', referralCode: refCode });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const { settings } = useSettingsStore();

  const isSignupDisabled = settings?.maintenanceMode || !settings?.allowSignups;

  const handleForgotPassword = async () => {
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) {
      toast.error('Please enter your email address first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, form.email);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (err) {
      toast.error(err.code === 'auth/user-not-found' ? 'No account found with that email.' : 'Could not send reset email.');
    }
  };

  const validate = () => {
    const e = {};
    if (mode === 'signup' && !form.name.trim()) e.name = 'Name is required';
    if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Valid email required';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'signup') {
        const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
        await updateProfile(cred.user, { displayName: form.name });
        
        // Send email verification link
        const { sendEmailVerification, signOut } = await import('firebase/auth');
        await sendEmailVerification(cred.user);

        await createUserProfile(cred.user.uid, {
          displayName: form.name,
          email: form.email,
          photoURL: null,
        });
        if (form.referralCode) await processReferral(cred.user.uid, form.referralCode);
        
        // Sign them out until they verify
        await signOut(auth);
        
        toast.success('Account created! Please check your email to verify your account before logging in.', { duration: 6000 });
        setMode('signin');
        setLoading(false);
        return; // Do not navigate to dashboard
      } else {
        const cred = await signInWithEmailAndPassword(auth, form.email, form.password);
        
        const { signOut, sendEmailVerification } = await import('firebase/auth');

        // Enforce Email Verification
        if (!cred.user.emailVerified) {
          await sendEmailVerification(cred.user).catch(() => {}); // silently resend if they forgot
          await signOut(auth);
          toast.error('Please verify your email address first. We just sent a new link to your inbox.', { duration: 6000 });
          setLoading(false);
          return;
        }

        // Check if banned
        const { getDoc, doc } = await import('firebase/firestore');
        const { db } = await import('../lib/firebase');
        const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
        
        if (userDoc.exists() && userDoc.data().banned) {
          await signOut(auth);
          toast.error('You are banned! This account cannot access EcoSpark.', { duration: 5000 });
          setLoading(false);
          return;
        }

        toast.success('Welcome back!');
      }
      navigate('/');
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Email already in use. Try signing in!'
        : ['auth/wrong-password', 'auth/user-not-found', 'auth/invalid-credential', 'auth/invalid-login-credentials'].includes(err.code)
        ? 'Invalid email or password. Please try again.'
        : err.message.replace('Firebase:', '').trim();
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      
      // Check if banned
      const { getDoc, doc } = await import('firebase/firestore');
      const { db } = await import('../lib/firebase');
      const userDoc = await getDoc(doc(db, 'users', cred.user.uid));
      
      if (userDoc.exists() && userDoc.data().banned) {
        const { signOut } = await import('firebase/auth');
        await signOut(auth);
        toast.error('You are banned! This account cannot access EcoSpark.', { duration: 5000 });
        return;
      }

      const isNew = cred._tokenResponse?.isNewUser;
      if (isNew) {
        await createUserProfile(cred.user.uid, {
          displayName: cred.user.displayName,
          email: cred.user.email,
          photoURL: cred.user.photoURL,
        });
        if (form.referralCode) await processReferral(cred.user.uid, form.referralCode);
        toast.success('Welcome to EcoSpark! 🌱');
      } else {
        toast.success('Welcome back!');
      }
      navigate('/');
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user') {
        toast.error('Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      {/* Background */}
      <div className={styles.bg}>
        <div className={styles.bgOrb1} />
        <div className={styles.bgOrb2} />
        <div className={styles.bgOrb3} />
      </div>

      <motion.div
        className={styles.card}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        {/* Logo */}
        <div className={styles.logo}>
          <img src="/logo-8k.jpeg" alt="EcoSpark Icon" style={{ height: '72px', width: '72px', borderRadius: '16px', objectFit: 'cover' }} />
          <div>
            <p className={styles.logoSub}>Sustainability Habit Tracker</p>
          </div>
        </div>

        {/* Mode toggle */}
        <div className={styles.toggle}>
          <button
            className={`${styles.toggleBtn} ${mode === 'signin' ? styles.toggleActive : ''}`}
            onClick={() => { setMode('signin'); setErrors({}); }}
          >
            Sign In
          </button>
          <button
            className={`${styles.toggleBtn} ${mode === 'signup' ? styles.toggleActive : ''}`}
            onClick={() => { setMode('signup'); setErrors({}); }}
          >
            Sign Up
          </button>
        </div>

        {mode === 'signup' && isSignupDisabled ? (
          <div style={{ textAlign: 'center', padding: '24px', backgroundColor: 'var(--color-bg)', borderRadius: '12px', border: '1px solid var(--color-border)', marginBottom: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🚧</div>
            <h3 style={{ color: 'var(--color-text)', margin: '0 0 8px 0', fontFamily: 'var(--font-display)' }}>
              {settings?.maintenanceMode ? 'System Maintenance' : 'Signups Paused'}
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--text-sm)', margin: 0 }}>
              {settings?.maintenanceMode 
                ? 'We are currently undergoing scheduled maintenance. New registrations are temporarily paused.' 
                : 'We are currently not accepting new user registrations. Please check back later!'}
            </p>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className={styles.form}>
            <AnimatePresence mode="popLayout">
              {mode === 'signup' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <div className={styles.field}>
                    <label className={styles.label}>Full Name</label>
                    <input
                      id="auth-name"
                      type="text"
                      className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                      placeholder="Your name"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      autoComplete="name"
                    />
                    {errors.name && <p className={styles.error}>{errors.name}</p>}
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Referral Code (Optional)</label>
                    <input
                      id="auth-referral"
                      type="text"
                      className={styles.input}
                      placeholder="ECO-..."
                      value={form.referralCode}
                      onChange={(e) => setForm({ ...form, referralCode: e.target.value })}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={styles.field}>
              <label className={styles.label}>Email</label>
              <input
                id="auth-email"
                type="email"
                className={`${styles.input} ${errors.email ? styles.inputError : ''}`}
                placeholder="you@email.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
              />
              {errors.email && <p className={styles.error}>{errors.email}</p>}
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Password</label>
              <input
                id="auth-password"
                type="password"
                className={`${styles.input} ${errors.password ? styles.inputError : ''}`}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              />
              {errors.password && <p className={styles.error}>{errors.password}</p>}
              {mode === 'signin' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className={styles.forgotLink}
                  style={{ background: 'none', border: 'none', color: 'var(--color-primary)', fontSize: 'var(--text-xs)', cursor: 'pointer', padding: '4px 0', marginTop: '4px', textAlign: 'right', width: '100%', fontFamily: 'var(--font-body)' }}
                >
                  Forgot Password?
                </button>
              )}
            </div>

            <motion.button
              type="submit"
              className={styles.submitBtn}
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? (
                <span className={styles.spinner} />
              ) : mode === 'signin' ? (
                'Sign In'
              ) : (
                'Create Account'
              )}
            </motion.button>
          </form>
        )}

        {/* Divider */}
        <div className={styles.divider}><span>or</span></div>

        {/* Google */}
        <motion.button
          type="button"
          className={styles.googleBtn}
          onClick={handleGoogleAuth}
          disabled={loading || (mode === 'signup' && isSignupDisabled)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </motion.button>

        <p className={styles.terms}>
          By continuing, you agree to our <a href="#">Terms</a> and <a href="#">Privacy Policy</a>
        </p>
      </motion.div>
    </div>
  );
}
