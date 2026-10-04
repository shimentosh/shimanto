import { describe, expect, it } from 'vitest';
import { nextNavState } from './floating-nav';
import { isActivePath } from './nav-types';

describe('nextNavState', () => {
  const shown = { hidden: false, compact: false };

  it('stays expanded and visible near the top', () => {
    expect(nextNavState(0, 10, shown)).toEqual({ hidden: false, compact: false });
  });

  it('compacts past 24px but only hides when scrolling down past 160px', () => {
    expect(nextNavState(20, 100, shown)).toEqual({ hidden: false, compact: true });
    expect(nextNavState(150, 400, shown)).toEqual({ hidden: true, compact: true });
  });

  it('shows again on scroll up', () => {
    expect(nextNavState(400, 350, { hidden: true, compact: true })).toEqual({
      hidden: false,
      compact: true,
    });
  });

  it('ignores sub-6px jitter', () => {
    const hidden = { hidden: true, compact: true };
    expect(nextNavState(400, 397, hidden)).toEqual(hidden);
  });
});

describe('isActivePath', () => {
  it('matches the section and its children, never a prefix lookalike', () => {
    expect(isActivePath('/work', '/work')).toBe(true);
    expect(isActivePath('/work/content-os', '/work')).toBe(true);
    expect(isActivePath('/workshop', '/work')).toBe(false);
    expect(isActivePath('/work', '/')).toBe(false);
    expect(isActivePath('/', '/')).toBe(true);
  });
});
