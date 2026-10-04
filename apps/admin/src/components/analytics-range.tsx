'use client';

import { FilterChips, Input, Tabs } from '@shimanto/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

export type RangeKey = 'today' | '7d' | '30d' | '90d' | 'custom';

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const toDateInput = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Date range from the URL (`?range=7d` or `?range=custom&from=2026-09-01&to=2026-09-26`), in local days. */
export function useAnalyticsRange() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const key = (params.get('range') as RangeKey) || '30d';
  const fromParam = params.get('from');
  const toParam = params.get('to');

  const range = useMemo(() => {
    const today = startOfDay(new Date());
    const endOfToday = new Date(today.getTime() + 86_400_000 - 1);
    const days = { today: 1, '7d': 7, '30d': 30, '90d': 90 } as const;
    if (key === 'custom' && fromParam && toParam) {
      const from = new Date(`${fromParam}T00:00:00`);
      const to = new Date(`${toParam}T23:59:59.999`);
      if (!Number.isNaN(from.getTime()) && !Number.isNaN(to.getTime())) {
        return {
          from: from.toISOString(),
          to: to.toISOString(),
          fromDate: fromParam,
          toDate: toParam,
        };
      }
    }
    const n = key in days ? days[key as keyof typeof days] : 30;
    const from = new Date(today.getTime() - (n - 1) * 86_400_000);
    return {
      from: from.toISOString(),
      to: endOfToday.toISOString(),
      fromDate: toDateInput(from),
      toDate: toDateInput(today),
    };
  }, [key, fromParam, toParam]);

  const set = (next: Record<string, string | null>) => {
    const q = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    router.replace(`${pathname}?${q}`);
  };

  return { key, range, set };
}

export function AnalyticsTabs() {
  const pathname = usePathname();
  const search = useSearchParams();
  const qs = search.toString();
  return (
    <Tabs
      items={[
        {
          label: 'Overview',
          href: `/analytics${qs ? `?${qs}` : ''}`,
          active: pathname === '/analytics',
        },
        { label: 'Events', href: '/analytics/events', active: pathname === '/analytics/events' },
      ]}
    />
  );
}

export function RangePicker() {
  const { key, range, set } = useAnalyticsRange();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <FilterChips
        label="Date range"
        value={key}
        onChange={(v) =>
          set({
            range: v || '30d',
            ...(v === 'custom'
              ? { from: range.fromDate, to: range.toDate }
              : { from: null, to: null }),
          })
        }
        options={[
          { value: 'today', label: 'Today' },
          { value: '7d', label: '7 days' },
          { value: '30d', label: '30 days' },
          { value: '90d', label: '90 days' },
          { value: 'custom', label: 'Custom' },
        ]}
      />
      {key === 'custom' && (
        <div className="flex items-center gap-2">
          <Input
            type="date"
            aria-label="From"
            value={range.fromDate}
            max={range.toDate}
            onChange={(e) => e.target.value && set({ from: e.target.value })}
            className="h-9 py-0"
          />
          <span className="text-ink-soft text-sm">to</span>
          <Input
            type="date"
            aria-label="To"
            value={range.toDate}
            min={range.fromDate}
            onChange={(e) => e.target.value && set({ to: e.target.value })}
            className="h-9 py-0"
          />
        </div>
      )}
    </div>
  );
}
