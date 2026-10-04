'use client';

import { useSyncExternalStore } from 'react';

const subscribe = (tick: () => void) => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
};
const clock = () => Math.floor(Date.now() / 1000) * 1000;

/**
 * Current time, ticking every second. The server render (and hydration) use `serverNow`, so the
 * markup matches; the client takes over right after.
 */
function useNow(serverNow: number): number {
  return useSyncExternalStore(subscribe, clock, () => serverNow);
}

const DAY = 86_400_000;
const fmt = new Intl.NumberFormat('en');

/**
 * Days online since `since`. Only the year is on record, so it counts from the last day of that
 * year: a floor, hence the "+".
 */
export function OnlineCounter({
  since,
  startedAtAge,
  serverNow,
}: {
  since: number;
  startedAtAge: number;
  serverNow: number;
}) {
  const now = useNow(serverNow);
  const days = Math.floor((now - Date.UTC(since, 11, 31)) / DAY);
  const years = new Date(now).getUTCFullYear() - since;
  return (
    <div className="bg-night text-cream rounded-card relative overflow-hidden p-6 ring-1 ring-white/10 md:p-7">
      <div
        aria-hidden="true"
        className="bg-build/25 pointer-events-none absolute -top-16 -right-16 size-48 rounded-full blur-3xl"
      />
      <p className="relative flex items-center gap-2 font-mono text-[11px] tracking-[0.16em] text-white/60 uppercase">
        <span className="relative grid size-2 place-items-center">
          <span className="motif-ping bg-build absolute inset-0 rounded-full" />
          <span className="bg-build relative size-2 rounded-full" />
        </span>
        Online since {since}
      </p>
      <p className="relative mt-4 flex items-baseline gap-1 text-[clamp(48px,6vw,72px)] leading-none font-medium tracking-[-0.05em] tabular-nums">
        {fmt.format(days)}
        <span className="text-build text-[0.5em]">+</span>
      </p>
      <p className="relative mt-2 text-lg">days online, and counting.</p>
      <p className="relative mt-4 text-sm text-white/60">
        {years} years since I started, at {startedAtAge}.
      </p>
    </div>
  );
}

/** How much of this year is already gone, to six decimals, so it visibly ticks every second. */
export function YearProgress({ serverNow }: { serverNow: number }) {
  const now = useNow(serverNow);
  // UTC on both sides, so the server render and hydration agree.
  const year = new Date(now).getUTCFullYear();
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const done = ((now - start) / (end - start)) * 100;
  return (
    <div className="border-ink/10 rounded-card border p-5">
      <div className="flex items-baseline justify-between gap-4">
        <p className="text-ink-soft text-sm font-medium">{year} so far</p>
        <p className="font-mono text-sm tabular-nums">{done.toFixed(6)}%</p>
      </div>
      <div
        role="progressbar"
        aria-label={`${year} so far`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(done)}
        className="bg-ink/[0.07] mt-3 h-2.5 overflow-hidden rounded-full"
      >
        <div
          className="from-build via-signal to-idea h-full rounded-full bg-linear-to-r transition-[width] duration-1000 ease-linear"
          style={{ width: `${done}%` }}
        />
      </div>
      <p className="text-ink-soft mt-3 text-sm">
        Gone for good. The best use of the rest: ship something.
      </p>
    </div>
  );
}
