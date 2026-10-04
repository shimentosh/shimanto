import type { Accent } from '@shimanto/ui';
import type { IconName } from '@shimanto/ui';
import { type Entry, posts } from '@/content/catalog';

/** Each blog category owns a world colour, so covers and chips stay consistent. */
const categoryWorld: Record<string, Accent> = {
  'Founder notes': 'build',
  Business: 'idea',
  Marketing: 'create',
  Technology: 'signal',
  AI: 'spark',
  Automation: 'signal',
  'Product building': 'build',
  Lessons: 'create',
  Ideas: 'idea',
  Research: 'spark',
};

const categoryIcon: Record<string, IconName> = {
  'Founder notes': 'pen',
  Business: 'chart',
  Marketing: 'megaphone',
  Technology: 'code',
  AI: 'spark',
  Automation: 'gear',
  'Product building': 'rocket',
  Lessons: 'book',
  Ideas: 'bulb',
  Research: 'globe',
};

export function iconFor(entry: Pick<Entry, 'category'>): IconName {
  return categoryIcon[entry.category] ?? 'book';
}

/** A second accent that reads well on top of each world (cover art, hero decoration). */
export const contrastWorld: Record<Accent, Accent> = {
  build: 'spark',
  create: 'idea',
  signal: 'spark',
  idea: 'create',
  spark: 'create',
};

export function worldFor(entry: Pick<Entry, 'world' | 'category'>): Accent {
  return entry.world ?? categoryWorld[entry.category] ?? 'idea';
}

/** Newest first. */
export function sortedPosts(list: Entry[] = posts): Entry[] {
  return [...list].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** Issue number shown on covers: the oldest post is Nº 01. */
export function issueNumber(slug: string, list: Entry[] = posts): string {
  const oldestFirst = [...list].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt));
  return String(oldestFirst.findIndex((p) => p.slug === slug) + 1).padStart(2, '0');
}

/** Same category first, then shared tags, then newest. */
export function relatedPosts(entry: Entry, limit = 3): Entry[] {
  const tags = new Set(entry.tags ?? []);
  return sortedPosts()
    .filter((p) => p.slug !== entry.slug)
    .map((p) => ({
      p,
      score:
        (p.category === entry.category ? 2 : 0) + (p.tags ?? []).filter((t) => tags.has(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);
}

/** Posts in any of the given categories, newest first. */
export function postsIn(categories: string[], limit = 3): Entry[] {
  return sortedPosts()
    .filter((p) => categories.includes(p.category))
    .slice(0, limit);
}

/** Stable small hash for picking cover layouts. */
export function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}
