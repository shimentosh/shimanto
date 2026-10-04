'use client';

import { errorMessage } from '@shimanto/sdk';
import type { Page } from '@shimanto/types';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

type Query = Record<string, string | number | undefined>;

interface State<T> {
  key: string;
  items: T[];
  next: string | null;
  error: string | null;
}

/** Keyset-paginated list with filters. Changing the filter reloads from the first page. */
export function usePaged<T>(path: string, filter: Query, limit = 50) {
  const [nonce, setNonce] = useState(0);
  const key = `${path}?${JSON.stringify(filter)}#${nonce}`;
  const [state, setState] = useState<State<T> | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api.get<Page<T>>(path, { ...filter, limit }).then(
      (page) => {
        if (!cancelled) setState({ key, items: page.items, next: page.nextCursor, error: null });
      },
      (e: unknown) => {
        if (!cancelled) setState({ key, items: [], next: null, error: errorMessage(e) });
      },
    );
    return () => {
      cancelled = true;
    };
    // `key` covers path, filter and reloads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const loadMore = useCallback(async () => {
    if (!state?.next) return;
    setLoadingMore(true);
    try {
      const page = await api.get<Page<T>>(path, { ...filter, limit, cursor: state.next });
      setState(
        (prev) => prev && { ...prev, items: [...prev.items, ...page.items], next: page.nextCursor },
      );
    } finally {
      setLoadingMore(false);
    }
  }, [state, path, filter, limit]);

  const current = state?.key === key ? state : null;
  return {
    items: current?.items ?? [],
    error: current?.error ?? null,
    loading: !current,
    hasMore: Boolean(current?.next),
    loadingMore,
    loadMore,
    reload: useCallback(() => setNonce((n) => n + 1), []),
    /** Replace one row in place (after an action). */
    update: (match: (row: T) => boolean, next: T) =>
      setState(
        (prev) => prev && { ...prev, items: prev.items.map((row) => (match(row) ? next : row)) },
      ),
  };
}

/** Search box value with a debounced copy for queries. */
export function useDebounced<T>(value: T, ms = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}
