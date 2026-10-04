import { Container, cn } from '@shimanto/ui';
import type { ReactNode } from 'react';

/** Page section on the page background, optionally with a hairline above it. */
export function Section({
  children,
  className,
  id,
  labelledBy,
  divided = false,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  labelledBy?: string;
  divided?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={cn('pb-16 md:pb-24', className)}>
      <Container>
        {divided ? (
          <div className="border-ink/10 border-t pt-12 md:pt-16">{children}</div>
        ) : (
          children
        )}
      </Container>
    </section>
  );
}

/**
 * Big two-line headline: a bright first line (usually with a Squiggle word and a small animated
 * motif beside it) over a softer second line.
 */
export function DisplayTitle({
  lead,
  rest,
  motif,
  id,
  size = 'lg',
  className,
}: {
  lead: ReactNode;
  rest?: ReactNode;
  /** Decorative; hidden from screen readers. See `title-motifs.tsx`. */
  motif?: ReactNode;
  id?: string;
  size?: 'lg' | 'md';
  className?: string;
}) {
  return (
    <h2
      id={id}
      className={cn(
        size === 'lg' ? 'text-[clamp(40px,5.4vw,80px)]' : 'text-[clamp(34px,4.2vw,60px)]',
        'leading-[0.98] font-medium tracking-[-0.05em] text-balance',
        className,
      )}
    >
      <span className="block">
        {lead}
        {motif && (
          <span
            aria-hidden="true"
            className="ml-[0.22em] inline-flex h-[0.6em] items-end gap-[0.06em] align-baseline"
          >
            {motif}
          </span>
        )}
      </span>
      {rest && <span className="text-ink-soft block">{rest}</span>}
    </h2>
  );
}

/**
 * Small eyebrow + H2, with an optional action aligned right. Pass `rest` or `motif` for the big
 * two-line display headline instead of the plain one.
 */
export function SectionTitle({
  eyebrow,
  title,
  rest,
  motif,
  id,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  rest?: ReactNode;
  motif?: ReactNode;
  id?: string;
  action?: ReactNode;
  className?: string;
}) {
  const display = rest !== undefined || motif !== undefined;
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div>
        {eyebrow && <p className="text-ink-soft text-sm font-medium">{eyebrow}</p>}
        {display ? (
          <DisplayTitle id={id} lead={title} rest={rest} motif={motif} className="mt-4" />
        ) : (
          <h2
            id={id}
            className="mt-2 text-2xl leading-tight font-medium tracking-[-0.03em] text-balance md:text-4xl"
          >
            {title}
          </h2>
        )}
      </div>
      {action}
    </div>
  );
}
