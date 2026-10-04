import { type Accent, Button, accentBg, cn } from '@shimanto/ui';
import type { ReactNode } from 'react';
import { Spot, type SpotName } from '@shimanto/ui';

export interface EmptyStateProps {
  title: string;
  body: ReactNode;
  cta?: { href: string; label: string };
  tone?: Accent;
  /** Spot illustration beside the text. */
  art?: SpotName;
  className?: string;
}

/** Honest "nothing here yet" note, used instead of placeholder content (brief §10). */
export function EmptyState({
  title,
  body,
  cta,
  tone = 'idea',
  art = 'toolbox',
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'border-ink/15 rounded-card grid items-center gap-8 border border-dashed p-8 md:grid-cols-[1fr_auto] md:p-10',
        className,
      )}
    >
      <div>
        <p className="text-ink-soft flex items-center gap-2 text-sm font-medium">
          <span aria-hidden="true" className={cn('size-2 rounded-full', accentBg[tone])} />
          In the works
        </p>
        <h2 className="mt-3 max-w-[28ch] text-2xl leading-tight font-medium tracking-[-0.03em]">
          {title}
        </h2>
        <div className="text-ink-soft mt-3 max-w-[52ch]">{body}</div>
        {cta && (
          <div className="mt-6">
            <Button href={cta.href} variant="secondary">
              {cta.label}
            </Button>
          </div>
        )}
      </div>
      <div className="hidden w-44 md:block">
        <Spot name={art} />
      </div>
    </div>
  );
}
