import type { PublicMedia } from '@shimanto/types';
import type { Media } from '../generated/prisma/client.js';

export interface MediaVariant {
  key: string;
  width: number;
  height: number;
  format: string;
}

/** Public URL for an object key. `base` = MEDIA_PUBLIC_URL (bucket or CDN origin). */
export function mediaUrl(base: string, key: string): string {
  return `${base.replace(/\/+$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

export function toPublicMedia(media: Media | null | undefined, base: string): PublicMedia | null {
  if (!media) return null;
  const variants = (media.variants as unknown as MediaVariant[]) ?? [];
  return {
    id: media.id,
    url: mediaUrl(base, media.key),
    mimeType: media.mimeType,
    width: media.width,
    height: media.height,
    alt: media.alt,
    blurDataUrl: media.blurDataUrl,
    variants: variants.map((v) => ({
      url: mediaUrl(base, v.key),
      width: v.width,
      height: v.height,
    })),
  };
}
