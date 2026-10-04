import type { Accent } from '@shimanto/ui';
import { type Playbook, type PlaybookTemplate, playbooks } from '@/content/playbooks';

/** Each playbook category owns a world colour (matches the category tiles). */
const categoryWorld: Record<string, Accent> = {
  Frameworks: 'idea',
  Systems: 'signal',
  Workflows: 'build',
  SOPs: 'spark',
};

export function playbookWorld(playbook: Pick<Playbook, 'category'>): Accent {
  return categoryWorld[playbook.category] ?? 'signal';
}

/** Newest first. */
export function sortedPlaybooks(): Playbook[] {
  return [...playbooks].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

export function getPlaybook(slug: string): Playbook | undefined {
  return playbooks.find((p) => p.slug === slug);
}

/** Same category first, then shared tags. */
export function relatedPlaybooks(playbook: Playbook, limit = 3): Playbook[] {
  const tags = new Set(playbook.tags ?? []);
  return sortedPlaybooks()
    .filter((p) => p.slug !== playbook.slug)
    .map((p) => ({
      p,
      score:
        (p.category === playbook.category ? 2 : 0) +
        (p.tags ?? []).filter((t) => tags.has(t)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ p }) => p);
}

export function templateHref(playbook: Pick<Playbook, 'slug'>, template: PlaybookTemplate): string {
  return `/playbooks/${playbook.slug}/templates/${template.file}`;
}

/** "6 steps" label for cards and headers. */
export function stepCount(playbook: Playbook): string {
  return `${playbook.steps.length} step${playbook.steps.length === 1 ? '' : 's'}`;
}
