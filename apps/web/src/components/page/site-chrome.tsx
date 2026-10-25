'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

/** Landing pages that bring their own header and footer (ads land here). */
const STANDALONE = ['/content-os', '/bn/content-os'];

export function isStandalone(pathname: string | null): boolean {
  return (
    pathname !== null && STANDALONE.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

/** The site's header, footer and backdrop, left out on standalone landing pages. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return isStandalone(usePathname()) ? null : children;
}
