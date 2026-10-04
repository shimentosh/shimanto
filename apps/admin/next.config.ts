import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  // Private app: never indexed.
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }] }];
  },
  poweredByHeader: false,
  // packages/ui ships TypeScript source; Next compiles it.
  transpilePackages: ['@shimanto/ui'],
  images: { formats: ['image/avif', 'image/webp'] },
};

export default nextConfig;
