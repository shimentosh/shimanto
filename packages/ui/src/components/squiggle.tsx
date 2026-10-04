'use client';

import { type ReactNode, useRef } from 'react';
import { cn } from '../lib/cn';
import { useInView, usePrefersReducedMotion } from '../lib/hooks';
import { type Surface, surfaceVar } from '../lib/worlds';

export interface SquiggleProps {
  /** The keyword to underline. It stays plain text for screen readers and SEO. */
  children: ReactNode;
  /** Stroke colour: the section's world colour. */
  world?: Surface;
  className?: string;
}

const WAVE = 'M3 13 C 23 3, 40 21, 60 11 S 98 3, 118 12 S 156 21, 176 10 S 194 7, 197 9';

type State = 'static' | 'armed' | 'drawing';

/**
 * Hand-drawn wave under one keyword, drawn with a left-to-right wipe when it scrolls
 * into view. SSR and no-JS output is the finished underline. With reduced motion it never animates.
 */
export function Squiggle({ children, world = 'build', className }: SquiggleProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = usePrefersReducedMotion();
  const inView = useInView(ref);
  // `reduced` is true during SSR/hydration, so the finished underline shows until the client arms it.
  const state: State = reduced ? 'static' : inView ? 'drawing' : 'armed';

  return (
    <span ref={ref} data-squiggle={state} className={cn('relative inline-block', className)}>
      {children}
      <svg
        aria-hidden="true"
        focusable="false"
        viewBox="0 0 200 24"
        preserveAspectRatio="none"
        className="squiggle-svg pointer-events-none absolute -bottom-[0.14em] left-[-2%] h-[0.26em] w-[104%] overflow-visible"
      >
        <path
          d={WAVE}
          fill="none"
          stroke={surfaceVar(world)}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 'clamp(3px, 0.075em, 12px)' }}
        />
      </svg>
    </span>
  );
}
