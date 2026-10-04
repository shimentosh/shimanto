/**
 * Design tokens — single source of truth mirrored in `styles/tokens.css`.
 * Values come straight from brief §2.1; a unit test keeps TS and CSS in sync.
 */
export const colors = {
  canvas: '#F3EFE4',
  canvas2: '#E6E0D3',
  ink: '#2C2E2A',
  inkSoft: '#5B5E57',
  paper: '#FFFFFF',
  night: '#0E0F0C',
} as const;

/** Accent "worlds": each major section owns one colour. */
export const worlds = {
  build: '#8FD464',
  create: '#FF7059',
  spark: '#F4E311',
  signal: '#2E9BF7',
  idea: '#E6C3F5',
} as const;

export const radii = {
  card: '28px',
  sheet: '56px',
  pill: '999px',
  button: '14px',
} as const;

export const typeScale = {
  hero: 'clamp(56px, 10vw, 160px)',
  h2: 'clamp(40px, 6vw, 96px)',
  body: 'clamp(18px, 1.1vw + 0.8rem, 20px)',
} as const;

export const tokens = { colors, worlds, radii, typeScale } as const;
export type WorldName = keyof typeof worlds;
