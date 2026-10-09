import Link from 'next/link';
import type { ReactNode } from 'react';

const LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

/** Block text with optional `[label](href)` links: internal paths use next/link, http(s) opens safely. */
export function InlineText({ text }: { text: string }): ReactNode {
  if (!text.includes('](')) return text;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    const raw = m[0];
    const label = m[1] ?? '';
    const href = m[2] ?? '';
    const at = m.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    const internal = href.startsWith('/') && !href.startsWith('//');
    if (internal) {
      parts.push(
        <Link
          key={at}
          href={href}
          className="decoration-ink/30 hover:decoration-ink underline underline-offset-4 transition-colors"
        >
          {label}
        </Link>,
      );
    } else if (/^https?:\/\//.test(href)) {
      parts.push(
        <a
          key={at}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="decoration-ink/30 hover:decoration-ink underline underline-offset-4 transition-colors"
        >
          {label}
        </a>,
      );
    } else {
      parts.push(raw);
    }
    last = at + raw.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

/** The same text without link syntax (reading time, search, feeds). */
export function plainText(text: string): string {
  return text.replace(LINK, '$1');
}
