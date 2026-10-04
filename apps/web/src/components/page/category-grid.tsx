import { type Accent, accentBg, cn } from '@shimanto/ui';
import Link from 'next/link';
import { Icon, type IconName } from '@shimanto/ui';

export interface CategoryItem {
  name: string;
  note?: string;
  href?: string;
  tone?: Accent;
  icon?: IconName;
  meta?: string;
}

const tones: Accent[] = ['build', 'create', 'signal', 'idea', 'spark'];

/** Categories, departments, disciplines: a clean two-column list with icons and hairlines. */
export function CategoryGrid({
  items,
  label,
  className,
}: {
  items: CategoryItem[];
  label: string;
  className?: string;
}) {
  return (
    <ul aria-label={label} className={cn('grid gap-x-10 sm:grid-cols-2', className)}>
      {items.map((item, i) => {
        const tone = item.tone ?? tones[i % tones.length]!;
        const body = (
          <>
            {item.icon ? (
              <span
                aria-hidden="true"
                className={cn(
                  'text-on-world grid size-10 shrink-0 place-items-center rounded-full',
                  accentBg[tone],
                )}
              >
                <Icon name={item.icon} />
              </span>
            ) : (
              <span
                aria-hidden="true"
                className={cn('mt-2 size-2 shrink-0 rounded-full', accentBg[tone])}
              />
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-lg font-medium">{item.name}</span>
              {item.note && <span className="text-ink-soft block">{item.note}</span>}
            </span>
            {item.meta && <span className="text-ink-soft shrink-0 pt-1 text-sm">{item.meta}</span>}
            {item.href && (
              <span
                aria-hidden="true"
                className="text-ink-soft pt-0.5 transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            )}
          </>
        );
        const classes = 'border-ink/10 flex items-start gap-4 border-t py-5';
        return (
          <li key={item.name}>
            {item.href ? (
              <Link href={item.href} className={cn('group hover:text-ink', classes)}>
                {body}
              </Link>
            ) : (
              <div className={classes}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
