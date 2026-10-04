'use client';

import { cn } from '@shimanto/ui';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/*
 * The vintage background at the top of every page, kept quiet so text stays readable: vinyl
 * grooves centred on the portrait's orbit ring (top centre elsewhere) with a slowly turning sheen,
 * green code raining down from the top like a terminal, and old-film grain, dust, a vignette and
 * a warm light leak in the corner. The cursor is a lamp that brightens grooves and code, a click
 * sends a ring outward, and scrolling spins the record. One raw WebGL fragment shader, no library.
 * Pauses offscreen and in hidden tabs, draws one still frame under reduced motion, follows the
 * theme, and renders nothing when WebGL is unavailable.
 */

const VERTEX = `
attribute vec2 p;
void main() { gl_Position = vec4(p, 0.0, 1.0); }
`;

const FRAGMENT = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform vec2 uRes;
uniform float uDpr;
uniform float uTime;
uniform float uSpin;
uniform float uDark;
uniform float uMask;
uniform vec2 uSun;
uniform float uR;
uniform vec3 uBuild;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform vec3 uClick;
uniform vec3 uInk;
uniform vec3 uSpark;
uniform vec3 uCreate;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Composite premultiplied colour b over a.
vec4 over(vec4 a, vec4 b) { return b + a * (1.0 - b.a); }

// A 5x7 pixel "code" glyph, re-rolled by seed and mirrored left/right so the noise reads as characters.
float glyph(vec2 local, vec2 seed) {
  vec2 g = (local - vec2(0.18, 0.12)) / vec2(0.64, 0.76);
  if (g.x < 0.0 || g.x >= 1.0 || g.y < 0.0 || g.y >= 1.0) return 0.0;
  vec2 gp = floor(g * vec2(5.0, 7.0));
  gp.x = min(gp.x, 4.0 - gp.x);
  vec2 inPx = fract(g * vec2(5.0, 7.0));
  float shape = step(0.08, inPx.x) * step(0.06, inPx.y);
  return step(0.5, hash(gp + seed)) * shape;
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 css = px / uDpr;
  vec2 uv = px / uRes;
  vec2 sun = uSun / uDpr;
  float R = uR / uDpr;
  float side = mix(1.0, mix(0.22, 1.0, smoothstep(0.32, 0.6, uv.x)), uMask);

  // Vinyl grooves between the portrait's two orbit rings (r and 1.47r), fading out past them.
  vec2 dc = css - sun;
  float rc = length(dc);
  float ang = atan(dc.y, dc.x);
  float rec = smoothstep(R * 1.0, R * 1.04, rc) * (1.0 - smoothstep(R * 1.4, R * 2.1, rc));
  float wobble = noise(vec2(rc * 0.05, 1.0)) * 1.5;
  float groove = smoothstep(0.55, 1.0, sin(rc * 1.3 + wobble));
  float sheen = pow(max(0.0, cos(2.0 * (ang - uSpin))), 10.0);

  // Cursor: a soft lamp. Click: one bright ring running outward.
  float dm = distance(css, uMouse / uDpr) / 140.0;
  float lamp = uMouseOn * exp(-dm * dm);
  float age = uTime - uClick.z;
  float rr = (distance(css, uClick.xy / uDpr) - age * 380.0) / 18.0;
  float ring = step(0.0, age) * exp(-rr * rr) * exp(-age * 1.3);

  float flicker = 0.94 + 0.06 * noise(vec2(uTime * 9.0, 3.0));
  float lines = rec * groove * (0.08 + sheen * 0.18 + lamp * 0.22) + groove * ring * 0.18;
  vec3 warm = mix(uInk, mix(uSpark, uCreate, 0.6), 0.35 * sheen);
  float a = lines * side * flicker * (uDark > 0.5 ? 1.0 : 1.2);
  vec4 outc = vec4(warm * a, a);

  // Code rain: columns of glyphs falling from the top, a bright head and a fading trail.
  vec2 cellSize = vec2(16.0, 21.0);
  float yDown = (uRes.y - px.y) / uDpr;
  float column = floor(css.x / cellSize.x);
  float ch = hash(vec2(column, 4.1));
  float speed = 70.0 + 150.0 * ch;
  float trail = 7.0 + 16.0 * hash(vec2(column, 9.3));
  float period = uRes.y / uDpr + trail * cellSize.y * 2.0;
  float travel = uTime * speed + ch * 5000.0;
  float cycle = floor(travel / period);
  float head = mod(travel, period) - trail * cellSize.y;
  float row = floor(yDown / cellSize.y);
  float behind = (head - row * cellSize.y) / cellSize.y;
  float live = step(0.3, hash(vec2(column, cycle))) * step(0.0, behind) * step(behind, trail);
  vec2 local = vec2(fract(css.x / cellSize.x), fract(yDown / cellSize.y));
  float swap = floor(uTime * (1.5 + 5.0 * hash(vec2(row, column))) + hash(vec2(column, row)) * 9.0);
  float lit = glyph(local, vec2(column * 7.0 + swap * 3.1, row * 13.0 + swap));
  float fade = pow(1.0 - clamp(behind / trail, 0.0, 1.0), 1.6);
  float isHead = 1.0 - step(1.0, behind);
  float rainA = live * lit * (fade * 0.75 + isHead * 0.25) * (1.0 + lamp * 1.2);
  rainA = min(rainA * side * (uDark > 0.5 ? 0.85 : 0.7), 1.0);
  vec3 rainCol = mix(uBuild, uDark > 0.5 ? vec3(0.9, 1.0, 0.85) : uInk, isHead * 0.6);
  if (uDark < 0.5) rainCol = mix(rainCol, uInk, 0.35);
  outc = over(outc, vec4(rainCol, 1.0) * rainA);

  // Old film: a warm light leak in the corner, vignette, dust and grain.
  float leak = exp(-length((uv - vec2(1.05, 1.08)) * vec2(1.4, 1.8)) * 2.6);
  leak *= 0.12 * (0.85 + 0.15 * noise(vec2(uTime * 0.7, 9.0)));
  outc = over(outc, vec4(mix(uCreate, uSpark, 0.35), 1.0) * leak);
  float vig = smoothstep(0.4, 1.1, length((uv - 0.5) * vec2(1.1, 1.3)));
  vec3 vigCol = uDark > 0.5 ? vec3(0.0) : mix(uInk, uCreate, 0.2);
  outc = over(outc, vec4(vigCol, 1.0) * vig * (uDark > 0.5 ? 0.5 : 0.12));
  float speck = step(0.9994, hash(floor(css / 5.0) + floor(uTime * 12.0) * 1.7));
  outc = over(outc, vec4(uInk, 1.0) * speck * 0.3);
  float grain = hash(px + fract(uTime * 7.0) * 113.0);
  outc = over(outc, vec4(uInk, 1.0) * grain * grain * 0.06);

  gl_FragColor = outc;
}
`;

type Rgb = [number, number, number];

function readColor(styles: CSSStyleDeclaration, name: string): Rgb {
  const hex = styles.getPropertyValue(name).trim().replace('#', '');
  const full = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  const v = Number.parseInt(full || '000000', 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
}

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

export function VintageField({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const isHome = usePathname() === '/';
  const homeRef = useRef(isHome);
  useEffect(() => {
    homeRef.current = isHome;
  }, [isHome]);

  useEffect(() => {
    const canvas = ref.current;
    const gl = canvas?.getContext('webgl', { premultipliedAlpha: true, antialias: false });
    if (!canvas || !gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u('uRes');
    const uDpr = u('uDpr');
    const uTime = u('uTime');
    const uSpin = u('uSpin');
    const uMask = u('uMask');
    const uSun = u('uSun');
    const uR = u('uR');
    const uMouse = u('uMouse');
    const uMouseOn = u('uMouseOn');
    const uClick = u('uClick');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const start = performance.now();
    const now = () => (performance.now() - start) / 1000;
    let dpr = 1;
    let frame = 0;
    let visible = true;
    let last = 0;
    let spin = 0;
    let lastScroll = window.scrollY;
    const mouse = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, target: 0 };

    const applyTheme = () => {
      const styles = getComputedStyle(document.documentElement);
      const [r, g, b] = readColor(styles, '--canvas');
      gl.uniform1f(u('uDark'), 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5 ? 1 : 0);
      gl.uniform3fv(u('uInk'), readColor(styles, '--ink'));
      gl.uniform3fv(u('uSpark'), readColor(styles, '--spark'));
      gl.uniform3fv(u('uCreate'), readColor(styles, '--create'));
      gl.uniform3fv(u('uBuild'), readColor(styles, '--build'));
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uDpr, dpr);
    };

    /**
     * Home: centred on the portrait's orbit ring, read from the DOM each frame so it follows the
     * tilt. Elsewhere (or before the portrait lays out): low centre, under the title.
     */
    const placeSun = () => {
      const box = canvas.getBoundingClientRect();
      const home = homeRef.current;
      const orbit = home ? document.querySelector('[data-hero-orbit]') : null;
      const ring = orbit?.getBoundingClientRect();
      if (ring && ring.width > 0) {
        // The inner ring in the 100x100 viewBox: centre (50, 38), radius 30.
        const cx = ring.left + ring.width * 0.5;
        const cy = ring.top + ring.height * 0.38;
        gl.uniform2f(uSun, (cx - box.left) * dpr, (box.bottom - cy) * dpr);
        gl.uniform1f(uR, ring.width * 0.3 * dpr);
      } else {
        gl.uniform2f(uSun, canvas.width * 0.5, canvas.height * 0.9);
        gl.uniform1f(uR, Math.min(canvas.width, canvas.height) * 0.16);
      }
      gl.uniform1f(uMask, home && box.width >= 1024 ? 1 : 0);
    };

    const draw = (time: number) => {
      const dt = Math.min(0.05, time - last);
      last = time;
      const scrolled = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      spin += dt * 0.35 + scrolled * 0.004;
      mouse.x += (mouse.tx - mouse.x) * 0.14;
      mouse.y += (mouse.ty - mouse.y) * 0.14;
      mouse.on += (mouse.target - mouse.on) * 0.08;
      placeSun();
      gl.uniform1f(uTime, time);
      gl.uniform1f(uSpin, spin);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uMouseOn, mouse.on);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.style.opacity = '1';
    };

    const still = () => {
      last = 0;
      draw(0);
    };
    const loop = () => {
      draw(now());
      frame = requestAnimationFrame(loop);
    };
    const play = () => {
      cancelAnimationFrame(frame);
      if (reduced.matches) still();
      else if (visible && !document.hidden) {
        last = now();
        frame = requestAnimationFrame(loop);
      }
    };

    const toCanvas = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const inside = e.clientY >= rect.top && e.clientY <= rect.bottom;
      return { x: (e.clientX - rect.left) * dpr, y: (rect.bottom - e.clientY) * dpr, inside };
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const { x, y, inside } = toCanvas(e);
      if (mouse.on < 0.05) {
        mouse.x = x;
        mouse.y = y;
      }
      mouse.tx = x;
      mouse.ty = y;
      mouse.target = inside ? 1 : 0;
    };
    const onLeave = () => (mouse.target = 0);
    const onDown = (e: PointerEvent) => {
      const { x, y, inside } = toCanvas(e);
      if (inside && !reduced.matches) gl.uniform3f(uClick, x, y, now());
    };
    const refresh = () => {
      applyTheme();
      if (reduced.matches) still();
    };

    gl.uniform3f(uClick, 0, 0, -100);
    applyTheme();
    resize();

    const sizeObserver = new ResizeObserver(() => {
      resize();
      if (reduced.matches) still();
    });
    sizeObserver.observe(canvas);
    const viewObserver = new IntersectionObserver(([entry]) => {
      visible = entry?.isIntersecting ?? true;
      play();
    });
    viewObserver.observe(canvas);
    const themeObserver = new MutationObserver(refresh);
    themeObserver.observe(document.documentElement, { attributeFilter: ['data-theme', 'class'] });

    darkQuery.addEventListener('change', refresh);
    reduced.addEventListener('change', play);
    document.addEventListener('visibilitychange', play);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    play();

    return () => {
      cancelAnimationFrame(frame);
      sizeObserver.disconnect();
      viewObserver.disconnect();
      themeObserver.disconnect();
      darkQuery.removeEventListener('change', refresh);
      reduced.removeEventListener('change', play);
      document.removeEventListener('visibilitychange', play);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      // Free our objects but keep the context: a remount (StrictMode, fast refresh) reuses this canvas,
      // and a lost context cannot be revived.
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className={cn(
        'pointer-events-none overflow-hidden transition-opacity duration-700',
        !isHome && 'opacity-55',
        className,
      )}
    >
      <canvas
        ref={ref}
        className="absolute inset-0 size-full opacity-0 transition-opacity duration-[1500ms]"
      />
    </div>
  );
}
