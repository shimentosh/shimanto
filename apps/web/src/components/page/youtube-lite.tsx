'use client';

import { cn } from '@shimanto/ui';
import Image from 'next/image';
import { useState } from 'react';

/**
 * Click-to-play YouTube: a thumbnail and a play button until pressed, then the privacy-enhanced
 * (youtube-nocookie) player, autoplaying. Nothing from YouTube loads before the click except the
 * thumbnail, which next/image proxies.
 */
export function YouTubeLite({
  id,
  title,
  priority = false,
  className,
}: {
  id: string;
  title: string;
  priority?: boolean;
  className?: string;
}) {
  const [playing, setPlaying] = useState(false);

  return (
    <div
      className={cn(
        'group bg-night ring-ink/10 relative aspect-video overflow-hidden rounded-2xl ring-1',
        className,
      )}
    >
      {playing ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 size-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 size-full cursor-pointer"
        >
          <span className="sr-only">Play {title}</span>
          <Image
            src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
            alt=""
            fill
            priority={priority}
            sizes="(min-width: 1024px) 760px, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"
          />
          <span
            aria-hidden="true"
            className="bg-create text-on-world absolute top-1/2 left-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full shadow-xl transition-transform duration-300 group-hover:scale-110"
          >
            <svg viewBox="0 0 24 24" className="ml-1 size-6" fill="currentColor">
              <path d="M7 4.5v15a1 1 0 0 0 1.5.86l12-7.5a1 1 0 0 0 0-1.72l-12-7.5A1 1 0 0 0 7 4.5Z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );
}
