'use client';

/* eslint-disable @next/next/no-img-element -- pre-sized renders from Content OS */
import { BrandMark, Icon, cn, useInView, usePrefersReducedMotion } from '@shimanto/ui';
import { useEffect, useRef, useState } from 'react';
import type { FeaturesCopy, StudioVisual } from '@/content/content-os/features';

type Studio = FeaturesCopy['studio'];

/** The real work the tour shows inside each view. */
export interface StudioMedia {
  slides: string[];
  posts: Array<{ src: string; hook: string }>;
  videos: Array<{ poster: string; name: string }>;
  categories: string[];
  stats: Array<{ value: string; label: string }>;
  brand: { colors: string[]; fonts: string };
}

const STEP_MS = 5000;
const PILLAR_SHARE = [82, 64, 55, 41, 30];

/** What one view shows: a small, honest picture of that screen, built from the real demos. */
function View({ id, studio, media }: { id: StudioVisual; studio: Studio; media: StudioMedia }) {
  const l = studio.labels;
  switch (id) {
    case 'dashboard':
      return (
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {media.stats.map((s) => (
              <div
                key={s.label}
                className="rounded-[14px] bg-white/[0.04] p-3.5 ring-1 ring-white/10"
              >
                <p className="text-2xl font-medium tracking-[-0.04em]">{s.value}</p>
                <p className="text-ink-soft text-xs">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-[1.3fr_1fr]">
            <div className="rounded-[14px] bg-white/[0.04] p-4 ring-1 ring-white/10">
              <p className="text-ink-soft text-xs">{l.pillars}</p>
              <ul className="mt-3 grid gap-2.5">
                {studio.pillars.map((p, i) => (
                  <li key={p} className="grid grid-cols-[110px_1fr] items-center gap-3 text-xs">
                    <span className="truncate">{p}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-white/10">
                      <span
                        className="from-signal to-idea cos-grow block h-full rounded-full bg-gradient-to-r"
                        style={{
                          width: `${PILLAR_SHARE[i % PILLAR_SHARE.length]}%`,
                          animationDelay: `${i * 90}ms`,
                        }}
                      />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-[14px] bg-white/[0.04] p-4 ring-1 ring-white/10">
              <p className="text-ink-soft text-xs">{l.next}</p>
              <p className="mt-2 leading-snug font-medium">{studio.ideas[0]}</p>
              {media.slides[0] && (
                <img
                  src={media.slides[0]}
                  alt=""
                  className="mt-3 aspect-[4/5] w-24 rounded-[8px] object-cover"
                />
              )}
            </div>
          </div>
        </div>
      );
    case 'carousel':
      return (
        <div>
          <div className="flex gap-3 overflow-hidden">
            {media.slides.slice(0, 5).map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className={cn(
                  'cos-rise aspect-[4/5] shrink-0 rounded-[10px] object-cover ring-1 ring-white/10',
                  i === 0 ? 'w-[46%] sm:w-[38%]' : 'w-[26%] opacity-80 sm:w-[20%]',
                )}
                style={{ animationDelay: `${i * 70}ms` }}
              />
            ))}
          </div>
          <p className="text-build mt-3 inline-flex items-center gap-1.5 text-sm">
            <Icon name="shield" className="size-4" />
            {l.qa}
          </p>
        </div>
      );
    case 'library':
      return (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
          {media.posts.slice(0, 8).map((p, i) => (
            <li
              key={p.src}
              className={cn('cos-rise', i > 5 && 'hidden sm:block')}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <img
                src={p.src}
                alt=""
                className="aspect-[4/5] w-full rounded-[10px] object-cover ring-1 ring-white/10"
              />
            </li>
          ))}
        </ul>
      );
    case 'videos':
      return (
        <ul className="grid grid-cols-3 gap-2.5 sm:grid-cols-6">
          {media.videos.slice(0, 6).map((v, i) => (
            <li
              key={v.poster}
              className="cos-rise relative"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <img
                src={v.poster}
                alt=""
                className="aspect-[9/16] w-full rounded-[10px] object-cover ring-1 ring-white/10"
              />
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid size-8 place-items-center rounded-full bg-black/55 backdrop-blur">
                  <Icon name="play" className="size-3.5" />
                </span>
              </span>
              <p className="text-ink-soft mt-1.5 truncate text-[11px]">{v.name}</p>
            </li>
          ))}
        </ul>
      );
    case 'ideas':
      return (
        <ul className="grid gap-2.5">
          {studio.ideas.map((idea, i) => (
            <li
              key={idea}
              className="cos-rise flex items-center gap-3 rounded-[12px] bg-white/[0.04] p-3 ring-1 ring-white/10"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="bg-spark/15 text-spark grid size-8 shrink-0 place-items-center rounded-[9px]">
                <Icon name="bulb" className="size-4" />
              </span>
              <span className="min-w-0 flex-1 text-[15px] leading-snug">{idea}</span>
              <span className="text-ink-soft hidden shrink-0 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs sm:inline">
                {studio.pillars[i % studio.pillars.length]}
              </span>
            </li>
          ))}
        </ul>
      );
    case 'context':
      return (
        <div className="grid gap-4 sm:grid-cols-[1fr_1fr]">
          <ul className="flex flex-wrap content-start gap-1.5">
            {media.categories.map((name, i) => (
              <li
                key={name}
                className="cos-rise rounded-pill bg-signal/10 ring-signal/30 inline-flex items-center gap-1.5 px-2.5 py-1 text-[13px] ring-1"
                style={{ animationDelay: `${i * 40}ms` }}
              >
                <Icon name="check" className="text-signal size-3" />
                {name}
              </li>
            ))}
          </ul>
          <div className="rounded-[12px] bg-black/40 p-3.5 font-mono text-[12px] leading-relaxed ring-1 ring-white/10">
            <p className="text-ink-soft font-sans text-xs">{l.preview}</p>
            <p className="mt-2">
              <span className="text-signal">voice:</span> practical, honest, direct
            </p>
            <p>
              <span className="text-signal">audience:</span> founders, agency owners
            </p>
            <p>
              <span className="text-signal">rule:</span> show real work
            </p>
            <p>
              <span className="text-signal">avoid:</span> question hooks
            </p>
          </div>
        </div>
      );
    case 'brand':
      return (
        <div className="grid gap-4 sm:grid-cols-[1fr_1.4fr]">
          <div className="rounded-[14px] bg-white/[0.04] p-4 ring-1 ring-white/10">
            <BrandMark className="size-10" />
            <div className="mt-4 flex gap-1.5">
              {media.brand.colors.map((c) => (
                <span
                  key={c}
                  className="size-7 rounded-full ring-1 ring-white/20"
                  style={{ background: c }}
                />
              ))}
            </div>
            <p className="text-ink-soft mt-3 text-sm">{media.brand.fonts}</p>
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {media.slides.slice(1, 4).map((src, i) => (
              <img
                key={src}
                src={src}
                alt=""
                className="cos-rise aspect-[4/5] w-full rounded-[10px] object-cover ring-1 ring-white/10"
                style={{ animationDelay: `${i * 70}ms` }}
              />
            ))}
          </div>
        </div>
      );
    case 'sync':
      return (
        <div className="grid gap-2.5">
          {studio.sync.map((m, i) => (
            <div
              key={m.name}
              className="cos-rise flex items-center gap-3 rounded-[12px] bg-white/[0.04] p-3 ring-1 ring-white/10"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="bg-idea/20 text-idea grid size-8 place-items-center rounded-full text-sm font-medium">
                {m.name[0]}
              </span>
              <span className="flex-1 font-medium">{m.name}</span>
              <span className="text-ink-soft text-sm">{m.role}</span>
            </div>
          ))}
          <p className="text-build mt-1 inline-flex items-center gap-1.5 text-sm">
            <span className="bg-build size-2 rounded-full" />
            {studio.synced}
          </p>
        </div>
      );
  }
}

/**
 * A tour of the Studio: an app window with its views on the left; each view shows a small picture
 * of that screen built from the real demos. Steps through the views on its own while on screen,
 * until you pick one.
 */
export function StudioTour({ studio, media }: { studio: Studio; media: StudioMedia }) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useInView(ref, { once: false, rootMargin: '0px' });
  const reduced = usePrefersReducedMotion();
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const view = studio.views[active]!;

  useEffect(() => {
    if (!auto || !visible || reduced) return;
    const id = window.setInterval(() => setActive((a) => (a + 1) % studio.views.length), STEP_MS);
    return () => window.clearInterval(id);
  }, [auto, visible, reduced, studio.views.length]);

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-[24px] bg-[#121310] shadow-[0_50px_120px_-40px_rgba(0,0,0,0.9)] ring-1 ring-white/10"
    >
      {/* Window bar */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span aria-hidden="true" className="flex gap-1.5">
          <span className="size-3 rounded-full bg-[#ff5f57]" />
          <span className="size-3 rounded-full bg-[#febc2e]" />
          <span className="size-3 rounded-full bg-[#28c840]" />
        </span>
        <span className="text-ink-soft min-w-0 flex-1 truncate rounded-[8px] bg-white/[0.05] px-3 py-1 text-center font-mono text-xs">
          {studio.address}
          {view.path}
        </span>
      </div>
      <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
        {/* Views */}
        <div
          role="group"
          aria-label={studio.title}
          className="flex [scrollbar-width:none] gap-1 overflow-x-auto border-b border-white/10 p-2 md:flex-col md:border-r md:border-b-0 md:p-3"
        >
          {studio.views.map((v, i) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={i === active}
              onClick={() => {
                setActive(i);
                setAuto(false);
              }}
              className={cn(
                'relative flex shrink-0 items-center gap-2.5 overflow-hidden rounded-[10px] px-3 py-2 text-left text-sm transition',
                i === active
                  ? 'bg-white/[0.08] text-[#F3EFE4]'
                  : 'text-ink-soft hover:bg-white/[0.04] hover:text-[#F3EFE4]',
              )}
            >
              <Icon
                name={v.icon}
                className={cn('size-4 shrink-0', i === active && 'text-signal')}
              />
              {v.label}
              {/* Time left on this view while the tour plays */}
              {i === active && auto && !reduced && (
                <span
                  key={active}
                  aria-hidden="true"
                  className="bg-signal cos-progress absolute inset-x-0 bottom-0 h-0.5 origin-left"
                  style={{
                    animationDuration: `${STEP_MS}ms`,
                    animationPlayState: visible ? 'running' : 'paused',
                  }}
                />
              )}
            </button>
          ))}
        </div>
        {/* The view */}
        <div className="min-h-[380px] p-5 md:p-7">
          <div key={view.id} className="cos-rise">
            <h3 className="flex items-center gap-2.5 text-xl font-medium tracking-[-0.02em]">
              <Icon name={view.icon} className="text-signal size-5" />
              {view.label}
            </h3>
            <p className="text-ink-soft mt-1">{view.body}</p>
            <div className="mt-5">
              <View id={view.id} studio={studio} media={media} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
