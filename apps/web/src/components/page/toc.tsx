'use client';

import { cn } from '@shimanto/ui';
import { useEffect, useState } from 'react';

/**
 * Table of contents with scroll-spy: the heading nearest the top third of the viewport is
 * marked `aria-current`. Without JS it is a plain list of anchor links.
 */
export function Toc({ headings }: { headings: Array<{ id: string; text: string }> }) {
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const targets = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => el !== null);
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '0px 0px -66% 0px' },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav aria-label="On this page">
      <p className="text-ink-soft font-mono text-xs tracking-[0.2em] uppercase">On this page</p>
      <ol className="border-ink/10 mt-4 space-y-1 border-l-2">
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              aria-current={active === h.id ? 'location' : undefined}
              className={cn(
                '-ml-0.5 block border-l-2 py-1.5 pl-4 text-[15px] transition-colors',
                active === h.id
                  ? 'border-ink text-ink font-medium'
                  : 'text-ink-soft hover:text-ink border-transparent',
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
