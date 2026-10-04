'use client';

import {
  DataTable,
  EmptyState,
  ErrorState,
  LoadMore,
  LoadingState,
  PageHeader,
  Select,
  formatDateTime,
} from '@shimanto/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePaged } from '@/lib/use-paged';

interface AuditRow {
  id: string;
  actorType: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  meta: unknown;
  createdAt: string;
}

const ENTITIES = [
  'Order',
  'Delivery',
  'Product',
  'ProductFile',
  'Media',
  'Coupon',
  'Customer',
  'SupportTicket',
  'Setting',
  'Lead',
  'User',
];

const links: Record<string, (id: string) => string> = {
  Order: (id) => `/orders/${id}`,
  Product: (id) => `/products/${id}`,
  Customer: (id) => `/customers/${id}`,
  SupportTicket: (id) => `/tickets/${id}`,
};

/** Append-only record of privileged changes: who did what, when. */
export function AuditView() {
  const [entity, setEntity] = useState('');
  const filter = useMemo(() => ({ entity }), [entity]);
  const list = usePaged<AuditRow>('/v1/admin/audit-log', filter);

  return (
    <>
      <PageHeader
        title="Audit log"
        description="Every privileged change (orders, refunds, deliveries, products, files, settings) with who made it."
        actions={
          <Select
            aria-label="Filter by entity"
            value={entity}
            onChange={(e) => setEntity(e.target.value)}
            className="h-10 w-48 py-0"
          >
            <option value="">Everything</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </Select>
        }
      />
      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState rows={8} />
      ) : (
        <>
          <DataTable
            caption="Audit log"
            rows={list.items}
            rowKey={(r) => r.id}
            empty={<EmptyState spot="notebook" title="Nothing recorded yet" />}
            columns={[
              {
                key: 'when',
                header: 'When',
                cell: (r) => (
                  <span className="whitespace-nowrap">{formatDateTime(r.createdAt)}</span>
                ),
              },
              {
                key: 'action',
                header: 'Action',
                cell: (r) => <span className="font-mono text-sm">{r.action}</span>,
              },
              {
                key: 'entity',
                header: 'Record',
                cell: (r) => {
                  const href = r.entityId && links[r.entity]?.(r.entityId);
                  return href ? (
                    <Link href={href} className="hover:underline">
                      {r.entity}
                    </Link>
                  ) : (
                    r.entity
                  );
                },
              },
              {
                key: 'actor',
                header: 'By',
                hideOnMobile: true,
                cell: (r) =>
                  r.actorType === 'user'
                    ? 'Team member'
                    : r.actorType === 'system'
                      ? 'System'
                      : 'API key',
              },
              {
                key: 'meta',
                header: 'Details',
                hideOnMobile: true,
                cell: (r) => (
                  <span className="text-ink-soft line-clamp-2 font-mono text-xs break-all">
                    {r.meta ? JSON.stringify(r.meta) : '—'}
                  </span>
                ),
              },
            ]}
          />
          <LoadMore
            hasMore={list.hasMore}
            loading={list.loadingMore}
            onClick={() => void list.loadMore()}
          />
        </>
      )}
    </>
  );
}
