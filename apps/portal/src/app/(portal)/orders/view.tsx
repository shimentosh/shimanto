'use client';

import type { OrderSummary } from '@shimanto/types';
import {
  ActionButton,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  StatusBadge,
  formatDate,
  formatMoney,
} from '@shimanto/ui';
import { SITE_URL } from '@/lib/config';
import { useApi } from '@/lib/use-api';

export function OrdersView() {
  const { data, error, loading, reload } = useApi<OrderSummary[]>('/v1/account/orders');
  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order you placed or claimed, with receipts and delivery status."
      />
      {loading && !data ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : (
        <DataTable
          caption="Your orders"
          rows={data ?? []}
          rowKey={(o) => o.id}
          rowHref={(o) => `/orders/${o.number}`}
          empty={
            <EmptyState
              spot="rocket"
              title="No orders yet"
              description="Free and paid products you get from the store show up here."
              action={<ActionButton href={`${SITE_URL}/products`}>Browse the store</ActionButton>}
            />
          }
          columns={[
            { key: 'number', header: 'Order', cell: (o) => `#${o.number}` },
            {
              key: 'items',
              header: 'Items',
              cell: (o) =>
                o.items
                  .map((i) => (i.quantity > 1 ? `${i.productName} × ${i.quantity}` : i.productName))
                  .join(', '),
            },
            {
              key: 'date',
              header: 'Date',
              cell: (o) => formatDate(o.createdAt),
              hideOnMobile: true,
            },
            {
              key: 'payment',
              header: 'Payment',
              cell: (o) => <StatusBadge status={o.paymentStatus} />,
              hideOnMobile: true,
            },
            { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
            {
              key: 'total',
              header: 'Total',
              align: 'right',
              cell: (o) => formatMoney(o.total, o.currency, { free: 'Free' }),
            },
          ]}
        />
      )}
    </>
  );
}
