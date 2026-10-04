'use client';

import type { AdminCustomerDetail } from '@shimanto/types';
import {
  ActionButton,
  ConfirmDialog,
  DataTable,
  DescriptionList,
  ErrorState,
  Icon,
  LoadingState,
  Notice,
  PageHeader,
  Section,
  StatusBadge,
  formatDate,
  formatDateTime,
  formatMoney,
  formatRelative,
  formatTotals,
} from '@shimanto/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';

export function CustomerView() {
  const { id } = useParams<{ id: string }>();
  const {
    data: c,
    error,
    loading,
    reload,
    setData,
  } = useApi<AdminCustomerDetail>(`/v1/admin/customers/${id}`);
  const action = useAction();
  const [confirm, setConfirm] = useState(false);

  if (loading && !c) return <LoadingState rows={8} />;
  if (error || !c)
    return <ErrorState title="Customer not found" message={error ?? undefined} onRetry={reload} />;

  const disabled = c.status === 'DISABLED';

  return (
    <>
      <PageHeader
        back={{ href: '/customers', label: 'Customers' }}
        eyebrow={
          <>
            <StatusBadge status={c.status} />
            <span>Customer since {formatDate(c.createdAt)}</span>
          </>
        }
        title={c.name ?? c.email}
        description={c.name ? c.email : undefined}
        actions={
          <>
            <ActionButton
              size="sm"
              icon="plus"
              href={`/orders/new?email=${encodeURIComponent(c.email)}`}
            >
              New order
            </ActionButton>
            <ActionButton
              size="sm"
              variant="secondary"
              icon="key"
              loading={action.isBusy('reset')}
              onClick={() =>
                void action.run(() => api.post(`/v1/admin/customers/${c.id}/password-reset`), {
                  key: 'reset',
                  success: `Password reset email sent to ${c.email}.`,
                })
              }
            >
              Send password reset
            </ActionButton>
            <ActionButton
              size="sm"
              variant={disabled ? 'secondary' : 'ghost'}
              onClick={() => setConfirm(true)}
            >
              {disabled ? 'Enable account' : 'Disable account'}
            </ActionButton>
          </>
        }
      />
      <div className="mb-6 grid gap-3">
        {action.error && <Notice tone="danger">{action.error}</Notice>}
        {action.success && <Notice tone="success">{action.success}</Notice>}
      </div>

      <DescriptionList
        columns={3}
        className="mb-4"
        items={[
          { label: 'Total spent', value: formatTotals(c.totals) },
          { label: 'Orders', value: c.orders },
          { label: 'Email', value: c.emailVerified ? 'Verified' : 'Not verified' },
          { label: 'Password', value: c.hasPassword ? 'Set' : 'Email links only' },
          { label: 'Last sign-in', value: formatDateTime(c.lastLoginAt) },
          {
            label: 'Came from (first touch)',
            value: c.attribution.first
              ? [
                  c.attribution.first.source,
                  c.attribution.first.medium,
                  c.attribution.first.campaign,
                ]
                  .filter(Boolean)
                  .join(' / ')
              : 'Unknown',
          },
          {
            label: 'GitHub',
            value: c.githubLogin ? (
              <span className="inline-flex items-center gap-1.5">
                <Icon name="github" className="size-4" />@{c.githubLogin} ·{' '}
                {formatDate(c.githubConnectedAt)}
              </span>
            ) : (
              'Not connected'
            ),
          },
        ]}
      />

      <Section title="Orders">
        <DataTable
          caption="Orders"
          rows={c.orderList}
          rowKey={(o) => o.id}
          rowHref={(o) => `/orders/${o.id}`}
          empty={<p className="text-ink-soft text-[15px]">No orders.</p>}
          columns={[
            { key: 'number', header: 'Order', cell: (o) => `#${o.number}` },
            {
              key: 'items',
              header: 'Items',
              cell: (o) => o.items.map((i) => i.productName).join(', '),
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
      </Section>

      <Section title="Deliveries">
        <DataTable
          caption="Deliveries"
          rows={c.deliveries}
          rowKey={(d) => d.id}
          empty={<p className="text-ink-soft text-[15px]">No deliveries.</p>}
          columns={[
            { key: 'product', header: 'Product', cell: (d) => d.productName },
            {
              key: 'type',
              header: 'Type',
              cell: (d) => (d.type === 'R2' ? 'Files' : `GitHub ${d.githubOwner}/${d.githubRepo}`),
            },
            { key: 'status', header: 'Status', cell: (d) => <StatusBadge status={d.status} /> },
            {
              key: 'error',
              header: 'Last error',
              hideOnMobile: true,
              cell: (d) => <span className="text-ink-soft text-sm">{d.lastError ?? '—'}</span>,
            },
          ]}
        />
      </Section>

      <Section title="Support tickets">
        {c.tickets.length === 0 ? (
          <p className="text-ink-soft text-[15px]">No tickets.</p>
        ) : (
          <ul className="divide-ink/[0.07] divide-y">
            {c.tickets.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tickets/${t.id}`}
                  className="flex items-center justify-between gap-3 py-3 hover:underline"
                >
                  <span className="font-medium">
                    #{t.number} {t.subject}
                  </span>
                  <span className="flex items-center gap-3">
                    <span className="text-ink-soft hidden text-sm sm:inline">
                      {formatRelative(t.lastMessageAt)}
                    </span>
                    <StatusBadge status={t.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title={disabled ? 'Enable this account?' : 'Disable this account?'}
        description={
          disabled
            ? 'The customer can sign in and check out again.'
            : 'The customer is signed out everywhere and can’t sign in or check out. Their orders stay unchanged.'
        }
        confirmLabel={disabled ? 'Enable' : 'Disable'}
        tone={disabled ? 'primary' : 'danger'}
        onConfirm={async () => {
          const res = await action.run(
            () =>
              api.patch<AdminCustomerDetail>(`/v1/admin/customers/${c.id}`, {
                status: disabled ? 'ACTIVE' : 'DISABLED',
              }),
            { key: 'status', success: disabled ? 'Account enabled.' : 'Account disabled.' },
          );
          if (res) setData(res);
        }}
      />
    </>
  );
}
