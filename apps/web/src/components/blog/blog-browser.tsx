'use client';

import { accentBg, cn } from '@shimanto/ui';
import { useState } from 'react';
import type { Entry } from '@/content/catalog';
import { worldFor } from '@/lib/blog';
import { PostListItem } from './post-card';

/**
 * Category chips over the editorial list. Every row is in the server HTML; filtering only hides,
 * so it works without JS (showing everything) and stays crawlable.
 */
export function BlogBrowser({ posts }: { posts: Entry[] }) {
  const [category, setCategory] = useState<string | null>(null);
  const categories = [...new Set(posts.map((p) => p.category))];
  const visible = category ? posts.filter((p) => p.category === category) : posts;

  return (
    <div>
      <div role="group" aria-label="Filter by topic" className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={category === null}
          onClick={() => setCategory(null)}
          className={cn(
            'rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors',
            category === null
              ? 'bg-ink text-canvas border-transparent'
              : 'border-ink/15 hover:border-ink/40',
          )}
        >
          All <span className="opacity-60">{posts.length}</span>
        </button>
        {categories.map((c) => {
          const sample = posts.find((p) => p.category === c)!;
          return (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn(
                'rounded-pill inline-flex items-center gap-2 border px-4 py-1.5 text-sm font-medium transition-colors',
                category === c
                  ? 'bg-ink text-canvas border-transparent'
                  : 'border-ink/15 hover:border-ink/40',
              )}
            >
              <span
                aria-hidden="true"
                className={cn('size-2 rounded-full', accentBg[worldFor(sample)])}
              />
              {c}
            </button>
          );
        })}
      </div>
      <ol className="border-ink/10 mt-10 border-b">
        {visible.map((post) => (
          <li key={post.slug}>
            <PostListItem post={post} />
          </li>
        ))}
      </ol>
    </div>
  );
}
