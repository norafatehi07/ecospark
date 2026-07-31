// src/lib/useMediaQuery.js
// One place that knows how to ask the browser about a media query.
//
// The shell has exactly one navigation breakpoint (§4.A: 1024px). Anything that
// needs to branch on it in JavaScript — the toast position, which nav is
// interactive — asks here, so the number lives next to the token that sets it
// rather than being retyped in five components.
import { useState, useEffect } from 'react';

export const NAV_BREAKPOINT = 1024;
export const MOBILE_QUERY = `(max-width: ${NAV_BREAKPOINT - 1}px)`;

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (e) => setMatches(e.matches);
    setMatches(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** True below the one navigation breakpoint. */
export function useIsMobile() {
  return useMediaQuery(MOBILE_QUERY);
}
