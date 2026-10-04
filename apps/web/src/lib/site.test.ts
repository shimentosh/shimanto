import { describe, expect, it } from 'vitest';
import { absoluteUrl, siteUrl } from './site';

describe('siteUrl', () => {
  it('defaults to the production domain', () => {
    expect(siteUrl({})).toBe('https://shimanto.xyz');
  });

  it('strips trailing slashes from the configured origin', () => {
    expect(siteUrl({ NEXT_PUBLIC_SITE_URL: 'http://localhost:3000//' })).toBe(
      'http://localhost:3000',
    );
  });
});

describe('absoluteUrl', () => {
  const origin = 'https://shimanto.xyz';

  it('keeps the root without a trailing slash', () => {
    expect(absoluteUrl('/', origin)).toBe('https://shimanto.xyz');
  });

  it('joins paths with or without a leading slash', () => {
    expect(absoluteUrl('/work/content-os', origin)).toBe('https://shimanto.xyz/work/content-os');
    expect(absoluteUrl('bn/now', origin)).toBe('https://shimanto.xyz/bn/now');
  });
});
