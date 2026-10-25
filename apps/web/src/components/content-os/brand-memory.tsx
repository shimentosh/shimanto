'use client';

/* eslint-disable @next/next/no-img-element -- pre-sized renders and brand logos */
import { BrandMark, Icon, type IconName, cn, usePrefersReducedMotion } from '@shimanto/ui';
import { useEffect, useRef, useState } from 'react';
import { SocialIcon } from '@/components/page/social-icon';
import type { ContentOsCopy } from '@/content/content-os';
import type { OutputMedia } from '@/content/content-os/types';
import { AutoVideo } from './media';

type Memory = ContentOsCopy['memory'];
type Brand = Memory['brands'][number];

/** A real output, ready to show: a fan of slides, an image or a video. */
export type OutputAsset =
  | { kind: 'stack'; images: string[] }
  | { kind: 'image'; src: string }
  | { kind: 'video'; video: string; poster: string; aspect: '9:16' | '16:9' };

/** Points on a sphere, evenly spread (Fibonacci lattice). */
function sphere(n: number): Array<[number, number, number]> {
  const golden = Math.PI * (3 - Math.sqrt(5));
  return Array.from({ length: n }, (_, i) => {
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const a = golden * i;
    return [Math.cos(a) * r, y, Math.sin(a) * r];
  });
}

const hexToRgb = (hex: string): [number, number, number] => {
  const n = Number.parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i]! - v) * t);

/** Three tilted orbits for the context categories: radius, tilt (x), tilt (z), speed. */
const RINGS = [
  { radius: 1.85, tiltX: 1.15, tiltZ: 0.25, speed: 0.16 },
  { radius: 2.2, tiltX: 1.35, tiltZ: -0.55, speed: -0.11 },
  { radius: 2.55, tiltX: 0.95, tiltZ: 0.9, speed: 0.08 },
];

/** Rotate a point around x then z (a ring's tilt). */
function tilt(x: number, y: number, z: number, ax: number, az: number) {
  const y1 = y * Math.cos(ax) - z * Math.sin(ax);
  const z1 = y * Math.sin(ax) + z * Math.cos(ax);
  return [x * Math.cos(az) - y1 * Math.sin(az), x * Math.sin(az) + y1 * Math.cos(az), z1] as const;
}

/** One real output as a small card the stream flows into. */
function OutputCard({ label, asset }: { label: string; asset: OutputAsset }) {
  const frame = 'rounded-[10px] shadow-xl shadow-black/50 ring-1 ring-white/15';
  return (
    <figure className="w-[84px] sm:w-[120px]">
      {asset.kind === 'stack' ? (
        <div className="relative aspect-[4/5]">
          {asset.images.slice(0, 3).map((src, i, all) => {
            const back = all.length - 1 - i;
            return (
              <img
                key={src}
                src={src}
                alt=""
                className={cn('absolute inset-0 size-full object-cover', frame)}
                style={{ transform: `translateX(${back * 8}px) rotate(${back * 6}deg)`, zIndex: i }}
              />
            );
          })}
        </div>
      ) : asset.kind === 'image' ? (
        <img src={asset.src} alt="" className={cn('aspect-[4/5] w-full object-cover', frame)} />
      ) : (
        <div
          className={cn(
            'relative overflow-hidden bg-black',
            frame,
            asset.aspect === '16:9' ? 'aspect-video' : 'mx-auto aspect-[9/16] w-[62px] sm:w-[92px]',
          )}
        >
          <AutoVideo src={asset.video} poster={asset.poster} />
        </div>
      )}
      <figcaption className="mt-1.5 text-center text-[11px] font-medium text-[#F3EFE4] sm:text-xs">
        {label}
      </figcaption>
    </figure>
  );
}

/**
 * The brand brain: a glowing core of points in the page's colour, the context categories
 * orbiting it on three tilted rings and streaming into it, and finished work streaming out to the
 * page's real outputs. Drag to turn it (with inertia), the cursor pushes the points aside and
 * lights up nearby context, a click makes the core flare. Canvas 2D with a hand-rolled projection
 * (like the site's other visuals, no library); labels are HTML, positioned every frame. Pauses
 * offscreen and in hidden tabs; one still frame under reduced motion.
 */
function Brain({
  categories,
  outputs,
  color,
  accent,
  pulse,
  label,
  hint,
}: {
  categories: string[];
  outputs: Array<{ label: string; asset: OutputAsset }>;
  color: string;
  accent: string;
  /** Changes when the brand changes: the core flares. */
  pulse: number;
  label: string;
  hint: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<Array<HTMLSpanElement | null>>([]);
  const column = useRef<HTMLDivElement>(null);
  const cards = useRef<Array<HTMLDivElement | null>>([]);
  const reduced = usePrefersReducedMotion();
  const [dragging, setDragging] = useState(false);
  // Values the draw loop reads without re-rendering.
  const target = useRef({ color: hexToRgb(color), accent: hexToRgb(accent) });
  const current = useRef({ color: hexToRgb(color), accent: hexToRgb(accent), flare: 0 });
  const pointer = useRef({ x: 0, y: 0, inside: false });
  const view = useRef({
    yaw: 0,
    pitch: 0.35,
    vYaw: 0.25,
    vPitch: 0,
    drag: null as null | { x: number; y: number; moved: number },
  });

  useEffect(() => {
    target.current = { color: hexToRgb(color), accent: hexToRgb(accent) };
  }, [color, accent]);
  useEffect(() => {
    if (pulse > 0) current.current.flare = 1;
  }, [pulse]);

  useEffect(() => {
    const el = canvas.current;
    const box = wrap.current;
    const ctx = el?.getContext('2d');
    if (!el || !box || !ctx) return;

    const core = sphere(1100);
    const nodes = categories.map((_, i) => ({
      ring: RINGS[i % RINGS.length]!,
      phase: (i / categories.length) * Math.PI * 2 + (i % 3) * 0.7,
    }));
    const inflow = Array.from({ length: 80 }, (_, i) => ({
      node: i % nodes.length,
      t: Math.random(),
      speed: 0.25 + Math.random() * 0.35,
    }));
    const outflow = Array.from({ length: 48 }, (_, i) => ({
      out: i,
      t: Math.random(),
      speed: 0.3 + Math.random() * 0.3,
    }));

    let w = 0;
    let h = 0;
    let dpr = 1;
    const resize = () => {
      const r = box.getBoundingClientRect();
      w = r.width;
      h = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(w * dpr);
      el.height = Math.round(h * dpr);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    let visible = true;
    const io = new IntersectionObserver(([e]) => {
      visible = Boolean(e?.isIntersecting);
    });
    io.observe(box);

    const FOCAL = 6;
    let raf = 0;
    let last = performance.now();
    let time = 0;

    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!reduced) time += dt;
      const cur = current.current;
      const tgt = target.current;
      const v = view.current;
      const ptr = pointer.current;
      cur.color = mix(cur.color, tgt.color, Math.min(1, dt * 4)) as typeof cur.color;
      cur.accent = mix(cur.accent, tgt.accent, Math.min(1, dt * 4)) as typeof cur.accent;
      cur.flare = Math.max(0, cur.flare - dt * 1.2);

      // Turning: a drag sets the angle directly; let go, it glides and eases back to a slow spin.
      if (v.drag) {
        v.vYaw *= Math.max(0, 1 - dt * 10);
        v.vPitch *= Math.max(0, 1 - dt * 10);
      } else if (!reduced) {
        v.vYaw += (0.25 - v.vYaw) * Math.min(1, dt * 1.2);
        v.vPitch *= Math.max(0, 1 - dt * 3);
        v.yaw += v.vYaw * dt;
        v.pitch = Math.max(-0.9, Math.min(1.2, v.pitch + v.vPitch * dt));
      }

      // The brain fills the space left of the output cards.
      const col = column.current;
      const room = col ? col.offsetLeft : w * 0.78;
      const cx = room * 0.52;
      const cy = h * 0.48;
      const unit = Math.min(room * 0.85, h * 0.95) / 5.1;
      const cyaw = Math.cos(v.yaw);
      const syaw = Math.sin(v.yaw);
      const cp = Math.cos(v.pitch);
      const sp = Math.sin(v.pitch);
      const project = (x: number, y: number, z: number) => {
        const rx = x * cyaw - z * syaw;
        const rz = x * syaw + z * cyaw;
        const ty = y * cp - rz * sp;
        const tz = y * sp + rz * cp;
        const p = FOCAL / (FOCAL + tz);
        return { x: cx + rx * unit * p, y: cy + ty * unit * p, z: tz, p };
      };
      const ring = (i: number) => {
        const n = nodes[i]!;
        const a = n.phase + time * n.ring.speed;
        return tilt(
          Math.cos(a) * n.ring.radius,
          0,
          Math.sin(a) * n.ring.radius,
          n.ring.tiltX,
          n.ring.tiltZ,
        );
      };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const [r, g, b] = cur.color.map(Math.round) as [number, number, number];
      const [ar, ag, ab] = cur.accent.map(Math.round) as [number, number, number];

      // Halo behind the core.
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, unit * (2.6 + cur.flare * 1.4));
      halo.addColorStop(0, `rgba(${r},${g},${b},${0.3 + cur.flare * 0.35})`);
      halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Orbit paths, faint.
      ctx.lineWidth = 1;
      for (const rg of RINGS) {
        ctx.beginPath();
        for (let k = 0; k <= 72; k++) {
          const a = (k / 72) * Math.PI * 2;
          const [x, y, z] = tilt(
            Math.cos(a) * rg.radius,
            0,
            Math.sin(a) * rg.radius,
            rg.tiltX,
            rg.tiltZ,
          );
          const p = project(x, y, z);
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},0.18)`;
        ctx.stroke();
      }

      // The core: points breathing, brighter in front, pushed aside by the cursor.
      const breathe = 1.15 + Math.sin(time * 1.6) * 0.03 + cur.flare * 0.3;
      const reach = unit * 1.1;
      for (const [x, y, z] of core) {
        const wob = breathe * (1 + Math.sin(time * 2 + x * 4 + y * 3) * 0.04);
        const p = project(x * wob, y * wob, z * wob);
        let px = p.x;
        let py = p.y;
        if (ptr.inside) {
          const dx = px - ptr.x;
          const dy = py - ptr.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < reach * reach) {
            const d = Math.sqrt(d2) || 1;
            const push = (1 - d / reach) ** 2 * unit * 0.6;
            px += (dx / d) * push;
            py += (dy / d) * push;
          }
        }
        const depth = (1 - p.z) / 2; // 0 back … 1 front
        const size = (0.7 + depth * 1.5) * p.p;
        ctx.fillStyle = `rgba(${r},${g},${b},${0.14 + depth * 0.6})`;
        ctx.fillRect(px - size / 2, py - size / 2, size, size);
      }

      // Context nodes, lit up near the cursor, and their streams into the core.
      const nodeScreen = nodes.map((_, i) => {
        const world = ring(i);
        const p = project(world[0], world[1], world[2]);
        const near = ptr.inside ? Math.max(0, 1 - Math.hypot(p.x - ptr.x, p.y - ptr.y) / 90) : 0;
        return { ...p, world, near };
      });
      for (const f of inflow) {
        const n = nodeScreen[f.node]!;
        if (!reduced) f.t += dt * f.speed * (1 + n.near * 2);
        if (f.t > 1) f.t -= 1;
        const k = 1 - f.t * f.t;
        const p = project(n.world[0] * k, n.world[1] * k, n.world[2] * k);
        ctx.fillStyle = `rgba(${ar},${ag},${ab},${Math.sin(f.t * Math.PI) * 0.9})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.7 * p.p * (1 + n.near * 0.6), 0, Math.PI * 2);
        ctx.fill();
      }
      nodeScreen.forEach((p, i) => {
        const depth = Math.max(0, Math.min(1, (1 - p.z / 3) / 2));
        const radius = (10 + p.near * 16) * p.p;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        glow.addColorStop(0, `rgba(${ar},${ag},${ab},${0.5 + depth * 0.5})`);
        glow.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - radius, p.y - radius, radius * 2, radius * 2);
        const tag = labels.current[i];
        if (tag) {
          tag.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -150%) scale(${1 + p.near * 0.25})`;
          tag.style.opacity = String(Math.max(p.near, 0.3 + depth * 0.7));
          tag.style.zIndex = String(Math.round(depth * 20 + p.near * 20));
          tag.style.borderColor = p.near > 0.3 ? `rgb(${ar},${ag},${ab})` : '';
        }
      });

      // Finished work streaming out to the real outputs.
      const anchors = cards.current.flatMap((card) =>
        card && col
          ? [
              {
                x: col.offsetLeft + card.offsetLeft - 4,
                y: col.offsetTop + card.offsetTop + card.offsetHeight * 0.42,
              },
            ]
          : [],
      );
      if (anchors.length) {
        for (const f of outflow) {
          const a = anchors[f.out % anchors.length]!;
          if (!reduced) f.t += dt * f.speed;
          if (f.t > 1) f.t -= 1;
          const e = f.t * f.t * (3 - 2 * f.t);
          const mx = (cx + a.x) / 2;
          const my = (cy + a.y) / 2 - unit * 0.4;
          const x = (1 - e) * (1 - e) * cx + 2 * (1 - e) * e * mx + e * e * a.x;
          const y = (1 - e) * (1 - e) * cy + 2 * (1 - e) * e * my + e * e * a.y;
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.sin(f.t * Math.PI) * 0.95})`;
          ctx.beginPath();
          ctx.arc(x, y, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.globalCompositeOperation = 'source-over';

      if (reduced) return; // one still frame
      raf = requestAnimationFrame(loop);
    };
    const loop = (now: number) => {
      if (!visible || document.hidden) {
        last = now;
        raf = requestAnimationFrame(loop);
        return;
      }
      frame(now);
    };
    raf = requestAnimationFrame(reduced ? frame : loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  }, [categories, reduced]);

  const local = (e: React.PointerEvent) => {
    const r = wrap.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const endDrag = (e: React.PointerEvent) => {
    const v = view.current;
    // A click without a drag wakes the core up.
    if (v.drag && v.drag.moved < 6) current.current.flare = 1;
    v.drag = null;
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div>
      {/* Touch: vertical swipes still scroll the page, horizontal ones turn the brain */}
      <div
        ref={wrap}
        role="img"
        aria-label={label}
        className={cn(
          'relative h-[420px] w-full touch-pan-y overflow-hidden select-none sm:h-[540px]',
          dragging ? 'cursor-grabbing' : 'cursor-grab',
        )}
        onPointerDown={(e) => {
          view.current.drag = { ...local(e), moved: 0 };
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const p = local(e);
          pointer.current = { ...p, inside: e.pointerType === 'mouse' };
          const v = view.current;
          if (!v.drag) return;
          const dx = p.x - v.drag.x;
          const dy = p.y - v.drag.y;
          v.yaw += dx * 0.008;
          v.pitch = Math.max(-0.9, Math.min(1.2, v.pitch + dy * 0.006));
          v.vYaw = dx * 0.5;
          v.vPitch = dy * 0.36;
          v.drag = { ...p, moved: v.drag.moved + Math.abs(dx) + Math.abs(dy) };
        }}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={() => {
          pointer.current.inside = false;
        }}
      >
        <canvas ref={canvas} className="absolute inset-0 size-full" />
        {categories.map((name, i) => (
          <span
            key={name}
            ref={(el) => {
              labels.current[i] = el;
            }}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 rounded-full border border-white/15 bg-black/60 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-[#F3EFE4] backdrop-blur sm:text-[11px]"
          >
            {name}
          </span>
        ))}
        {/* The page's real outputs, where the stream lands */}
        <div
          ref={column}
          className="pointer-events-none absolute inset-y-0 right-0 flex flex-col justify-center gap-3 sm:right-2 sm:gap-4"
        >
          {outputs.map((o, i) => (
            <div
              key={`${o.label}-${i}`}
              ref={(el) => {
                cards.current[i] = el;
              }}
              aria-hidden="true"
              className="cos-rise"
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <OutputCard label={o.label} asset={o.asset} />
            </div>
          ))}
        </div>
      </div>
      <p className="text-ink-soft mt-2 flex items-center justify-center gap-2 text-sm">
        <Icon name="repeat" className="size-4" />
        {hint}
      </p>
    </div>
  );
}

const factIcon: Record<string, IconName> = {
  voice: 'mic',
  audience: 'users',
  pillars: 'layers',
  rule: 'shield',
  language: 'globe',
};

/** The page's own logo: a mark (switcher) or the full lockup (card). */
function BrandLogo({ logo, size }: { logo: Brand['logo']; size: 'mark' | 'full' }) {
  if (logo === 'dotmirror') {
    return size === 'mark' ? (
      <img src="/content-os/brands/dotmirror-mark.svg" alt="" className="size-6 rounded-[6px]" />
    ) : (
      <img src="/content-os/brands/dotmirror-logo.svg" alt="Dot Mirror" className="h-7 w-auto" />
    );
  }
  return size === 'mark' ? (
    <BrandMark className="size-6" />
  ) : (
    <span className="inline-flex items-center gap-2.5" aria-label="shimanto.xyz">
      <BrandMark className="size-8" />
      <span
        aria-hidden="true"
        className="font-logo text-[19px] leading-none font-bold tracking-[-0.045em] lowercase"
      >
        shimanto<span className="text-build">.</span>xyz
      </span>
    </span>
  );
}

/** The brand memory section: page switcher, what it knows about that page, and the brain. */
export function BrandMemory({
  memory,
  media,
}: {
  memory: Memory;
  media: Record<OutputMedia, OutputAsset>;
}) {
  const [active, setActive] = useState(0);
  const [pulse, setPulse] = useState(0);
  const brand: Brand = memory.brands[active]!;
  const accent = brand.colors[1] && brand.colors[1] !== '#FFFFFF' ? brand.colors[1] : '#9EC2FF';

  const facts = (['voice', 'audience', 'pillars', 'rule', 'language'] as const).flatMap((key) =>
    brand[key] ? [{ key, label: memory.labels[key], value: brand[key]! }] : [],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-center">
      <div>
        <p className="text-ink-soft text-sm font-medium">{memory.switchLabel}</p>
        <div className="mt-3 flex flex-wrap gap-2" role="group" aria-label={memory.switchLabel}>
          {memory.brands.map((b, i) => (
            <button
              key={b.id}
              type="button"
              aria-pressed={i === active}
              onClick={() => {
                setActive(i);
                setPulse((n) => n + 1);
              }}
              className={cn(
                'rounded-pill inline-flex items-center gap-2 py-1.5 pr-4 pl-1.5 text-sm font-medium ring-1 transition',
                i === active
                  ? 'bg-[#F3EFE4] text-[#0E0F0C] ring-transparent'
                  : 'text-ink-soft ring-white/15 hover:text-[#F3EFE4]',
              )}
            >
              <BrandLogo logo={b.logo} size="mark" />
              {b.name}
            </button>
          ))}
        </div>

        {/* What it knows about this page */}
        <div
          key={brand.id}
          className="cos-rise mt-6 rounded-[24px] bg-white/[0.03] p-5 ring-1 ring-white/10 md:p-6"
          aria-live="polite"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <BrandLogo logo={brand.logo} size="full" />
            <span className="text-ink-soft inline-flex items-center gap-2 text-sm">
              <SocialIcon platform={brand.platform} className="size-6 rounded-md" />
              {brand.handle}
            </span>
          </div>
          <dl className="mt-5 grid gap-3.5 text-[15px]">
            {facts.map((f) => (
              <div key={f.key} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className="grid size-8 shrink-0 place-items-center rounded-[10px]"
                  style={{ background: `${brand.colors[0]}26`, color: brand.colors[0] }}
                >
                  <Icon name={factIcon[f.key]!} className="size-4" />
                </span>
                <div className="min-w-0">
                  <dt className="text-ink-soft text-xs">{f.label}</dt>
                  <dd className="leading-snug">{f.value}</dd>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap gap-x-8 gap-y-3 border-t border-white/10 pt-4">
              <div>
                <dt className="text-ink-soft text-xs">{memory.labels.colours}</dt>
                <dd className="mt-1.5 flex gap-1.5">
                  {brand.colors.map((c) => (
                    <span
                      key={c}
                      title={c}
                      className="size-6 rounded-full ring-1 ring-white/20"
                      style={{ background: c }}
                    />
                  ))}
                </dd>
              </div>
              <div>
                <dt className="text-ink-soft text-xs">{memory.labels.fonts}</dt>
                <dd className="mt-1.5">{brand.fonts}</dd>
              </div>
            </div>
          </dl>
        </div>
        <p className="text-ink-soft mt-4 text-sm">{memory.note}</p>
      </div>

      <Brain
        categories={memory.categories}
        outputs={brand.outputs.map((o) => ({ label: o.label, asset: media[o.media] }))}
        color={brand.colors[0]!}
        accent={accent}
        pulse={pulse}
        label={memory.visualLabel}
        hint={memory.hint}
      />
    </div>
  );
}
