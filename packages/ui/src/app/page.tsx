import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Icon } from '../components/art/icon';

export interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Buttons on the right (wrap under the title on small screens). */
  actions?: ReactNode;
  back?: { href: string; label: string };
  /** Small line above the title (e.g. a status badge or date). */
  eyebrow?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  back,
  eyebrow,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn('mb-8', className)}>
      {back && (
        <Link
          href={back.href}
          className="text-ink-soft hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm font-medium"
        >
          <Icon name="arrowLeft" className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <div className="text-ink-soft mb-2 flex flex-wrap items-center gap-2 text-sm">
              {eyebrow}
            </div>
          )}
          <h1 className="text-[clamp(28px,4vw,40px)] leading-[1.05] font-medium tracking-[-0.03em] text-balance">
            {title}
          </h1>
          {description && <p className="text-ink-soft mt-2 max-w-2xl text-[16px]">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** A page section separated by a hairline, not a box. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={cn(
        'border-ink/10 border-t py-7 first-of-type:border-t-0 first-of-type:pt-0',
        className,
      )}
    >
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div>
            {title && <h2 className="text-lg font-medium tracking-tight">{title}</h2>}
            {description && <p className="text-ink-soft mt-1 text-[15px]">{description}</p>}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

/** Label / value pairs (order facts, customer details). */
export function DescriptionList({
  items,
  className,
  columns = 2,
}: {
  items: Array<{ label: string; value: ReactNode } | null | false>;
  className?: string;
  columns?: 1 | 2 | 3;
}) {
  return (
    <dl
      className={cn(
        'grid gap-x-8 gap-y-4',
        columns === 2 && 'sm:grid-cols-2',
        columns === 3 && 'sm:grid-cols-2 lg:grid-cols-3',
        className,
      )}
    >
      {items.filter(Boolean).map((item) => {
        const { label, value } = item as { label: string; value: ReactNode };
        return (
          <div key={label} className="min-w-0">
            <dt className="text-ink-soft text-sm">{label}</dt>
            <dd className="mt-0.5 text-[15px] break-words">{value ?? '—'}</dd>
          </div>
        );
      })}
    </dl>
  );
}

/** Headline numbers in one row, divided by hairlines (no boxes). */
export function StatRow({
  stats,
  className,
}: {
  stats: Array<{ label: string; value: ReactNode; hint?: ReactNode; href?: string }>;
  className?: string;
}) {
  return (
    <div className={cn('border-ink/10 grid grid-cols-2 border-y lg:grid-cols-4', className)}>
      {stats.map((stat, i) => {
        const body = (
          <>
            <p className="text-ink-soft text-sm">{stat.label}</p>
            <p className="mt-1 text-[28px] leading-none font-medium tracking-[-0.03em] tabular-nums">
              {stat.value}
            </p>
            {stat.hint && <p className="text-ink-soft mt-1.5 text-[13px]">{stat.hint}</p>}
          </>
        );
        const classes = cn(
          'block px-1 py-5 sm:px-5',
          i % 2 === 1 && 'border-ink/10 border-l',
          i >= 2 && 'border-ink/10 border-t lg:border-t-0',
          i === 2 && 'lg:border-l',
        );
        return stat.href ? (
          <Link
            key={stat.label}
            href={stat.href}
            className={cn(classes, 'hover:bg-ink/[0.03] transition-colors')}
          >
            {body}
          </Link>
        ) : (
          <div key={stat.label} className={classes}>
            {body}
          </div>
        );
      })}
    </div>
  );
}

/** Link tabs (settings sections, filters). */
export function Tabs({
  items,
  className,
}: {
  items: Array<{ label: string; href: string; active: boolean; count?: number }>;
  className?: string;
}) {
  return (
    <nav
      aria-label="Sections"
      className={cn('border-ink/10 -mx-1 mb-6 flex gap-1 overflow-x-auto border-b', className)}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? 'page' : undefined}
          className={cn(
            '-mb-px border-b-2 px-3 py-2.5 text-[15px] whitespace-nowrap transition-colors',
            item.active
              ? 'border-ink text-ink font-medium'
              : 'text-ink-soft hover:text-ink border-transparent',
          )}
        >
          {item.label}
          {item.count !== undefined && (
            <span className="text-ink-soft ml-1.5 text-sm tabular-nums">{item.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

/** Button-style filter chips (status filters on list pages). */
export function FilterChips<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | '';
  options: Array<{ value: T | ''; label: string }>;
  onChange: (value: T | '') => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.value || 'all'}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            'rounded-pill h-8 px-3.5 text-sm font-medium transition-colors',
            value === option.value
              ? 'bg-ink text-canvas'
              : 'bg-ink/[0.05] text-ink-soft hover:text-ink',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
