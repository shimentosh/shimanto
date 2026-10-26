import { bn } from './bn';
import { en } from './en';
import type { ContentOsCopy } from './types';

export type { ContentOsCopy } from './types';

export const contentOsCopy = { en, bn } satisfies Record<string, ContentOsCopy>;
export type ContentOsLocale = keyof typeof contentOsCopy;

/**
 * Where each version of Content OS is sold. Bangladesh gets the Bangla pages at half price in
 * taka (bKash, Nagad); everyone else gets English in dollars. `src/proxy.ts` sends visitors to
 * theirs by country, so there's no language switch on the pages.
 */
export interface ContentOsMarket {
  lang: ContentOsLocale;
  /** Where the pages live. */
  base: string;
  /** Store slug the buy buttons check out (a separate taka product for Bangladesh). */
  slug: string;
  /** Shown until the store answers (minor units). The store's price wins once it's live. */
  fallback: { amount: number; currency: string };
  /** Percent off the full price: the full price is shown struck through beside the price. */
  discount?: number;
}

export const CONTENT_OS_MARKETS: Record<ContentOsLocale, ContentOsMarket> = {
  en: {
    lang: 'en',
    base: '/content-os',
    slug: 'content-os',
    fallback: { amount: 11900, currency: 'USD' },
  },
  bn: {
    lang: 'bn',
    base: '/bn/content-os',
    slug: 'content-os-bd',
    fallback: { amount: 725000, currency: 'BDT' },
    discount: 50,
  },
};
