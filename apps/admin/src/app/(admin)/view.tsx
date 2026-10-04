'use client';

import type { AdminDashboard } from '@shimanto/types';
import {
  ActionButton,
  DataTable,
  EmptyState,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  Section,
  StatRow,
  StatusBadge,
  formatDate,
  formatMoney,
  formatRelative,
  formatTotals,
} from '@shimanto/ui';
import Link from 'next/link';
import { useAdmin } from '@/lib/session';
import { useApi } from '@/lib/use-api';

export function DashboardView() {
  const { user } = useAdmin();
  const { data, error, loading, reload } = useApi<AdminDashboard>('/v1/admin/dashboard');

  return (
    <>
      <PageHeader
        title={`Good to see you${user?.name ? `, ${user.name.split(' ')[0]}` : ''}`}
        description="What’s happening in the store."
        actions={
          <>
            <ActionButton variant="secondary" icon="plus" href="/orders/new">
              New order
            </ActionButton>
            <ActionButton icon="plus" href="/products/new">
              New product
            </ActionButton>
          </>
        }
      />
      {loading && !data ? (
        <LoadingState rows={6} />
      ) : error || !data ? (
        <ErrorState message={error ?? undefined} onRetry={reload} />
      ) : (
        <>
          {data.deliveriesNeedingAttention > 0 && (
            <Notice
              tone="warning"
              className="mb-6"
              title={`${data.deliveriesNeedingAttention} ${data.deliveriesNeedingAttention === 1 ? 'delivery needs' : 'deliveries need'} attention`}
              action={
                <ActionButton size="sm" href="/orders?fulfillmentStatus=PROCESSING">
                  Review orders
                </ActionButton>
              }
            >
              Failed or expired GitHub invitations, or customers who still need to connect GitHub.
            </Notice>
          )}
          <StatRow
            className="mb-10"
            stats={[
              {
                label: 'Revenue',
                value: formatTotals(data.revenue),
                hint: `${formatTotals(data.revenueLast30Days)} in 30 days`,
              },
              {
                label: 'Orders',
                value: data.orders,
                hint: `${data.ordersLast30Days} in 30 days`,
                href: '/orders',
              },
              { label: 'Customers', value: data.customers, href: '/customers' },
              {
                label: 'Open tickets',
                value: data.openTickets,
                hint: `${data.products.published} of ${data.products.total} products live`,
                href: '/tickets',
              },
            ]}
          />

          <Section
            title="Recent orders"
            actions={
              <ActionButton size="sm" variant="ghost" href="/orders">
                All orders
              </ActionButton>
            }
          >
            <DataTable
              caption="Recent orders"
              rows={data.recentOrders}
              rowKey={(o) => o.id}
              rowHref={(o) => `/orders/${o.id}`}
              empty={
                <EmptyState
                  spot="rocket"
                  title="No orders yet"
                  description="Orders from checkout and the ones you create show up here."
                />
              }
              columns={[
                { key: 'number', header: 'Order', cell: (o) => `#${o.number}` },
                {
                  key: 'customer',
                  header: 'Customer',
                  cell: (o) => o.customer.name ?? o.customer.email,
                },
                {
                  key: 'items',
                  header: 'Items',
                  hideOnMobile: true,
                  cell: (o) => o.items.map((i) => i.productName).join(', '),
                },
                { key: 'status', header: 'Status', cell: (o) => <StatusBadge status={o.status} /> },
                {
                  key: 'date',
                  header: 'Date',
                  hideOnMobile: true,
                  cell: (o) => formatRelative(o.createdAt),
                },
                {
                  key: 'total',
                  header: 'Total',
                  align: 'right',
                  cell: (o) => formatMoney(o.total, o.currency, { free: 'Free' }),
                },
              ]}
            />
          </Section>

          <div className="border-ink/10 grid gap-x-10 border-t lg:grid-cols-2">
            <Section
              className="border-t-0 first-of-type:pt-7"
              title="Support"
              actions={
                <ActionButton size="sm" variant="ghost" href="/tickets">
                  All tickets
                </ActionButton>
              }
            >
              {data.tickets.length === 0 ? (
                <p className="text-ink-soft text-[15px]">No open tickets. Nice.</p>
              ) : (
                <ul className="divide-ink/[0.07] divide-y">
                  {data.tickets.map((t) => (
                    <li key={t.id}>
                      <Link
                        href={`/tickets/${t.id}`}
                        className="flex items-center justify-between gap-3 py-3 hover:underline"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">
                            #{t.number} {t.subject}
                          </span>
                          <span className="text-ink-soft block text-sm">
                            {t.customerEmail} · {formatRelative(t.lastMessageAt)}
                          </span>
                        </span>
                        <StatusBadge status={t.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
            <Section
              className="border-t-0 first-of-type:pt-7"
              title="New customers"
              actions={
                <ActionButton size="sm" variant="ghost" href="/customers">
                  All customers
                </ActionButton>
              }
            >
              {data.recentCustomers.length === 0 ? (
                <p className="text-ink-soft text-[15px]">No customers yet.</p>
              ) : (
                <ul className="divide-ink/[0.07] divide-y">
                  {data.recentCustomers.map((c) => (
                    <li key={c.id}>
                      <Link
                        href={`/customers/${c.id}`}
                        className="flex items-center justify-between gap-3 py-3 hover:underline"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{c.name ?? c.email}</span>
                          <span className="text-ink-soft block text-sm">
                            {c.orders} {c.orders === 1 ? 'order' : 'orders'} · joined{' '}
                            {formatDate(c.createdAt)}
                          </span>
                        </span>
                        <span className="text-sm tabular-nums">{formatTotals(c.totals)}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          </div>
        </>
      )}
    </>
  );
}
