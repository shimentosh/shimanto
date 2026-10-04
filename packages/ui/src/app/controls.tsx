'use client';

import Link from 'next/link';
import { type ComponentPropsWithoutRef, type ReactNode, type Ref, useId } from 'react';
import { cn } from '../lib/cn';
import { Icon, type IconName } from '../components/art/icon';

// ───────────── Buttons ─────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-pill font-medium whitespace-nowrap transition-[opacity,background-color,border-color] disabled:pointer-events-none disabled:opacity-50';
const buttonVariants: Record<Variant, string> = {
  primary: 'bg-ink text-canvas hover:opacity-85',
  secondary: 'border border-ink/15 text-ink hover:border-ink/40 bg-transparent',
  ghost: 'text-ink hover:bg-ink/[0.06]',
  danger: 'bg-create text-on-world hover:opacity-90',
};
const buttonSizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-sm',
  md: 'h-10 px-5 text-[15px]',
};

export function Spinner({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={cn('size-4 animate-spin', className)}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="3"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

type ActionButtonBase = {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  loading?: boolean;
  className?: string;
};

export type ActionButtonProps =
  | (ActionButtonBase & { href: string; external?: boolean } & Omit<
        ComponentPropsWithoutRef<'a'>,
        'href' | 'className' | 'children'
      >)
  | (ActionButtonBase & { href?: undefined } & Omit<
        ComponentPropsWithoutRef<'button'>,
        'className' | 'children'
      >);

/** Compact app button (no arrow): toolbar actions, forms, dialogs. Link when `href` is set. */
export function ActionButton(props: ActionButtonProps) {
  const { children, variant = 'primary', size = 'md', icon, loading, className, ...rest } = props;
  const classes = cn(buttonBase, buttonVariants[variant], buttonSizes[size], className);
  const content = (
    <>
      {loading ? <Spinner /> : icon ? <Icon name={icon} className="size-4" /> : null}
      {children}
    </>
  );
  if (rest.href !== undefined) {
    const { href, external, ...anchor } = rest as { href: string; external?: boolean };
    if (external || /^https?:/.test(href)) {
      return (
        <a
          href={href}
          className={classes}
          {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
          {...anchor}
        >
          {content}
        </a>
      );
    }
    return (
      <Link href={href} className={classes} {...anchor}>
        {content}
      </Link>
    );
  }
  const { type = 'button', disabled, ...button } = rest as ComponentPropsWithoutRef<'button'>;
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...button}
    >
      {content}
    </button>
  );
}

// ───────────── Form fields ─────────────

const control =
  'w-full rounded-button border border-ink/15 bg-paper px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/70 transition-colors hover:border-ink/30 focus-visible:border-ink/50 disabled:opacity-60 aria-[invalid=true]:border-create';

export interface FieldProps {
  label: ReactNode;
  /** Pass through to the control so label, hint and error are wired for screen readers. */
  children: (ids: { id: string; describedBy?: string; invalid: boolean }) => ReactNode;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
}

/** Label + control + hint/error, accessibly linked. */
export function Field({ label, children, hint, error, optional, className }: FieldProps) {
  const id = useId();
  const hintId = hint && !error ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('grid gap-1.5', className)}>
      <label htmlFor={id} className="text-[15px] font-medium">
        {label}
        {optional && <span className="text-ink-soft font-normal"> (optional)</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-ink-soft text-sm">
          {hint}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-create text-sm font-medium dark:text-[#ff9b8a]"
        >
          {error}
        </p>
      )}
    </div>
  );
}

type Wired = { id?: string; describedBy?: string; invalid?: boolean };

export function Input({
  describedBy,
  invalid,
  className,
  ref,
  ...props
}: Wired & ComponentPropsWithoutRef<'input'> & { ref?: Ref<HTMLInputElement> }) {
  return (
    <input
      ref={ref}
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={cn(control, className)}
      {...props}
    />
  );
}

export function Textarea({
  describedBy,
  invalid,
  className,
  ...props
}: Wired & ComponentPropsWithoutRef<'textarea'>) {
  return (
    <textarea
      aria-describedby={describedBy}
      aria-invalid={invalid || undefined}
      className={cn(control, 'min-h-28 resize-y leading-relaxed', className)}
      {...props}
    />
  );
}

export function Select({
  describedBy,
  invalid,
  className,
  children,
  ...props
}: Wired & ComponentPropsWithoutRef<'select'>) {
  return (
    <div className="relative">
      <select
        aria-describedby={describedBy}
        aria-invalid={invalid || undefined}
        className={cn(control, 'appearance-none pr-10', className)}
        {...props}
      >
        {children}
      </select>
      <Icon
        name="chevronDown"
        className="text-ink-soft pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2"
      />
    </div>
  );
}

export function Checkbox({
  label,
  description,
  className,
  ...props
}: { label: ReactNode; description?: ReactNode } & Omit<
  ComponentPropsWithoutRef<'input'>,
  'type'
>) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        className="accent-ink border-ink/30 mt-1 size-4 shrink-0 rounded"
        {...props}
      />
      <label htmlFor={id} className="text-[15px] leading-snug">
        <span className="font-medium">{label}</span>
        {description && <span className="text-ink-soft mt-0.5 block text-sm">{description}</span>}
      </label>
    </div>
  );
}

/** Inline search box for list pages. */
export function SearchInput({
  className,
  ...props
}: Omit<ComponentPropsWithoutRef<'input'>, 'type'>) {
  return (
    <div className={cn('relative', className)}>
      <Icon
        name="search"
        className="text-ink-soft pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2"
      />
      <input type="search" className={cn(control, 'rounded-pill pl-10')} {...props} />
    </div>
  );
}
