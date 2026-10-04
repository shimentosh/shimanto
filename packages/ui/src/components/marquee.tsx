'use client';

import { type ReactNode, useState } from 'react';
import { cn } from '../lib/cn';

export interface MarqueeRow {
  items: ReactNode[];
  direction?: 'left' | 'right';
}

export interface MarqueeProps {
  rows: MarqueeRow[];
  /** Accessible name for the whole marquee region. */
  label: string;
  /** Seconds for one full loop. */
  duration?: number;
  /** Gap between items (Tailwind gap class). */
  gapClassName?: string;
  className?: string;
}

/**
 * Infinite multi-row ticker. It pauses on hover or focus, and a visible pause button covers
 * WCAG 2.2.2. With reduced motion it becomes a static, wrapped list with no duplicates.
 * The second copy of each row is `aria-hidden` so assistive tech reads every item once.
 */
export function Marquee({
  rows,
  label,
  duration = 40,
  gapClassName = 'gap-3',
  className,
}: MarqueeProps) {
  const [paused, setPaused] = useState(false);

  return (
    <div
      role="region"
      aria-label={label}
      data-paused={paused}
      className={cn('marquee relative', className)}
      style={{ ['--marquee-duration' as string]: `${duration}s` }}
    >
      <div className="marquee-viewport flex flex-col gap-3 overflow-hidden">
        {rows.map((row, rowIndex) => (
          <div key={rowIndex} className="marquee-row" data-direction={row.direction ?? 'left'}>
            <div className={cn('marquee-track flex w-max', gapClassName)}>
              <ul className={cn('flex shrink-0 items-center', gapClassName)}>
                {row.items.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
              <ul
                aria-hidden="true"
                className={cn('marquee-dup flex shrink-0 items-center', gapClassName)}
              >
                {row.items.map((item, i) => (
                  <li key={i} inert>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        aria-pressed={paused}
        className="marquee-toggle bg-paper text-ink rounded-pill absolute -top-11 right-0 px-3 py-1 font-mono text-xs tracking-[0.12em] uppercase"
      >
        {paused ? 'Play' : 'Pause'}
        <span className="sr-only"> scrolling</span>
      </button>
    </div>
  );
}

export interface MarqueePillProps {
  label: string;
  /** Icon or monogram in the round badge. */
  icon?: ReactNode;
  /** Secondary text, e.g. a follower count. */
  meta?: string;
  href?: string;
  className?: string;
}

/** Pill chip used inside marquees: round icon badge, name, optional meta. */
export function MarqueePill({ label, icon, meta, href, className }: MarqueePillProps) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="bg-canvas grid size-9 place-items-center rounded-full text-sm font-semibold"
      >
        {icon ?? label.slice(0, 1)}
      </span>
      <span className="font-medium whitespace-nowrap">{label}</span>
      {meta && <span className="text-ink-soft font-mono text-xs whitespace-nowrap">{meta}</span>}
    </>
  );
  const classes = cn(
    'bg-paper text-ink rounded-pill inline-flex items-center gap-3 py-1.5 pr-5 pl-1.5',
    className,
  );
  return href ? (
    <a href={href} className={classes} rel="me noopener" target="_blank">
      {body}
    </a>
  ) : (
    <span className={classes}>{body}</span>
  );
}

/** Mono text ticker item with a separator dot ("Business · Marketing · …"). */
export function MarqueeWord({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-3 font-mono text-sm tracking-[0.2em] whitespace-nowrap uppercase">
      {children}
      <span aria-hidden="true">·</span>
    </span>
  );
}
