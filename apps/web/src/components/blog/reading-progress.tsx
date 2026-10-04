'use client';

import { type Accent, accentBg, cn } from '@shimanto/ui';
import { useEffect, useRef } from 'react';

/**
 * Thin progress bar pinned to the top edge that fills as you read `targetId`.
 * Transform-only (scaleX) and updated once per frame.
 */
export function ReadingProgress({ targetId, tone }: { targetId: string; tone: Accent }) {
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const total = rect.height - window.innerHeight;
        const progress = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
        if (bar.current) bar.current.style.transform = `scaleX(${progress})`;
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [targetId]);

  return (
    <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[60] h-1">
      <div
        ref={bar}
        className={cn('h-full origin-left', accentBg[tone])}
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
