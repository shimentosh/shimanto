import type { MetadataRoute } from 'next';
import { experiments, playbooks, posts, ventures } from '@/content/catalog';
import { tools } from '@/content/tools';
import { absoluteUrl } from '@/lib/site';
import { getStoreProducts } from '@/lib/store';

const staticRoutes = [
  '/',
  '/about',
  '/work',
  '/products',
  '/tools',
  '/blog',
  '/playbooks',
  '/resources',
  '/experiments',
  '/creative',
  '/social',
  '/lab',
  '/skills',
  '/exploring',
  '/personal',
  '/featured',
  '/collaborate',
  '/legal/privacy',
  '/legal/terms',
  '/legal/refund',
];

/** English sitemap. Phase 7 splits it per locale and adds hreflang alternates. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = (await getStoreProducts()).filter((p) => p.status !== 'sample');
  return [
    ...staticRoutes.map((path) => ({ url: absoluteUrl(path) })),
    ...ventures.map((v) => ({ url: absoluteUrl(`/work/${v.slug}`) })),
    ...tools.map((t) => ({ url: absoluteUrl(`/tools/${t.slug}`) })),
    ...products.map((p) => ({ url: absoluteUrl(`/products/${p.slug}`) })),
    ...posts.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      lastModified: p.updatedAt ?? p.publishedAt,
    })),
    ...playbooks.map((p) => ({
      url: absoluteUrl(`/playbooks/${p.slug}`),
      lastModified: p.updatedAt ?? p.publishedAt,
    })),
    ...experiments.map((e) => ({
      url: absoluteUrl(`/experiments/${e.slug}`),
      lastModified: e.updatedAt ?? e.publishedAt,
    })),
  ];
}
