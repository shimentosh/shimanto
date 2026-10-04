import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../lib/cn';

type ButtonBaseProps = {
  children: ReactNode;
  /** `primary`: solid pill. `secondary`: outlined pill. `text`: underlined inline action. */
  variant?: 'primary' | 'secondary' | 'text';
  className?: string;
};

type ButtonAsLink = ButtonBaseProps & { href: string } & Omit<
    ComponentPropsWithoutRef<typeof Link>,
    'href' | 'className' | 'children'
  >;
type ButtonAsButton = ButtonBaseProps & { href?: undefined } & Omit<
    ComponentPropsWithoutRef<'button'>,
    'className' | 'children'
  >;
export type ButtonProps = ButtonAsLink | ButtonAsButton;

const styles = {
  primary:
    'group bg-ink text-canvas rounded-pill inline-flex items-center gap-2 px-5 py-2.5 font-medium transition-opacity hover:opacity-85 disabled:opacity-50',
  secondary:
    'group border-ink/20 text-ink hover:border-ink/50 rounded-pill inline-flex items-center gap-2 border px-5 py-2.5 font-medium transition-colors disabled:opacity-50',
  text: 'group inline-flex items-center gap-1 font-medium underline decoration-1 underline-offset-[6px] hover:decoration-2',
};

/**
 * Brand button with a small arrow that nudges right on hover.
 * Renders a Next `<Link>` when `href` is set, otherwise a `<button>`.
 */
export function Button(props: ButtonProps) {
  const { children, variant = 'primary', className, ...rest } = props;
  const content = (
    <>
      <span>{children}</span>
      {variant !== 'text' && (
        <span
          aria-hidden="true"
          className="transition-transform duration-300 group-hover:translate-x-0.5"
        >
          →
        </span>
      )}
    </>
  );
  const classes = cn(styles[variant], className);

  if (rest.href !== undefined) {
    return (
      <Link {...(rest as ButtonAsLink)} className={classes}>
        {content}
      </Link>
    );
  }
  const { type = 'button', ...buttonProps } = rest as Omit<ButtonAsButton, keyof ButtonBaseProps>;
  return (
    <button type={type} {...buttonProps} className={classes}>
      {content}
    </button>
  );
}
