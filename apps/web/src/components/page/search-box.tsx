'use client';

import { Chip } from '@shimanto/ui';
import Link from 'next/link';
import { useDeferredValue, useEffect, useId, useMemo, useState } from 'react';
import { searchDocs } from '@/lib/search';
import type { SearchDoc } from '@/lib/search-index';

/** Instant, client-side search over the prebuilt index. The query is mirrored to `?q=`. */
export function SearchBox({
  docs,
  initialQuery = '',
}: {
  docs: SearchDoc[];
  initialQuery?: string;
}) {
  const inputId = useId();
  const [query, setQuery] = useState(initialQuery);
  const deferred = useDeferredValue(query);

  const results = useMemo(() => searchDocs(docs, deferred), [deferred, docs]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (deferred) url.searchParams.set('q', deferred);
    else url.searchParams.delete('q');
    window.history.replaceState(null, '', url);
  }, [deferred]);

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        Search the site
      </label>
      <div className="border-ink/20 rounded-pill flex items-center gap-3 border px-5 py-3.5 focus-within:outline-3 focus-within:outline-offset-3 focus-within:outline-[var(--signal)]">
        <svg
          viewBox="0 0 24 24"
          className="text-ink-soft size-6 shrink-0"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.8" />
          <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <input
          id={inputId}
          type="search"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Ventures, products, notes, skills…"
          className="placeholder:text-ink-soft/70 min-w-0 flex-1 bg-transparent text-lg outline-none focus-visible:shadow-none focus-visible:outline-none md:text-xl"
        />
      </div>

      <p aria-live="polite" className="text-ink-soft mt-6 text-sm">
        {deferred
          ? `${results.length} result${results.length === 1 ? '' : 's'}`
          : 'Start typing to search'}
      </p>

      {results.length > 0 && (
        <ul className="border-ink/10 mt-4 border-b">
          {results.map((doc) => (
            <li key={`${doc.kind}-${doc.href}-${doc.title}`}>
              <Link
                href={doc.href}
                className="group border-ink/10 flex items-center justify-between gap-4 border-t py-4"
              >
                <span className="text-lg font-medium group-hover:underline">{doc.title}</span>
                <Chip className="shrink-0">{doc.kind}</Chip>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {deferred && results.length === 0 && (
        <p className="mt-4 text-lg">
          Nothing matches &ldquo;{deferred}&rdquo;. Try a venture name, or{' '}
          <Link href="/collaborate" className="font-medium underline underline-offset-4">
            ask me directly
          </Link>
          .
        </p>
      )}
    </div>
  );
}
