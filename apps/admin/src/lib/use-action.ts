'use client';

import { errorMessage, fieldErrors } from '@shimanto/sdk';
import { useCallback, useState } from 'react';

/**
 * Runs a mutation with busy / error / success state for buttons and forms.
 * `run` resolves to the action's result, or undefined when it failed (the error is kept).
 */
export function useAction() {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState<string | null>(null);

  const run = useCallback(
    async <T>(
      action: () => Promise<T>,
      opts: { key?: string; success?: string } = {},
    ): Promise<T | undefined> => {
      setBusy(opts.key ?? 'default');
      setError(null);
      setFields({});
      setSuccess(null);
      try {
        const result = await action();
        if (opts.success) setSuccess(opts.success);
        return result;
      } catch (e) {
        const byField = fieldErrors(e);
        setFields(byField);
        setError(errorMessage(e));
        return undefined;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const clear = useCallback(() => {
    setError(null);
    setSuccess(null);
    setFields({});
  }, []);

  return { run, busy, error, fields, success, clear, isBusy: (key = 'default') => busy === key };
}
