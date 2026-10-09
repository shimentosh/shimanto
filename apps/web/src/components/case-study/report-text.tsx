import type { ReactNode } from 'react';
import { InlineText, plainText } from '@/components/page/inline-text';

/**
 * `[^n]` citation markers. Published text only has numbers; a draft can still hold `[^?key]` for a
 * claim whose source is not linked yet (Publishing OS reports it as an error before publishing).
 */
const CITATION = /\[\^([^\]\s]+)\]/g;

/** Paragraph text with links and `[^n]` citation markers rendered as superscript source links. */
export function ReportText({ text }: { text: string }): ReactNode {
  if (!text.includes('[^')) return <InlineText text={text} />;
  const parts: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(CITATION)) {
    const at = m.index ?? 0;
    const n = m[1] ?? '';
    if (at > last) parts.push(<InlineText key={`t${last}`} text={text.slice(last, at)} />);
    parts.push(
      <sup key={`c${at}`} className="ml-0.5 font-mono text-[0.62em] leading-none">
        {/^\d+$/.test(n) ? (
          <a
            href={`#source-${n}`}
            aria-label={`Source ${n}`}
            className="text-ink-soft hover:text-ink rounded-sm px-0.5 no-underline transition-colors"
          >
            [{n}]
          </a>
        ) : (
          <span title="Citation without a linked source" className="text-ink-soft px-0.5">
            [?]
          </span>
        )}
      </sup>,
    );
    last = at + m[0].length;
  }
  if (last < text.length) parts.push(<InlineText key={`t${last}`} text={text.slice(last)} />);
  return <>{parts}</>;
}

/** The same text without links or citation markers (reading time, search, feeds). */
export function reportPlainText(text: string): string {
  // Markers first, so `[^1](…)` is never read as a link labelled "^1".
  return plainText(text.replace(CITATION, ''));
}
