'use client';

import { useEffect, useRef, useState } from 'react';
import { useFinePointer, usePrefersReducedMotion } from '../lib/hooks';

/**
 * Soft circle that trails the pointer and grows with a label ("View", "Read", "Play") over any
 * element with `data-cursor="Label"`. It follows the native cursor rather than replacing it, so
 * precision and OS accessibility cursors keep working. It is off on touch devices and under
 * reduced motion, and it's transform-only on a single rAF loop.
 */
export function CustomCursor() {
  const finePointer = useFinePointer();
  const reduced = usePrefersReducedMotion();
  const enabled = finePointer && !reduced;
  const dot = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const target = { x: -100, y: -100 };
    const pos = { x: -100, y: -100 };
    let frame = 0;

    const tick = () => {
      pos.x += (target.x - pos.x) * 0.2;
      pos.y += (target.y - pos.y) * 0.2;
      dot.current?.style.setProperty('translate', `${pos.x}px ${pos.y}px`);
      frame = requestAnimationFrame(tick);
    };
    const onMove = (event: PointerEvent) => {
      target.x = event.clientX;
      target.y = event.clientY;
      setVisible(true);
    };
    const onOver = (event: PointerEvent) => {
      const el = (event.target as Element | null)?.closest<HTMLElement>('[data-cursor]');
      setLabel(el?.dataset.cursor ?? null);
    };
    const onLeave = () => setVisible(false);

    frame = requestAnimationFrame(tick);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <div
      ref={dot}
      aria-hidden="true"
      className="pointer-events-none fixed top-0 left-0 z-[100]"
      style={{ opacity: visible ? 1 : 0, transition: 'opacity 0.2s' }}
    >
      <div
        className={
          label
            ? 'bg-spark text-on-world grid size-20 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full text-sm font-medium transition-[width,height] duration-300'
            : 'bg-ink/20 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full backdrop-blur-[2px] transition-[width,height] duration-300'
        }
      >
        {label}
      </div>
    </div>
  );
}
