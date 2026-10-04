import { cn } from '../lib/cn';
import { type Accent, accentBg } from '../lib/worlds';

export type MilestoneType = 'LAUNCH' | 'USERS' | 'VIEWS' | 'REVENUE' | 'PRESS';

export interface Milestone {
  id: string;
  /** ISO date (YYYY or YYYY-MM or YYYY-MM-DD). */
  date: string;
  title: string;
  description?: string;
  type: MilestoneType;
  /** Optional headline figure ("35M+"). */
  value?: string;
}

/** Milestone type → world colour (brief §5 /wins). */
export const milestoneWorld: Record<MilestoneType, Accent> = {
  LAUNCH: 'build',
  USERS: 'signal',
  VIEWS: 'create',
  REVENUE: 'spark',
  PRESS: 'idea',
};

const typeLabel: Record<MilestoneType, string> = {
  LAUNCH: 'Launch',
  USERS: 'Users',
  VIEWS: 'Views',
  REVENUE: 'Revenue',
  PRESS: 'Press',
};

/** Groups milestones by year, newest year first, keeping input order inside each year. */
export function groupByYear(items: Milestone[]): Array<{ year: string; items: Milestone[] }> {
  const groups = new Map<string, Milestone[]>();
  for (const item of items) {
    const year = item.date.slice(0, 4);
    groups.set(year, [...(groups.get(year) ?? []), item]);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, grouped]) => ({ year, items: grouped }));
}

export interface TimelineProps {
  items: Milestone[];
  className?: string;
}

/** Vertical timeline with year markers and colour-coded milestone cards. Cards reveal on scroll (CSS only). */
export function Timeline({ items, className }: TimelineProps) {
  return (
    <ol className={cn('relative space-y-14', className)}>
      {groupByYear(items).map(({ year, items: yearItems }) => (
        <li key={year} className="relative grid gap-4 md:grid-cols-[minmax(0,200px)_1fr] md:gap-8">
          <h3 className="text-[clamp(40px,5vw,72px)] leading-none font-medium tracking-[-0.05em] md:sticky md:top-28 md:self-start">
            {year}
          </h3>
          <ol className="border-ink/15 space-y-5 border-l-2 pl-6 md:pl-10">
            {yearItems.map((item) => (
              <li key={item.id} className="reveal relative">
                <span
                  aria-hidden="true"
                  className={cn(
                    'ring-canvas absolute top-7 -left-[calc(1.5rem+7px)] size-3 rounded-full ring-4 md:-left-[calc(2.5rem+7px)]',
                    accentBg[milestoneWorld[item.type]],
                  )}
                />
                <article className="bg-paper rounded-card p-6 md:p-7">
                  <p className="text-ink-soft flex items-center gap-3 font-mono text-xs tracking-[0.12em] uppercase">
                    <span
                      className={cn(
                        'text-on-world rounded-pill px-2 py-0.5',
                        accentBg[milestoneWorld[item.type]],
                      )}
                    >
                      {typeLabel[item.type]}
                    </span>
                    <time dateTime={item.date}>{item.date}</time>
                  </p>
                  {item.value && (
                    <p className="mt-3 text-5xl font-medium tracking-[-0.05em]">{item.value}</p>
                  )}
                  <h4 className="mt-2 text-xl font-medium">{item.title}</h4>
                  {item.description && <p className="text-ink-soft mt-2">{item.description}</p>}
                </article>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ol>
  );
}
