import type { Metadata } from 'next';
import { site } from './site';

/** Per-route metadata with a canonical path. The title template adds "— Shimanto". */
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} — ${site.name}`, description, url: path, siteName: site.name },
  };
}
