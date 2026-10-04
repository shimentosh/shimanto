'use client';

import Image from 'next/image';
import { useState } from 'react';

export interface MusicPlayerVideo {
  id: string;
  title: string;
  bangla?: string;
  note: string;
  views: string;
}

const PLAY_PATH = 'M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z';

let warmed = false;
/** Open connections to the player's origins on first intent, so the click starts faster. */
function warmConnections() {
  if (warmed) return;
  warmed = true;
  for (const href of [
    'https://www.youtube-nocookie.com',
    'https://www.google.com',
    'https://i.ytimg.com',
  ]) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    document.head.append(link);
  }
}

/**
 * The home page music player: a lite preview (local thumbnail, title, views) that turns into the
 * privacy-enhanced YouTube player on click. Nothing from YouTube loads until the first hover or
 * focus. Picking a video below swaps it into the player and starts it, without leaving the page.
 */
export function MusicPlayer({ videos }: { videos: readonly MusicPlayerVideo[] }) {
  const [order, setOrder] = useState(() => [...videos]);
  const [playing, setPlaying] = useState(false);
  const [active, ...more] = order;
  if (!active) return null;

  const pick = (index: number) => {
    setOrder((current) => {
      const next = [...current];
      const [chosen] = next.splice(index + 1, 1, current[0]!);
      next[0] = chosen!;
      return next;
    });
    setPlaying(true);
  };

  return (
    <div onPointerEnter={warmConnections} onFocus={warmConnections}>
      <div className="group rounded-card bg-night relative aspect-video overflow-hidden">
        {playing ? (
          <iframe
            key={active.id}
            src={`https://www.youtube-nocookie.com/embed/${active.id}?autoplay=1&rel=0&playsinline=1`}
            title={`${active.title} — ${active.note}`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            data-cursor="Play"
            className="absolute inset-0 block size-full cursor-pointer text-left"
          >
            <span className="sr-only">Play {active.title}</span>
            <Image
              src={`/music/${active.id}.jpg`}
              alt=""
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
            />
            <span
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent"
            />
            <span
              aria-hidden="true"
              className="bg-create text-on-world absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-lg transition-transform duration-300 group-hover:scale-110 md:size-20"
            >
              <svg viewBox="0 0 24 24" className="ml-1 size-7 md:size-8" fill="currentColor">
                <path d={PLAY_PATH} />
              </svg>
            </span>
            <span
              aria-hidden="true"
              className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5 text-white md:p-6"
            >
              <span className="min-w-0">
                <span className="block truncate text-xl font-medium md:text-2xl">
                  {active.title}
                  {active.bangla && (
                    <span lang="bn" className="ml-2 font-normal text-white/70">
                      {active.bangla}
                    </span>
                  )}
                </span>
                <span className="block text-sm text-white/75">{active.note}</span>
              </span>
              <span className="rounded-pill shrink-0 bg-white/15 px-3 py-1 text-sm font-semibold backdrop-blur">
                {active.views} views
              </span>
            </span>
          </button>
        )}
      </div>

      {more.length > 0 && (
        <ul className="mt-4 grid grid-cols-2 gap-3">
          {more.map((video, i) => (
            <li key={video.id}>
              <button
                type="button"
                onClick={() => pick(i)}
                className="group border-ink/10 bg-paper hover:border-ink/25 flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-2 pr-3 text-left transition-colors"
              >
                <span className="relative aspect-video w-20 shrink-0 overflow-hidden rounded-xl sm:w-24">
                  <Image
                    src={`/music/${video.id}.jpg`}
                    alt=""
                    fill
                    sizes="96px"
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <span
                    aria-hidden="true"
                    className="absolute inset-0 grid place-items-center bg-black/25 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <svg viewBox="0 0 24 24" className="ml-0.5 size-5" fill="currentColor">
                      <path d={PLAY_PATH} />
                    </svg>
                  </span>
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-medium group-hover:underline">
                    {video.title}
                  </span>
                  <span className="text-ink-soft block truncate text-sm">{video.note}</span>
                </span>
                <span className="sr-only">(play here)</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
