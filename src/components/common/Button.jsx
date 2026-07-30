import React, { forwardRef } from 'react';
import { RingSpinner } from './GrowthRings';
import styles from './Button.module.css';

/**
 * Button — the shared action primitive (Regalia Phase 1).
 *
 * Deliberately QUIET. §2.2 of the overhaul brief spends the elaborate execution
 * budget on the Growth Rings motif and says to "keep everything else (buttons,
 * tables, forms) quiet by comparison"; §2.5 adds "if you're tempted to animate
 * something that appears on every page load (nav, cards, standard buttons),
 * don't." So: no entrance animation, no glow by default, no gradient. Hover is a
 * 150ms colour/elevation shift and a 1.02 scale, nothing more.
 *
 * Everything is a token. No hex values, no px font sizes — that is what makes
 * [data-theme], [data-contrast="high"] and [data-text-size] work for free.
 *
 * `as` lets the same visuals carry a router <Link> or an <a> without duplicating
 * the CSS. When `as` is a component, `to`/`href` pass straight through.
 */
const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    as: Component = 'button',
    type,
    loading = false,
    disabled = false,
    fullWidth = false,
    iconOnly = false,
    leadingIcon = null,
    trailingIcon = null,
    loadingLabel = 'Working',
    className = '',
    onClick,
    ...rest
  },
  ref
) {
  const isNativeButton = Component === 'button';
  // A loading button must stay focused and announce itself, so it is
  // aria-disabled (still reachable) rather than removed from the tab order.
  const inert = disabled || loading;

  const classes = [
    styles.btn,
    styles[variant] || styles.primary,
    styles[size] || styles.md,
    fullWidth ? styles.fullWidth : '',
    iconOnly ? styles.iconOnly : '',
    loading ? styles.isLoading : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleClick = (event) => {
    if (inert) {
      event.preventDefault();
      return;
    }
    onClick?.(event);
  };

  return (
    <Component
      ref={ref}
      className={classes}
      // Only native buttons get a real type/disabled; links get aria-disabled.
      {...(isNativeButton ? { type: type || 'button', disabled } : {})}
      aria-disabled={inert || undefined}
      aria-busy={loading || undefined}
      onClick={handleClick}
      {...rest}
    >
      {loading && (
        <span className={styles.spinner} aria-hidden="true">
          <RingSpinner size={size === 'sm' ? 14 : 18} color="currentColor" label={loadingLabel} />
        </span>
      )}
      {!loading && leadingIcon && (
        <span className={styles.icon} aria-hidden="true">{leadingIcon}</span>
      )}
      {/* Label stays mounted while loading so the button does not resize mid-action. */}
      <span className={loading ? styles.labelMuted : styles.label}>{children}</span>
      {!loading && trailingIcon && (
        <span className={styles.icon} aria-hidden="true">{trailingIcon}</span>
      )}
    </Component>
  );
});

export default Button;
