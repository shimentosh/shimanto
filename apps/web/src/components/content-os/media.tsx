'use client';

import { Icon, cn, useFinePointer, useInView, usePrefersReducedMotion } from '@shimanto/ui';
import { useEffect, useRef, useState } from 'react';

/**
 * The story video behind a poster: nothing downloads until the visitor presses play. The video
 * has no sound track, so it may start muted with controls.
 */
export function StoryVideo({
  src,
  poster,
  width,
  height,
  label,
  className,
}: {
  src: string;
  poster: string;
  width: number;
  height: number;
  label: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div
      id="story"
      className={cn(
        'bg-night relative overflow-hidden rounded-[20px] shadow-[0_40px_120px_-40px_rgba(46,155,247,0.55)] ring-1 ring-white/10 md:rounded-[28px]',
        className,
      )}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {playing ? (
        <video
          src={src}
          poster={poster}
          width={width}
          height={height}
          controls
          autoPlay
          muted
          playsInline
          className="size-full object-cover"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 size-full cursor-pointer"
          data-cursor="Play"
        >
          {/* A plain img: the poster is already web-sized, and next/image would add a request. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={poster}
            alt=""
            width={width}
            height={height}
            className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          <span className="absolute inset-0 grid place-items-center">
            <span className="bg-paper text-ink flex items-center gap-3 rounded-full py-3 pr-6 pl-3 text-base font-medium shadow-xl transition-transform duration-300 group-hover:scale-105 md:text-lg">
              <span className="bg-signal grid size-10 place-items-center rounded-full text-[#2C2E2A] md:size-12">
                <Icon name="play" className="size-5" />
              </span>
              <span className="sr-only">{label}</span>
              <span aria-hidden="true">1:44</span>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

/** A poster that turns into the video (with controls) when pressed; nothing loads before. */
export function Clip({
  video,
  poster,
  label,
  className,
}: {
  video: string;
  poster: string;
  label: string;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={cn('relative overflow-hidden bg-black', className)}>
      {playing ? (
        <video
          src={video}
          poster={poster}
          controls
          autoPlay
          playsInline
          className="size-full object-cover"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 size-full"
          data-cursor="Play"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={poster} alt="" loading="lazy" className="size-full object-cover" />
          <span className="absolute inset-0 grid place-items-center bg-black/10 transition group-hover:bg-black/0">
            <span className="bg-signal grid size-14 place-items-center rounded-full text-[#0E0F0C] shadow-xl transition-transform group-hover:scale-110">
              <Icon name="play" className="size-6" />
              <span className="sr-only">{label}</span>
            </span>
          </span>
        </button>
      )}
    </div>
  );
}

/**
 * A silent preview that plays while it's on screen, unless `paused` (another card is hovered, a
 * player is open) or the visitor prefers reduced motion. Nothing downloads before it's in view.
 */
export function AutoVideo({
  src,
  poster,
  paused = false,
  className,
}: {
  src: string;
  poster: string;
  paused?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const reduced = usePrefersReducedMotion();
  const visible = useInView(ref, { once: false, rootMargin: '0px' });
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (visible && !reduced && !paused) void v.play().catch(() => undefined);
    else v.pause();
  }, [visible, reduced, paused]);
  return (
    <video
      ref={ref}
      src={src}
      poster={poster}
      muted
      loop
      playsInline
      preload="none"
      aria-hidden="true"
      className={cn('absolute inset-0 size-full object-cover', className)}
    />
  );
}

/** Swipe left / right on touch screens: calls `onStep(+1 | -1)`. */
function useSwipe(onStep?: (delta: number) => void) {
  const start = useRef<number | null>(null);
  return {
    onTouchStart: (e: React.TouchEvent) => {
      start.current = e.touches[0]?.clientX ?? null;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const x0 = start.current;
      const x1 = e.changedTouches[0]?.clientX;
      start.current = null;
      if (!onStep || x0 === null || x1 === undefined || Math.abs(x1 - x0) < 50) return;
      onStep(x1 < x0 ? 1 : -1);
    },
  };
}

/**
 * The original video, full screen: native controls (sound included), Esc or a click outside to
 * close. With `onStep` it's a gallery: arrows, ← / → keys and swipe move to the next video.
 */
export function VideoDialog({
  src,
  poster,
  title,
  aspect,
  closeLabel,
  onClose,
  onStep,
  prevLabel = 'Previous',
  nextLabel = 'Next',
  position,
}: {
  src: string;
  poster: string;
  title: string;
  aspect: string;
  closeLabel: string;
  onClose: () => void;
  onStep?: (delta: number) => void;
  prevLabel?: string;
  nextLabel?: string;
  /** e.g. "3 / 10". */
  position?: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const swipe = useSwipe(onStep);
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);
  const arrow = (delta: number) =>
    onStep && (
      <button
        type="button"
        onClick={() => onStep(delta)}
        aria-label={delta < 0 ? prevLabel : nextLabel}
        className={cn(
          'absolute top-1/2 z-10 grid size-12 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#0E0F0C] shadow-xl transition hover:bg-white',
          delta < 0 ? 'left-2 md:-left-16' : 'right-2 md:-right-16',
        )}
      >
        <Icon name={delta < 0 ? 'arrowLeft' : 'arrowRight'} className="size-5" />
      </button>
    );
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      onKeyDown={(e) => {
        if (!onStep) return;
        if (e.key === 'ArrowRight') onStep(1);
        if (e.key === 'ArrowLeft') onStep(-1);
      }}
      aria-label={title}
      className="lightbox m-auto max-h-[94dvh] w-[min(94vw,1200px)] overflow-visible bg-transparent p-0 text-[#F3EFE4] backdrop:bg-black/85 backdrop:backdrop-blur-sm"
    >
      <div className="lightbox-media flex flex-col items-center gap-4" {...swipe}>
        <div className="relative flex w-full justify-center">
          {arrow(-1)}
          <video
            key={src}
            src={src}
            poster={poster}
            autoPlay
            controls
            playsInline
            className={cn(
              'rounded-[18px] bg-black shadow-2xl',
              aspect === '16:9' ? 'aspect-video w-full' : 'aspect-[9/16] h-[82dvh] max-w-full',
            )}
          />
          {arrow(1)}
        </div>
        <div className="flex w-full max-w-[640px] items-center justify-between gap-4">
          <p className="font-medium">
            {title}
            {position && <span className="ml-3 font-mono text-sm text-[#B9B4A7]">{position}</span>}
          </p>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="rounded-full px-4 py-2 text-sm font-medium ring-1 ring-white/20 hover:bg-white/10"
          >
            {closeLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** A card playing its silent preview; `onOpen` on click. Fades while another card is hovered. */
function PreviewCard({
  video,
  poster,
  title,
  onOpen,
  onHover,
  dimmed = false,
  paused = false,
  className,
}: {
  video: string;
  poster: string;
  title: string;
  onOpen: () => void;
  onHover?: (hovering: boolean) => void;
  dimmed?: boolean;
  paused?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      onMouseEnter={() => onHover?.(true)}
      onMouseLeave={() => onHover?.(false)}
      aria-label={title}
      data-cursor="Play"
      className={cn(
        'group relative block w-full overflow-hidden bg-black transition-opacity duration-300',
        dimmed && 'opacity-35',
        className,
      )}
    >
      <AutoVideo src={video} poster={poster} paused={paused || dimmed} />
      <span className="absolute right-2.5 bottom-2.5 grid size-9 place-items-center rounded-full bg-white text-[#0E0F0C] shadow-lg transition group-hover:scale-110">
        <Icon name="play" className="size-4" />
      </span>
    </button>
  );
}

/** One video card that opens its original full screen. */
export function HoverClip({
  video,
  poster,
  full,
  title,
  aspect,
  closeLabel,
  className,
}: {
  video: string;
  poster: string;
  full: string;
  title: string;
  aspect: string;
  closeLabel: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <PreviewCard
        video={video}
        poster={poster}
        title={title}
        onOpen={() => setOpen(true)}
        className={className}
      />
      {open && (
        <VideoDialog
          src={full}
          poster={poster}
          title={title}
          aspect={aspect}
          closeLabel={closeLabel}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

/**
 * A masonry of video cards sharing one full-screen player: open any, then slide through the rest
 * (arrows, keys, swipe).
 */
export function ClipGallery({
  items,
  labels,
  className,
}: {
  items: Array<{
    id: string;
    title: string;
    body: string;
    aspect: string;
    video: string;
    poster: string;
    full: string;
  }>;
  labels: { close: string; prev: string; next: string };
  className?: string;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);
  const hover = useFinePointer();
  const current = open === null ? null : items[open];
  return (
    <>
      <ul className={className}>
        {items.map((item, i) => (
          <li key={item.id}>
            <PreviewCard
              video={item.video}
              poster={item.poster}
              title={item.title}
              onOpen={() => setOpen(i)}
              onHover={(on) => hover && setHovered(on ? item.id : null)}
              dimmed={hovered !== null && hovered !== item.id}
              paused={open !== null}
              // Same shape in the grid; the player shows each clip at its own shape.
              className="aspect-[9/16] rounded-[18px] ring-1 ring-white/10"
            />
            <p className="mt-2.5 font-medium">{item.title}</p>
            <p className="text-ink-soft text-[13px] leading-snug">{item.body}</p>
          </li>
        ))}
      </ul>
      {current && open !== null && (
        <VideoDialog
          src={current.full}
          poster={current.poster}
          title={current.title}
          aspect={current.aspect}
          closeLabel={labels.close}
          prevLabel={labels.prev}
          nextLabel={labels.next}
          position={`${open + 1} / ${items.length}`}
          onClose={() => setOpen(null)}
          onStep={(delta) =>
            setOpen((o) => (o === null ? o : (o + delta + items.length) % items.length))
          }
        />
      )}
    </>
  );
}
