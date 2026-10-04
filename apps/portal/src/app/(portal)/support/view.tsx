'use client';

import type { TicketSummary } from '@shimanto/types';
import {
  ActionButton,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
  formatRelative,
} from '@shimanto/ui';
import { useApi } from '@/lib/use-api';

export function SupportView() {
  const { data, error, loading, reload } = useApi<TicketSummary[]>('/v1/account/tickets');
  return (
    <>
      <PageHeader
        title="Support"
        description="Questions about a product, a download or your order? We usually reply within a day."
        actions={
          <ActionButton icon="plus" href="/support/new">
            New ticket
          </ActionButton>
        }
      />
      {loading && !data ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : (
        <DataTable
          caption="Your tickets"
          rows={data ?? []}
          rowKey={(t) => t.id}
          rowHref={(t) => `/support/${t.number}`}
          empty={
            <EmptyState
              spot="hello"
              title="No tickets yet"
              description="If anything’s unclear or broken, open a ticket and we’ll sort it out."
              action={<ActionButton href="/support/new">Open a ticket</ActionButton>}
            />
          }
          columns={[
            { key: 'subject', header: 'Subject', cell: (t) => `#${t.number} ${t.subject}` },
            {
              key: 'about',
              header: 'About',
              hideOnMobile: true,
              cell: (t) => t.product?.name ?? (t.order ? `Order #${t.order.number}` : '—'),
            },
            {
              key: 'updated',
              header: 'Last reply',
              hideOnMobile: true,
              cell: (t) => formatRelative(t.lastMessageAt),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (t) => (
                <StatusBadge
                  status={t.status}
                  label={t.status === 'PENDING' ? 'Waiting on you' : undefined}
                />
              ),
            },
          ]}
        />
      )}
    </>
  );
}
