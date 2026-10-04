export type UiLocale = 'en' | 'bn';

/** Split a pathname into its locale and the locale-less path. English has no prefix. */
export function parseLocalePath(pathname: string): { locale: UiLocale; path: string } {
  const clean = pathname.split(/[?#]/)[0] || '/';
  if (clean === '/bn' || clean.startsWith('/bn/')) {
    return { locale: 'bn', path: clean.slice(3) || '/' };
  }
  return { locale: 'en', path: clean };
}

/** Same page in another locale: `/work/x` ↔ `/bn/work/x`. */
export function localizePath(path: string, locale: UiLocale): string {
  const { path: bare } = parseLocalePath(path);
  if (locale === 'en') return bare;
  return bare === '/' ? '/bn' : `/bn${bare}`;
}
