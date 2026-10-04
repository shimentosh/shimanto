import { describe, expect, it } from 'vitest';
import { colors, worlds } from '../tokens/index';
import { contrastRatio } from './contrast';

const AA_TEXT = 4.5;
const AA_NON_TEXT = 3;
const dark = {
  canvas: '#0E0F0C',
  canvas2: '#1A1C17',
  paper: '#1F211C',
  ink: '#F3EFE4',
  inkSoft: '#B9B4A7',
};

describe('WCAG 2.2 AA contrast (brief §8)', () => {
  it.each(Object.entries(worlds))('ink text on %s world ≥ 4.5:1', (_name, hex) => {
    expect(contrastRatio(colors.ink, hex)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each([
    ['ink', colors.ink, 'canvas', colors.canvas],
    ['ink', colors.ink, 'canvas-2', colors.canvas2],
    ['ink', colors.ink, 'paper', colors.paper],
    ['ink-soft', colors.inkSoft, 'canvas', colors.canvas],
    ['ink-soft', colors.inkSoft, 'canvas-2', colors.canvas2],
    ['ink-soft', colors.inkSoft, 'paper', colors.paper],
  ])('light: %s on %s ≥ 4.5:1', (_a, fg, _b, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it.each([
    ['ink', dark.ink, 'canvas', dark.canvas],
    ['ink', dark.ink, 'canvas-2', dark.canvas2],
    ['ink', dark.ink, 'paper', dark.paper],
    ['ink-soft', dark.inkSoft, 'canvas', dark.canvas],
    ['ink-soft', dark.inkSoft, 'paper', dark.paper],
  ])('dark: %s on %s ≥ 4.5:1', (_a, fg, _b, bg) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it('focus indicator: the ink halo reaches 3:1 where signal blue alone does not', () => {
    expect(contrastRatio(worlds.signal, colors.canvas)).toBeLessThan(AA_NON_TEXT);
    expect(contrastRatio(colors.ink, colors.canvas)).toBeGreaterThanOrEqual(AA_NON_TEXT);
    expect(contrastRatio(dark.ink, dark.canvas)).toBeGreaterThanOrEqual(AA_NON_TEXT);
  });

  it('muted ink fails on some accents, so .on-world re-scopes --ink-soft to full ink', () => {
    expect(contrastRatio(colors.inkSoft, worlds.idea)).toBeLessThan(AA_TEXT);
    expect(contrastRatio(colors.inkSoft, worlds.signal)).toBeLessThan(AA_TEXT);
  });

  it('white text on signal blue fails, which is why accents always carry dark ink', () => {
    expect(contrastRatio('#FFFFFF', worlds.signal)).toBeLessThan(AA_TEXT);
  });
});
