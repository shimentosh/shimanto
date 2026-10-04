'use client';

import type {
  AttributionModel,
  ProductReportRow,
  SalesReport,
  SourceReportRow,
} from '@shimanto/types';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FilterChips,
  LoadingState,
  Notice,
  PageHeader,
  Section,
  StatRow,
  formatTotals,
} from '@shimanto/ui';
import Link from 'next/link';
import { useState } from 'react';
import { AnalyticsTabs, RangePicker, useAnalyticsRange } from '@/components/analytics-range';
import { useApi } from '@/lib/use-api';

const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;
const money = (m: Record<string, number>) => (Object.keys(m).length ? formatTotals(m) : '—');

/** Group source rows (which are per campaign) into source / medium totals. */
function bySource(rows: SourceReportRow[]) {
  const map = new Map<string, SourceReportRow>();
  for (const r of rows) {
    const key = `${r.source}|${r.medium}`;
    const cur = map.get(key) ?? { ...r, campaign: '', visitors: 0, orders: 0, revenue: {} };
    cur.visitors += r.visitors;
    cur.orders += r.orders;
    for (const [c, v] of Object.entries(r.revenue)) cur.revenue[c] = (cur.revenue[c] ?? 0) + v;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.orders - a.orders || b.visitors - a.visitors);
}

export function AnalyticsView() {
  const { range } = useAnalyticsRange();
  const [model, setModel] = useState<AttributionModel>('last');
  const q = `from=${encodeURIComponent(range.from)}&to=${encodeURIComponent(range.to)}`;
  const sales = useApi<SalesReport>(`/v1/admin/analytics/sales?${q}`);
  const products = useApi<ProductReportRow[]>(`/v1/admin/analytics/products?${q}`);
  const sources = useApi<SourceReportRow[]>(`/v1/admin/analytics/sources?${q}&model=${model}`);

  const s = sales.data;
  const sourceRows = sources.data ? bySource(sources.data) : [];
  const campaignRows = (sources.data ?? []).filter((r) => r.campaign !== '(not set)');

  return (
    <>
      <PageHeader
        title="Analytics"
        description="Sales from your orders and payments; traffic and funnels from first-party events."
        actions={<RangePicker />}
      />
      <AnalyticsTabs />

      {sales.error ? (
        <ErrorState message={sales.error} onRetry={sales.reload} />
      ) : !s ? (
        <LoadingState rows={4} />
      ) : (
        <>
          <StatRow
            stats={[
              {
                label: 'Revenue',
                value: money(s.revenue),
                hint: `Net after refunds: ${money(s.netRevenue)}`,
              },
              {
                label: 'Orders',
                value: s.orders,
                hint: `${s.paidOrders} paid · ${s.freeOrders} free`,
                href: '/orders',
              },
              {
                label: 'Average order value',
                value: money(s.averageOrderValue),
                hint: 'Paid orders only',
              },
              {
                label: 'Conversion rate',
                value: pct(s.conversionRate),
                hint: `${s.orders} orders / ${s.sessions} sessions`,
              },
            ]}
          />
          <StatRow
            className="mb-8 border-t-0"
            stats={[
              {
                label: 'Refunds',
                value: money(s.refunds),
                hint: `${s.refundedOrders} ${s.refundedOrders === 1 ? 'order' : 'orders'}`,
              },
              { label: 'Free orders', value: s.freeOrders, hint: '$0 products and 100% coupons' },
              { label: 'New customers', value: s.newCustomers, href: '/customers' },
              { label: 'Visitors', value: s.visitors, hint: `${s.sessions} sessions` },
            ]}
          />
          <Notice tone="info" className="mb-4">
            Money figures come from orders and payments (the source of truth). Visitors, sessions
            and product views count only people who allowed analytics, so conversion rates are
            estimates. GA4 and Meta use their own attribution and will not match these numbers
            exactly.
          </Notice>
        </>
      )}

      <Section
        title="Products"
        description="Views, add-to-cart and checkouts from events; orders and revenue from orders."
      >
        {products.error ? (
          <ErrorState message={products.error} onRetry={products.reload} />
        ) : !products.data ? (
          <LoadingState rows={3} />
        ) : (
          <DataTable
            caption="Product performance"
            rows={products.data}
            rowKey={(r) => r.productId}
            empty={<EmptyState spot="toolbox" title="No product activity in this range" />}
            columns={[
              { key: 'name', header: 'Product', cell: (r) => r.name },
              { key: 'views', header: 'Views', align: 'right', cell: (r) => r.views },
              {
                key: 'cart',
                header: 'Add to cart',
                align: 'right',
                hideOnMobile: true,
                cell: (r) => r.addToCart,
              },
              {
                key: 'checkouts',
                header: 'Checkouts',
                align: 'right',
                hideOnMobile: true,
                cell: (r) => r.checkouts,
              },
              {
                key: 'orders',
                header: 'Orders',
                align: 'right',
                cell: (r) => (r.freeOrders ? `${r.orders} (${r.freeOrders} free)` : r.orders),
              },
              { key: 'revenue', header: 'Revenue', align: 'right', cell: (r) => money(r.revenue) },
              {
                key: 'conv',
                header: 'Conversion',
                align: 'right',
                hideOnMobile: true,
                cell: (r) => (r.views ? pct(r.conversionRate) : '—'),
              },
            ]}
          />
        )}
      </Section>

      <Section
        title="Sources"
        description={
          model === 'first'
            ? 'Orders credited to where the customer first came from.'
            : 'Orders credited to the most recent campaign or referral before buying.'
        }
        actions={
          <FilterChips
            label="Attribution model"
            value={model}
            onChange={(v) => setModel((v || 'last') as AttributionModel)}
            options={[
              { value: 'last', label: 'Last touch' },
              { value: 'first', label: 'First touch' },
            ]}
          />
        }
      >
        {sources.error ? (
          <ErrorState message={sources.error} onRetry={sources.reload} />
        ) : !sources.data ? (
          <LoadingState rows={3} />
        ) : (
          <DataTable
            caption="Top sources"
            rows={sourceRows.slice(0, 15)}
            rowKey={(r) => `${r.source}|${r.medium}`}
            empty={<EmptyState spot="megaphone" title="No traffic or orders in this range" />}
            columns={[
              { key: 'source', header: 'Source', cell: (r) => r.source },
              { key: 'medium', header: 'Medium', cell: (r) => r.medium },
              { key: 'visitors', header: 'Visitors', align: 'right', cell: (r) => r.visitors },
              { key: 'orders', header: 'Orders', align: 'right', cell: (r) => r.orders },
              { key: 'revenue', header: 'Revenue', align: 'right', cell: (r) => money(r.revenue) },
            ]}
          />
        )}
      </Section>

      <Section title="Campaigns" description="UTM campaigns, with the same attribution model.">
        {sources.data && (
          <DataTable
            caption="Top campaigns"
            rows={campaignRows.slice(0, 15)}
            rowKey={(r) => `${r.source}|${r.medium}|${r.campaign}`}
            empty={
              <p className="text-ink-soft text-[15px]">
                No tagged campaigns yet. Add <code className="font-mono text-sm">utm_campaign</code>{' '}
                to your ad and newsletter links to see them here.
              </p>
            }
            columns={[
              { key: 'campaign', header: 'Campaign', cell: (r) => r.campaign },
              {
                key: 'source',
                header: 'Source / medium',
                cell: (r) => `${r.source} / ${r.medium}`,
              },
              {
                key: 'visitors',
                header: 'Visitors',
                align: 'right',
                hideOnMobile: true,
                cell: (r) => r.visitors,
              },
              { key: 'orders', header: 'Orders', align: 'right', cell: (r) => r.orders },
              { key: 'revenue', header: 'Revenue', align: 'right', cell: (r) => money(r.revenue) },
            ]}
          />
        )}
        <p className="text-ink-soft mt-4 text-sm">
          Delivery to GA4 and Meta is shown under{' '}
          <Link href="/analytics/events" className="underline underline-offset-4">
            Events
          </Link>
          .
        </p>
      </Section>
    </>
  );
}
