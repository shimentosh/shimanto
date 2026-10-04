'use client';

import { cn } from '@shimanto/ui';
import { useState } from 'react';
import { PlatformMark } from '@/components/page/social-icon';

/** Share without trackers: plain intent URLs plus copy-link, as round brand-icon buttons. */
export function ShareLinks({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const targets = [
    {
      label: 'X',
      hover: 'hover:bg-black hover:text-white hover:border-black',
      href: `https://x.com/intent/post?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: 'LinkedIn',
      hover: 'hover:bg-[#0a66c2] hover:text-white hover:border-[#0a66c2]',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
    {
      label: 'Facebook',
      hover: 'hover:bg-[#0866ff] hover:text-white hover:border-[#0866ff]',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
    },
  ];
  const round =
    'border-ink/15 grid size-10 place-items-center rounded-full border transition-colors';

  return (
    <div>
      <p className="text-ink-soft font-mono text-xs tracking-[0.2em] uppercase">Share</p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {targets.map((t) => (
          <li key={t.label}>
            <a
              href={t.href}
              target="_blank"
              rel="noopener noreferrer"
              title={`Share on ${t.label}`}
              className={cn(round, t.hover)}
            >
              <PlatformMark platform={t.label} className="size-4" />
              <span className="sr-only">Share on {t.label} (opens in a new tab)</span>
            </a>
          </li>
        ))}
        <li>
          <button
            type="button"
            title="Copy link"
            className={cn(
              round,
              copied ? 'bg-build text-on-world border-transparent' : 'hover:border-ink/40',
            )}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
          >
            <svg
              viewBox="0 0 24 24"
              aria-hidden="true"
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {copied ? (
                <path d="M5 12.5l4.5 4.5L19 7.5" />
              ) : (
                <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />
              )}
            </svg>
            <span aria-live="polite" className="sr-only">
              {copied ? 'Link copied' : 'Copy link'}
            </span>
          </button>
        </li>
      </ul>
    </div>
  );
}
