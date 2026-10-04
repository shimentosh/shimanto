import type { Accent } from '@shimanto/ui';
import {
  experiments,
  playbooks,
  posts,
  skills,
  ventures,
  writingCategories,
} from '@/content/catalog';
import { footerColumns, legalNav, menuGroups, primaryNav } from '@/content/navigation';
import { tools } from '@/content/tools';
import { worldFor } from './blog';
import { getStoreProducts } from './store';

export interface SearchDoc {
  href: string;
  title: string;
  kind: string;
  /** Everything matched against (title included). */
  text: string;
  /** One line under the title in results. */
  summary?: string;
  /** Small label on the right, e.g. a category or status. */
  hint?: string;
  tone?: Accent;
  /** Square logo, shown instead of the kind's icon. */
  image?: string;
}

/**
 * Everything /search and the ⌘K palette can find, built from the same content the pages render.
 * The palette fetches it as static JSON from `/search-index.json` on first open.
 */
export async function buildSearchIndex(): Promise<SearchDoc[]> {
  // Same list the store shows, so products added in the admin are findable too.
  const products = await getStoreProducts();
  const pages = new Map<string, string>();
  for (const link of [
    ...primaryNav,
    ...menuGroups.flatMap((g) => g.links),
    ...footerColumns.flatMap((c) => c.links),
    ...legalNav,
  ]) {
    pages.set(link.href, link.label);
  }
  return [
    ...[...pages].map(([href, title]) => ({ href, title, kind: 'Page', text: title })),
    ...ventures.map((v) => ({
      href: `/work/${v.slug}`,
      title: v.name,
      kind: 'Venture',
      text: [v.name, v.oneLiner, v.category].filter(Boolean).join(' '),
      summary: v.oneLiner,
      hint: v.category,
      image: v.logo,
    })),
    ...products.map((p) => ({
      href: `/products/${p.slug}`,
      title: p.name,
      kind: 'Product',
      text: [p.name, p.tagline, p.summary, p.kind, ...p.highlights].join(' '),
      summary: p.tagline,
      hint:
        p.status === 'available' ? p.priceLabel : p.status === 'sample' ? 'Sample' : 'Coming soon',
      tone: p.world,
    })),
    ...posts.map((p) => ({
      href: `/blog/${p.slug}`,
      title: p.title,
      kind: 'Blog post',
      text: [p.title, p.summary, p.category, ...(p.tags ?? [])].join(' '),
      summary: p.summary,
      hint: p.category,
      tone: worldFor(p),
    })),
    ...playbooks.map((p) => ({
      href: `/playbooks/${p.slug}`,
      title: p.title,
      kind: 'Playbook',
      text: [p.title, p.summary, p.category, p.outcome, ...(p.tags ?? []), ...p.tools].join(' '),
      summary: p.summary,
      hint: `${p.level} · ${p.time}`,
      tone: worldFor(p),
    })),
    ...tools.map((t) => ({
      href: `/tools/${t.slug}`,
      title: t.name,
      kind: 'Tool',
      text: [t.name, t.kind, t.tagline, ...t.tags].join(' '),
      summary: t.tagline,
      hint: t.kind,
      tone: t.tone,
      image: t.logo.src,
    })),
    ...experiments.map((e) => ({
      href: `/experiments/${e.slug}`,
      title: e.title,
      kind: 'Experiment',
      text: `${e.title} ${e.summary}`,
      summary: e.summary,
      tone: worldFor(e),
    })),
    ...skills.map((s) => ({
      href: '/skills',
      title: s.name,
      kind: 'Skill',
      text: `${s.name} ${s.summary}`,
      summary: s.summary,
      tone: s.tone,
    })),
    ...writingCategories.map((c) => ({ href: '/blog', title: c, kind: 'Topic', text: c })),
  ];
}
