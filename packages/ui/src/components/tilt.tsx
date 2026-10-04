'use client';

import { type PointerEvent, type ReactNode, useRef } from 'react';
import { cn } from '../lib/cn';
import { useFinePointer, usePrefersReducedMotion } from '../lib/hooks';

export interface TiltProps {
  children: ReactNode;
  /** Maximum rotation in degrees. */
  max?: number;
  className?: string;
}

/**
 * Tilts its child slightly toward the cursor. Transform-only (no layout), desktop pointers only,
 * and off entirely under reduced motion.
 */
export function Tilt({ children, max = 4, className }: TiltProps) {
  const ref = useRef<HTMLDivElement>(null);
  const finePointer = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const enabled = finePointer && !reduced;

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!enabled || !el) return;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--tilt-x', `${(-y * max).toFixed(2)}deg`);
    el.style.setProperty('--tilt-y', `${(x * max).toFixed(2)}deg`);
  }

  function reset() {
    ref.current?.style.setProperty('--tilt-x', '0deg');
    ref.current?.style.setProperty('--tilt-y', '0deg');
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={reset}
      className={cn(
        '[transform:perspective(900px)_rotateX(var(--tilt-x,0deg))_rotateY(var(--tilt-y,0deg))] transition-transform duration-300 ease-out',
        className,
      )}
    >
      {children}
    </div>
  );
}
