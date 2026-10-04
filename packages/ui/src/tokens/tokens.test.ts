// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { colors, worlds } from './index.js';

const css = readFileSync(fileURLToPath(new URL('../styles/tokens.css', import.meta.url)), 'utf8');
const lightRoot = css.slice(0, css.indexOf('}'));
const kebab = (s: string) => s.replace(/([A-Z0-9])/g, '-$1').toLowerCase();

describe('design tokens', () => {
  it.each(Object.entries({ ...colors, ...worlds }))('CSS --%s matches TS value', (name, hex) => {
    expect(lightRoot).toContain(`--${kebab(name)}: ${hex.toLowerCase()};`);
  });
});
