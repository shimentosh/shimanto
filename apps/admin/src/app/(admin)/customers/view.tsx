'use client';

import type { AdminCustomerSummary } from '@shimanto/types';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterChips,
  Icon,
  LoadMore,
  LoadingState,
  PageHeader,
  SearchInput,
  StatusBadge,
  formatDate,
  formatTotals,
} from '@shimanto/ui';
import { useMemo, useState } from 'react';
import { useDebounced, usePaged } from '@/lib/use-paged';

export function CustomersView() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'' | 'ACTIVE' | 'DISABLED'>('');
  const query = useDebounced(q);
  const filter = useMemo(() => ({ q: query, status }), [query, status]);
  const list = usePaged<AdminCustomerSummary>('/v1/admin/customers', filter);

  return (
    <>
      <PageHeader
        title="Customers"
        description="Everyone with an account: buyers, free claims and customers you created orders for."
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All' },
            { value: 'ACTIVE', label: 'Active' },
            { value: 'DISABLED', label: 'Disabled' },
          ]}
        />
        <SearchInput
          className="w-full sm:w-80"
          placeholder="Search email, name or GitHub"
          aria-label="Search customers"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState rows={8} />
      ) : (
        <>
          <DataTable
            caption="Customers"
            rows={list.items}
            rowKey={(c) => c.id}
            rowHref={(c) => `/customers/${c.id}`}
            empty={<EmptyState spot="hello" title="No customers found" />}
            columns={[
              {
                key: 'customer',
                header: 'Customer',
                cell: (c) => (
                  <div className="min-w-0">
                    <p className="truncate">{c.name ?? c.email}</p>
                    {c.name && (
                      <p className="text-ink-soft truncate text-sm font-normal">{c.email}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'github',
                header: 'GitHub',
                hideOnMobile: true,
                cell: (c) =>
                  c.githubLogin ? (
                    <span className="inline-flex items-center gap-1 text-sm">
                      <Icon name="github" className="size-4" />@{c.githubLogin}
                    </span>
                  ) : (
                    <span className="text-ink-soft text-sm">—</span>
                  ),
              },
              {
                key: 'orders',
                header: 'Orders',
                align: 'right',
                hideOnMobile: true,
                cell: (c) => c.orders,
              },
              {
                key: 'spent',
                header: 'Spent',
                align: 'right',
                cell: (c) => formatTotals(c.totals),
              },
              {
                key: 'status',
                header: 'Status',
                hideOnMobile: true,
                cell: (c) => <StatusBadge status={c.status} />,
              },
              {
                key: 'joined',
                header: 'Joined',
                hideOnMobile: true,
                cell: (c) => formatDate(c.createdAt),
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
