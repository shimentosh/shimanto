'use client';

import { Icon, type IconName, cn, usePrefersReducedMotion } from '@shimanto/ui';
import { useEffect, useRef, useState } from 'react';
import { SocialIcon } from '@/components/page/social-icon';
import type { ContentOsCopy } from '@/content/content-os';

type Memory = ContentOsCopy['memory'];
type Brand = Memory['brands'][number];

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

/** Dark or light text, whichever reads on this colour. */
const textOn = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.35 ? '#0E0F0C' : '#FFFFFF';
};

/** Three tilted orbits for the context categories: radius, tilt (x), tilt (z), speed. */
const RINGS = [
  { radius: 2.05, tiltX: 1.15, tiltZ: 0.25, speed: 0.16 },
  { radius: 2.45, tiltX: 1.35, tiltZ: -0.55, speed: -0.11 },
  { radius: 2.85, tiltX: 0.95, tiltZ: 0.9, speed: 0.08 },
];

/**
 * The brand brain: a glowing core of points in the page's colour, the context categories
 * orbiting it on three tilted rings and streaming into it, and finished work streaming out to
 * the outputs. Canvas 2D with a hand-rolled projection (like the site's other visuals, no
 * library); labels are HTML, positioned every frame. Pauses offscreen and in hidden tabs; one
 * still frame under reduced motion.
 */
function Brain({
  categories,
  outputs,
  color,
  accent,
  pulse,
  label,
}: {
  categories: string[];
  outputs: string[];
  color: string;
  accent: string;
  /** Changes when the brand changes: the core flares. */
  pulse: number;
  label: string;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const labels = useRef<Array<HTMLSpanElement | null>>([]);
  const outs = useRef<Array<HTMLSpanElement | null>>([]);
  const reduced = usePrefersReducedMotion();
  // Animated values the draw loop reads without re-rendering.
  const target = useRef({ color: hexToRgb(color), accent: hexToRgb(accent) });
  const current = useRef({ color: hexToRgb(color), accent: hexToRgb(accent), flare: 0 });

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

    const core = sphere(900);
    const nodes = categories.map((_, i) => ({
      ring: RINGS[i % RINGS.length]!,
      phase: (i / categories.length) * Math.PI * 2 + (i % 3) * 0.7,
    }));
    // Context flowing in (node → core) and work flowing out (core → output).
    const inflow = Array.from({ length: 70 }, (_, i) => ({
      node: i % nodes.length,
      t: Math.random(),
      speed: 0.25 + Math.random() * 0.35,
    }));
    const outflow = Array.from({ length: 30 }, (_, i) => ({
      out: i % outputs.length,
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
      cur.color = mix(cur.color, tgt.color, Math.min(1, dt * 4)) as typeof cur.color;
      cur.accent = mix(cur.accent, tgt.accent, Math.min(1, dt * 4)) as typeof cur.accent;
      cur.flare = Math.max(0, cur.flare - dt * 1.2);

      // Core on the left two thirds; outputs on the right edge.
      const cx = w * 0.42;
      const cy = h * 0.5;
      const unit = Math.min(w * 0.62, h) / 6.6;
      const spin = time * 0.25;
      const cos = Math.cos(spin);
      const sin = Math.sin(spin);
      const project = (x: number, y: number, z: number) => {
        // Spin around y, then a slight forward tilt.
        const rx = x * cos - z * sin;
        const rz = x * sin + z * cos;
        const ty = y * Math.cos(0.35) - rz * Math.sin(0.35);
        const tz = y * Math.sin(0.35) + rz * Math.cos(0.35);
        const p = FOCAL / (FOCAL + tz);
        return { x: cx + rx * unit * p, y: cy + ty * unit * p, z: tz, p };
      };
      const ring = (i: number) => {
        const n = nodes[i]!;
        const a = n.phase + time * n.ring.speed;
        // A circle on the ring's plane, tilted about x then z.
        let x = Math.cos(a) * n.ring.radius;
        let y = 0;
        let z = Math.sin(a) * n.ring.radius;
        const y1 = y * Math.cos(n.ring.tiltX) - z * Math.sin(n.ring.tiltX);
        const z1 = y * Math.sin(n.ring.tiltX) + z * Math.cos(n.ring.tiltX);
        y = y1;
        z = z1;
        const x2 = x * Math.cos(n.ring.tiltZ) - y * Math.sin(n.ring.tiltZ);
        const y2 = x * Math.sin(n.ring.tiltZ) + y * Math.cos(n.ring.tiltZ);
        x = x2;
        y = y2;
        return [x, y, z] as const;
      };

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'lighter';
      const [r, g, b] = cur.color.map(Math.round) as [number, number, number];
      const [ar, ag, ab] = cur.accent.map(Math.round) as [number, number, number];

      // Halo behind the core.
      const halo = ctx.createRadialGradient(cx, cy, 0, cx, cy, unit * (2.4 + cur.flare));
      halo.addColorStop(0, `rgba(${r},${g},${b},${0.32 + cur.flare * 0.3})`);
      halo.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, w, h);

      // Orbit paths, faint.
      ctx.lineWidth = 1;
      for (const rg of RINGS) {
        ctx.beginPath();
        for (let k = 0; k <= 64; k++) {
          const a = (k / 64) * Math.PI * 2;
          let x = Math.cos(a) * rg.radius;
          let y = 0;
          let z = Math.sin(a) * rg.radius;
          const y1 = y * Math.cos(rg.tiltX) - z * Math.sin(rg.tiltX);
          z = y * Math.sin(rg.tiltX) + z * Math.cos(rg.tiltX);
          y = y1;
          const x2 = x * Math.cos(rg.tiltZ) - y * Math.sin(rg.tiltZ);
          y = x * Math.sin(rg.tiltZ) + y * Math.cos(rg.tiltZ);
          x = x2;
          const p = project(x, y, z);
          if (k === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.strokeStyle = `rgba(${r},${g},${b},0.16)`;
        ctx.stroke();
      }

      // The core: points breathing, brighter in front.
      const breathe = 1 + Math.sin(time * 1.6) * 0.03 + cur.flare * 0.25;
      for (const [x, y, z] of core) {
        const wob = 1 + Math.sin(time * 2 + x * 4 + y * 3) * 0.04;
        const p = project(x * breathe * wob, y * breathe * wob, z * breathe * wob);
        const depth = (1 - p.z) / 2; // 0 back … 1 front
        const size = (0.6 + depth * 1.4) * p.p;
        ctx.fillStyle = `rgba(${r},${g},${b},${0.12 + depth * 0.55})`;
        ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      }

      // Context nodes and their streams into the core.
      const nodeScreen = nodes.map((_, i) => {
        const [x, y, z] = ring(i);
        return { ...project(x, y, z), world: [x, y, z] as const };
      });
      for (const f of inflow) {
        f.t += dt * f.speed * (reduced ? 0 : 1);
        if (f.t > 1) f.t -= 1;
        const [x, y, z] = nodeScreen[f.node]!.world;
        const k = 1 - f.t * f.t; // accelerate into the core
        const p = project(x * k, y * k, z * k);
        const alpha = Math.sin(f.t * Math.PI) * 0.9;
        ctx.fillStyle = `rgba(${ar},${ag},${ab},${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.6 * p.p, 0, Math.PI * 2);
        ctx.fill();
      }
      nodeScreen.forEach((p, i) => {
        const depth = (1 - p.z / 3) / 2;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10 * p.p);
        glow.addColorStop(0, `rgba(${ar},${ag},${ab},${0.5 + depth * 0.5})`);
        glow.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
        ctx.fillStyle = glow;
        ctx.fillRect(p.x - 12, p.y - 12, 24, 24);
        const el2 = labels.current[i];
        if (el2) {
          el2.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -150%)`;
          el2.style.opacity = String(0.3 + Math.max(0, Math.min(1, depth)) * 0.7);
          el2.style.zIndex = String(Math.round(depth * 20));
        }
      });

      // Finished work streaming out to the outputs on the right.
      // Chips hang off the right edge; particles aim at their left half.
      const anchors = outputs.map((_, i) => ({
        x: w - 56,
        y: h * (0.3 + (i * 0.4) / Math.max(1, outputs.length - 1)),
      }));
      for (const f of outflow) {
        f.t += dt * f.speed * (reduced ? 0 : 1);
        if (f.t > 1) f.t -= 1;
        const a = anchors[f.out]!;
        const e = f.t * f.t * (3 - 2 * f.t);
        // A gentle curve from the core to the output.
        const mx = (cx + a.x) / 2;
        const my = Math.min(cy, a.y) - unit * 0.6;
        const x = (1 - e) * (1 - e) * cx + 2 * (1 - e) * e * mx + e * e * a.x;
        const y = (1 - e) * (1 - e) * cy + 2 * (1 - e) * e * my + e * e * a.y;
        ctx.fillStyle = `rgba(${r},${g},${b},${Math.sin(f.t * Math.PI) * 0.95})`;
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
      }
      anchors.forEach((a, i) => {
        const el3 = outs.current[i];
        if (el3) el3.style.transform = `translate(${w - 8}px, ${a.y}px) translate(-100%, -50%)`;
      });
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
  }, [categories, outputs, reduced]);

  return (
    <div
      ref={wrap}
      role="img"
      aria-label={label}
      className="relative h-[420px] w-full overflow-hidden sm:h-[520px]"
    >
      <canvas ref={canvas} className="absolute inset-0 size-full" />
      {categories.map((name, i) => (
        <span
          key={name}
          ref={(el) => {
            labels.current[i] = el;
          }}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-medium whitespace-nowrap text-[#F3EFE4] ring-1 ring-white/15 backdrop-blur sm:text-[11px]"
        >
          {name}
        </span>
      ))}
      {outputs.map((name, i) => (
        <span
          key={name}
          ref={(el) => {
            outs.current[i] = el;
          }}
          aria-hidden="true"
          className="absolute top-0 left-0 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium shadow-lg transition-colors duration-500"
          style={{ background: color, color: textOn(color) }}
        >
          <Icon name={i === 0 ? 'grid' : i === 1 ? 'video' : 'pen'} className="size-3.5" />
          {name}
        </span>
      ))}
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

/** The brand memory section: page switcher, what it knows about that page, and the brain. */
export function BrandMemory({ memory }: { memory: Memory }) {
  const [active, setActive] = useState(0);
  const [pulse, setPulse] = useState(0);
  const brand: Brand = memory.brands[active]!;
  const accent = brand.colors[1] && brand.colors[1] !== '#FFFFFF' ? brand.colors[1] : '#F3EFE4';

  const facts = (['voice', 'audience', 'pillars', 'rule', 'language'] as const).flatMap((key) =>
    brand[key] ? [{ key, label: memory.labels[key], value: brand[key]! }] : [],
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-10">
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
                'rounded-pill inline-flex items-center gap-2 px-4 py-2 text-sm font-medium ring-1 transition',
                i === active
                  ? 'bg-[#F3EFE4] text-[#0E0F0C] ring-transparent'
                  : 'text-ink-soft ring-white/15 hover:text-[#F3EFE4]',
              )}
            >
              <span
                aria-hidden="true"
                className="size-2.5 rounded-full"
                style={{ background: b.colors[0] }}
              />
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
          <div className="flex items-center gap-3">
            <SocialIcon platform={brand.platform} className="size-10" />
            <div className="min-w-0">
              <p className="text-lg font-medium">{brand.name}</p>
              <p className="text-ink-soft truncate text-sm">
                {brand.handle} · {memory.labels.platform}: {brand.platform}
              </p>
            </div>
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
        outputs={memory.outputs}
        color={brand.colors[0]!}
        accent={accent}
        pulse={pulse}
        label={memory.visualLabel}
      />
    </div>
  );
}
