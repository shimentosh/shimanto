import { cn } from '@shimanto/ui';
import Link from 'next/link';
import { absoluteUrl } from '@/lib/site';
import { JsonLd } from './json-ld';

export type Crumb = { label: string; href: string };

/**
 * Visible trail plus BreadcrumbList schema. Home is prepended automatically. The current page's
 * label is capped and ellipsised so long post titles stay on one line.
 */
export function Breadcrumbs({
  items,
  align = 'start',
}: {
  items: Crumb[];
  align?: 'start' | 'center';
}) {
  const trail = [{ label: 'Home', href: '/' }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol
          className={cn(
            'text-ink-soft flex flex-wrap items-center gap-2 font-mono text-xs tracking-[0.14em] uppercase',
            align === 'center' && 'justify-center',
          )}
        >
          {trail.map((crumb, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={crumb.href} className="flex min-w-0 items-center gap-2">
                {last ? (
                  <span
                    aria-current="page"
                    title={crumb.label}
                    className="text-ink block max-w-[36ch] truncate"
                  >
                    {crumb.label}
                  </span>
                ) : (
                  <>
                    <Link
                      href={crumb.href}
                      className="hover:text-ink underline-offset-4 hover:underline"
                    >
                      {crumb.label}
                    </Link>
                    <span aria-hidden="true">/</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: trail.map((crumb, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: crumb.label,
            item: absoluteUrl(crumb.href),
          })),
        }}
      />
    </>
  );
}
