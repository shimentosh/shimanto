import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { type Accent, accentBg } from '../lib/worlds';

export interface ChipProps {
  children: ReactNode;
  /** `tag`: small outlined pill ("AI", "Case study"). `status`: coloured dot + label. */
  variant?: 'tag' | 'status';
  /** Dot colour for `status` chips, or the fill for a coloured tag. */
  tone?: Accent;
  className?: string;
}

/** Small label. Purely presentational: it renders a `<span>`. */
export function Chip({ children, variant = 'tag', tone, className }: ChipProps) {
  if (variant === 'status') {
    return (
      <span className={cn('text-ink-soft inline-flex items-center gap-2 text-sm', className)}>
        <span
          aria-hidden="true"
          className={cn('size-2 rounded-full', tone ? accentBg[tone] : 'bg-ink-soft')}
        />
        {children}
      </span>
    );
  }
  return (
    <span
      className={cn(
        'rounded-pill inline-flex items-center px-2.5 py-0.5 text-[13px] font-medium',
        tone ? cn(accentBg[tone], 'text-on-world') : 'border-ink/15 text-ink border',
        className,
      )}
    >
      {children}
    </span>
  );
}
