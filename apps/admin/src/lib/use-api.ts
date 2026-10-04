'use client';

import { errorMessage } from '@shimanto/sdk';
import { useCallback, useEffect, useState } from 'react';
import { api } from './api';

export interface ApiState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  /** Loads again (keeps showing the current data meanwhile). */
  reload: () => void;
  setData: (data: T) => void;
}

interface Result<T> {
  key: string | null;
  path: string | null;
  data?: T;
  error: string | null;
}

/** Loads a GET endpoint on mount and whenever `path` changes. `null` = don't load yet. */
export function useApi<T>(path: string | null): ApiState<T> {
  const [nonce, setNonce] = useState(0);
  const key = path ? `${path}#${nonce}` : null;
  const [result, setResult] = useState<Result<T>>({ key: null, path: null, error: null });

  useEffect(() => {
    if (!path || !key) return;
    let cancelled = false;
    api.get<T>(path).then(
      (data) => {
        if (!cancelled) setResult({ key, path, data, error: null });
      },
      (error: unknown) => {
        if (!cancelled) {
          setResult((prev) => ({
            key,
            path,
            data: prev.path === path ? prev.data : undefined,
            error: errorMessage(error),
          }));
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [path, key]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  const setData = useCallback((data: T) => setResult((prev) => ({ ...prev, path, data })), [path]);

  const current = result.path === path;
  return {
    data: current ? result.data : undefined,
    error: current && result.key === key ? result.error : null,
    loading: Boolean(key) && result.key !== key,
    reload,
    setData,
  };
}
