import { type Accent, Icon, type IconName, accentBg, cn } from '@shimanto/ui';
import { VentureLogo } from '@/components/page/venture-card';
import type { Venture } from '@/content/catalog';

/** Node centres in % of the panel: a hexagon around the hub, pulled in at the sides for labels. */
const SLOTS = [
  [50, 11],
  [76, 30],
  [76, 70],
  [50, 89],
  [24, 70],
  [24, 30],
] as const;

/**
 * The venture's highlights as a system map: logo hub in the middle, each benefit a node wired to
 * it with a flowing dashed line. Decorative: the same highlights are listed in full further down.
 */
export function BenefitMap({
  venture,
  tone,
  items,
  className,
}: {
  venture: Venture;
  tone: Accent;
  items: Array<{ title: string; icon: IconName }>;
  className?: string;
}) {
  const nodes = items.slice(0, SLOTS.length);
  return (
    <div
      aria-hidden="true"
      className={cn(
        'bg-ink/[0.03] border-ink/10 rounded-sheet relative aspect-square w-full overflow-hidden border',
        className,
      )}
      style={{
        backgroundImage:
          'radial-gradient(color-mix(in oklab, var(--ink) 16%, transparent) 1px, transparent 1px)',
        backgroundSize: '18px 18px',
      }}
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
        <circle
          cx="50"
          cy="50"
          r="25"
          fill="none"
          className="stroke-ink/15"
          strokeDasharray="1 2"
          vectorEffect="non-scaling-stroke"
        />
        {nodes.map((_, i) => {
          const [x, y] = SLOTS[i]!;
          return (
            <line
              key={i}
              x1="50"
              y1="50"
              x2={x}
              y2={y}
              className="stroke-ink/30 benefit-flow"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              vectorEffect="non-scaling-stroke"
              style={{ animationDelay: `${i * -0.4}s` }}
            />
          );
        })}
      </svg>

      {/* Hub */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
        <span
          className={cn('absolute inset-0 -m-6 rounded-full opacity-30 blur-2xl', accentBg[tone])}
        />
        <span className="bg-paper ring-ink/10 relative grid place-items-center rounded-[30%] p-2 shadow-lg ring-1">
          <VentureLogo venture={venture} tone={tone} size={72} className="text-2xl ring-0" />
        </span>
      </div>

      {/* Nodes */}
      {nodes.map((item, i) => {
        const [x, y] = SLOTS[i]!;
        return (
          <div
            key={item.title}
            className="absolute w-max max-w-[46%] -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${x}%`, top: `${y}%` }}
          >
            <div
              className="art-float bg-paper border-ink/10 flex items-center gap-2 rounded-2xl border py-1.5 pr-3 pl-1.5 shadow-sm"
              style={{ animationDelay: `${i * -0.8}s` }}
            >
              <span
                className={cn(
                  'on-world grid size-7 shrink-0 place-items-center rounded-xl',
                  accentBg[tone],
                )}
              >
                <Icon name={item.icon} className="size-4" />
              </span>
              <span className="text-[12px] leading-tight font-medium sm:text-[13px]">
                {item.title}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
