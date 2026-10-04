import { accentBg, cn } from '@shimanto/ui';
import Link from 'next/link';
import type { Playbook } from '@/content/playbooks';
import { Icon, type IconName } from '@shimanto/ui';
import { playbookWorld, stepCount } from '@/lib/playbooks';

const categoryIcon: Record<string, IconName> = {
  Frameworks: 'target',
  Systems: 'gear',
  Workflows: 'repeat',
  SOPs: 'list',
};

/** Playbook item as a framed card: category, title, outcome and a meta line. */
export function PlaybookCard({
  playbook,
  variant = 'card',
  headingLevel: Heading = 'h3',
}: {
  playbook: Playbook;
  variant?: 'card' | 'feature';
  headingLevel?: 'h2' | 'h3';
}) {
  const tone = playbookWorld(playbook);
  const feature = variant === 'feature';
  return (
    <Link
      href={`/playbooks/${playbook.slug}`}
      data-cursor="Open"
      className={cn(
        'group border-ink/10 bg-paper hover:border-ink/25 relative flex h-full flex-col overflow-hidden border transition-[transform,border-color] duration-300',
        feature
          ? 'rounded-sheet p-6 md:grid md:grid-cols-[1fr_1.4fr] md:gap-12 md:p-10'
          : 'rounded-card p-6 motion-safe:hover:-translate-y-1',
      )}
    >
      {feature && (
        <span
          aria-hidden="true"
          className={cn(
            'absolute -top-24 -left-24 size-72 rounded-full opacity-20 blur-3xl',
            accentBg[tone],
          )}
        />
      )}
      <div className="relative">
        <p className="text-ink-soft flex items-center gap-2.5 text-sm font-medium">
          <span
            aria-hidden="true"
            className={cn(
              'text-on-world grid size-8 place-items-center rounded-full',
              accentBg[tone],
            )}
          >
            <Icon name={categoryIcon[playbook.category] ?? 'list'} className="size-4" />
          </span>
          {playbook.category}
        </p>
        {feature && (
          <p className="mt-6 hidden text-6xl font-medium tracking-tighter md:block">
            {playbook.time}
          </p>
        )}
      </div>
      <div className="relative flex flex-1 flex-col">
        <Heading
          className={cn(
            'leading-snug font-medium tracking-tight text-balance group-hover:underline',
            feature ? 'mt-3 text-3xl md:mt-0 md:text-4xl md:leading-tight' : 'mt-3 text-xl',
          )}
        >
          {playbook.title}
        </Heading>
        <p className={cn('text-ink-soft mt-2', feature ? 'text-lg' : 'line-clamp-2')}>
          {playbook.outcome}
        </p>
        <p className="text-ink-soft mt-auto pt-5 text-sm">
          {stepCount(playbook)} · {playbook.time} · {playbook.level}
          {playbook.templates.length > 0 &&
            ` · ${playbook.templates.length} template${playbook.templates.length === 1 ? '' : 's'}`}
        </p>
      </div>
    </Link>
  );
}
