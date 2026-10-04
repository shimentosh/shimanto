import type { ReactNode } from 'react';
import { cn } from '../lib/cn';
import { type Surface, surfaceBg } from '../lib/worlds';

export interface Stat {
  /** Big number, already formatted ("35M+"). */
  value: string;
  label: string;
  surface?: Surface;
  icon?: ReactNode;
}

export interface StatCardStackProps {
  stats: Stat[];
  className?: string;
}

const TILTS = [
  '-rotate-[4deg]',
  'rotate-[3deg]',
  '-rotate-[2deg]',
  'rotate-[5deg]',
  '-rotate-[3deg]',
];
const DEFAULT_SURFACES: Surface[] = ['paper', 'build', 'create', 'paper', 'idea'];

/**
 * Tilted big-number cards that pin and pile onto each other as you scroll.
 * Pure CSS `position: sticky`: no JS, and nothing to disable for reduced motion (it's layout, not animation).
 */
export function StatCardStack({ stats, className }: StatCardStackProps) {
  return (
    <ul className={cn('relative flex flex-col gap-[28vh] pb-[8vh]', className)}>
      {stats.map((stat, i) => (
        <li
          key={stat.label}
          className="sticky"
          style={{ top: `calc(18vh + ${i * 28}px)`, zIndex: i + 1 }}
        >
          <StatCard stat={stat} index={i} />
        </li>
      ))}
    </ul>
  );
}

export function StatCard({ stat, index = 0 }: { stat: Stat; index?: number }) {
  const surface = stat.surface ?? DEFAULT_SURFACES[index % DEFAULT_SURFACES.length] ?? 'paper';
  return (
    <div
      className={cn(
        'rounded-card relative mx-auto max-w-md p-7 shadow-[0_30px_60px_-30px_rgb(0_0_0/0.45)] md:p-9',
        surfaceBg[surface],
        TILTS[index % TILTS.length],
      )}
    >
      {stat.icon && (
        <span
          aria-hidden="true"
          className="bg-canvas text-ink absolute top-6 right-6 grid size-12 place-items-center rounded-full text-xl"
        >
          {stat.icon}
        </span>
      )}
      <p className="text-[clamp(72px,11vw,140px)] leading-[0.9] font-medium tracking-[-0.06em]">
        {stat.value}
      </p>
      <p className="mt-4 max-w-[22ch] text-lg font-medium">{stat.label}</p>
    </div>
  );
}
