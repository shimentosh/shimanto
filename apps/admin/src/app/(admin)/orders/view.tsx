'use client';

import type { AdminOrderSummary } from '@shimanto/types';
import {
  ActionButton,
  DataTable,
  EmptyState,
  ErrorState,
  FilterChips,
  LoadMore,
  LoadingState,
  PageHeader,
  SearchInput,
  Select,
  StatusBadge,
  formatDate,
  formatMoney,
  humanize,
} from '@shimanto/ui';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useDebounced, usePaged } from '@/lib/use-paged';

const STATUSES = ['PENDING', 'PAID', 'PROCESSING', 'COMPLETED', 'CANCELLED', 'REFUNDED'] as const;
/** Not an order status: manual payments with proof sent, waiting for the team. */
const TO_VERIFY = 'TO_VERIFY';

const PROVIDERS: Record<AdminOrderSummary['provider'], string> = {
  FREE: 'Free',
  STRIPE: 'Card',
  PAYPAL: 'PayPal',
  MANUAL: 'Manual',
};
const FULFILLMENT = [
  'PENDING',
  'PROCESSING',
  'PARTIALLY_DELIVERED',
  'DELIVERED',
  'FAILED',
  'COMPLETED',
] as const;

export function OrdersView() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const status = params.get('status') ?? '';
  const fulfillmentStatus = params.get('fulfillmentStatus') ?? '';
  const source = params.get('source') ?? '';
  const customerId = params.get('customerId') ?? '';
  const toVerify = params.get('toVerify') === 'true';
  const [q, setQ] = useState(params.get('q') ?? '');
  const query = useDebounced(q);

  const filter = useMemo(
    () => ({
      status,
      fulfillmentStatus,
      source,
      customerId,
      q: query,
      toVerify: toVerify ? 'true' : '',
    }),
    [status, fulfillmentStatus, source, customerId, query, toVerify],
  );
  const list = usePaged<AdminOrderSummary>('/v1/admin/orders', filter);

  const setParams = (values: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [name, value] of Object.entries(values)) {
      if (value) next.set(name, value);
      else next.delete(name);
    }
    router.replace(`${pathname}?${next}`);
  };
  const setParam = (name: string, value: string) => setParams({ [name]: value });

  const [exporting, setExporting] = useState(false);
  /** Fetched through the API client (so an expired session refreshes), then saved as a file. */
  const exportCsv = async () => {
    setExporting(true);
    try {
      const csv = await api.get<string>('/v1/admin/orders/export.csv', filter);
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = Object.assign(document.createElement('a'), {
        href: url,
        download: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
      });
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Orders"
        description="Each order is the single record of what a customer bought, paid and received."
        actions={
          <>
            <ActionButton
              variant="secondary"
              icon="download"
              loading={exporting}
              onClick={() => void exportCsv()}
            >
              Export CSV
            </ActionButton>
            <ActionButton icon="plus" href="/orders/new">
              New order
            </ActionButton>
          </>
        }
      />

      <div className="mb-6 grid gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            className="w-full sm:w-80"
            placeholder="Search email, name or #number"
            aria-label="Search orders"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label="Delivery status"
              value={fulfillmentStatus}
              onChange={(e) => setParam('fulfillmentStatus', e.target.value)}
              className="h-10 py-0"
            >
              <option value="">Any delivery</option>
              {FULFILLMENT.map((s) => (
                <option key={s} value={s}>
                  {humanize(s)}
                </option>
              ))}
            </Select>
            <Select
              aria-label="Source"
              value={source}
              onChange={(e) => setParam('source', e.target.value)}
              className="h-10 py-0"
            >
              <option value="">Any source</option>
              <option value="CHECKOUT">Checkout</option>
              <option value="ADMIN">Created by admin</option>
            </Select>
          </div>
        </div>
        <FilterChips
          label="Order status"
          value={toVerify ? TO_VERIFY : (status as (typeof STATUSES)[number] | '')}
          onChange={(v) =>
            v === TO_VERIFY
              ? setParams({ toVerify: 'true', status: '' })
              : setParams({ status: v, toVerify: '' })
          }
          options={[
            { value: '', label: 'All' },
            { value: TO_VERIFY, label: 'Payments to verify' },
            ...STATUSES.map((s) => ({ value: s, label: humanize(s) })),
          ]}
        />
      </div>

      {list.error ? (
        <ErrorState message={list.error} onRetry={list.reload} />
      ) : list.loading ? (
        <LoadingState rows={8} />
      ) : (
        <>
          <DataTable
            caption="Orders"
            rows={list.items}
            rowKey={(o) => o.id}
            rowHref={(o) => `/orders/${o.id}`}
            empty={
              <EmptyState
                spot="magnifier"
                title={toVerify ? 'Nothing to verify' : 'No orders found'}
                description={
                  toVerify
                    ? 'Manual payments show up here once a customer sends their transaction details.'
                    : 'Try a different filter or search.'
                }
              />
            }
            columns={[
              { key: 'number', header: 'Order', cell: (o) => `#${o.number}` },
              {
                key: 'customer',
                header: 'Customer',
                cell: (o) => (
                  <div className="min-w-0">
                    <p className="truncate">{o.customer.name ?? o.customer.email}</p>
                    {o.customer.name && (
                      <p className="text-ink-soft truncate text-sm">{o.customer.email}</p>
                    )}
                  </div>
                ),
              },
              {
                key: 'items',
                header: 'Items',
                hideOnMobile: true,
                cell: (o) => o.items.map((i) => i.productName).join(', '),
              },
              {
                key: 'payment',
                header: 'Payment',
                hideOnMobile: true,
                cell: (o) => (
                  <div className="flex flex-col items-start gap-0.5">
                    <StatusBadge status={o.paymentStatus} />
                    <span className="text-ink-soft text-xs">{PROVIDERS[o.provider]}</span>
                  </div>
                ),
              },
              {
                key: 'delivery',
                header: 'Delivery',
                hideOnMobile: true,
                cell: (o) => <StatusBadge status={o.fulfillmentStatus} />,
              },
              { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
              {
                key: 'date',
                header: 'Date',
                hideOnMobile: true,
                cell: (o) => formatDate(o.createdAt),
              },
              {
                key: 'total',
                header: 'Total',
                align: 'right',
                cell: (o) => formatMoney(o.total, o.currency, { free: 'Free' }),
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
