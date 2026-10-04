'use client';

import { cn } from '@shimanto/ui';
import { type ReactNode, useState } from 'react';

/**
 * Category chips over server-rendered playbook cards. All cards are in the HTML; filtering only
 * hides, so it works without JS.
 */
export function PlaybookBrowser({
  categories,
  items,
}: {
  categories: string[];
  items: Array<{ slug: string; category: string; card: ReactNode }>;
}) {
  const [category, setCategory] = useState<string | null>(null);
  const pill = (active: boolean) =>
    cn(
      'rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors',
      active ? 'bg-ink text-canvas border-transparent' : 'border-ink/15 hover:border-ink/40',
    );
  const present = categories.filter((c) => items.some((i) => i.category === c));

  return (
    <div>
      {present.length > 1 && (
        <div role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={category === null}
            onClick={() => setCategory(null)}
            className={pill(category === null)}
          >
            All <span className="opacity-60">{items.length}</span>
          </button>
          {present.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={pill(category === c)}
            >
              {c} <span className="opacity-60">{items.filter((i) => i.category === c).length}</span>
            </button>
          ))}
        </div>
      )}
      <ul className="mt-8 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) =>
          category === null || item.category === category ? (
            <li key={item.slug}>{item.card}</li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
