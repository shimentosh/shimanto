'use client';

import type { TicketSummary } from '@shimanto/types';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterChips,
  LoadMore,
  LoadingState,
  PageHeader,
  SearchInput,
  StatusBadge,
  formatRelative,
} from '@shimanto/ui';
import { useMemo, useState } from 'react';
import { useDebounced, usePaged } from '@/lib/use-paged';

type Status = 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';

export function TicketsView() {
  const [status, setStatus] = useState<Status | ''>('OPEN');
  const [q, setQ] = useState('');
  const query = useDebounced(q);
  const filter = useMemo(() => ({ status, q: query }), [status, query]);
  const list = usePaged<TicketSummary>('/v1/admin/tickets', filter);

  return (
    <>
      <PageHeader
        title="Support"
        description="Open = waiting on the team. Pending = waiting on the customer."
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: 'OPEN', label: 'Open' },
            { value: 'PENDING', label: 'Pending' },
            { value: 'RESOLVED', label: 'Resolved' },
            { value: 'CLOSED', label: 'Closed' },
            { value: '', label: 'All' },
          ]}
        />
        <SearchInput
          className="w-full sm:w-80"
          placeholder="Search subject, email or #number"
          aria-label="Search tickets"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState rows={6} />
      ) : (
        <>
          <DataTable
            caption="Tickets"
            rows={list.items}
            rowKey={(t) => t.id}
            rowHref={(t) => `/tickets/${t.id}`}
            empty={
              <EmptyState
                spot="coffee"
                title={status === 'OPEN' ? 'Inbox zero' : 'No tickets'}
                description={status === 'OPEN' ? 'No one is waiting on you right now.' : undefined}
              />
            }
            columns={[
              { key: 'subject', header: 'Ticket', cell: (t) => `#${t.number} ${t.subject}` },
              {
                key: 'customer',
                header: 'Customer',
                cell: (t) => t.customer.name ?? t.customer.email,
              },
              {
                key: 'about',
                header: 'About',
                hideOnMobile: true,
                cell: (t) => t.product?.name ?? (t.order ? `Order #${t.order.number}` : '—'),
              },
              { key: 'status', header: 'Status', cell: (t) => <StatusBadge status={t.status} /> },
              {
                key: 'updated',
                header: 'Last message',
                hideOnMobile: true,
                cell: (t) => formatRelative(t.lastMessageAt),
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
