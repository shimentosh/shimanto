import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from '../lib/cn';

export type ContainerProps<T extends ElementType = 'div'> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'children' | 'className'>;

/** The site's single content width (`--container-site`) with responsive side gutters. */
export function Container<T extends ElementType = 'div'>({
  as,
  children,
  className,
  ...rest
}: ContainerProps<T>) {
  const Component: ElementType = as ?? 'div';
  return (
    <Component {...rest} className={cn('max-w-site mx-auto w-full px-5 md:px-8', className)}>
      {children}
    </Component>
  );
}
