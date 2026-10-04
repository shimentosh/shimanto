import { Children, type ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface BentoGridProps {
  /** First child becomes the large feature tile; the rest fill in around it. */
  children: ReactNode;
  label?: string;
  className?: string;
}

/** One large feature card and smaller cards around it. It stacks into a single column on mobile. */
export function BentoGrid({ children, label, className }: BentoGridProps) {
  return (
    <ul
      aria-label={label}
      className={cn('grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6', className)}
    >
      {Children.toArray(children).map((child, index) => (
        <li key={index} className={cn(index === 0 && 'md:col-span-2 lg:row-span-2')}>
          {child}
        </li>
      ))}
    </ul>
  );
}
