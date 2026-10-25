'use client';

/* eslint-disable @next/next/no-img-element -- hundreds of small pre-sized posters */
import { Icon, type IconName, cn, useFinePointer } from '@shimanto/ui';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { DemoGroup, FormatDemo } from '@/content/content-os/demos';

const PAGE = 30;

/** An icon per group, for the filter chips and tiles. */
const groupIcon: Record<DemoGroup, IconName> = {
  viral: 'spark',
  brand: 'tag',
  teach: 'book',
  story: 'users',
  social: 'music',
  motion: 'pen',
  mixed: 'layers',
  engines: 'box',
  youtube: 'play',
  headlines: 'bolt',
};

/**
 * A pin: the poster at its own shape, a silent preview while hovered, the name over a gradient on
 * hover (always under it on touch screens). Opens the player.
 */
function Tile({
  demo,
  groupName,
  hover,
  wideLabel,
  onOpen,
}: {
  demo: FormatDemo;
  groupName: string;
  hover: boolean;
  wideLabel: string;
  onOpen: () => void;
}) {
  const [previewing, setPreviewing] = useState(false);

  return (
    <li className="mb-3 break-inside-avoid md:mb-4">
      <button
        type="button"
        onClick={onOpen}
        onMouseEnter={() => hover && setPreviewing(true)}
        onMouseLeave={() => setPreviewing(false)}
        aria-label={`${demo.name}: ${demo.tagline}`}
        className="group block w-full text-left"
        data-cursor="Play"
      >
        <span
          className={cn(
            'relative block overflow-hidden rounded-[20px] bg-[#1a1c17] transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.9)]',
            demo.aspect === '16:9'
              ? 'aspect-video'
              : demo.aspect === '1:1'
                ? 'aspect-square'
                : 'aspect-[9/16]',
          )}
        >
          <img
            src={demo.poster}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
          {previewing && (
            <video
              src={demo.video}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 size-full object-cover"
            />
          )}
          {/* Group mark, and "16:9 too" when the format has both shapes */}
          <span className="absolute top-2.5 left-2.5 flex gap-1.5">
            <span className="grid size-7 place-items-center rounded-full bg-black/45 text-white backdrop-blur">
              <Icon name={groupIcon[demo.group]} className="size-3.5" />
            </span>
            {demo.wide && (
              <span className="rounded-full bg-black/45 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
                {wideLabel}
              </span>
            )}
          </span>
          {/* Name over a gradient on hover (desktop) */}
          <span className="pointer-events-none absolute inset-x-0 bottom-0 hidden translate-y-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-3 pt-10 opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 [@media(hover:hover)]:block">
            <span className="block text-[15px] leading-tight font-medium text-white">
              {demo.name}
            </span>
            <span className="mt-0.5 block text-xs text-white/70">{groupName}</span>
          </span>
          <span className="absolute right-2.5 bottom-2.5 grid size-9 place-items-center rounded-full bg-white text-[#0E0F0C] opacity-0 shadow-lg transition group-hover:opacity-100 group-focus-visible:opacity-100">
            <Icon name="play" className="size-4" />
          </span>
        </span>
        {/* Touch screens: the name under the pin */}
        <span className="mt-1.5 block truncate px-1 text-[13px] font-medium [@media(hover:hover)]:hidden">
          {demo.name}
        </span>
      </button>
    </li>
  );
}

/** Full-screen player for one demo, with 9:16 / 16:9 when the format has both, and prev / next. */
function Player({
  demo,
  groupName,
  labels,
  onClose,
  onStep,
}: {
  demo: FormatDemo;
  groupName: string;
  labels: { close: string; vertical: string; landscape: string; prev: string; next: string };
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  // Swipe left / right to move through the demos on touch screens.
  const touch = useRef<number | null>(null);
  const [wide, setWide] = useState(false);
  const show = wide && demo.wide ? demo.wide : demo;
  const aspect = wide && demo.wide ? '16:9' : demo.aspect;

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') onStep(1);
        if (e.key === 'ArrowLeft') onStep(-1);
      }}
      aria-label={demo.name}
      className="lightbox m-auto max-h-[94dvh] w-[min(94vw,1100px)] overflow-visible bg-transparent p-0 text-[#F3EFE4] backdrop:bg-black/85 backdrop:backdrop-blur-sm"
    >
      <div
        className="lightbox-media grid gap-5 md:grid-cols-[minmax(0,1fr)_280px] md:items-center"
        onTouchStart={(e) => {
          touch.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const x0 = touch.current;
          const x1 = e.changedTouches[0]?.clientX;
          touch.current = null;
          if (x0 !== null && x1 !== undefined && Math.abs(x1 - x0) >= 50) onStep(x1 < x0 ? 1 : -1);
        }}
      >
        <div className="flex justify-center">
          <video
            key={show.full}
            src={show.full}
            poster={show.poster}
            autoPlay
            loop
            playsInline
            controls
            className={cn(
              'max-h-[82dvh] rounded-[18px] bg-black object-contain shadow-2xl',
              aspect === '16:9' ? 'aspect-video w-full' : 'aspect-[9/16] h-[82dvh] max-w-full',
            )}
          />
        </div>
        <div>
          <p className="font-mono text-xs tracking-[0.14em] text-[#B9B4A7] uppercase">
            {groupName}
          </p>
          <h3 className="mt-2 text-2xl font-medium tracking-[-0.03em]">{demo.name}</h3>
          <p className="mt-2 leading-relaxed text-[#B9B4A7]">{demo.tagline}</p>
          {demo.wide && (
            <div className="mt-5 inline-flex rounded-full bg-white/10 p-1 text-sm">
              {[false, true].map((w) => (
                <button
                  key={String(w)}
                  type="button"
                  onClick={() => setWide(w)}
                  aria-pressed={wide === w}
                  className={cn(
                    'rounded-full px-4 py-1.5 font-medium transition',
                    wide === w ? 'bg-[#F3EFE4] text-[#0E0F0C]' : 'text-[#B9B4A7]',
                  )}
                >
                  {w ? labels.landscape : labels.vertical}
                </button>
              ))}
            </div>
          )}
          <div className="mt-6 flex gap-2">
            <button
              type="button"
              onClick={() => onStep(-1)}
              aria-label={labels.prev}
              className="grid size-10 place-items-center rounded-full ring-1 ring-white/20 hover:bg-white/10"
            >
              <Icon name="arrowLeft" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onStep(1)}
              aria-label={labels.next}
              className="grid size-10 place-items-center rounded-full ring-1 ring-white/20 hover:bg-white/10"
            >
              <Icon name="arrowRight" className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => dialog.current?.close()}
              className="ml-auto rounded-full px-4 text-sm font-medium ring-1 ring-white/20 hover:bg-white/10"
            >
              {labels.close}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

/** Every format demo: filter by group, preview on hover, watch in a player. */
export function DemoGallery({
  demos,
  groups,
  labels,
}: {
  demos: FormatDemo[];
  groups: Record<DemoGroup, string>;
  labels: {
    all: string;
    showMore: string;
    close: string;
    vertical: string;
    landscape: string;
    wideToo: string;
    prev: string;
    next: string;
  };
}) {
  const hover = useFinePointer();
  const [group, setGroup] = useState<DemoGroup | 'all'>('all');
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState<number | null>(null);

  const counts = useMemo(() => {
    const c = new Map<DemoGroup, number>();
    for (const d of demos) c.set(d.group, (c.get(d.group) ?? 0) + 1);
    return c;
  }, [demos]);
  const list = useMemo(
    () => (group === 'all' ? demos : demos.filter((d) => d.group === group)),
    [demos, group],
  );
  const visible = list.slice(0, shown);
  const current = open === null ? null : list[open];

  const chip = (value: DemoGroup | 'all', label: string, count: number) => (
    <button
      key={value}
      type="button"
      onClick={() => {
        setGroup(value);
        setShown(PAGE);
      }}
      aria-pressed={group === value}
      className={cn(
        'rounded-pill inline-flex shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium whitespace-nowrap ring-1 transition-colors',
        group === value
          ? 'bg-[#F3EFE4] text-[#0E0F0C] ring-transparent'
          : 'text-ink-soft ring-white/15 hover:text-[#F3EFE4]',
      )}
    >
      {value !== 'all' && <Icon name={groupIcon[value]} className="size-3.5" />}
      {label} <span className="opacity-60">{count}</span>
    </button>
  );

  return (
    <div>
      <div className="-mx-5 flex [scrollbar-width:none] gap-2 overflow-x-auto px-5 pb-2 md:-mx-8 md:flex-wrap md:px-8">
        {chip('all', labels.all, demos.length)}
        {(Object.keys(groups) as DemoGroup[])
          .filter((g) => counts.get(g))
          .map((g) => chip(g, groups[g], counts.get(g) ?? 0))}
      </div>

      <ul className="mt-8 columns-2 gap-3 sm:columns-3 md:gap-4 lg:columns-4 xl:columns-5 2xl:columns-6">
        {visible.map((demo, i) => (
          <Tile
            key={demo.id}
            demo={demo}
            groupName={groups[demo.group]}
            hover={hover}
            wideLabel={labels.wideToo}
            onOpen={() => setOpen(i)}
          />
        ))}
      </ul>

      {shown < list.length && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + PAGE)}
            className="rounded-pill px-6 py-3 font-medium ring-1 ring-white/20 hover:bg-white/10"
          >
            {labels.showMore} <span className="text-ink-soft">({list.length - shown})</span>
          </button>
        </div>
      )}

      {current && open !== null && (
        <Player
          key={current.id}
          demo={current}
          groupName={groups[current.group]}
          labels={labels}
          onClose={() => setOpen(null)}
          onStep={(delta) =>
            setOpen((o) => (o === null ? o : (o + delta + list.length) % list.length))
          }
        />
      )}
    </div>
  );
}
