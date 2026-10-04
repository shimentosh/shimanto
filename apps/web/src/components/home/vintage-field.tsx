'use client';

import { cn } from '@shimanto/ui';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/*
 * The background at the top of every page: a line-art brain (the "CEO mind") crowning the home
 * portrait, centred on its orbit ring (behind the title elsewhere). Its folds are contour lines of
 * a warped noise field, and thoughts flare across it in the brand world colours. The rest stays
 * empty so text reads clearly, under old-film grain, dust, a vignette and a warm light leak. The
 * cursor lights the folds it passes and a click sends a ring of light through the brain.
 * One raw WebGL fragment shader, no library.
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
uniform float uDark;
uniform float uMask;
uniform vec2 uSun;
uniform float uR;
uniform vec3 uBuild;
uniform vec3 uSignal;
uniform vec3 uIdea;
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

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * noise(p); p = p * 2.03 + 17.0; a *= 0.5; }
  return v;
}

float ellipse(vec2 p, vec2 c, vec2 r) { return (length((p - c) / r) - 1.0) * min(r.x, r.y); }
float capsule(vec2 p, vec2 a, vec2 b, float r) {
  vec2 pa = p - a, ba = b - a;
  return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0)) - r;
}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// A brain in side view, facing left, in units of its half-width: cerebrum, temporal lobe,
// cerebellum and brainstem, blended into one outline.
float brain(vec2 q) {
  float d = ellipse(q, vec2(0.0, -0.06), vec2(1.0, 0.64));
  d = smin(d, ellipse(q, vec2(-0.12, 0.3), vec2(0.66, 0.3)), 0.12);
  d = smin(d, ellipse(q, vec2(0.6, 0.44), vec2(0.36, 0.23)), 0.1);
  d = smin(d, capsule(q, vec2(0.28, 0.42), vec2(0.36, 0.98), 0.1), 0.08);
  return d;
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  vec2 css = vec2(px.x, uRes.y - px.y) / uDpr;
  vec2 sun = vec2(uSun.x, uRes.y - uSun.y) / uDpr;
  float R = uR / uDpr;
  vec2 mouse = vec2(uMouse.x, uRes.y - uMouse.y) / uDpr;
  vec2 click = vec2(uClick.x, uRes.y - uClick.y) / uDpr;

  // Brain space: centred a little above the orbit ring's centre, so the lobes crown the head.
  float S = R * 1.62;
  vec2 q = (css - (sun + vec2(0.0, -R * 0.28))) / S;
  float d = brain(q) + (noise(q * 9.0) - 0.5) * 0.035;
  float inside = 1.0 - smoothstep(-0.015, 0.0, d);
  float dl = d / 0.012;
  float outline = exp(-dl * dl);

  // Folds: tightly packed, meandering stripes (strong domain warp) read as gyri and sulci.
  vec2 p = q * 2.4;
  vec2 w = vec2(fbm(p + vec2(0.0, uTime * 0.012)), fbm(p + vec2(5.2, 1.3)));
  w += 0.5 * vec2(fbm(p * 2.1 + w * 2.0 + 3.7), fbm(p * 2.1 + w * 2.0 + 8.1));
  float f = fbm(p + w * 2.6);
  float fold = smoothstep(0.55, 0.95, sin(f * 6.2832 * 13.0));

  // The lateral (Sylvian) fissure and the central sulcus, as gentle curves.
  float fis = min(capsule(q, vec2(-0.52, 0.22), vec2(-0.18, 0.1), 0.0),
              min(capsule(q, vec2(-0.18, 0.1), vec2(0.14, 0.04), 0.0),
                  capsule(q, vec2(0.14, 0.04), vec2(0.4, -0.1), 0.0)));
  float cs = min(capsule(q, vec2(0.08, -0.66), vec2(0.0, -0.42), 0.0),
                 capsule(q, vec2(0.0, -0.42), vec2(-0.06, -0.1), 0.0));
  float fl = fis / 0.016;
  float cl = cs / 0.012;
  float fissure = exp(-fl * fl) + 0.6 * exp(-cl * cl);
  fold *= smoothstep(0.02, 0.05, min(fis, cs));

  // Thoughts: hotspots that drift, flare and fade, each in a brand world colour.
  vec3 glowCol = vec3(0.0);
  float glow = 0.0;
  for (int i = 0; i < 4; i++) {
    float fi = float(i);
    vec2 c = vec2(noise(vec2(uTime * 0.12, fi * 9.1)) * 1.5 - 0.8,
                  noise(vec2(fi * 4.7, uTime * 0.1)) * 0.9 - 0.5);
    float flare = pow(0.5 + 0.5 * sin(uTime * 0.8 + fi * 1.9), 5.0);
    vec2 dq = q - c;
    float g = flare * exp(-dot(dq, dq) / 0.07);
    vec3 col = i == 0 ? uBuild : i == 1 ? uSignal : i == 2 ? uCreate : uIdea;
    glowCol += col * g;
    glow += g;
  }

  // Cursor lights the folds it passes; a click sends a ring of light through the brain.
  float dm = distance(css, mouse) / 120.0;
  float lamp = uMouseOn * exp(-dm * dm);
  float age = uTime - uClick.z;
  float rr = (distance(css, click) - age * 340.0) / 30.0;
  float ring = step(0.0, age) * exp(-rr * rr) * exp(-age * 1.2);
  glowCol += uBuild * (lamp + ring);
  glow += lamp + ring;

  float lit = clamp(glow, 0.0, 1.0);
  vec3 col = mix(uInk, glowCol / max(glow, 0.001), lit);
  float side = mix(1.0, mix(0.15, 1.0, smoothstep(0.32, 0.6, uv.x)), uMask);
  float breathe = 0.92 + 0.08 * sin(uTime * 1.1);
  float a = (inside * (fold * (0.16 + 0.7 * lit) + fissure * 0.35) + outline * (0.3 + 0.5 * lit)) * side * breathe;
  a = min(a * (uDark > 0.5 ? 1.0 : 1.25), 1.0);
  vec4 outc = vec4(col * a, a);

  // Old film: a warm light leak in the corner, vignette, dust and grain.
  float leak = exp(-length((uv - vec2(1.05, 1.08)) * vec2(1.4, 1.8)) * 2.6);
  leak *= 0.12 * (0.85 + 0.15 * noise(vec2(uTime * 0.7, 9.0)));
  outc = over(outc, vec4(mix(uCreate, uSpark, 0.35), 1.0) * leak);
  float vig = smoothstep(0.4, 1.1, length((uv - 0.5) * vec2(1.1, 1.3)));
  vec3 vigCol = uDark > 0.5 ? vec3(0.0) : mix(uInk, uCreate, 0.2);
  outc = over(outc, vec4(vigCol, 1.0) * vig * (uDark > 0.5 ? 0.5 : 0.12));
  float speck = step(0.9994, hash(floor(px / uDpr / 5.0) + floor(uTime * 12.0) * 1.7));
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
    const mouse = { x: -1e4, y: -1e4, tx: -1e4, ty: -1e4, on: 0, target: 0 };

    const applyTheme = () => {
      const styles = getComputedStyle(document.documentElement);
      const [r, g, b] = readColor(styles, '--canvas');
      gl.uniform1f(u('uDark'), 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5 ? 1 : 0);
      gl.uniform3fv(u('uInk'), readColor(styles, '--ink'));
      gl.uniform3fv(u('uSpark'), readColor(styles, '--spark'));
      gl.uniform3fv(u('uCreate'), readColor(styles, '--create'));
      gl.uniform3fv(u('uBuild'), readColor(styles, '--build'));
      gl.uniform3fv(u('uSignal'), readColor(styles, '--signal'));
      gl.uniform3fv(u('uIdea'), readColor(styles, '--idea'));
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
      mouse.x += (mouse.tx - mouse.x) * 0.14;
      mouse.y += (mouse.ty - mouse.y) * 0.14;
      mouse.on += (mouse.target - mouse.on) * 0.08;
      placeSun();
      gl.uniform1f(uTime, time);
      gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.uniform1f(uMouseOn, mouse.on);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      canvas.style.opacity = '1';
    };

    const still = () => {
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
