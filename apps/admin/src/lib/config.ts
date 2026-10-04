/** Public configuration (inlined at build time). */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(
  /\/+$/,
  '',
);
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3100').replace(
  /\/+$/,
  '',
);
export const PORTAL_URL = (process.env.NEXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3102').replace(
  /\/+$/,
  '',
);
