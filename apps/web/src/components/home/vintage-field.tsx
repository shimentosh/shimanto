'use client';

import { cn } from '@shimanto/ui';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/*
 * The background at the top of every page. On the home page, a Siri-style glow hugs the hero
 * lens (found through data-hero-orbit): soft layers in the brand colours flow around its rim,
 * two "bunny ear" flares rise from the top and sway, the glow leans toward the cursor, and a
 * click on the lens sends a pulse outward. Everywhere, a vignette and a warm light leak. One raw WebGL fragment shader, no library.
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
uniform vec2 uSun;
uniform float uR;
uniform float uAnchor;
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

const float PI = 3.14159265;

// Signed distance between two angles, wrapped to [-PI, PI].
float angleDiff(float a, float b) {
  float d = mod(a - b + PI, 2.0 * PI) - PI;
  return d;
}

// How far the glow reaches out from the rim at this angle (in units of R): a calm base that
// breathes, noise flowing around the circle, and two "bunny ear" flares on top that sway.
float reach(float ang, float layer, float t) {
  vec2 around = vec2(cos(ang), sin(ang));
  float flow = noise(around * 1.7 + vec2(t * 0.35 + layer * 3.1, -t * 0.25 + layer * 1.7));
  float r = 0.05 + 0.09 * flow * flow + 0.015 * sin(t * 1.6 + layer * 2.0);
  float sway = 0.07 * sin(t * 0.9 + layer);
  for (int k = 0; k < 2; k++) {
    float side = k == 0 ? -1.0 : 1.0;
    float centre = -PI * 0.5 + side * (0.42 + sway * side);
    float e = angleDiff(ang, centre) / (0.15 + 0.03 * layer);
    float ear = exp(-e * e) * (0.45 + 0.08 * sin(t * 1.3 + side + layer));
    r += ear;
  }
  return r;
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 uv = px / uRes;
  vec2 css = vec2(px.x, uRes.y - px.y) / uDpr;
  vec2 sun = vec2(uSun.x, uRes.y - uSun.y) / uDpr;
  float R = uR / uDpr;
  vec2 mouse = vec2(uMouse.x, uRes.y - uMouse.y) / uDpr;
  vec2 click = vec2(uClick.x, uRes.y - uClick.y) / uDpr;
  float t = uTime;

  vec2 dc = css - sun;
  float dist = length(dc);
  float ang = atan(dc.y, dc.x);
  float out_ = (dist - R) / R;

  // The cursor pulls the glow toward itself; a click sends a pulse out from the rim.
  float mouseAng = atan(mouse.y - sun.y, mouse.x - sun.x);
  float toward = angleDiff(ang, mouseAng) / 0.5;
  float near = uMouseOn * exp(-toward * toward) * (1.0 - smoothstep(R * 0.6, R * 3.0, distance(mouse, sun) - R));
  float age = t - uClick.z;
  float clicked = step(0.0, age) * step(distance(click, sun), R * 1.6);
  float pr = (out_ - age * 0.9) / 0.05;
  float pulse = clicked * exp(-pr * pr) * exp(-age * 1.8);

  // Siri-style glow: three soft layers, each colour sliding around the rim at its own pace.
  vec3 col = vec3(0.0);
  float a = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    float r = reach(ang, fi, t) * (1.0 + near * 0.6);
    float g = exp(-pow(max(out_, 0.0) / r, 1.35)) * smoothstep(-0.02, 0.0, out_);
    float hue = fract(ang / (2.0 * PI) + t * (0.04 + fi * 0.025) + fi * 0.33);
    vec3 c = mix(uSignal, uIdea, smoothstep(0.0, 0.33, hue));
    c = mix(c, uCreate, smoothstep(0.33, 0.66, hue));
    c = mix(c, uSpark, smoothstep(0.66, 0.85, hue) * 0.8);
    c = mix(c, uSignal, smoothstep(0.85, 1.0, hue));
    float w = g * (0.75 - fi * 0.15);
    col += c * w;
    a += w;
  }
  // A thin bright rim right at the edge, and the click pulse.
  float rimL = out_ / 0.012;
  float rim = exp(-rimL * rimL) * smoothstep(-0.02, 0.0, out_);
  col += vec3(1.0) * rim * 0.18 + mix(uIdea, uSignal, 0.5) * pulse;
  a += rim * 0.18 + pulse;

  // Average the layers' colours instead of summing them, so overlaps stay saturated, not white.
  float strength = uAnchor * (uDark > 0.5 ? 1.0 : 0.85);
  vec3 hueMix = col / max(a, 0.001);
  a = clamp(a * strength * 0.7, 0.0, 0.8);
  col = hueMix * a;
  vec4 outc = vec4(col, a);

  // Old film: a warm light leak in the corner and a vignette.
  float leak = exp(-length((uv - vec2(1.05, 1.08)) * vec2(1.4, 1.8)) * 2.6);
  leak *= 0.12 * (0.85 + 0.15 * noise(vec2(t * 0.7, 9.0)));
  outc = over(outc, vec4(mix(uCreate, uSpark, 0.35), 1.0) * leak);
  float vig = smoothstep(0.4, 1.1, length((uv - 0.5) * vec2(1.1, 1.3)));
  vec3 vigCol = uDark > 0.5 ? vec3(0.0) : mix(uInk, uCreate, 0.2);
  outc = over(outc, vec4(vigCol, 1.0) * vig * (uDark > 0.5 ? 0.5 : 0.12));

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
    const uSun = u('uSun');
    const uR = u('uR');
    const uAnchor = u('uAnchor');
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
        // data-hero-orbit="cx,cy,r" as fractions of the element's width/height (default: the
        // portrait's inner orbit ring, centre (50, 38) radius 30 in its 100x100 viewBox).
        const [fx = 0.5, fy = 0.38, fr = 0.3] = (orbit?.getAttribute('data-hero-orbit') || '')
          .split(',')
          .filter((part) => part.trim() !== '')
          .map(Number);
        const cx = ring.left + ring.width * fx;
        const cy = ring.top + ring.height * fy;
        gl.uniform2f(uSun, (cx - box.left) * dpr, (box.bottom - cy) * dpr);
        gl.uniform1f(uR, ring.width * fr * dpr);
        gl.uniform1f(uAnchor, 1);
      } else {
        gl.uniform2f(uSun, canvas.width * 0.5, canvas.height * 0.9);
        gl.uniform1f(uR, Math.min(canvas.width, canvas.height) * 0.16);
        gl.uniform1f(uAnchor, 0);
      }
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
