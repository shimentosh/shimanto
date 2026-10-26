'use client';

import { Icon, cn, usePrefersReducedMotion } from '@shimanto/ui';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import type { FeaturesCopy } from '@/content/content-os/features';
import { pressDark } from './press';

type Studio = FeaturesCopy['studio'];

const pad = (n: number) => String(n).padStart(2, '0');

/** Share of the track one slide takes, and the gap, in percent (phone, then wider). */
const SLIDE = { phone: 88, wide: 78 };
const GAP = { phone: 3, wide: 2.5 };
/** A drag this far (px) moves to the next screen. */
const SWIPE = 60;

/**
 * The Studio as a slideshow: one real screen big in the middle, the ones before and after peeking
 * in at the sides, smaller and dimmed. Click a peeking screen (or the big side arrows, a chip,
 * ← / →) and the track glides to it; drag or swipe and it follows your hand, then settles. The
 * middle screen carries numbered markers that light up the matching benefit below (and back), and
 * a click on it opens the screenshot full size (the site's lightbox).
 */
export function StudioTour({ studio }: { studio: Studio }) {
  const screens = studio.screens;
  const total = screens.length;
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState<1 | -1>(1);
  const [point, setPoint] = useState<number | null>(null);
  const [wide, setWide] = useState(true);
  const [drag, setDrag] = useState(0);
  const dragging = useRef<{ x: number; moved: boolean } | null>(null);
  // Set for a moment after a drag, so letting go isn't taken as a click.
  const justDragged = useRef(false);
  const screen = screens[index]!;

  useEffect(() => {
    const query = window.matchMedia('(min-width: 768px)');
    const update = () => setWide(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  const go = (to: number) => {
    const next = Math.max(0, Math.min(total - 1, to));
    if (next === index) return;
    setDir(next > index ? 1 : -1);
    setIndex(next);
    setPoint(null);
  };

  const end = () => {
    const d = dragging.current;
    dragging.current = null;
    if (d?.moved) {
      if (drag < -SWIPE) go(index + 1);
      else if (drag > SWIPE) go(index - 1);
      justDragged.current = true;
      window.setTimeout(() => {
        justDragged.current = false;
      }, 0);
    }
    setDrag(0);
  };

  const slide = wide ? SLIDE.wide : SLIDE.phone;
  const gap = wide ? GAP.wide : GAP.phone;
  const offset = (100 - slide) / 2 - index * (slide + gap);

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
        className="cos-rail -mx-5 flex gap-1.5 overflow-x-auto px-5 pb-1 md:mx-0 md:flex-wrap md:justify-center md:px-0"
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

      {/* The track */}
      <div className="relative mt-6 md:mt-8">
        <div
          className="-mx-5 overflow-hidden select-none md:mx-0"
          style={{ touchAction: 'pan-y' }}
          onPointerDown={(e) => {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            dragging.current = { x: e.clientX, moved: false };
          }}
          onPointerMove={(e) => {
            const d = dragging.current;
            if (!d) return;
            const dx = e.clientX - d.x;
            if (Math.abs(dx) > 6) d.moved = true;
            if (d.moved) setDrag(dx);
          }}
          onPointerUp={() => end()}
          onPointerLeave={() => end()}
          onPointerCancel={() => {
            dragging.current = null;
            setDrag(0);
          }}
          onClickCapture={(e) => {
            if (justDragged.current) e.stopPropagation();
          }}
        >
          <div
            id="studio-slide"
            role="tabpanel"
            aria-label={screen.label}
            className={cn(
              'flex',
              drag === 0 &&
                !reduced &&
                'transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
            )}
            style={{
              gap: `${gap}%`,
              transform: `translateX(calc(${offset}% + ${drag}px))`,
            }}
          >
            {screens.map((s, i) => {
              const active = i === index;
              const near = Math.abs(i - index) <= 1;
              return (
                <figure
                  key={s.id}
                  aria-hidden={!active}
                  className={cn(
                    'relative shrink-0 overflow-hidden rounded-[16px] bg-[#121310] ring-1 ring-white/10 md:rounded-[24px]',
                    !reduced &&
                      'transition-[transform,opacity,filter] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]',
                    active
                      ? 'shadow-[0_60px_140px_-50px_rgba(0,0,0,0.95)]'
                      : 'scale-[0.9] opacity-40 brightness-75',
                  )}
                  style={{ width: `${slide}%` }}
                >
                  <div className="flex items-center gap-3 border-b border-white/10 px-3.5 py-2.5 md:px-5 md:py-3">
                    <span aria-hidden="true" className="flex gap-1.5">
                      <span className="size-2.5 rounded-full bg-[#ff5f57] md:size-3" />
                      <span className="size-2.5 rounded-full bg-[#febc2e] md:size-3" />
                      <span className="size-2.5 rounded-full bg-[#28c840] md:size-3" />
                    </span>
                    <span className="text-ink-soft min-w-0 flex-1 truncate rounded-[8px] bg-white/[0.05] px-3 py-1 text-center font-mono text-[11px] md:text-xs">
                      localhost:3000{s.path}
                    </span>
                    <span
                      className="text-ink-soft hidden font-mono text-xs md:block"
                      aria-hidden="true"
                    >
                      {pad(i + 1)} / {pad(total)}
                    </span>
                  </div>
                  <div className="relative">
                    <Image
                      src={s.image}
                      alt={active ? `Content OS Studio: ${s.label}` : ''}
                      width={2000}
                      height={1250}
                      priority={i === 0}
                      loading={near ? 'eager' : 'lazy'}
                      draggable={false}
                      sizes="(min-width: 1280px) 960px, 90vw"
                      className={cn('block h-auto w-full select-none', active && 'cursor-zoom-in')}
                    />
                    {active &&
                      s.points.map((p, j) => (
                        <button
                          key={p.title}
                          type="button"
                          {...hover(j)}
                          aria-label={`${j + 1}. ${p.title}`}
                          aria-describedby={`studio-point-${j}`}
                          className={cn(
                            'cos-fade absolute isolate grid size-6 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full font-mono text-[11px] font-semibold text-[#06121f] transition md:size-9 md:text-sm',
                            'bg-signal shadow-[0_0_0_4px_rgba(46,155,247,0.25),0_8px_20px_-6px_rgba(0,0,0,0.8)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white',
                            point === j ? 'scale-125 bg-[#9EC2FF]' : point !== null && 'opacity-50',
                          )}
                          style={{
                            left: `${p.x}%`,
                            top: `${p.y}%`,
                            animationDelay: `${300 + j * 80}ms`,
                          }}
                        >
                          {j + 1}
                          <span
                            aria-hidden="true"
                            className="bg-signal/40 absolute inset-0 -z-10 rounded-full motion-safe:animate-ping motion-safe:[animation-duration:2.4s]"
                          />
                        </button>
                      ))}
                  </div>
                  {/* A peeking screen is one big button: click it to bring it to the middle. */}
                  {!active && (
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => go(i)}
                      aria-label={s.label}
                      className="absolute inset-0 cursor-pointer"
                    />
                  )}
                </figure>
              );
            })}
          </div>
        </div>

        {/* Big side arrows */}
        {[-1, 1].map((d) => {
          const to = index + d;
          const off = to < 0 || to >= total;
          return (
            <button
              key={d}
              type="button"
              onClick={() => go(to)}
              disabled={off}
              aria-label={d < 0 ? 'Previous screen' : 'Next screen'}
              className={cn(
                pressDark,
                'absolute top-1/2 z-10 hidden size-12 -translate-y-1/2 place-items-center rounded-full bg-[#16130f]/90 backdrop-blur md:grid md:size-14',
                d < 0 ? 'left-2 lg:-left-3' : 'right-2 lg:-right-3',
                off && 'pointer-events-none opacity-0',
              )}
            >
              <Icon name={d < 0 ? 'arrowLeft' : 'arrowRight'} className="size-5" />
            </button>
          );
        })}
      </div>

      {/* Where you are */}
      <div aria-hidden="true" className="mx-auto mt-6 flex max-w-md gap-1">
        {screens.map((s, i) => (
          <button
            key={s.id}
            type="button"
            tabIndex={-1}
            onClick={() => go(i)}
            className="group flex-1 py-2"
          >
            <span
              className={cn(
                'block h-1 rounded-full transition-colors',
                i === index ? 'bg-signal' : 'bg-white/15 group-hover:bg-white/35',
              )}
            />
          </button>
        ))}
      </div>

      {/* What this screen does for you */}
      <div
        key={screen.id}
        className={cn(
          'mt-6 grid gap-6 md:mt-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-12',
          !reduced && (dir > 0 ? 'cos-in-right' : 'cos-in-left'),
        )}
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
          {/* Phones: the next screen as a big button (the side arrows are for wider screens). */}
          {index < total - 1 && (
            <button
              type="button"
              onClick={() => go(index + 1)}
              className={cn(
                pressDark,
                'mt-6 inline-flex h-12 items-center gap-2 rounded-[14px] px-5 text-sm font-medium md:hidden',
              )}
            >
              {screens[index + 1]!.label}
              <Icon name="arrowRight" className="size-4" />
            </button>
          )}
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
  );
}
