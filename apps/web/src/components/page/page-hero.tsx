import { type Accent, Container, accentBg, cn } from '@shimanto/ui';
import type { ReactNode } from 'react';
import { Spot, type SpotName } from '@shimanto/ui';
import { Breadcrumbs, type Crumb } from './breadcrumbs';

export interface PageHeroProps {
  eyebrow: string;
  title: ReactNode;
  intro?: ReactNode;
  /** The page's accent: the eyebrow dot and the title's squiggle use it. */
  world?: Accent;
  crumbs?: Crumb[];
  /** Topic tags shown under the intro. */
  stickers?: string[];
  /** Extra context after the eyebrow, e.g. a count. */
  index?: ReactNode;
  /** Spot illustration on the right (from md up). */
  art?: SpotName;
  children?: ReactNode;
}

/**
 * Inner-page header: breadcrumbs, a small eyebrow, the H1 and the intro, with an optional spot
 * illustration on the right, on the page background.
 */
export function PageHero({
  eyebrow,
  title,
  intro,
  world = 'build',
  crumbs,
  stickers,
  index,
  art,
  children,
}: PageHeroProps) {
  return (
    <section className="pt-28 pb-12 md:pt-36 md:pb-16">
      <Container>
        {crumbs && <Breadcrumbs items={crumbs} />}
        <div className={cn(art && 'grid items-center gap-10 md:grid-cols-[1fr_auto] md:gap-12')}>
          <div className="min-w-0">
            <p className="text-ink-soft mt-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium">
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className={cn('size-2 rounded-full', accentBg[world])} />
                {eyebrow}
              </span>
              {index && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{index}</span>
                </>
              )}
            </p>
            <h1 className="mt-4 max-w-[18ch] text-[clamp(38px,5.4vw,68px)] leading-[1.02] font-medium tracking-[-0.045em] text-balance">
              {title}
            </h1>
            {intro && (
              <div className="text-ink-soft mt-5 max-w-[58ch] text-lg leading-relaxed md:text-xl">
                {intro}
              </div>
            )}
            {stickers && stickers.length > 0 && (
              <ul aria-label="Topics" className="mt-7 flex flex-wrap gap-2">
                {stickers.map((sticker) => (
                  <li
                    key={sticker}
                    className="border-ink/15 text-ink-soft rounded-pill border px-3 py-1 text-sm"
                  >
                    {sticker}
                  </li>
                ))}
              </ul>
            )}
            {children && <div className="mt-8">{children}</div>}
          </div>
          {art && (
            <div className="hidden w-60 md:mt-10 md:block lg:w-80">
              <Spot name={art} float />
            </div>
          )}
        </div>
      </Container>
    </section>
  );
}
