'use client';

import { type Accent, accentBg, cn } from '@shimanto/ui';
import { useId, useMemo, useState, useSyncExternalStore } from 'react';

const EVENT = 'playbook-checklist-change';
// Used when storage is blocked (private mode, disabled site data): progress lasts the visit.
const memory = new Map<string, string>();

function read(key: string): string {
  try {
    return window.localStorage.getItem(key) ?? memory.get(key) ?? '[]';
  } catch {
    return memory.get(key) ?? '[]';
  }
}

function write(key: string, value: string) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage unavailable: the in-memory copy still works for this visit.
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(EVENT, callback);
  };
}

/**
 * Tickable checklist with progress. Ticks are remembered in this browser only (a per-visitor
 * convenience); without JS it renders as a plain list of checkboxes.
 */
export function PlaybookChecklist({
  slug,
  items,
  tone,
}: {
  slug: string;
  items: string[];
  tone: Accent;
}) {
  const id = useId();
  const key = `playbook:${slug}:checklist`;
  const raw = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => '[]',
  );
  const done = useMemo(() => {
    try {
      const parsed: unknown = JSON.parse(raw);
      return new Set(Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'number') : []);
    } catch {
      return new Set<number>();
    }
  }, [raw]);
  const [copied, setCopied] = useState(false);
  const progress = items.length ? done.size / items.length : 0;

  function toggle(index: number) {
    const next = new Set(done);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    write(key, JSON.stringify([...next]));
  }

  return (
    <div className="border-ink/15 rounded-card border p-6 md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p aria-live="polite" className="font-medium">
          {done.size} of {items.length} done
          {done.size === items.length && items.length > 0 && ' 🎉'}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={async () => {
              const md = items
                .map((item, i) => `- [${done.has(i) ? 'x' : ' '}] ${item}`)
                .join('\n');
              try {
                await navigator.clipboard.writeText(md);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                setCopied(false);
              }
            }}
            className="border-ink/15 hover:border-ink/40 rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors"
          >
            {copied ? 'Copied ✓' : 'Copy as Markdown'}
          </button>
          <button
            type="button"
            onClick={() => write(key, '[]')}
            disabled={done.size === 0}
            className="border-ink/15 hover:border-ink/40 rounded-pill border px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-40"
          >
            Reset
          </button>
        </div>
      </div>
      <div aria-hidden="true" className="bg-ink/10 mt-4 h-1.5 overflow-hidden rounded-full">
        <div
          className={cn(
            'h-full origin-left rounded-full transition-transform duration-500',
            accentBg[tone],
          )}
          style={{ transform: `scaleX(${progress})` }}
        />
      </div>
      <ul className="mt-6 space-y-2">
        {items.map((item, i) => {
          const checked = done.has(i);
          return (
            <li key={item}>
              <label
                htmlFor={`${id}-${i}`}
                className={cn(
                  'rounded-button flex cursor-pointer items-start gap-4 px-4 py-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--signal)]',
                  'hover:bg-ink/5',
                )}
              >
                <input
                  id={`${id}-${i}`}
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(i)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 text-sm transition-colors',
                    checked
                      ? cn('text-on-world border-transparent', accentBg[tone])
                      : 'border-ink/25',
                  )}
                >
                  {checked ? '✓' : ''}
                </span>
                <span
                  className={cn('text-lg', checked && 'text-ink-soft line-through decoration-2')}
                >
                  {item}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
      <p className="text-ink-soft mt-5 text-sm">Your ticks are saved in this browser only.</p>
    </div>
  );
}
