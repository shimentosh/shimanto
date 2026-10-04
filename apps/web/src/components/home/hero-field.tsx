'use client';

import { cn } from '@shimanto/ui';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

/*
 * The living background at the top of every page: a 3D ocean of glowing particles in the brand
 * worlds that the camera glides over, with dust motes twinkling in the air above it. The cursor
 * raises a swell in the terrain, a click sends a shockwave across it, and scrolling speeds the
 * flight up. Full strength on the home page, softer elsewhere. Raw WebGL, one point-sprite
 * program, no library.
 * Pauses offscreen and in hidden tabs, draws one still frame under reduced motion, follows the
 * theme, and renders nothing when WebGL is unavailable.
 */

const COLS = 160;
const ROWS = 96;
/** Floating dust above the terrain, drawn from the same buffer (grid y > 1 marks a dust mote). */
const DUST = 1800;
const NEAR = 2.2;
const FAR = 46;
const CAM_Y = 2.4;
const TILT = 0.22;
const FOCAL = 1.6;

const VERTEX = `
attribute vec2 aGrid;
uniform float uAspect;
uniform float uTime;
uniform float uTravel;
uniform float uDpr;
uniform vec2 uMouse;
uniform float uMouseOn;
uniform vec3 uClick;
uniform float uMask;
uniform vec3 uC0;
uniform vec3 uC1;
uniform vec3 uC2;
uniform vec3 uC3;
varying vec3 vColor;
varying float vAlpha;

const float NEAR = ${NEAR.toFixed(2)};
const float FAR = ${FAR.toFixed(2)};
const float CAM_Y = ${CAM_Y.toFixed(2)};
const float TILT = ${TILT.toFixed(3)};
const float FOCAL = ${FOCAL.toFixed(2)};

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
vec3 palette(float k) {
  vec3 col = mix(uC0, uC1, smoothstep(0.0, 0.3, k));
  col = mix(col, uC2, smoothstep(0.3, 0.55, k));
  col = mix(col, uC3, smoothstep(0.55, 0.8, k));
  return mix(col, uC0, smoothstep(0.8, 1.0, k));
}

void main() {
  float x, y, z, energy, base, alpha;
  bool dust = aGrid.y > 1.0;

  if (dust) {
    // A mote at a random spot in the volume above the ground, drifting toward the camera.
    float r1 = hash(aGrid * 13.1), r2 = hash(aGrid * 7.7 + 3.0), r3 = hash(aGrid * 3.3 + 9.0);
    float span = FAR - NEAR;
    z = NEAR + mod(r1 * span - uTravel * 0.7, span);
    x = (r2 * 2.0 - 1.0) * z * uAspect / FOCAL * 1.1 + sin(uTime * 0.3 + r1 * 20.0) * 0.4;
    y = mix(0.2, CAM_Y + z * 0.75, r3) + sin(uTime * 0.5 + r2 * 30.0) * 0.25;
    float twinkle = 0.35 + 0.65 * pow(0.5 + 0.5 * sin(uTime * (1.2 + r3 * 2.5) + r1 * 40.0), 3.0);
    float dm = distance(vec2(x, z), uMouse);
    energy = uMouseOn * exp(-dm * dm / 8.0) * 0.8;
    base = (1.6 + 2.6 * twinkle) * 18.0;
    vColor = palette(fract(r1 * 3.7 + uTime * 0.03)) * (0.7 + twinkle * 0.6) + vec3(energy * 0.4);
    // Fade in from the horizon and out before the camera, so the wrap-around never pops.
    alpha = twinkle * smoothstep(NEAR, NEAR + 3.0, z) * (1.0 - smoothstep(FAR * 0.55, FAR, z));
  } else {
    // Rows spaced evenly on screen (uniform in 1/z), columns fanned out to fill the frustum.
    z = 1.0 / mix(1.0 / NEAR, 1.0 / FAR, aGrid.y);
    x = aGrid.x * z * uAspect / FOCAL * 1.2;

    // Rolling terrain, flowing toward the camera.
    vec2 w = vec2(x, z + uTravel);
    float h = 0.75 * noise(w * 0.16) + 0.35 * noise(w * 0.42 + 7.0) - 0.55;
    h += 0.3 * sin(w.x * 0.45 + uTime * 0.9) * cos(w.y * 0.38 - uTime * 0.6);
    h *= 2.0;

    // Cursor swell and click shockwave, in world space on the ground plane.
    float dm = distance(vec2(x, z), uMouse);
    float swell = uMouseOn * 1.8 * exp(-dm * dm / 6.0);
    float age = uTime - uClick.z;
    float rr = distance(vec2(x, z), uClick.xy) - age * 12.0;
    float wave = step(0.0, age) * 1.8 * exp(-rr * rr / 1.4) * exp(-age * 0.7);
    y = h + swell + wave;

    energy = clamp(swell * 0.7 + wave * 0.8, 0.0, 1.5);
    base = (3.6 + 3.0 * clamp(h, 0.0, 1.0) + energy * 4.0) * 16.0;
    float k = fract(aGrid.x * 0.45 + 0.5 + z * 0.012 + uTime * 0.02);
    float lift = clamp(0.75 + h * 0.6 + energy * 0.7, 0.35, 1.9);
    vColor = palette(k) * lift + vec3(energy * 0.45);
    alpha = (1.0 - smoothstep(FAR * 0.45, FAR, z)) * smoothstep(NEAR, NEAR + 1.2, z);
  }

  // Camera at (0, CAM_Y, 0) tilted down by TILT.
  vec3 pc = vec3(x, y - CAM_Y, z);
  float c = cos(TILT), s = sin(TILT);
  pc = vec3(pc.x, pc.y * c + pc.z * s, pc.z * c - pc.y * s);
  gl_Position = vec4(pc.x * FOCAL / uAspect, pc.y * FOCAL, 0.0, pc.z);
  gl_PointSize = clamp(base / pc.z, 1.4, 34.0) * uDpr;

  float sx = pc.x * FOCAL / uAspect / pc.z;
  float side = mix(1.0, mix(0.5, 1.0, smoothstep(-0.75, 0.15, sx)), uMask);
  vAlpha = alpha * side;
}
`;

const FRAGMENT = `
precision mediump float;
uniform float uDark;
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  // A bright core inside a soft halo.
  float halo = 1.0 - smoothstep(0.0, 1.0, d);
  float core = 1.0 - smoothstep(0.0, 0.38, d);
  float a = (halo * halo * 0.6 + core * 0.9) * vAlpha;
  vec3 col = uDark > 0.5 ? vColor : vColor * 0.75;
  gl_FragColor = vec4(col * a, min(a, 1.0));
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

/** Where a screen point (NDC) hits the ground plane y = 0, using the shader's camera. */
function groundHit(nx: number, ny: number, aspect: number): [number, number] | null {
  const dx = (nx * aspect) / FOCAL;
  const dy = ny / FOCAL;
  const c = Math.cos(TILT);
  const s = Math.sin(TILT);
  // Undo the camera tilt: camera space (dx, dy, 1) back to world.
  const wy = dy * c - s;
  const wz = dy * s + c;
  if (wy >= -0.02) return null;
  const t = CAM_Y / -wy;
  return [dx * t, wz * t];
}

export function HeroField({ className }: { className?: string }) {
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

    const count = COLS * ROWS + DUST;
    const grid = new Float32Array(count * 2);
    let i = 0;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++, i += 2) {
        grid[i] = (c / (COLS - 1)) * 2 - 1;
        grid[i + 1] = r / (ROWS - 1);
      }
    }
    // Dust motes: a unique seed each, with y > 1 so the shader can tell them apart.
    for (let d = 0; d < DUST; d++, i += 2) {
      grid[i] = d / DUST;
      grid[i + 1] = 1.5 + (d % 97) / 97;
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, grid, gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'aGrid');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uAspect = u('uAspect');
    const uTime = u('uTime');
    const uTravel = u('uTravel');
    const uDpr = u('uDpr');
    const uMouse = u('uMouse');
    const uMouseOn = u('uMouseOn');
    const uClick = u('uClick');
    const uMask = u('uMask');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const start = performance.now();
    const now = () => (performance.now() - start) / 1000;
    let aspect = 1;
    let frame = 0;
    let visible = true;
    let last = 0;
    let travel = 0;
    let boost = 0;
    let lastScroll = window.scrollY;
    const mouse = { x: 0, z: 10, tx: 0, tz: 10, on: 0, target: 0 };

    const applyTheme = () => {
      const styles = getComputedStyle(document.documentElement);
      const [r, g, b] = readColor(styles, '--canvas');
      const dark = 0.2126 * r + 0.7152 * g + 0.0722 * b < 0.5;
      gl.uniform1f(u('uDark'), dark ? 1 : 0);
      // Additive glow on the night canvas; ordinary "over" blending on cream so dots stay visible.
      if (dark) gl.blendFunc(gl.ONE, gl.ONE);
      else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      gl.uniform3fv(u('uC0'), readColor(styles, '--build'));
      gl.uniform3fv(u('uC1'), readColor(styles, '--signal'));
      gl.uniform3fv(u('uC2'), readColor(styles, '--idea'));
      gl.uniform3fv(u('uC3'), readColor(styles, '--create'));
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      aspect = canvas.width / canvas.height;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(uAspect, aspect);
      gl.uniform1f(uDpr, dpr);
    };

    const draw = (time: number) => {
      const dt = Math.min(0.05, time - last);
      last = time;
      const scrolled = window.scrollY - lastScroll;
      lastScroll = window.scrollY;
      boost = boost * 0.92 + Math.abs(scrolled) * 0.012;
      travel += dt * (1.1 + Math.min(boost, 12));
      mouse.x += (mouse.tx - mouse.x) * 0.1;
      mouse.z += (mouse.tz - mouse.z) * 0.1;
      mouse.on += (mouse.target - mouse.on) * 0.06;
      gl.uniform1f(uTime, time);
      gl.uniform1f(uTravel, travel);
      gl.uniform2f(uMouse, mouse.x, mouse.z);
      gl.uniform1f(uMouseOn, mouse.on);
      // Home dims the particles behind the left-aligned headline; other pages are centred.
      gl.uniform1f(uMask, homeRef.current && canvas.clientWidth >= 1024 ? 1 : 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.POINTS, 0, count);
      canvas.style.opacity = '1';
    };

    const still = () => {
      travel = 6;
      draw(8);
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

    const toGround = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (e.clientY < rect.top || e.clientY > rect.bottom) return null;
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = 1 - ((e.clientY - rect.top) / rect.height) * 2;
      return groundHit(nx, ny, aspect);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const hit = toGround(e);
      if (!hit) {
        mouse.target = 0;
        return;
      }
      if (mouse.on < 0.05) [mouse.x, mouse.z] = hit;
      [mouse.tx, mouse.tz] = hit;
      mouse.target = 1;
    };
    const onLeave = () => (mouse.target = 0);
    const onDown = (e: PointerEvent) => {
      const hit = toGround(e);
      if (hit && !reduced.matches) gl.uniform3f(uClick, hit[0], hit[1], now());
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
      {/* A soft horizon glow the particles rise out of. */}
      <div
        className="absolute inset-x-0 top-[30%] h-[45%] opacity-60 blur-3xl"
        style={{
          background:
            'radial-gradient(45% 50% at 62% 50%, color-mix(in oklab, var(--signal) 28%, transparent), transparent 70%), radial-gradient(35% 40% at 85% 60%, color-mix(in oklab, var(--build) 22%, transparent), transparent 70%)',
        }}
      />
      <canvas
        ref={ref}
        className="absolute inset-0 size-full opacity-0 transition-opacity duration-[1500ms]"
      />
    </div>
  );
}
