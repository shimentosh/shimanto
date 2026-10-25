'use client';

import { Icon, cn } from '@shimanto/ui';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { FeaturesCopy } from '@/content/content-os/features';
import { useSwipe } from './media';
import { pressDark } from './press';

type Studio = FeaturesCopy['studio'];

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * The Studio as a slideshow: one real screen at a time, as big as the page allows, with numbered
 * markers on the parts that matter and the same numbered benefits under it (pointing at one lights
 * up the other). Chips, arrows, ← / → and swipe move between screens; a click on the screenshot
 * opens it full size (the site's lightbox).
 */
export function StudioTour({ studio }: { studio: Studio }) {
  const screens = studio.screens;
  const total = screens.length;
  const [index, setIndex] = useState(0);
  const [point, setPoint] = useState<number | null>(null);
  const screen = screens[index]!;
  const go = (to: number) => {
    setIndex((to + total) % total);
    setPoint(null);
  };
  const swipe = useSwipe((d) => go(index + d));

  // Load the next screen ahead, so stepping forward is instant.
  useEffect(() => {
    const next = screens[(index + 1) % total];
    if (next) new window.Image().src = next.image;
  }, [index, screens, total]);

  const hover = (i: number) => ({
    onMouseEnter: () => setPoint(i),
    onMouseLeave: () => setPoint(null),
    onFocus: () => setPoint(i),
    onBlur: () => setPoint(null),
  });

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={studio.title}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1);
        if (e.key === 'ArrowLeft') go(index - 1);
      }}
    >
      {/* Screens */}
      <div
        role="tablist"
        aria-label={studio.title}
        className="cos-rail -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:px-0"
      >
        {screens.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-controls="studio-slide"
            onClick={() => go(i)}
            className={cn(
              'flex h-9 shrink-0 items-center gap-2 rounded-[12px] px-3 text-sm font-medium whitespace-nowrap transition',
              i === index
                ? 'bg-gradient-to-b from-[#FFFBF0] to-[#DED7C4] text-[#0E0F0C] shadow-[inset_0_1px_0_#fff,inset_0_-2px_0_rgba(0,0,0,0.18)]'
                : cn(pressDark, 'text-ink-soft hover:text-[#F3EFE4]'),
            )}
          >
            <Icon name={s.icon} className="size-4" />
            {s.label}
          </button>
        ))}
      </div>

      {/* The slide */}
      <div id="studio-slide" role="tabpanel" aria-label={screen.label} className="mt-6">
        <figure
          {...swipe}
          className="overflow-hidden rounded-[16px] bg-[#121310] shadow-[0_60px_140px_-50px_rgba(0,0,0,0.95)] ring-1 ring-white/10 md:rounded-[24px]"
        >
          <div className="flex items-center gap-3 border-b border-white/10 px-3.5 py-2.5 md:px-5 md:py-3">
            <span aria-hidden="true" className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[#ff5f57] md:size-3" />
              <span className="size-2.5 rounded-full bg-[#febc2e] md:size-3" />
              <span className="size-2.5 rounded-full bg-[#28c840] md:size-3" />
            </span>
            <span className="text-ink-soft min-w-0 flex-1 truncate rounded-[8px] bg-white/[0.05] px-3 py-1 text-center font-mono text-[11px] md:text-xs">
              localhost:3000{screen.path}
            </span>
            <span className="text-ink-soft hidden font-mono text-xs md:block" aria-hidden="true">
              {pad(index + 1)} / {pad(total)}
            </span>
          </div>
          <div key={screen.id} className="cos-fade relative">
            <Image
              src={screen.image}
              alt={`The Content OS Studio: ${screen.label}`}
              width={2000}
              height={1250}
              priority={index === 0}
              sizes="(min-width: 1280px) 1200px, 100vw"
              className="block h-auto w-full cursor-zoom-in"
            />
            {screen.points.map((p, i) => (
              <button
                key={p.title}
                type="button"
                {...hover(i)}
                aria-label={`${i + 1}. ${p.title}`}
                aria-describedby={`studio-point-${i}`}
                className={cn(
                  'absolute isolate grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-mono text-[11px] font-semibold text-[#06121f] transition md:size-9 md:text-sm',
                  'bg-signal shadow-[0_0_0_4px_rgba(46,155,247,0.25),0_8px_20px_-6px_rgba(0,0,0,0.8)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                  point === i ? 'scale-125 bg-[#9EC2FF]' : point !== null && 'opacity-50',
                )}
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              >
                {i + 1}
                {/* A slow pulse, so the markers read as things to point at (off with reduced motion). */}
                <span
                  aria-hidden="true"
                  className="bg-signal/40 absolute inset-0 -z-10 rounded-full motion-safe:animate-ping motion-safe:[animation-duration:2.4s]"
                />
              </button>
            ))}
          </div>
        </figure>

        {/* What this screen does for you */}
        <div
          key={`${screen.id}-text`}
          className="cos-rise mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12"
        >
          <div>
            <p className="text-ink-soft flex items-center gap-3 font-mono text-xs tracking-[0.16em] uppercase">
              <span className="bg-signal/15 text-signal grid size-8 place-items-center rounded-[10px]">
                <Icon name={screen.icon} className="size-4" />
              </span>
              {pad(index + 1)} / {pad(total)} · {screen.label}
            </p>
            <h3 className="mt-4 text-[clamp(28px,3.2vw,44px)] leading-[1.02] font-medium tracking-[-0.04em] text-balance">
              {screen.title}
            </h3>
            <p className="text-ink-soft mt-3 text-lg leading-snug">{screen.body}</p>
            {/* Step through the screens */}
            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous screen"
                className={cn(pressDark, 'grid size-11 place-items-center rounded-[14px]')}
              >
                <Icon name="arrowLeft" className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                className={cn(
                  pressDark,
                  'inline-flex h-11 items-center gap-2 rounded-[14px] px-4 text-sm font-medium',
                )}
              >
                {screens[(index + 1) % total]!.label}
                <Icon name="arrowRight" className="size-4" />
              </button>
              {/* Where you are */}
              <span aria-hidden="true" className="ml-2 hidden flex-1 gap-1 sm:flex">
                {screens.map((s, i) => (
                  <span
                    key={s.id}
                    className={cn(
                      'h-1 flex-1 rounded-full transition-colors',
                      i === index ? 'bg-signal' : i < index ? 'bg-white/30' : 'bg-white/10',
                    )}
                  />
                ))}
              </span>
            </div>
          </div>
          <ol className="grid content-start gap-1 sm:grid-cols-2">
            {screen.points.map((p, i) => (
              <li
                key={p.title}
                id={`studio-point-${i}`}
                {...hover(i)}
                className={cn(
                  'flex gap-3.5 rounded-[14px] p-3 transition-colors',
                  point === i ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]',
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold transition-colors',
                    point === i ? 'bg-signal text-[#06121f]' : 'text-signal bg-signal/15',
                  )}
                >
                  {i + 1}
                </span>
                <span>
                  <span className="block font-medium">{p.title}</span>
                  <span className="text-ink-soft mt-0.5 block text-[15px] leading-snug">
                    {p.body}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
