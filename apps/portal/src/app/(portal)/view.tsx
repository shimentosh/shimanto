'use client';

import { errorMessage } from '@shimanto/sdk';
import type { CustomerDashboard } from '@shimanto/types';
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
} from '@shimanto/ui';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { useSession } from '@/lib/session';
import { useApi } from '@/lib/use-api';

function VerifyEmailNotice() {
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | string>('idle');
  return (
    <Notice
      tone="warning"
      title="Please verify your email"
      action={
        state === 'sent' ? (
          <span className="text-sm font-medium">Link sent</span>
        ) : (
          <ActionButton
            size="sm"
            variant="secondary"
            loading={state === 'sending'}
            onClick={async () => {
              setState('sending');
              try {
                await api.post('/v1/customer/auth/resend-verification');
                setState('sent');
              } catch (e) {
                setState(errorMessage(e));
              }
            }}
          >
            Resend link
          </ActionButton>
        )
      }
    >
      {state !== 'idle' && state !== 'sending' && state !== 'sent'
        ? state
        : 'It helps us reach you about your orders and keeps your account secure.'}
    </Notice>
  );
}

export function DashboardView() {
  const { me } = useSession();
  const welcome = useSearchParams().get('welcome');
  const { data, error, loading, reload } = useApi<CustomerDashboard>('/v1/account/dashboard');
  const firstName = me?.name?.split(' ')[0];

  return (
    <>
      <PageHeader
        title={firstName ? `Hi, ${firstName}` : 'Your account'}
        description="Your orders, downloads, repository access and support in one place."
      />

      <div className="mb-8 grid gap-3">
        {welcome === 'reset' && (
          <Notice tone="success">Your new password is saved. Other devices were signed out.</Notice>
        )}
        {me && !me.emailVerified && <VerifyEmailNotice />}
        {data && data.actionRequired > 0 && (
          <Notice
            tone="warning"
            title={
              data.actionRequired === 1
                ? 'One delivery needs your attention'
                : `${data.actionRequired} deliveries need your attention`
            }
            action={
              <ActionButton size="sm" href={me?.github.connected ? '/products' : '/account/github'}>
                {me?.github.connected ? 'Review' : 'Connect GitHub'}
              </ActionButton>
            }
          >
            Repository access is waiting on you, for example a GitHub account to invite.
          </Notice>
        )}
      </div>

      {loading && !data ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : data ? (
        <>
          <StatRow
            className="mb-10"
            stats={[
              { label: 'Products', value: data.products.length, href: '/products' },
              { label: 'Downloads', value: data.downloadCount, href: '/downloads' },
              { label: 'Recent orders', value: data.recentOrders.length, href: '/orders' },
              { label: 'Open tickets', value: data.openTickets.length, href: '/support' },
            ]}
          />

          <Section
            title="Recent orders"
            actions={
              data.recentOrders.length > 0 && (
                <ActionButton size="sm" variant="ghost" href="/orders">
                  View all
                </ActionButton>
              )
            }
          >
            <DataTable
              caption="Recent orders"
              rows={data.recentOrders}
              rowKey={(o) => o.id}
              rowHref={(o) => `/orders/${o.number}`}
              empty={
                <EmptyState
                  spot="rocket"
                  title="No orders yet"
                  description="When you buy or claim something from the store, it shows up here."
                  action={
                    <ActionButton href={`${SITE_URL}/products`}>Browse the store</ActionButton>
                  }
                />
              }
              columns={[
                { key: 'number', header: 'Order', cell: (o) => `#${o.number}` },
                {
                  key: 'items',
                  header: 'Items',
                  cell: (o) => o.items.map((i) => i.productName).join(', '),
                },
                {
                  key: 'date',
                  header: 'Date',
                  cell: (o) => formatDate(o.createdAt),
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
          </Section>

          {data.products.length > 0 && (
            <Section
              title="Your products"
              actions={
                <ActionButton size="sm" variant="ghost" href="/products">
                  Manage
                </ActionButton>
              }
            >
              <ul className="divide-ink/[0.07] divide-y">
                {data.products.slice(0, 5).map((p) => (
                  <li
                    key={p.productId}
                    className="flex flex-wrap items-center justify-between gap-3 py-3"
                  >
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-ink-soft text-sm">
                        Order #{p.orderNumber} · {formatDate(p.purchasedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {p.deliveries.map((d) => (
                        <StatusBadge
                          key={d.id}
                          status={d.status}
                          label={`${d.type === 'R2' ? 'Files' : 'GitHub'}: ${d.status === 'READY' ? 'ready' : d.status.toLowerCase().replace(/_/g, ' ')}`}
                        />
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section
            title="Support"
            actions={
              <ActionButton size="sm" variant="secondary" icon="plus" href="/support/new">
                New ticket
              </ActionButton>
            }
          >
            {data.openTickets.length === 0 ? (
              <p className="text-ink-soft text-[15px]">
                No open tickets. Need a hand? We usually reply within a day.
              </p>
            ) : (
              <ul className="divide-ink/[0.07] divide-y">
                {data.openTickets.map((t) => (
                  <li key={t.number}>
                    <Link
                      href={`/support/${t.number}`}
                      className="flex items-center justify-between gap-3 py-3 hover:underline"
                    >
                      <span className="font-medium">
                        #{t.number} {t.subject}
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-ink-soft hidden text-sm sm:inline">
                          {formatRelative(t.lastMessageAt)}
                        </span>
                        <StatusBadge
                          status={t.status}
                          label={t.status === 'PENDING' ? 'Waiting on you' : undefined}
                        />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </>
      ) : null}
    </>
  );
}
