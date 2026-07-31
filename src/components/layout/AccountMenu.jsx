// src/components/layout/AccountMenu.jsx
// Phase 4 §4.L — the account popover, and the only home of the appearance controls.
//
// Theme, text size and contrast live here rather than on a settings page because
// all three are judged by looking at the app: sending someone to a dedicated page
// to pick a theme means they choose it against the one screen it does not have to
// work on. Picking a chip therefore does not close the menu.
//
// role="dialog" rather than role="menu": ARIA only allows menuitem-shaped
// children inside a menu, and the appearance panel is a set of toggle buttons. A
// menu role here would promise Arrow-key semantics this popover does not have, so
// the anchor buttons advertise aria-haspopup="dialog" to match.
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Bell, Settings as SettingsIcon, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useUiStore, THEMES, TEXT_SIZES, CONTRASTS } from '../../store/uiStore';
import { useIsMobile } from '../../lib/useMediaQuery';
import toast from 'react-hot-toast';
import styles from './AccountMenu.module.css';

const LINKS = [
  { path: '/profile', icon: User, label: 'Profile' },
  { path: '/notifications', icon: Bell, label: 'Notifications' },
  { path: '/settings', icon: SettingsIcon, label: 'Settings' },
];

const REGALIA_THEMES = THEMES.filter((t) => t.group === 'regalia');
const CLASSIC_THEMES = THEMES.filter((t) => t.group === 'classic');

// Keep in step with .panel's width in the stylesheet — the clamp below needs the
// number before the panel has been laid out.
const PANEL_WIDTH = 264;

const EASE_GLIDE = [0.16, 1, 0.3, 1];

/** §4.J vocabulary — a short glide, never a spring: the nav indicator owns the
 *  shell's only spring. Reduced motion gets the same surface with no entrance. */
function panelMotion(sheet, reduced) {
  if (reduced) return {};
  if (sheet) {
    return {
      initial: { y: 24, opacity: 0 },
      animate: { y: 0, opacity: 1 },
      exit: { y: 24, opacity: 0 },
      transition: { duration: 0.22, ease: EASE_GLIDE },
    };
  }
  return {
    initial: { opacity: 0, y: 6, scale: 0.98 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: 4, scale: 0.98 },
    transition: { duration: 0.18, ease: EASE_GLIDE },
  };
}

function Chip({ label, active, onClick }) {
  return (
    <button
      type="button"
      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function AppearancePanel() {
  const theme = useUiStore((s) => s.activeTheme);
  const textSize = useUiStore((s) => s.textSize);
  const contrast = useUiStore((s) => s.highContrast ? 'high' : 'default');
  const setTheme = useUiStore((s) => s.setTheme);
  const setTextSize = useUiStore((s) => s.setTextSize);
  const setContrast = useUiStore((s) => s.setContrast);

  // Phase 1 shipped `regalia-day` for what §4.F calls `regalia-light`, and both
  // resolve to the same token block — so a preference saved under the old name
  // still has to light its chip.
  const activeTheme = theme === 'regalia-day' ? 'regalia-light' : theme;

  return (
    <div className={styles.appearance}>
      <div className={styles.group} role="group" aria-label="Theme">
        <span className={styles.groupLabel}>Theme</span>
        <div className={styles.chipRow}>
          {REGALIA_THEMES.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              active={activeTheme === t.id}
              onClick={() => setTheme(t.id)}
            />
          ))}
        </div>
        <div className={`${styles.hairline} ${styles.classicSplit}`} />
        <span className={styles.groupLabel}>Classic</span>
        <div className={styles.chipRow}>
          {CLASSIC_THEMES.map((t) => (
            <Chip
              key={t.id}
              label={t.label}
              active={activeTheme === t.id}
              onClick={() => setTheme(t.id)}
            />
          ))}
        </div>
      </div>

      <div className={styles.group} role="group" aria-label="Text size">
        <span className={styles.groupLabel}>Text size</span>
        <div className={styles.chipRow}>
          {TEXT_SIZES.map((s) => (
            <Chip
              key={s.id}
              label={s.label}
              active={textSize === s.id}
              onClick={() => setTextSize(s.id)}
            />
          ))}
        </div>
      </div>

      <div className={styles.group} role="group" aria-label="Contrast">
        <span className={styles.groupLabel}>Contrast</span>
        <div className={styles.chipRow}>
          {CONTRASTS.map((c) => (
            <Chip
              key={c.id}
              label={c.label}
              active={contrast === c.id}
              onClick={() => setContrast(c.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {boolean}  open
 * @param {Function} onClose      close without moving focus (outside click, navigation)
 * @param {object}   anchorRef    the account button — positions the popover and
 *                                takes focus back when Escape closes the menu
 */
export default function AccountMenu({ open, onClose, anchorRef }) {
  const isMobile = useIsMobile();
  const panelRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  const reduced = useUiStore((s) => s.reducedMotion);

  const closeToAnchor = useCallback(() => {
    anchorRef?.current?.focus();
    onClose();
  }, [anchorRef, onClose]);

  // Placed before paint, not after: measuring in a passive effect would show the
  // panel at its fallback corner for a frame and then move it.
  useLayoutEffect(() => {
    if (!open || isMobile) return undefined;
    const place = () => {
      const rect = anchorRef?.current?.getBoundingClientRect();
      if (!rect) {
        setPos({ left: 12, bottom: 12 });
        return;
      }
      setPos({
        left: Math.max(8, Math.min(rect.left, window.innerWidth - PANEL_WIDTH - 8)),
        bottom: Math.max(8, window.innerHeight - rect.top + 8),
      });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [open, isMobile, anchorRef]);

  useEffect(() => {
    if (!open) return;
    panelRef.current?.querySelector('a[href], button')?.focus();
  }, [open]);

  // Crossing the nav breakpoint hides the chrome the anchor belongs to. Closing
  // is the honest outcome: the alternative is a sheet pointing at a button that
  // is no longer on screen.
  const wasMobile = useRef(isMobile);
  useEffect(() => {
    if (wasMobile.current === isMobile) return;
    wasMobile.current = isMobile;
    if (open) onClose();
  }, [isMobile, open, onClose]);

  // Escape returns focus to the button that opened this. Tab wraps because the
  // scrim makes everything behind the menu unclickable — walking focus out there
  // would hand the keyboard controls the pointer cannot reach.
  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeToAnchor();
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closeToAnchor]);

  const handleSignOut = useCallback(async () => {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await useAuthStore.getState().signOut();
    } catch {
      setSigningOut(false);
    }
  }, [signingOut]);

  // Anchored from the bottom edge, so the room the panel has is what is left
  // above the button — not the whole viewport.
  const anchoredBottom = pos?.bottom ?? 12;
  const desktopStyle = {
    left: pos?.left ?? 12,
    bottom: anchoredBottom,
    maxHeight: `calc(100dvh - ${anchoredBottom + 8}px)`,
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="scrim"
          className={`${styles.scrim} ${isMobile ? styles.scrimSheet : ''}`}
          aria-hidden="true"
          onPointerDown={onClose}
          {...(reduced ? {} : {
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            transition: { duration: 0.14, ease: 'linear' },
          })}
        />
      )}
      {open && (
        <motion.div
          key="panel"
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label="Account"
          className={`${styles.panel} ${isMobile ? styles.sheet : ''}`}
          style={isMobile ? undefined : desktopStyle}
          {...panelMotion(isMobile, reduced)}
        >
          {LINKS.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={styles.item}
              onClick={onClose}
            >
              <link.icon size={16} className={styles.itemIcon} aria-hidden="true" />
              <span>{link.label}</span>
            </Link>
          ))}

          <div className={styles.hairline} />
          <AppearancePanel />
          <div className={styles.hairline} />

          <button
            type="button"
            className={styles.item}
            onClick={handleSignOut}
            disabled={signingOut}
          >
            <LogOut size={16} className={styles.itemIcon} aria-hidden="true" />
            <span>{signingOut ? 'Signing out…' : 'Sign out'}</span>
          </button>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
