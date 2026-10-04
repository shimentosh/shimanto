import { describe, expect, it } from 'vitest';
import { localizePath, parseLocalePath } from './locale-path';

describe('parseLocalePath', () => {
  it.each([
    ['/', 'en', '/'],
    ['/work/content-os', 'en', '/work/content-os'],
    ['/bn', 'bn', '/'],
    ['/bn/work/content-os', 'bn', '/work/content-os'],
    ['/bnx', 'en', '/bnx'],
    ['/writing?tag=ai#top', 'en', '/writing'],
  ])('%s → %s %s', (input, locale, path) => {
    expect(parseLocalePath(input)).toEqual({ locale, path });
  });
});

describe('localizePath', () => {
  it('adds and removes the /bn prefix, keeping the page', () => {
    expect(localizePath('/work/x', 'bn')).toBe('/bn/work/x');
    expect(localizePath('/bn/work/x', 'en')).toBe('/work/x');
    expect(localizePath('/', 'bn')).toBe('/bn');
    expect(localizePath('/bn', 'en')).toBe('/');
    expect(localizePath('/bn/now', 'bn')).toBe('/bn/now');
  });
});
