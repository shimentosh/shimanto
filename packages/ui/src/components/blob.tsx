'use client';

import { usePrefersReducedMotion } from '../lib/hooks';
import { cn } from '../lib/cn';
import { type Surface, surfaceVar } from '../lib/worlds';

/** Organic shapes that share one command structure (M + 4×C + Z), so SMIL can morph between them. */
const SHAPES = [
  'M104,18 C150,14 186,52 182,98 C178,146 150,184 100,182 C52,180 16,150 18,102 C20,56 58,22 104,18Z',
  'M96,24 C142,10 190,60 176,104 C164,150 140,178 94,176 C46,174 22,140 24,96 C26,52 50,36 96,24Z',
  'M108,22 C156,30 172,62 178,108 C184,152 136,186 92,178 C50,170 12,146 20,98 C28,50 62,16 108,22Z',
] as const;

export interface BlobProps {
  world?: Surface;
  /** Picks the resting shape and the morph order, so neighbouring blobs don't move in sync. */
  seed?: 0 | 1 | 2;
  /** Morph cycle length in seconds. */
  duration?: number;
  /** Slow scroll parallax (CSS scroll-driven; ignored where unsupported or with reduced motion). */
  parallax?: boolean;
  className?: string;
}

/**
 * Decorative morphing SVG blob. The static shape is rendered on the server; the morph is only
 * added on the client, and only when the user hasn't asked for reduced motion.
 */
export function Blob({ world = 'build', seed = 0, duration = 18, parallax, className }: BlobProps) {
  const reduced = usePrefersReducedMotion();
  const ordered = [...SHAPES.slice(seed), ...SHAPES.slice(0, seed)];
  const rest = ordered[0];

  return (
    <svg
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
      className={cn('pointer-events-none', parallax && 'parallax-slow', className)}
    >
      <path d={rest} fill={surfaceVar(world)}>
        {!reduced && (
          <animate
            attributeName="d"
            dur={`${duration}s`}
            repeatCount="indefinite"
            calcMode="spline"
            keyTimes="0;0.33;0.66;1"
            keySplines="0.45 0 0.55 1;0.45 0 0.55 1;0.45 0 0.55 1"
            values={[...ordered, rest].join(';')}
          />
        )}
      </path>
    </svg>
  );
}
