'use client';

import { cn } from '@shimanto/ui';
import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

// Cloudflare's always-pass test key keeps local development working without real keys.
export const TURNSTILE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ||
  (process.env.NODE_ENV === 'development' ? '1x00000000000000000000AA' : undefined);

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id: string) => void;
    };
  }
}

/**
 * Cloudflare Turnstile widget. Reports the token (or `undefined` when it expires or fails) and
 * resets whenever `resetSignal` changes, e.g. after a rejected submission.
 */
export function Turnstile({
  onToken,
  resetSignal = 0,
  className,
}: {
  onToken: (token: string | undefined) => void;
  resetSignal?: number;
  className?: string;
}) {
  const el = useRef<HTMLDivElement>(null);
  const widget = useRef<string>(undefined);
  const callback = useRef(onToken);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    callback.current = onToken;
  }, [onToken]);

  useEffect(() => {
    if (!ready || !el.current || !window.turnstile || !TURNSTILE_KEY) return;
    widget.current = window.turnstile.render(el.current, {
      sitekey: TURNSTILE_KEY,
      callback: (token: string) => callback.current(token),
      'expired-callback': () => callback.current(undefined),
      'error-callback': () => callback.current(undefined),
    });
    return () => {
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = undefined;
    };
  }, [ready]);

  useEffect(() => {
    if (resetSignal === 0 || !widget.current) return;
    window.turnstile?.reset(widget.current);
    callback.current(undefined);
  }, [resetSignal]);

  if (!TURNSTILE_KEY) {
    return (
      <p className={cn('text-ink-soft text-sm', className)}>
        The spam check isn’t configured on this deployment, so this form can’t send yet.
      </p>
    );
  }
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="lazyOnload"
        onReady={() => setReady(true)}
      />
      <div ref={el} className={cn('min-h-[65px]', className)} />
    </>
  );
}
