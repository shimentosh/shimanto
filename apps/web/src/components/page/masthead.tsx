import { type Accent, Container, accentBg, cn } from '@shimanto/ui';
import type { ReactNode } from 'react';
import { Breadcrumbs, type Crumb } from './breadcrumbs';

const glow: Record<Accent, string> = {
  build: 'rgb(143 212 100 / 0.26)',
  create: 'rgb(255 112 89 / 0.28)',
  spark: 'rgb(244 227 17 / 0.22)',
  signal: 'rgb(46 155 247 / 0.28)',
  idea: 'rgb(230 195 245 / 0.26)',
};

/**
 * Compact editorial page header: breadcrumbs, a mono kicker with a world dot, the H1 on the left
 * and the intro on the right, closed by a hairline. Optional `children` render under the rule
 * (stats, filters). Replaces the illustrated PageHero where a page should get to content fast.
 */
export function Masthead({
  crumbs,
  kicker,
  world = 'build',
  title,
  intro,
  children,
}: {
  crumbs: Crumb[];
  kicker: ReactNode;
  world?: Accent;
  title: ReactNode;
  intro?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className="pt-28 pb-12 md:pt-36 md:pb-16">
      <Container>
        <Breadcrumbs items={crumbs} />
        <div className="border-ink/10 mt-10 grid items-end gap-6 border-b pb-10 md:grid-cols-[1.3fr_1fr] md:gap-12">
          <div>
            <p className="text-ink-soft flex items-center gap-2.5 font-mono text-xs tracking-[0.14em] uppercase">
              <span aria-hidden="true" className={cn('size-2 rounded-full', accentBg[world])} />
              {kicker}
            </p>
            <h1 className="mt-5 text-[clamp(44px,6vw,84px)] leading-[0.96] font-medium tracking-[-0.05em] text-balance">
              {title}
            </h1>
          </div>
          {intro && (
            <p className="text-ink-soft max-w-[40ch] text-lg leading-relaxed md:justify-self-end md:text-right">
              {intro}
            </p>
          )}
        </div>
        {children && <div className="mt-8">{children}</div>}
      </Container>
    </header>
  );
}

/** Closing call to action: a night card with a world-coloured glow, a heading and actions. */
export function CtaBand({
  eyebrow,
  title,
  body,
  world = 'build',
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  body?: ReactNode;
  world?: Accent;
  children: ReactNode;
}) {
  return (
    <div
      className="bg-night text-cream rounded-sheet flex flex-col items-start justify-between gap-8 p-8 ring-1 ring-white/10 md:flex-row md:items-center md:p-12"
      style={{
        backgroundImage: `radial-gradient(120% 140% at 100% 0%, ${glow[world]}, transparent 55%)`,
      }}
    >
      <div>
        <p className="font-mono text-xs tracking-[0.14em] text-white/60 uppercase">{eyebrow}</p>
        <h2 className="mt-3 max-w-[22ch] text-2xl font-medium tracking-[-0.03em] md:text-4xl">
          {title}
        </h2>
        {body && <p className="mt-3 max-w-[48ch] text-white/70">{body}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

/** Pill links styled for the night CtaBand. */
export const ctaPrimary =
  'bg-cream text-night rounded-pill inline-flex items-center gap-2 px-5 py-2.5 font-medium transition-opacity hover:opacity-90';
export const ctaSecondary =
  'rounded-pill inline-flex items-center px-5 py-2.5 font-medium ring-1 ring-white/20 transition-colors hover:bg-white/10';
