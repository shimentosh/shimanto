import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  poweredByHeader: false,
  // packages/ui ships TypeScript source; Next compiles it.
  transpilePackages: ['@shimanto/ui'],
  images: {
    formats: ['image/avif', 'image/webp'],
    // YouTube thumbnails for the click-to-play music videos on /creative.
    remotePatterns: [{ protocol: 'https', hostname: 'i.ytimg.com', pathname: '/vi/**' }],
  },
  // The notes section was renamed from /writing to /blog.
  async redirects() {
    return [
      { source: '/writing', destination: '/blog', permanent: true },
      { source: '/writing/:slug', destination: '/blog/:slug', permanent: true },
      // The Wall of Wins page was removed.
      { source: '/wins', destination: '/about', permanent: true },
    ];
  },
};

export default nextConfig;
