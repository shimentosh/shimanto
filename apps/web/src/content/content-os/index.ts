import { en } from './en';
import type { ContentOsCopy } from './types';

export type { ContentOsCopy } from './types';

/** Store slug: the landing's buy button checks out this product. */
export const CONTENT_OS_SLUG = 'content-os';
/** Shown until the store answers (minor units). The store's price wins once it's live. */
export const CONTENT_OS_FALLBACK = { amount: 11900, currency: 'USD' };

/** Add `bn` here (and a `/bn/content-os` route) to publish the Bangla page. */
export const contentOsCopy = { en } satisfies Record<string, ContentOsCopy>;
export type ContentOsLocale = keyof typeof contentOsCopy;
