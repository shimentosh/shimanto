import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { type Surface, surfaceBg } from '../lib/worlds';

export type CardProps<T extends ElementType = 'article'> = {
  as?: T;
  children: ReactNode;
  surface?: Surface;
  /** Hover lift (6px). Use for cards that are links or contain a primary link. */
  interactive?: boolean;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

/** Rounded 28px surface. Server component; pair with `<Tilt>` for cursor tilt. */
export function Card<T extends ElementType = 'article'>({
  as,
  children,
  surface = 'paper',
  interactive = false,
  className,
  ...rest
}: CardProps<T>) {
  const Component: ElementType = as ?? 'article';
  return (
    <Component
      {...rest}
      className={cn(
        'rounded-card relative p-6 md:p-8',
        surfaceBg[surface],
        interactive &&
          'transition-[translate,box-shadow] duration-300 ease-out hover:-translate-y-1.5 hover:shadow-[0_24px_48px_-24px_rgb(0_0_0/0.35)]',
        className,
      )}
    >
      {children}
    </Component>
  );
}
