import type { MetadataRoute } from 'next';
import { site } from '@/lib/site';

/** Web app manifest: lets phones install the site and open it full-screen, like an app. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${site.name} — ${site.tagline}`,
    short_name: site.name,
    description: site.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0E0F0C',
    theme_color: '#0E0F0C',
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/brand/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      { name: 'Work', url: '/work' },
      { name: 'Tools', url: '/tools' },
      { name: 'Blog', url: '/blog' },
    ],
  };
}
