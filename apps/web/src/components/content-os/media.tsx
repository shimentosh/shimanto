'use client';

import { Icon, cn } from '@shimanto/ui';
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
 * The original video, full screen: native controls (sound included), Esc or a click outside to
 * close. Used when a preview card is opened.
 */
export function VideoDialog({
  src,
  poster,
  title,
  aspect,
  closeLabel,
  onClose,
}: {
  src: string;
  poster: string;
  title: string;
  aspect: string;
  closeLabel: string;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      aria-label={title}
      className="lightbox m-auto max-h-[94dvh] w-[min(94vw,1200px)] overflow-visible bg-transparent p-0 text-[#F3EFE4] backdrop:bg-black/85 backdrop:backdrop-blur-sm"
    >
      <div className="lightbox-media flex flex-col items-center gap-4">
        <video
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
        <div className="flex w-full max-w-[640px] items-center justify-between gap-4">
          <p className="font-medium">{title}</p>
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

/**
 * A card that loops a light, silent preview while hovered, and opens the original (with sound)
 * full screen when clicked.
 */
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
  const [previewing, setPreviewing] = useState(false);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        onMouseEnter={() => setPreviewing(true)}
        onMouseLeave={() => setPreviewing(false)}
        aria-label={title}
        data-cursor="Play"
        className={cn('group relative block w-full overflow-hidden bg-black', className)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={poster}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover"
        />
        {previewing && (
          <video
            src={video}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <span className="absolute right-2.5 bottom-2.5 grid size-9 place-items-center rounded-full bg-white text-[#0E0F0C] shadow-lg transition group-hover:scale-110">
          <Icon name="play" className="size-4" />
        </span>
      </button>
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
