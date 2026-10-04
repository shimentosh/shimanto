'use client';

import { useSyncExternalStore } from 'react';

const noSubscribe = () => () => {};
const readCancelled = () =>
  new URLSearchParams(window.location.search).get('checkout') === 'cancelled';

/** Shown when Stripe sends the buyer back with `?checkout=cancelled`. Keeps the page static. */
export function CancelledNotice() {
  const cancelled = useSyncExternalStore(noSubscribe, readCancelled, () => false);
  if (!cancelled) return null;
  return (
    <p role="status" className="bg-spark on-world rounded-button mb-6 px-5 py-3 font-medium">
      Checkout cancelled. Nothing was charged, and you can pick up where you left off below.
    </p>
  );
}
