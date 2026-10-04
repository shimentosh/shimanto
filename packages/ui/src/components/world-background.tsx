'use client';

import { useEffect } from 'react';
import { type Surface, surfaceVar } from '../lib/worlds';

/**
 * Tweens the page background (`--page-bg`) to the world colour of whichever `[data-world]`
 * section crosses the middle of the viewport. The transition lives in CSS, so reduced motion
 * makes it an instant swap. Mount once per page layout; it renders nothing.
 */
export function WorldBackground() {
  useEffect(() => {
    const root = document.documentElement;
    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-world]'));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const world = (entry.target as HTMLElement).dataset.world as Surface;
          root.style.setProperty('--page-bg', surfaceVar(world));
        }
      },
      // A 1px band across the vertical middle of the viewport.
      { rootMargin: '-50% 0px -50% 0px' },
    );
    sections.forEach((section) => observer.observe(section));
    return () => {
      observer.disconnect();
      root.style.removeProperty('--page-bg');
    };
  }, []);

  return null;
}
