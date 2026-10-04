'use client';

import type { VentureStatus } from '@shimanto/types';
import { cn } from '@shimanto/ui';
import { useState } from 'react';
import { type Venture, ventureStatusLabel } from '@/content/catalog';
import { VentureCard } from './venture-card';

/** Venture showcase cards with status tabs. All cards are in the HTML; filtering only hides. */
export function VentureGrid({ ventures }: { ventures: Venture[] }) {
  const [status, setStatus] = useState<VentureStatus | 'ALL'>('ALL');
  const present = [...new Set(ventures.map((v) => v.status))];
  const options: Array<VentureStatus | 'ALL'> = ['ALL', ...present];
  const count = (s: VentureStatus | 'ALL') =>
    s === 'ALL' ? ventures.length : ventures.filter((v) => v.status === s).length;

  return (
    <div>
      {present.length > 1 && (
        <div role="group" aria-label="Filter by status" className="mb-6 flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={status === option}
              onClick={() => setStatus(option)}
              className={cn(
                'rounded-pill border px-4 py-1.5 text-sm font-medium transition-colors',
                status === option
                  ? 'bg-ink text-canvas border-transparent'
                  : 'border-ink/15 hover:border-ink/40',
              )}
            >
              {option === 'ALL' ? 'All' : ventureStatusLabel[option]}{' '}
              <span className="opacity-60">{count(option)}</span>
            </button>
          ))}
        </div>
      )}
      <ul className="grid gap-4 md:grid-cols-2">
        {ventures.map((venture, i) =>
          status === 'ALL' || venture.status === status ? (
            <li key={venture.slug}>
              <VentureCard venture={venture} index={i} />
            </li>
          ) : null,
        )}
      </ul>
    </div>
  );
}
