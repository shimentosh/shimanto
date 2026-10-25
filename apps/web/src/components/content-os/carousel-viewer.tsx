'use client';

/* eslint-disable @next/next/no-img-element -- pre-sized slide renders */
import { Icon, cn } from '@shimanto/ui';
import { useEffect, useRef, useState } from 'react';
import type { CarouselDemo } from '@/content/content-os/demos';

/**
 * Real carousels, swiped like on Instagram: the slides scroll-snap (touch, trackpad, arrows,
 * keys), and the picker switches between carousels. Caption and hashtags sit beside them.
 */
export function CarouselViewer({
  carousels,
  labels,
}: {
  carousels: CarouselDemo[];
  labels: { pick: string; slideOf: string; captionLabel: string; prev: string; next: string };
}) {
  const [active, setActive] = useState(0);
  const [slide, setSlide] = useState(0);
  const track = useRef<HTMLDivElement>(null);
  const carousel = carousels[active]!;
  const total = carousel.slides.length;

  // Which slide is in view, from the scroll position.
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setSlide(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const n = Math.max(0, Math.min(total - 1, i));
    el.scrollTo({ left: n * el.clientWidth, behavior: 'smooth' });
  };

  const pick = (i: number) => {
    setActive(i);
    setSlide(0);
    track.current?.scrollTo({ left: 0 });
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,460px)_minmax(0,1fr)] lg:gap-14">
      {/* The post */}
      <div className="mx-auto w-full max-w-[460px]">
        <div className="bg-paper overflow-hidden rounded-[22px] ring-1 ring-white/10">
          <div className="flex items-center gap-3 px-4 py-3">
            <img
              src={carousel.slides[0]!.src}
              alt=""
              width={32}
              height={40}
              className="size-8 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">shimanto</p>
              <p className="text-ink-soft text-xs">Instagram · Carousel</p>
            </div>
            <span className="text-ink-soft font-mono text-xs" aria-live="polite">
              {labels.slideOf.replace('{n}', String(slide + 1)).replace('{total}', String(total))}
            </span>
          </div>
          <div className="relative">
            <div
              ref={track}
              tabIndex={0}
              role="region"
              aria-roledescription="carousel"
              aria-label={carousel.hook}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') go(slide + 1);
                if (e.key === 'ArrowLeft') go(slide - 1);
              }}
              className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
            >
              {carousel.slides.map((slide, i) => (
                <img
                  key={slide.src}
                  src={slide.src}
                  srcSet={`${slide.src} 900w, ${slide.full} 1080w`}
                  sizes="(min-width: 1024px) 460px, 92vw"
                  alt={`${carousel.hook} (slide ${i + 1} of ${total})`}
                  width={720}
                  height={900}
                  loading={i < 2 ? 'eager' : 'lazy'}
                  className="aspect-[4/5] w-full shrink-0 snap-start object-cover"
                />
              ))}
            </div>
            {slide > 0 && (
              <button
                type="button"
                onClick={() => go(slide - 1)}
                aria-label={labels.prev}
                className="absolute top-1/2 left-3 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0E0F0C] shadow-lg"
              >
                <Icon name="arrowLeft" className="size-4" />
              </button>
            )}
            {slide < total - 1 && (
              <button
                type="button"
                onClick={() => go(slide + 1)}
                aria-label={labels.next}
                className="absolute top-1/2 right-3 grid size-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0E0F0C] shadow-lg"
              >
                <Icon name="arrowRight" className="size-4" />
              </button>
            )}
          </div>
          <div className="flex justify-center gap-1.5 py-3" aria-hidden="true">
            {carousel.slides.map((dot, i) => (
              <span
                key={dot.src}
                className={cn(
                  'size-1.5 rounded-full transition-colors',
                  i === slide ? 'bg-signal' : 'bg-ink/20',
                )}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Picker + caption */}
      <div className="min-w-0">
        <p className="text-ink-soft text-sm font-medium">{labels.pick}</p>
        <div className="mt-3 flex [scrollbar-width:thin] gap-3 overflow-x-auto pb-2">
          {carousels.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => pick(i)}
              aria-pressed={i === active}
              className={cn(
                'w-[92px] shrink-0 overflow-hidden rounded-[12px] ring-2 transition',
                i === active ? 'ring-signal' : 'opacity-60 ring-transparent hover:opacity-100',
              )}
            >
              <img
                src={c.slides[0]!.src}
                alt={c.hook}
                width={92}
                height={115}
                loading="lazy"
                className="aspect-[4/5] w-full object-cover"
              />
            </button>
          ))}
        </div>
        <div className="border-ink/10 mt-6 rounded-[18px] border p-5">
          <p className="text-ink-soft font-mono text-xs tracking-[0.12em] uppercase">
            {labels.captionLabel}
          </p>
          <p className="mt-3 max-h-[260px] overflow-y-auto text-[15px] leading-relaxed whitespace-pre-line">
            {carousel.caption}
          </p>
          {carousel.hashtags.length > 0 && (
            <p className="text-signal mt-4 text-sm">{carousel.hashtags.join(' ')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
