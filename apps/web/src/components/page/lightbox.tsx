'use client';

import { Icon } from '@shimanto/ui';
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Site-wide lightbox. One delegated click listener opens any image or video inside <main> full
 * screen, with every other eligible one on the page as a gallery (arrows, swipe, Esc). Nothing has
 * to opt in. Media is skipped when it already does something on click (inside a link or button,
 * or a playable <video controls>), when it's decorative (aria-hidden, empty alt), when it's tiny
 * (logos, avatars), or when an ancestor carries `data-no-lightbox`.
 */

type Item = { kind: 'image' | 'video'; src: string; alt: string; poster?: string };

const MIN_SIZE = 120;
const SKIP = 'a, button, [role="button"], label, [data-no-lightbox], [aria-hidden="true"]';

function eligible(el: Element): el is HTMLImageElement | HTMLVideoElement {
  if (!(el instanceof HTMLImageElement || el instanceof HTMLVideoElement)) return false;
  if (!el.closest('main') || el.closest(SKIP)) return false;
  if (el instanceof HTMLImageElement && el.getAttribute('alt') === '') return false;
  if (el instanceof HTMLVideoElement && el.controls) return false;
  const box = el.getBoundingClientRect();
  return box.width >= MIN_SIZE && box.height >= MIN_SIZE;
}

/** The biggest candidate in srcset, so next/image's 640px variant isn't blown up to fill the screen. */
function largestSrc(img: HTMLImageElement) {
  const candidates = img.srcset
    .split(/,\s+/)
    .map((part) => {
      const [url, size = '1x'] = part.trim().split(/\s+/);
      return { url, size: parseFloat(size) || 1 };
    })
    .filter((c) => c.url);
  if (!candidates.length) return img.currentSrc || img.src;
  return candidates.reduce((a, b) => (b.size > a.size ? b : a)).url!;
}

function toItem(el: HTMLImageElement | HTMLVideoElement): Item {
  if (el instanceof HTMLImageElement) {
    return { kind: 'image', src: largestSrc(el), alt: el.alt };
  }
  return {
    kind: 'video',
    src: el.currentSrc || el.src,
    alt: el.getAttribute('aria-label') ?? el.title ?? '',
    poster: el.poster || undefined,
  };
}

/** Same picture twice (e.g. a blur-up base under an HD layer) should be one gallery entry. */
function collect() {
  const seen = new Set<string>();
  const els: (HTMLImageElement | HTMLVideoElement)[] = [];
  for (const el of document.querySelectorAll('main img, main video')) {
    if (!eligible(el)) continue;
    const key = el instanceof HTMLImageElement ? largestSrc(el) : el.currentSrc || el.src;
    if (seen.has(key)) continue;
    seen.add(key);
    els.push(el);
  }
  return els;
}

export function Lightbox() {
  const dialog = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (step: number) => setIndex((i) => (i + step + items.length) % items.length),
    [items.length],
  );
  const close = useCallback(() => dialog.current?.close(), []);

  // Open on click, and mark what's clickable so it gets a zoom cursor.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
      const target = (event.target as Element | null)?.closest('img, video');
      if (!target || !eligible(target)) return;
      event.preventDefault();
      const els = collect();
      const at = Math.max(0, els.indexOf(target));
      setItems((els.length ? els : [target]).map(toItem));
      setIndex(at);
      dialog.current?.showModal();
    };
    const onOver = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (
        (target instanceof HTMLImageElement || target instanceof HTMLVideoElement) &&
        eligible(target)
      ) {
        target.style.cursor = 'zoom-in';
      }
    };
    document.addEventListener('click', onClick);
    document.addEventListener('pointerover', onOver);
    return () => {
      document.removeEventListener('click', onClick);
      document.removeEventListener('pointerover', onOver);
    };
  }, []);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') go(1);
      if (event.key === 'ArrowLeft') go(-1);
    };
    // Lock page scroll while open; the native dialog handles focus trapping and Esc.
    const onClose = () => {
      document.documentElement.style.overflow = '';
      setItems([]);
    };
    const observer = new MutationObserver(() => {
      if (el.open) document.documentElement.style.overflow = 'hidden';
    });
    observer.observe(el, { attributes: true, attributeFilter: ['open'] });
    el.addEventListener('keydown', onKey);
    el.addEventListener('close', onClose);
    return () => {
      observer.disconnect();
      el.removeEventListener('keydown', onKey);
      el.removeEventListener('close', onClose);
    };
  }, [go]);

  const item = items[index];
  const many = items.length > 1;

  return (
    <dialog
      ref={dialog}
      aria-label="Media preview"
      className="lightbox fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 text-white backdrop:bg-black/85 backdrop:backdrop-blur-sm"
      onClick={(event) => {
        // Clicking the dim area (anything that isn't the media or a control) closes it.
        if (!(event.target as Element).closest('img, video, button')) close();
      }}
      onTouchStart={(event) => (touchX.current = event.touches[0]?.clientX ?? null)}
      onTouchEnd={(event) => {
        const start = touchX.current;
        const end = event.changedTouches[0]?.clientX;
        touchX.current = null;
        if (!many || start == null || end == null || Math.abs(end - start) < 50) return;
        go(end < start ? 1 : -1);
      }}
    >
      {item && (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-4 pt-16 pb-6 md:px-20">
          <div className="flex min-h-0 w-full flex-1 items-center justify-center">
            {item.kind === 'image' ? (
              // A plain <img>: the source is already an optimized URL picked off the page.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.src}
                src={item.src}
                alt={item.alt}
                className="lightbox-media max-h-full max-w-full rounded-lg object-contain shadow-2xl"
              />
            ) : (
              <video
                key={item.src}
                src={item.src}
                poster={item.poster}
                aria-label={item.alt || undefined}
                controls
                autoPlay
                playsInline
                className="lightbox-media max-h-full max-w-full rounded-lg shadow-2xl"
              />
            )}
          </div>
          {(item.alt || many) && (
            <p className="max-w-3xl text-center text-sm text-white/75">
              {many && (
                <span className="mr-2 font-mono text-white/50 tabular-nums">
                  {index + 1} / {items.length}
                </span>
              )}
              {item.alt}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={close}
        aria-label="Close preview"
        className="fixed top-4 right-4 grid size-11 place-items-center rounded-full bg-white/10 transition hover:bg-white/20"
      >
        <Icon name="x" className="size-5" />
      </button>
      {many && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous"
            className="fixed top-1/2 left-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 md:grid"
          >
            <Icon name="arrowLeft" className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next"
            className="fixed top-1/2 right-3 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/10 transition hover:bg-white/20 md:grid"
          >
            <Icon name="arrowRight" className="size-5" />
          </button>
        </>
      )}
    </dialog>
  );
}
