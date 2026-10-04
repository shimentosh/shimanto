'use client';

import { type CommandGroup, type CommandItem, CommandPalette, type IconName } from '@shimanto/ui';
import { commandGroups } from '@/content/navigation';
import { searchDocs } from '@/lib/search';
import type { SearchDoc } from '@/lib/search-index';

let index: Promise<SearchDoc[]> | undefined;

/** Fetched once, on the first search, then reused for every keystroke. */
function loadIndex(): Promise<SearchDoc[]> {
  index ??= fetch('/search-index.json')
    .then((res) => {
      if (!res.ok) throw new Error(`search index: ${res.status}`);
      return res.json() as Promise<SearchDoc[]>;
    })
    .catch((error: unknown) => {
      index = undefined; // let the next keystroke retry
      throw error;
    });
  return index;
}

/** Icon per page, used for the shortcuts and for page results. */
const pageIcon: Record<string, IconName> = {
  '/': 'home',
  '/work': 'briefcase',
  '/products': 'box',
  '/blog': 'pen',
  '/playbooks': 'book',
  '/tools': 'wrench',
  '/collaborate': 'chat',
  '/experiments': 'flask',
  '/resources': 'layers',
  '/lab': 'megaphone',
  '/skills': 'spark',
  '/exploring': 'compass',
  '/creative': 'music',
  '/social': 'users',
  '/featured': 'target',
  '/about': 'user',
  '/personal': 'heart',
  '/legal/privacy': 'shield',
  '/legal/terms': 'file',
  '/legal/refund': 'refund',
};

/** One line under the main shortcuts, so the empty palette explains itself. */
const pageNote: Record<string, string> = {
  '/': 'Start here',
  '/work': 'Ventures and software I’ve built',
  '/products': 'Apps and systems, packaged for you',
  '/blog': 'Founder notes on business, tech and AI',
  '/playbooks': 'Frameworks and methods I use',
  '/tools': 'Free tools I’ve built',
  '/collaborate': 'Tell me what you’re building',
};

const kindIcon: Record<string, IconName> = {
  Product: 'box',
  'Blog post': 'pen',
  Playbook: 'book',
  Tool: 'wrench',
  Venture: 'rocket',
  Experiment: 'flask',
  Skill: 'spark',
  Topic: 'tag',
};

/** Rows per kind, so one busy kind can't push the others off screen. */
const PER_GROUP = 5;

const shortcuts: CommandGroup[] = commandGroups.map((group) => ({
  ...group,
  items: group.items.map((item) => ({
    ...item,
    icon: pageIcon[item.href] ?? 'arrowRight',
    description: pageNote[item.href],
    hint: undefined,
  })),
}));

function toItem(doc: SearchDoc): CommandItem {
  return {
    label: doc.title,
    href: doc.href,
    description: doc.summary,
    hint: doc.hint,
    image: doc.image,
    icon:
      doc.kind === 'Page' ? (pageIcon[doc.href] ?? 'arrowRight') : (kindIcon[doc.kind] ?? 'file'),
    tone: doc.tone,
  };
}

/** Results grouped by kind (best match's kind first), a few per group, plus a "see all" link. */
async function search(query: string): Promise<CommandGroup[]> {
  const q = query.trim();
  const docs = searchDocs(await loadIndex(), q, 200);
  const byKind = new Map<string, CommandGroup>();
  for (const doc of docs) {
    const heading = doc.kind === 'Page' ? 'Pages' : `${doc.kind}s`;
    const group = byKind.get(heading) ?? { heading, items: [] };
    if (group.items.length < PER_GROUP) group.items.push(toItem(doc));
    byKind.set(heading, group);
  }
  return [
    ...byKind.values(),
    {
      heading: 'More',
      items: [
        {
          label: `See all ${docs.length} result${docs.length === 1 ? '' : 's'} for “${q}”`,
          href: `/search?q=${encodeURIComponent(q)}`,
          icon: 'search',
        },
      ],
    },
  ];
}

/** The ⌘K palette: page shortcuts until you type, then full-site results. */
export function SiteCommandPalette() {
  return (
    <CommandPalette
      groups={shortcuts}
      search={search}
      placeholder="Search products, posts, tools, playbooks…"
    />
  );
}
