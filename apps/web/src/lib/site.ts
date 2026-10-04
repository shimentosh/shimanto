/** Site-wide identity and URL helpers. Copy comes from the project brief (§1, §4). */
export const site = {
  name: 'Shimanto',
  domain: 'shimanto.xyz',
  tagline: 'Founder. Builder. Systems Thinker.',
  description:
    'I build businesses, software and systems at the intersection of business, marketing, technology, AI and automation.',
  titleTemplate: '%s — Shimanto',
} as const;

/** Canonical origin without a trailing slash. Falls back to production so builds never emit localhost canonicals by accident. */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  return (env.NEXT_PUBLIC_SITE_URL ?? `https://${site.domain}`).replace(/\/+$/, '');
}

/** Absolute URL for a site path — used for canonicals, OG images, sitemaps and JSON-LD. */
export function absoluteUrl(path = '/', origin = siteUrl()): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin}${normalized === '/' ? '' : normalized}`;
}
