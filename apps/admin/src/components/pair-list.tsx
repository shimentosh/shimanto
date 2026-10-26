'use client';

import { ActionButton, Field, Input, Textarea } from '@shimanto/ui';

export interface Pair {
  first: string;
  second: string;
}

/**
 * A repeatable list of two-field rows (feature title + description, question + answer), with
 * add, remove and move up. Empty rows are dropped when the form is saved.
 */
export function PairList({
  items,
  onChange,
  firstLabel,
  secondLabel,
  addLabel,
  max,
  firstMax,
  secondMax,
}: {
  items: Pair[];
  onChange: (items: Pair[]) => void;
  firstLabel: string;
  secondLabel: string;
  addLabel: string;
  max: number;
  firstMax: number;
  secondMax: number;
}) {
  const update = (i: number, patch: Partial<Pair>) =>
    onChange(items.map((item, j) => (j === i ? { ...item, ...patch } : item)));
  const move = (i: number) => {
    const next = [...items];
    [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
    onChange(next);
  };

  return (
    <div className="grid gap-3">
      {items.map((item, i) => (
        <div key={i} className="border-ink/10 grid gap-3 rounded-2xl border p-4">
          <div className="flex items-start gap-3">
            <span className="text-ink-soft mt-2.5 w-5 shrink-0 font-mono text-xs tabular-nums">
              {String(i + 1).padStart(2, '0')}
            </span>
            <div className="grid min-w-0 flex-1 gap-3">
              <Field label={firstLabel}>
                {(p) => (
                  <Input
                    {...p}
                    maxLength={firstMax}
                    value={item.first}
                    onChange={(e) => update(i, { first: e.target.value })}
                  />
                )}
              </Field>
              <Field label={secondLabel}>
                {(p) => (
                  <Textarea
                    {...p}
                    rows={2}
                    maxLength={secondMax}
                    value={item.second}
                    onChange={(e) => update(i, { second: e.target.value })}
                  />
                )}
              </Field>
            </div>
            <div className="flex shrink-0 flex-col gap-1">
              <ActionButton
                size="sm"
                variant="ghost"
                aria-label={`Remove ${firstLabel.toLowerCase()} ${i + 1}`}
                icon="trash"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
              />
              {i > 0 && (
                <ActionButton
                  size="sm"
                  variant="ghost"
                  aria-label={`Move ${firstLabel.toLowerCase()} ${i + 1} up`}
                  onClick={() => move(i)}
                >
                  ↑
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      ))}
      {items.length < max && (
        <div>
          <ActionButton
            size="sm"
            variant="secondary"
            icon="plus"
            onClick={() => onChange([...items, { first: '', second: '' }])}
          >
            {addLabel}
          </ActionButton>
        </div>
      )}
    </div>
  );
}

/** Rows with both fields filled, trimmed. */
export const filledPairs = (items: Pair[]) =>
  items
    .map((item) => ({ first: item.first.trim(), second: item.second.trim() }))
    .filter((item) => item.first && item.second);
