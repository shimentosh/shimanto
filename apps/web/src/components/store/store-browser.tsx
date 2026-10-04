'use client';

import { cn } from '@shimanto/ui';
import { type ReactNode, useState } from 'react';
import { type ProductKind, kindLabel } from '@/content/products';

/**
 * Kind filter over server-rendered product cards. Cards arrive as children keyed by kind, so the
 * cards themselves stay server components; filtering only hides.
 */
export function StoreBrowser({
  items,
}: {
  items: Array<{ slug: string; kind: ProductKind; card: ReactNode }>;
}) {
  const [kind, setKind] = useState<ProductKind | null>(null);
  const kinds = [...new Set(items.map((i) => i.kind))];
  const pill = (active: boolean) =>
    cn(
      'rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors',
      active ? 'bg-ink text-canvas border-transparent' : 'border-ink/15 hover:border-ink/40',
    );

  return (
    <div>
      {kinds.length > 1 && (
        <div role="group" aria-label="Filter by type" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={kind === null}
            onClick={() => setKind(null)}
            className={pill(kind === null)}
          >
            All <span className="opacity-60">{items.length}</span>
          </button>
          {kinds.map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
              className={pill(kind === k)}
            >
              {kindLabel[k]}{' '}
              <span className="opacity-60">{items.filter((i) => i.kind === k).length}</span>
            </button>
          ))}
        </div>
      )}
      <ul className="mt-8 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) =>
          kind === null || item.kind === kind ? <li key={item.slug}>{item.card}</li> : null,
        )}
      </ul>
    </div>
  );
}
