'use client';

import { type RefObject, useEffect, useState, useSyncExternalStore } from 'react';

function subscribeMedia(query: string) {
  return (onChange: () => void) => {
    const mql = window.matchMedia(query);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  };
}

/**
 * Live `matchMedia` result. The server snapshot is `serverValue`, so SSR output is deterministic
 * and hydration never mismatches.
 */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );
}

/**
 * True when the user asked for reduced motion. It is also true during SSR and hydration,
 * so animated components always render their static variant first and only add motion once
 * we know it is welcome.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)', true);
}

/** Desktop-class pointer (mouse / trackpad). False on touch devices and during SSR. */
export function useFinePointer(): boolean {
  return useMediaQuery('(hover: hover) and (pointer: fine)', false);
}

/** Becomes true once the element enters the viewport (and stays true when `once`). */
export function useInView(
  ref: RefObject<Element | null>,
  { once = true, rootMargin = '0px 0px -10% 0px' }: { once?: boolean; rootMargin?: string } = {},
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        // Elements already scrolled past (e.g. after a reload mid-page) count as seen.
        const seen = entry.isIntersecting || entry.boundingClientRect.bottom < 0;
        if (once) {
          if (seen) {
            setInView(true);
            observer.disconnect();
          }
        } else {
          setInView(entry.isIntersecting);
        }
      },
      { rootMargin },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, once, rootMargin]);

  return inView;
}
