'use client';

import { Icon } from '@shimanto/ui';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { NowBuildingChip, OnlineSinceChip, Sparkle } from '@/components/home/portrait';
import { home } from '@/content/home';
import { site } from '@/lib/site';
import lensHd from '../../../public/me/lens-hd.webp';
import lens from '../../../public/me/lens.webp';

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
/** Where Shimanto sits in the fisheye frame (fraction of the lens): button zooms aim here. */
const SUBJECT = { x: 0.5, y: 0.44 };
/** The view the lens opens on: zoomed in on Shimanto, his face a little up and right of centre. */
const DEFAULT_VIEW = { z: 2.9, x: 0.62 - SUBJECT.x * 2.9, y: 0.36 - SUBJECT.y * 2.9 };

/** Pan, zoom, and (at rest) a slight look-around, driven by CSS variables the effect sets. */
const VIEW_TRANSFORM =
  'translate(calc(var(--tx) - var(--rest) * 3% - var(--look-x) * var(--rest) * 2.5%), calc(var(--ty) - var(--rest) * 3% - var(--look-y) * var(--rest) * 2.5%)) scale(var(--z)) scale(calc(1 + var(--rest) * 0.06))';

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Home hero visual: the fisheye room shot as a glass lens you can zoom into. Disciplines orbit it
 * as ring text.
 * Zoom like a map: the wheel over the lens zooms toward the cursor (zoomed all the way out, the
 * wheel scrolls the page as usual), drag pans, double-click zooms in or resets, and the −/+ pill
 * works for touch and keyboard. At rest the cursor lets you look around inside the lens.
 * The lens carries data-hero-orbit (its centre and radius) so the page background can wrap
 * its glow around the rim.
 */
export function HeroLens() {
  const root = useRef<HTMLDivElement>(null);
  const glass = useRef<HTMLDivElement>(null);
  /** Imperative zoom API for the buttons, set up by the effect. */
  const api = useRef<{ zoomBy: (factor: number) => void; reset: () => void } | null>(null);
  const [level, setLevel] = useState(DEFAULT_VIEW.z);
  // The default view is zoomed, so the full-resolution frame is needed from the start.
  const [used, setUsed] = useState(true);
  const [hdReady, setHdReady] = useState(false);

  useEffect(() => {
    const el = root.current;
    const lensEl = glass.current;
    if (!el || !lensEl) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;
    // Current and target view: zoom z, and the image's top-left offset t (fractions of the lens),
    // so a lens point p shows at t + p * z.
    const view = { ...DEFAULT_VIEW };
    const goal = { ...DEFAULT_VIEW };
    const look = { x: 0, y: 0, tx: 0, ty: 0 };
    let shown = DEFAULT_VIEW.z;

    const fit = () => {
      goal.z = clamp(goal.z, MIN_ZOOM, MAX_ZOOM);
      goal.x = clamp(goal.x, 1 - goal.z, 0);
      goal.y = clamp(goal.y, 1 - goal.z, 0);
    };
    /** Zoom by a factor, keeping the lens point under (cx, cy) where it is. */
    const zoomAt = (factor: number, cx: number, cy: number) => {
      const z = clamp(goal.z * factor, MIN_ZOOM, MAX_ZOOM);
      const px = (cx - goal.x) / goal.z;
      const py = (cy - goal.y) / goal.z;
      goal.z = z;
      goal.x = cx - px * z;
      goal.y = cy - py * z;
      fit();
      setUsed(true);
      schedule();
    };

    const update = () => {
      frame = 0;
      const k = reduced.matches ? 1 : 0.2;
      view.z += (goal.z - view.z) * k;
      view.x += (goal.x - view.x) * k;
      view.y += (goal.y - view.y) * k;
      look.x += (look.tx - look.x) * 0.12;
      look.y += (look.ty - look.y) * 0.12;
      // Look-around only at rest; once zoomed, the view stays where it was put.
      const rest = clamp(1 - (view.z - 1) * 4, 0, 1);
      el.style.setProperty('--z', view.z.toFixed(4));
      el.style.setProperty('--tx', `${(view.x * 100).toFixed(3)}%`);
      el.style.setProperty('--ty', `${(view.y * 100).toFixed(3)}%`);
      el.style.setProperty('--rest', rest.toFixed(3));
      el.style.setProperty('--look-x', look.x.toFixed(4));
      el.style.setProperty('--look-y', look.y.toFixed(4));
      const rounded = Math.round(goal.z * 10) / 10;
      if (rounded !== shown) {
        shown = rounded;
        setLevel(rounded);
      }
      const moving =
        Math.abs(goal.z - view.z) > 0.0005 ||
        Math.abs(goal.x - view.x) > 0.0005 ||
        Math.abs(goal.y - view.y) > 0.0005 ||
        Math.abs(look.tx - look.x) > 0.001 ||
        Math.abs(look.ty - look.y) > 0.001;
      if (moving) schedule();
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };

    const local = (clientX: number, clientY: number) => {
      const rect = lensEl.getBoundingClientRect();
      return { x: (clientX - rect.left) / rect.width, y: (clientY - rect.top) / rect.height };
    };

    const onWheel = (e: WheelEvent) => {
      const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1);
      // Fully zoomed out and scrolling down: leave the wheel to the page.
      if (delta > 0 && goal.z <= MIN_ZOOM + 0.001) return;
      if (delta < 0 && goal.z >= MAX_ZOOM - 0.001) return;
      e.preventDefault();
      const p = local(e.clientX, e.clientY);
      zoomAt(Math.exp(-delta * 0.0018), p.x, p.y);
    };

    let drag: { id: number; x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (goal.z <= MIN_ZOOM + 0.001 || e.button !== 0) return;
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      lensEl.setPointerCapture(e.pointerId);
      lensEl.style.cursor = 'grabbing';
    };
    const onDrag = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const rect = lensEl.getBoundingClientRect();
      goal.x += (e.clientX - drag.x) / rect.width;
      goal.y += (e.clientY - drag.y) / rect.height;
      drag.x = e.clientX;
      drag.y = e.clientY;
      fit();
      schedule();
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      lensEl.style.cursor = '';
    };
    const onDouble = (e: MouseEvent) => {
      const p = local(e.clientX, e.clientY);
      // Toggle between the whole room and a close-up of the clicked spot.
      if (goal.z > 1.5) {
        goal.z = 1;
        goal.x = 0;
        goal.y = 0;
        schedule();
      } else zoomAt(DEFAULT_VIEW.z / goal.z, p.x, p.y);
    };
    const onLook = (e: PointerEvent) => {
      if (e.pointerType === 'touch' || reduced.matches) return;
      const rect = el.getBoundingClientRect();
      look.tx = clamp(((e.clientX - rect.left) / rect.width - 0.5) * 2, -1, 1);
      look.ty = clamp(((e.clientY - rect.top) / rect.height - 0.5) * 2, -1, 1);
      schedule();
    };

    api.current = {
      zoomBy: (factor) => zoomAt(factor, SUBJECT.x, SUBJECT.y),
      reset: () => {
        Object.assign(goal, DEFAULT_VIEW);
        schedule();
      },
    };

    lensEl.addEventListener('wheel', onWheel, { passive: false });
    lensEl.addEventListener('pointerdown', onDown);
    lensEl.addEventListener('pointermove', onDrag);
    lensEl.addEventListener('pointerup', onUp);
    lensEl.addEventListener('pointercancel', onUp);
    lensEl.addEventListener('dblclick', onDouble);
    window.addEventListener('pointermove', onLook, { passive: true });
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      api.current = null;
      lensEl.removeEventListener('wheel', onWheel);
      lensEl.removeEventListener('pointerdown', onDown);
      lensEl.removeEventListener('pointermove', onDrag);
      lensEl.removeEventListener('pointerup', onUp);
      lensEl.removeEventListener('pointercancel', onUp);
      lensEl.removeEventListener('dblclick', onDouble);
      window.removeEventListener('pointermove', onLook);
    };
  }, []);

  const ring = `${home.hero.marquee.join(' · ')} · `;
  const zoomed = level > 1.05;

  return (
    <div
      ref={root}
      className="lens-in relative mx-auto aspect-square w-full max-w-[680px]"
      style={
        {
          '--z': DEFAULT_VIEW.z,
          '--tx': `${DEFAULT_VIEW.x * 100}%`,
          '--ty': `${DEFAULT_VIEW.y * 100}%`,
          '--rest': 0,
          '--look-x': 0,
          '--look-y': 0,
        } as React.CSSProperties
      }
    >
      {/* Ring text: the disciplines, turning slowly around the lens. */}
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        className="lens-ring text-ink-soft absolute -inset-[7%] size-[114%]"
      >
        <defs>
          <path id="lens-ring-path" d="M100,100 m-92,0 a92,92 0 1,1 184,0 a92,92 0 1,1 -184,0" />
        </defs>
        <text className="fill-current font-mono text-[6.4px] tracking-[0.32em] uppercase">
          <textPath href="#lens-ring-path" textLength="575">
            {ring}
            {ring}
          </textPath>
        </text>
      </svg>

      {/* The lens itself. Zoom, pan and look-around come from the CSS variables set above. */}
      <div
        ref={glass}
        data-hero-orbit="0.5,0.5,0.5"
        data-no-lightbox
        data-cursor={zoomed ? 'Drag' : 'Zoom'}
        className={`absolute inset-[4%] touch-pan-y overflow-hidden rounded-full shadow-[0_40px_90px_-30px_rgb(0_0_0/0.8)] ring-1 ring-white/10 select-none ${zoomed ? 'cursor-grab' : 'cursor-zoom-in'}`}
      >
        <Image
          src={lens}
          alt={`${site.name} kicking back in his room, shot through a fisheye lens`}
          priority
          placeholder="blur"
          draggable={false}
          sizes="(min-width: 1024px) 600px, 92vw"
          className="size-full origin-top-left object-cover will-change-transform"
          style={{ transform: VIEW_TRANSFORM }}
        />
        {/* The full-resolution frame, fetched only once someone starts zooming, over the base. */}
        {used && (
          <Image
            src={lensHd}
            alt=""
            unoptimized
            draggable={false}
            onLoad={() => setHdReady(true)}
            className={`absolute inset-0 size-full origin-top-left object-cover transition-opacity duration-500 will-change-transform ${hdReady ? 'opacity-100' : 'opacity-0'}`}
            style={{ transform: VIEW_TRANSFORM }}
          />
        )}

        {/* Glass: a soft highlight up top and a darker rim, so it reads as a sphere. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background:
              'radial-gradient(60% 45% at 32% 18%, rgb(255 255 255 / 0.22), transparent 60%), radial-gradient(closest-side, transparent 78%, rgb(0 0 0 / 0.45))',
          }}
        />
      </div>

      {/* Zoom controls for touch and keyboard; the level resets to the default view. */}
      <div className="bg-night/70 text-cream absolute bottom-[1%] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1 rounded-full p-1 shadow-lg ring-1 ring-white/15 backdrop-blur-xl">
        <button
          type="button"
          aria-label="Zoom out"
          disabled={!zoomed}
          onClick={() => api.current?.zoomBy(1 / 1.6)}
          className="grid size-8 place-items-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-35"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            −
          </span>
        </button>
        <button
          type="button"
          onClick={() => api.current?.reset()}
          aria-label="Back to the default view"
          className="min-w-[4.5rem] rounded-full px-2 font-mono text-xs tabular-nums transition-colors hover:bg-white/10 disabled:hover:bg-transparent"
        >
          {level.toFixed(1)}×
        </button>
        <button
          type="button"
          aria-label="Zoom in"
          disabled={level >= MAX_ZOOM - 0.05}
          onClick={() => api.current?.zoomBy(1.6)}
          className="grid size-8 place-items-center rounded-full transition-colors hover:bg-white/10 disabled:opacity-35"
        >
          <Icon name="plus" className="size-4" />
        </button>
      </div>

      {/* Facts and doodles around the lens. */}
      <div className="art-float absolute top-[8%] -left-[4%] sm:-left-[12%]">
        <OnlineSinceChip />
      </div>
      <div
        className="art-float absolute -right-[2%] bottom-[10%] sm:-right-[8%]"
        style={{ animationDelay: '-2.5s' }}
      >
        <NowBuildingChip />
      </div>
      <span
        aria-hidden="true"
        className="text-ink-soft absolute -top-[7%] -right-[12%] hidden rotate-[8deg] font-mono text-xs tracking-wide sm:block"
        style={{ opacity: 'var(--rest)' }}
      >
        that&apos;s me, in there
      </span>
      {/* A hand-drawn arrow from the note, over the glass, to Shimanto in the room (hidden while
          zoomed, when it would point at the wrong spot). A dark underlay keeps the cream line
          readable on the photo and on either theme's canvas. */}
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 hidden size-full overflow-visible sm:block"
        style={{ opacity: 'var(--rest)' }}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {['rgb(0 0 0 / 0.45)', '#f3efe4'].map((stroke, i) => (
          <g
            key={stroke}
            stroke={stroke}
            strokeWidth={i === 0 ? 0.6 : 0.28}

            className="lens-arrow"
          >
            <path d="M93 -2C91 13 78 22 52 40" pathLength={1} />
            <path d="M56.5 39.6 52 40 53.9 35.9" pathLength={1} />
          </g>
        ))}
      </svg>
      <Sparkle className="art-float fill-spark absolute -top-[2%] left-[22%] size-6" />
      <Sparkle className="art-float art-float-slow fill-idea absolute top-[46%] -right-[5%] size-4" />
      <Sparkle className="art-float fill-signal absolute bottom-[2%] left-[8%] size-3.5" />
    </div>
  );
}
