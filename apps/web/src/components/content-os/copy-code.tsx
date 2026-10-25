'use client';

import { Icon, cn } from '@shimanto/ui';
import { useState } from 'react';

/** A code block with a copy button: each line gets a prompt, the button copies them all. */
export function CopyCode({
  code,
  copyLabel,
  copiedLabel,
}: {
  code: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="group relative rounded-[14px] bg-black/50 ring-1 ring-white/10">
      <pre className="overflow-x-auto py-3.5 pr-24 pl-4 font-mono text-[13px] leading-relaxed md:text-[14px]">
        {code.split('\n').map((line, i) => (
          <span key={i} className="block">
            <span aria-hidden="true" className="text-build mr-2 select-none">
              ›
            </span>
            {line}
          </span>
        ))}
      </pre>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          });
        }}
        className={cn(
          'rounded-pill absolute top-2.5 right-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 text-xs ring-1 transition',
          copied
            ? 'bg-build/20 text-build ring-build/40'
            : 'text-ink-soft bg-white/[0.06] ring-white/10 hover:text-[#F3EFE4]',
        )}
      >
        <Icon name={copied ? 'check' : 'copy'} className="size-3.5" />
        <span aria-live="polite">{copied ? copiedLabel : copyLabel}</span>
      </button>
    </div>
  );
}
