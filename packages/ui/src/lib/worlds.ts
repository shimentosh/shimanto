/**
 * Static class maps for surfaces. Tailwind only generates classes it can see as literal strings,
 * so components look colours up here instead of building `bg-${world}` dynamically.
 */
export type Surface =
  'build' | 'create' | 'spark' | 'signal' | 'idea' | 'canvas' | 'canvas-2' | 'paper' | 'night';

export type Accent = 'build' | 'create' | 'spark' | 'signal' | 'idea';

export const surfaceBg: Record<Surface, string> = {
  build: 'bg-build on-world',
  create: 'bg-create on-world',
  spark: 'bg-spark on-world',
  signal: 'bg-signal on-world',
  idea: 'bg-idea on-world',
  canvas: 'bg-canvas text-ink',
  'canvas-2': 'bg-canvas-2 text-ink',
  paper: 'bg-paper text-ink',
  night: 'bg-night text-cream',
};

export const accentBg: Record<Accent, string> = {
  build: 'bg-build',
  create: 'bg-create',
  spark: 'bg-spark',
  signal: 'bg-signal',
  idea: 'bg-idea',
};

/** CSS custom property for a surface — used for SVG strokes/fills and the page-background tween. */
export function surfaceVar(surface: Surface): string {
  if (surface === 'night') return '#0e0f0c';
  return `var(--${surface})`;
}
