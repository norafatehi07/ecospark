import React, { forwardRef } from 'react';
import styles from './Card.module.css';

/**
 * Card — the shared surface primitive (Regalia Phase 1).
 *
 * globals.css already ships a `.card` class, and ~15 page-level modules style
 * their own panels. This does NOT replace either; it is the primitive new
 * premium surfaces compose from, and it differs from `.card` in one important
 * way: `.card` applies a hover lift to *every* card unconditionally, which §2.5
 * explicitly rules out ("if you're tempted to animate something that appears on
 * every page load ... don't"). Here the lift is opt-in via `interactive`.
 *
 * Tone ladder, quietest first:
 *   flat    — border only, no shadow. Nested panels, list rows.
 *   default — --color-bg-card + elevation-2. The everyday surface.
 *   raised  — --color-surface-raised + elevation-3. Pulls one panel forward.
 *   glass   — --glass-bg + blur. Overlays and sticky chrome only.
 *   gold    — gold hairline + gold-tinted elevation. Ceremonial/celestial only.
 *
 * `interactive` makes the card a real control: it becomes focusable, takes
 * Enter/Space, and gets role="button" unless you pass your own `as`/`role`.
 * A div with an onClick and no keyboard path is the accessibility bug this
 * prop exists to prevent.
 */
const Card = forwardRef(function Card(
  {
    children,
    tone = 'default',
    padding = 'md',
    interactive = false,
    as: Component = 'div',
    className = '',
    onClick,
    onKeyDown,
    role,
    tabIndex,
    ...rest
  },
  ref
) {
  const isNativeInteractive = Component === 'button' || Component === 'a';
  const needsKeyboardShim = interactive && !isNativeInteractive;

  const classes = [
    styles.card,
    styles[tone] || styles.default,
    styles[`pad-${padding}`] || styles['pad-md'],
    interactive ? styles.interactive : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const handleKeyDown = (event) => {
    onKeyDown?.(event);
    if (!needsKeyboardShim || !onClick || event.defaultPrevented) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'Spacebar') {
      // Space would otherwise scroll the page.
      event.preventDefault();
      onClick(event);
    }
  };

  return (
    <Component
      ref={ref}
      className={classes}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={role ?? (needsKeyboardShim ? 'button' : undefined)}
      tabIndex={tabIndex ?? (needsKeyboardShim ? 0 : undefined)}
      {...rest}
    >
      {children}
    </Component>
  );
});

/**
 * CardHeader / CardBody / CardFooter — optional structure. They only handle
 * spacing and the divider hairline; nothing here decides colour or type scale
 * beyond the tokens, so [data-text-size] and [data-contrast] still apply.
 */
export function CardHeader({ title, subtitle, action, children, className = '', ...rest }) {
  return (
    <div className={`${styles.header} ${className}`} {...rest}>
      <div className={styles.headerText}>
        {title && <h3 className={styles.title}>{title}</h3>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
      </div>
      {action && <div className={styles.headerAction}>{action}</div>}
    </div>
  );
}

export function CardBody({ children, className = '', ...rest }) {
  return (
    <div className={`${styles.body} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '', ...rest }) {
  return (
    <div className={`${styles.footer} ${className}`} {...rest}>
      {children}
    </div>
  );
}

export default Card;
