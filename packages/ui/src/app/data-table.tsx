import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn';

export interface Column<T> {
  key: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  /** Right-align numbers. */
  align?: 'left' | 'right';
  /** Hide on small screens (the row still links to the detail page). */
  hideOnMobile?: boolean;
  className?: string;
}

export interface DataTableProps<T> {
  columns: Array<Column<T>>;
  rows: T[];
  rowKey: (row: T) => string;
  /** Whole-row link (keyboard users get the first cell as the link). */
  rowHref?: (row: T) => string;
  caption?: string;
  empty?: ReactNode;
  className?: string;
}

/**
 * A plain, readable table: hairline rows, no zebra, no boxes. Columns marked `hideOnMobile`
 * collapse on small screens so rows stay one line.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  caption,
  empty,
  className,
}: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className={cn('-mx-1 overflow-x-auto', className)}>
      <table className="w-full border-collapse text-left text-[15px]">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-ink/10 border-b">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  'text-ink-soft px-1 py-2.5 text-[13px] font-medium whitespace-nowrap first:pl-1 sm:px-3',
                  col.align === 'right' && 'text-right',
                  col.hideOnMobile && 'hidden md:table-cell',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr
                key={rowKey(row)}
                className={cn(
                  'border-ink/[0.07] border-b last:border-b-0',
                  href && 'hover:bg-ink/[0.025] relative',
                )}
              >
                {columns.map((col, i) => (
                  <td
                    key={col.key}
                    className={cn(
                      'px-1 py-3.5 align-middle sm:px-3',
                      col.align === 'right' && 'text-right tabular-nums',
                      col.hideOnMobile && 'hidden md:table-cell',
                      col.className,
                    )}
                  >
                    {href && i === 0 ? (
                      <Link
                        href={href}
                        className="font-medium after:absolute after:inset-0 hover:underline"
                      >
                        {col.cell(row)}
                      </Link>
                    ) : (
                      col.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** "Load more" for keyset-paginated lists. */
export function LoadMore({
  onClick,
  loading,
  hasMore,
}: {
  onClick: () => void;
  loading?: boolean;
  hasMore: boolean;
}) {
  if (!hasMore) return null;
  return (
    <div className="mt-6 flex justify-center">
      <button
        type="button"
        onClick={onClick}
        disabled={loading}
        className="border-ink/15 hover:border-ink/40 rounded-pill h-10 border px-5 text-[15px] font-medium disabled:opacity-50"
      >
        {loading ? 'Loading…' : 'Load more'}
      </button>
    </div>
  );
}
