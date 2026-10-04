/** Browser-visible configuration (inlined at build time). */
export const PUBLIC_API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
  /\/+$/,
  '',
);
export const PORTAL_URL = (process.env.NEXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3102').replace(
  /\/+$/,
  '',
);
export const PUBLIC_SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100'
).replace(/\/+$/, '');
