import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '../lib/cn';
import { Container } from './container';

export interface SectionSheetProps extends Omit<ComponentPropsWithoutRef<'section'>, 'children'> {
  children: ReactNode;
  /** `default`: page background. `muted`: a flat, slightly deeper band to separate content. */
  tone?: 'default' | 'muted';
  /** Hairline above the section. */
  divided?: boolean;
  /** Inner width container. `false` for full-bleed content. */
  contained?: boolean;
}

/**
 * A full-width page section: flat surface, generous vertical rhythm, optional hairline divider.
 * Sections are separated by space and lines, not by coloured panels.
 */
export function SectionSheet({
  children,
  tone = 'default',
  divided = false,
  contained = true,
  className,
  ...rest
}: SectionSheetProps) {
  return (
    <section
      {...rest}
      className={cn(
        'relative py-16 md:py-24',
        tone === 'muted' && 'bg-canvas-2',
        divided && 'border-ink/10 border-t',
        className,
      )}
    >
      {contained ? <Container>{children}</Container> : children}
    </section>
  );
}
