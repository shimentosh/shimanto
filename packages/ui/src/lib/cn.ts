import { type ClassValue, clsx } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/** tailwind-merge taught about our custom theme keys, so `text-hero` (size) and `text-ink` (colour) don't clobber each other. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['hero', 'h2'],
      radius: ['card', 'sheet', 'pill', 'button'],
      container: ['site'],
    },
  },
});

/** Compose class names; later Tailwind classes win over earlier conflicting ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
