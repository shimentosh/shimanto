'use client';

import type { AnalyticsEventRow } from '@shimanto/types';
import {
  ActionButton,
  DataTable,
  EmptyState,
  ErrorState,
  FilterChips,
  LoadMore,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
  formatDateTime,
  formatMoney,
} from '@shimanto/ui';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { AnalyticsTabs } from '@/components/analytics-range';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';
import { usePaged } from '@/lib/use-paged';

type Filter = '' | 'server' | 'browser' | 'FAILED';

const providerLabel: Record<string, string> = { ga4: 'GA4', meta_capi: 'Meta CAPI' };
const deliveryTone: Record<string, string> = {
  SENT: 'SENT',
  FAILED: 'FAILED',
  PENDING: 'QUEUED',
  SKIPPED: 'ARCHIVED',
};

/** Recent analytics events and what happened to each provider delivery. */
export function EventsView() {
  const [filter, setFilter] = useState<Filter>('');
  const [name, setName] = useState('');
  const query = useMemo(
    () => ({
      name,
      origin: filter === 'server' || filter === 'browser' ? filter : '',
      status: filter === 'FAILED' ? 'FAILED' : '',
    }),
    [filter, name],
  );
  const list = usePaged<AnalyticsEventRow>('/v1/admin/analytics/events', query);
  const action = useAction();

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Sales from your orders and payments; traffic and funnels from first-party events."
      />
      <AnalyticsTabs />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Events"
          value={filter}
          onChange={setFilter}
          options={[
            { value: '', label: 'All' },
            { value: 'server', label: 'Server' },
            { value: 'browser', label: 'Browser' },
            { value: 'FAILED', label: 'Failed deliveries' },
          ]}
        />
        <FilterChips
          label="Event name"
          value={name}
          onChange={(v) => setName(v)}
          options={[
            { value: '', label: 'Any event' },
            { value: 'purchase', label: 'purchase' },
            { value: 'refund', label: 'refund' },
            { value: 'sign_up', label: 'sign_up' },
            { value: 'page_view', label: 'page_view' },
          ]}
        />
      </div>
      {action.error && (
        <Notice tone="danger" className="mb-4">
          {action.error}
        </Notice>
      )}
      {action.success && (
        <Notice tone="success" className="mb-4">
          {action.success}
        </Notice>
      )}

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState rows={8} />
      ) : (
        <>
          <DataTable
            caption="Analytics events"
            rows={list.items}
            rowKey={(e) => e.id}
            empty={
              <EmptyState
                spot="notebook"
                title="No events yet"
                description="Events appear as visitors browse and customers buy."
              />
            }
            columns={[
              {
                key: 'event',
                header: 'Event',
                cell: (e) => (
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-medium">{e.name}</p>
                    <p className="text-ink-soft font-mono text-xs break-all">{e.eventId}</p>
                  </div>
                ),
              },
              {
                key: 'who',
                header: 'Customer / order',
                hideOnMobile: true,
                cell: (e) => (
                  <div className="text-sm">
                    {e.customer ? (
                      <Link href={`/customers/${e.customer.id}`} className="hover:underline">
                        {e.customer.name ?? e.customer.email}
                      </Link>
                    ) : (
                      <span className="text-ink-soft">Anonymous</span>
                    )}
                    {e.order && (
                      <Link
                        href={`/orders/${e.order.id}`}
                        className="text-ink-soft block hover:underline"
                      >
                        Order #{e.order.number}
                        {e.value !== null && e.currency
                          ? ` · ${formatMoney(e.value, e.currency, { free: 'Free' })}`
                          : ''}
                      </Link>
                    )}
                  </div>
                ),
              },
              {
                key: 'source',
                header: 'Source',
                hideOnMobile: true,
                cell: (e) => (
                  <span className="text-ink-soft text-sm">
                    {e.attribution.source
                      ? `${e.attribution.source} / ${e.attribution.medium ?? '—'}`
                      : e.source === 'browser'
                        ? '(direct)'
                        : '—'}
                  </span>
                ),
              },
              {
                key: 'deliveries',
                header: 'Providers',
                cell: (e) =>
                  e.deliveries.length ? (
                    <ul className="grid gap-1.5">
                      {e.deliveries.map((d) => (
                        <li key={d.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <StatusBadge
                            status={deliveryTone[d.status] ?? d.status}
                            label={`${providerLabel[d.provider] ?? d.provider}: ${d.status.toLowerCase()}`}
                          />
                          {d.status === 'FAILED' && (
                            <ActionButton
                              size="sm"
                              variant="ghost"
                              loading={action.isBusy(d.id)}
                              onClick={async () => {
                                const ok = await action.run(
                                  () => api.post(`/v1/admin/analytics/deliveries/${d.id}/retry`),
                                  {
                                    key: d.id,
                                    success: 'Delivery retried.',
                                  },
                                );
                                if (ok) list.reload();
                              }}
                            >
                              Retry
                            </ActionButton>
                          )}
                          {d.lastError && d.status !== 'SENT' && (
                            <span className="text-ink-soft w-full text-xs">{d.lastError}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-ink-soft text-sm">
                      {e.source === 'browser' ? 'Browser tags' : 'Internal only'}
                    </span>
                  ),
              },
              {
                key: 'when',
                header: 'When',
                hideOnMobile: true,
                cell: (e) => (
                  <span className="whitespace-nowrap">{formatDateTime(e.createdAt)}</span>
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
