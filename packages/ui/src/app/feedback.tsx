import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Icon, type IconName } from '../components/art/icon';
import { Spot, type SpotName } from '../components/art/spot';

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  spot?: SpotName;
  className?: string;
}

/** Friendly "nothing here yet" with one of the site's spot illustrations and a next step. */
export function EmptyState({
  title,
  description,
  action,
  spot = 'package',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('mx-auto flex max-w-md flex-col items-center py-12 text-center', className)}>
      <div className="w-40">
        <Spot name={spot} />
      </div>
      <h3 className="mt-4 text-xl font-medium tracking-tight">{title}</h3>
      {description && <p className="text-ink-soft mt-2 text-[15px]">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/** Skeleton rows while data loads. Announced politely to screen readers. */
export function LoadingState({
  rows = 4,
  label = 'Loading…',
  className,
}: {
  rows?: number;
  label?: string;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cn('grid gap-3 py-2', className)}>
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="bg-ink/[0.06] h-12 animate-pulse rounded-[12px]"
          style={{ opacity: 1 - i * 0.15 }}
        />
      ))}
    </div>
  );
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn('mx-auto flex max-w-md flex-col items-center py-12 text-center', className)}
    >
      <span className="bg-create/20 grid size-12 place-items-center rounded-full">
        <Icon name="alert" className="size-6" />
      </span>
      <h3 className="mt-4 text-xl font-medium tracking-tight">{title}</h3>
      {message && <p className="text-ink-soft mt-2 text-[15px]">{message}</p>}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="border-ink/15 hover:border-ink/40 rounded-pill mt-6 h-10 border px-5 text-[15px] font-medium"
        >
          Try again
        </button>
      )}
    </div>
  );
}

const noticeTones = {
  info: { icon: 'info', className: 'bg-signal/10' },
  success: { icon: 'check', className: 'bg-build/20' },
  warning: { icon: 'alert', className: 'bg-spark/30' },
  danger: { icon: 'alert', className: 'bg-create/15' },
} satisfies Record<string, { icon: IconName; className: string }>;

/** Inline message banner. Use `role="alert"` for errors (the default for `danger`). */
export function Notice({
  tone = 'info',
  title,
  children,
  action,
  className,
}: {
  tone?: keyof typeof noticeTones;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  const t = noticeTones[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'text-ink flex flex-wrap items-start gap-3 rounded-[14px] px-4 py-3 text-[15px]',
        t.className,
        className,
      )}
    >
      <Icon name={t.icon} className="mt-0.5 size-5" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div className={cn(title && 'text-ink-soft mt-0.5')}>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
