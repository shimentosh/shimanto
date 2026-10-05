'use client';

import { cn } from '@shimanto/ui';
import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ToolImage } from '@/content/tools';

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-5"
    >
      <path d={dir === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'} />
    </svg>
  );
}

/**
 * Screenshot carousel: a scroll-snap track (so swipe and trackpad work natively) with arrow
 * buttons, a caption from the alt text and a thumbnail strip. The first shot loads with priority,
 * since it sits in the hero.
 */
export function ScreenshotSlider({ shots }: { shots: ToolImage[] }) {
  const track = useRef<HTMLUListElement>(null);
  const thumbs = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  const last = shots.length - 1;

  const goTo = useCallback((i: number) => {
    const el = track.current;
    const slide = el?.children[i] as HTMLElement | undefined;
    if (!el || !slide) return;
    el.scrollTo({ left: slide.offsetLeft - el.offsetLeft, behavior: 'smooth' });
  }, []);

  // The active slide is whichever one's left edge sits closest to the track's.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const slides = Array.from(el.children) as HTMLElement[];
        let best = 0;
        let bestDist = Infinity;
        slides.forEach((s, i) => {
          const dist = Math.abs(s.offsetLeft - el.offsetLeft - el.scrollLeft);
          if (dist < bestDist) {
            bestDist = dist;
            best = i;
          }
        });
        // The last slide can't reach the left edge, so the end of the scroll range means it.
        setIndex(el.scrollLeft >= el.scrollWidth - el.clientWidth - 2 ? slides.length - 1 : best);
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  // Keep the active thumbnail in view without moving the page.
  useEffect(() => {
    const strip = thumbs.current;
    const thumb = strip?.children[index] as HTMLElement | undefined;
    if (!strip || !thumb) return;
    const left = thumb.offsetLeft - strip.offsetLeft - (strip.clientWidth - thumb.clientWidth) / 2;
    strip.scrollTo({ left, behavior: 'smooth' });
  }, [index]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      goTo(Math.min(index + 1, last));
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goTo(Math.max(index - 1, 0));
    }
  };

  const arrow =
    'border-ink/15 text-ink hover:bg-ink hover:text-canvas grid size-10 place-items-center rounded-full border transition-colors disabled:pointer-events-none disabled:opacity-30';

  const multiple = shots.length > 1;

  return (
    <div role="region" aria-roledescription="carousel" aria-label="Screenshots" onKeyDown={onKey}>
      <ul
        ref={track}
        tabIndex={0}
        className="flex snap-x snap-mandatory [scrollbar-width:none] gap-5 overflow-x-auto scroll-smooth pb-2 focus-visible:outline-none [&::-webkit-scrollbar]:hidden"
      >
        {shots.map((shot, i) => (
          <li
            key={shot.src}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${shots.length}`}
            className="w-full shrink-0 snap-start"
          >
            <figure
              className={cn(
                'border-ink/10 bg-canvas-2 rounded-card relative overflow-hidden border shadow-[0_40px_80px_-40px_rgb(0_0_0/0.6)] transition-opacity duration-500',
                i === index ? 'opacity-100' : 'opacity-40',
              )}
            >
              <div aria-hidden="true" className="border-ink/10 flex gap-1.5 border-b px-4 py-3">
                <span className="bg-ink/15 size-2.5 rounded-full" />
                <span className="bg-ink/15 size-2.5 rounded-full" />
                <span className="bg-ink/15 size-2.5 rounded-full" />
              </div>
              <Image
                src={shot.src}
                alt={shot.alt}
                width={shot.width}
                height={shot.height}
                priority={i === 0}
                sizes="(min-width: 1024px) 700px, 100vw"
                className="h-auto w-full"
              />
            </figure>
          </li>
        ))}
      </ul>

      {multiple && (
        <>
          <div className="mt-5 flex items-center justify-between gap-4">
            <p aria-live="polite" className="flex min-w-0 items-baseline gap-4">
              <span className="text-ink shrink-0 font-mono text-sm whitespace-nowrap tabular-nums">
                {String(index + 1).padStart(2, '0')}
                <span className="text-ink-soft"> / {String(shots.length).padStart(2, '0')}</span>
              </span>
              <span className="text-ink-soft truncate">{shots[index]?.alt}</span>
            </p>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                className={arrow}
                onClick={() => goTo(index - 1)}
                disabled={index === 0}
                aria-label="Previous screenshot"
              >
                <Chevron dir="left" />
              </button>
              <button
                type="button"
                className={arrow}
                onClick={() => goTo(index + 1)}
                disabled={index === last}
                aria-label="Next screenshot"
              >
                <Chevron dir="right" />
              </button>
            </div>
          </div>

          <ul
            ref={thumbs}
            className="mt-4 flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden"
          >
            {shots.map((shot, i) => (
              <li key={shot.src} className="shrink-0">
                <button
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`Show screenshot ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    'block w-20 overflow-hidden rounded-md border-2 transition md:w-24',
                    i === index
                      ? 'border-ink opacity-100'
                      : 'border-transparent opacity-50 hover:opacity-80',
                  )}
                >
                  <Image
                    src={shot.src}
                    alt=""
                    width={shot.width}
                    height={shot.height}
                    sizes="96px"
                    className="h-auto w-full"
                  />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
