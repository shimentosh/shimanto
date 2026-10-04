import { type Accent, accentBg, cn } from '@shimanto/ui';
import type { ReactNode } from 'react';

/**
 * Little animated marks that sit beside a DisplayTitle's first line, one per section's subject.
 * Sized in `em`, so they scale with the headline. Animations live in globals.css and stand
 * still under reduced motion.
 */

/** Music: four bars bouncing to the beat. */
export function Equalizer({ tone = 'create' }: { tone?: Accent }) {
  return [0.55, 1, 0.7, 0.9].map((h, i) => (
    <span
      key={i}
      className={cn('motif-eq w-[0.085em] rounded-full', accentBg[tone])}
      style={{ height: `${h * 100}%`, animationDelay: `${-i * 0.28}s` }}
    />
  ));
}

/** Building: three blocks that stack up, one after another. */
export function Blocks({ tone = 'build' }: { tone?: Accent }) {
  return (
    <span className="flex flex-col-reverse items-center gap-[0.04em]">
      {[0.3, 0.24, 0.18].map((size, i) => (
        <span
          key={i}
          className={cn('motif-block rounded-[0.04em]', accentBg[tone])}
          style={{ width: `${size}em`, height: `${size * 0.62}em`, animationDelay: `${i * 0.35}s` }}
        />
      ))}
    </span>
  );
}

/** Coming soon: three dots, loading. */
export function LoadingDots({ tone = 'signal' }: { tone?: Accent }) {
  return [0, 1, 2].map((i) => (
    <span
      key={i}
      className={cn('motif-dot mb-[0.04em] size-[0.13em] rounded-full', accentBg[tone])}
      style={{ animationDelay: `${i * 0.18}s` }}
    />
  ));
}

/** Writing: a blinking text cursor. */
export function Caret({ tone = 'idea' }: { tone?: Accent }) {
  return <span className={cn('motif-caret h-[0.82em] w-[0.06em] rounded-full', accentBg[tone])} />;
}

/** Now: a live dot with a ping ring. */
export function LiveDot({ tone = 'build' }: { tone?: Accent }) {
  return (
    <span className="relative mb-[0.1em] grid size-[0.2em] place-items-center">
      <span className={cn('motif-ping absolute inset-0 rounded-full', accentBg[tone])} />
      <span className={cn('relative size-[0.2em] rounded-full', accentBg[tone])} />
    </span>
  );
}

/** Social: broadcast waves going out. */
export function Broadcast({ tone = 'spark' }: { tone?: Accent }) {
  return (
    <svg viewBox="0 0 24 24" className="mb-[-0.02em] size-[0.62em] overflow-visible" fill="none">
      <circle cx="5" cy="19" r="2.4" style={{ fill: `var(--${tone})` }} />
      {[7, 12, 17].map((r, i) => (
        <path
          key={r}
          className="motif-wave"
          d={`M5 ${19 - r}a${r} ${r} 0 0 1 ${r} ${r}`}
          stroke={`var(--${tone})`}
          strokeWidth="2.4"
          strokeLinecap="round"
          style={{ animationDelay: `${i * 0.3}s` }}
        />
      ))}
    </svg>
  );
}

/** A hand-drawn line through a word ("Not a ~~portfolio~~"). */
export function Strike({ children, tone = 'create' }: { children: ReactNode; tone?: Accent }) {
  return (
    <span className="relative inline-block">
      {children}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 20"
        preserveAspectRatio="none"
        className="pointer-events-none absolute top-[48%] left-[-3%] h-[0.3em] w-[106%] -translate-y-1/2 overflow-visible"
      >
        <path
          className="motif-strike"
          d="M3 14C40 9 90 6 130 8s50 2 67-3"
          fill="none"
          stroke={`var(--${tone})`}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          style={{ strokeWidth: 'clamp(3px, 0.07em, 10px)' }}
        />
      </svg>
    </span>
  );
}
