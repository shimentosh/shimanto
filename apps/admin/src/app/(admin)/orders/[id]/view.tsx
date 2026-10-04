'use client';

import type { AdminDelivery, AdminOrderDetail } from '@shimanto/types';
import {
  ActionButton,
  ConfirmDialog,
  DataTable,
  DescriptionList,
  Dialog,
  ErrorState,
  Field,
  Icon,
  Input,
  LoadingState,
  Notice,
  OrderSummary,
  PageHeader,
  Section,
  StatusBadge,
  Textarea,
  formatDateTime,
  formatMoney,
  humanize,
} from '@shimanto/ui';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';

type Confirm = 'cancel' | 'refund' | null;

const touchLabel = (t: AdminOrderDetail['attribution']['first']) =>
  t ? [t.source, t.medium, t.campaign].filter(Boolean).join(' / ') || 'Unknown' : 'Unknown';

function DeliveryRow({
  d,
  onChange,
  run,
  busy,
}: {
  d: AdminDelivery;
  onChange: () => void;
  run: ReturnType<typeof useAction>['run'];
  busy: string | null;
}) {
  const [revoking, setRevoking] = useState(false);
  const [reason, setReason] = useState('');
  const retryable = ['PENDING', 'ACTION_REQUIRED', 'FAILED', 'EXPIRED', 'REVOKED'].includes(
    d.status,
  );
  const act = async (kind: 'retry' | 'refresh') => {
    const res = await run(() => api.post(`/v1/admin/deliveries/${d.id}/${kind}`), {
      key: `${kind}:${d.id}`,
      success: kind === 'retry' ? 'Delivery retried.' : 'Status synced with GitHub.',
    });
    if (res) onChange();
  };

  return (
    <li className="py-5 first:pt-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex flex-wrap items-center gap-2 font-medium">
            <Icon name={d.type === 'R2' ? 'download' : 'github'} className="text-ink-soft size-4" />
            {d.productName}
            <span className="text-ink-soft text-sm font-normal">
              {d.type === 'R2' ? 'Files' : 'GitHub repository'}
            </span>
            <StatusBadge status={d.status} />
          </p>
          <dl className="text-ink-soft mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {d.type === 'GITHUB' && (
              <>
                <div>
                  <dt className="inline">Repository: </dt>
                  <dd className="text-ink inline font-mono">
                    {d.githubOwner && d.githubRepo ? `${d.githubOwner}/${d.githubRepo}` : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="inline">GitHub user: </dt>
                  <dd className="text-ink inline">
                    {d.githubLogin ? `@${d.githubLogin}` : 'not connected'}
                  </dd>
                </div>
                {d.githubInvitationId && (
                  <div>
                    <dt className="inline">Invitation: </dt>
                    <dd className="text-ink inline">#{d.githubInvitationId}</dd>
                  </div>
                )}
                <div>
                  <dt className="inline">Last synced: </dt>
                  <dd className="inline">{formatDateTime(d.lastSyncedAt)}</dd>
                </div>
              </>
            )}
            <div>
              <dt className="inline">Attempts: </dt>
              <dd className="text-ink inline">{d.attempts}</dd>
            </div>
            <div>
              <dt className="inline">Delivered: </dt>
              <dd className="inline">{formatDateTime(d.deliveredAt)}</dd>
            </div>
          </dl>
          {d.lastError && (
            <p className="bg-create/10 mt-3 rounded-[10px] px-3 py-2 text-sm">
              <span className="font-medium">Last error:</span> {d.lastError}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {d.type === 'GITHUB' &&
            ['INVITATION_SENT', 'ACCEPTED', 'ACTION_REQUIRED'].includes(d.status) && (
              <ActionButton
                size="sm"
                variant="secondary"
                icon="repeat"
                loading={busy === `refresh:${d.id}`}
                onClick={() => void act('refresh')}
              >
                Sync status
              </ActionButton>
            )}
          {retryable && (
            <ActionButton
              size="sm"
              variant="secondary"
              loading={busy === `retry:${d.id}`}
              onClick={() => void act('retry')}
            >
              {d.status === 'REVOKED' ? 'Re-grant' : 'Retry'}
            </ActionButton>
          )}
          {d.status !== 'REVOKED' && (
            <ActionButton size="sm" variant="ghost" onClick={() => setRevoking(true)}>
              Revoke
            </ActionButton>
          )}
        </div>
      </div>
      <ConfirmDialog
        open={revoking}
        onOpenChange={setRevoking}
        title="Revoke access?"
        description={
          d.type === 'R2'
            ? 'The customer can no longer download these files.'
            : 'The pending invitation is cancelled, or the collaborator removed (unless another active order grants the same repository).'
        }
        confirmLabel="Revoke access"
        tone="danger"
        onConfirm={async () => {
          const res = await run(
            () => api.post(`/v1/admin/deliveries/${d.id}/revoke`, { reason: reason || undefined }),
            {
              key: `revoke:${d.id}`,
              success: 'Access revoked.',
            },
          );
          if (res) onChange();
        }}
      >
        <Field label="Reason" optional>
          {(f) => (
            <Input
              {...f}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Chargeback"
            />
          )}
        </Field>
      </ConfirmDialog>
    </li>
  );
}

export function OrderView() {
  const { id } = useParams<{ id: string }>();
  const {
    data: order,
    error,
    loading,
    reload,
    setData,
  } = useApi<AdminOrderDetail>(`/v1/admin/orders/${id}`);
  const action = useAction();
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState('');

  if (loading && !order) return <LoadingState rows={8} />;
  if (error || !order)
    return <ErrorState title="Order not found" message={error ?? undefined} onRetry={reload} />;

  const doAction = async (path: string, success: string, key: string) => {
    const res = await action.run(
      () => api.post<AdminOrderDetail>(`/v1/admin/orders/${order.id}/${path}`),
      { key, success },
    );
    if (res && 'id' in (res as object)) setData(res as AdminOrderDetail);
  };
  const canCancel = !['CANCELLED', 'REFUNDED'].includes(order.status);
  const canRefund = order.paymentStatus === 'PAID';
  const canFulfill = ['PAID', 'PROCESSING', 'COMPLETED'].includes(order.status);

  return (
    <>
      <PageHeader
        back={{ href: '/orders', label: 'Orders' }}
        eyebrow={
          <>
            <StatusBadge status={order.status} />
            <StatusBadge
              status={order.paymentStatus}
              label={`Payment: ${humanize(order.paymentStatus).toLowerCase()}`}
            />
            <StatusBadge
              status={order.fulfillmentStatus}
              label={`Delivery: ${humanize(order.fulfillmentStatus).toLowerCase()}`}
            />
          </>
        }
        title={`Order #${order.number}`}
        description={`${formatMoney(order.total, order.currency, { free: 'Free' })} · placed ${formatDateTime(order.createdAt)} · ${order.source === 'ADMIN' ? 'created by admin' : 'checkout'}`}
        actions={
          <>
            {canFulfill && (
              <ActionButton
                size="sm"
                variant="secondary"
                icon="repeat"
                loading={action.isBusy('fulfill')}
                onClick={() => void doAction('fulfill', 'Fulfillment ran again.', 'fulfill')}
              >
                Re-run fulfillment
              </ActionButton>
            )}
            <ActionButton
              size="sm"
              variant="secondary"
              icon="mail"
              loading={action.isBusy('resend')}
              onClick={() =>
                void doAction('resend-confirmation', 'Confirmation email sent.', 'resend').then(
                  reload,
                )
              }
            >
              Resend email
            </ActionButton>
            {canRefund && (
              <ActionButton size="sm" variant="secondary" onClick={() => setConfirm('refund')}>
                Refund
              </ActionButton>
            )}
            {canCancel && (
              <ActionButton size="sm" variant="ghost" onClick={() => setConfirm('cancel')}>
                Cancel order
              </ActionButton>
            )}
          </>
        }
      />

      <div className="mb-6 grid gap-3">
        {action.error && <Notice tone="danger">{action.error}</Notice>}
        {action.success && <Notice tone="success">{action.success}</Notice>}
      </div>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0">
          <Section title="Items">
            <OrderSummary
              currency={order.currency}
              subtotal={order.subtotal}
              discount={order.discount}
              total={order.total}
              couponCode={order.couponCode}
              lines={order.items.map((i) => ({
                id: i.id,
                name: i.productName,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                discount: i.discount,
                total: i.total,
                meta: (
                  <Link href={`/products/${i.productId}`} className="hover:underline">
                    {humanize(i.productType)} · {i.productSlug}
                  </Link>
                ),
              }))}
            />
          </Section>

          <Section
            title="Deliveries"
            description="One per product and delivery method. Retries never send duplicates."
          >
            {order.deliveries.length === 0 ? (
              <p className="text-ink-soft text-[15px]">
                {canFulfill
                  ? 'No deliveries yet. Re-run fulfillment to create them.'
                  : 'Deliveries are created once the order is paid or confirmed.'}
              </p>
            ) : (
              <ul className="divide-ink/[0.07] divide-y">
                {order.deliveries.map((d) => (
                  <DeliveryRow
                    key={d.id}
                    d={d}
                    onChange={reload}
                    run={action.run}
                    busy={action.busy}
                  />
                ))}
              </ul>
            )}
          </Section>

          <Section title="Payments">
            <DataTable
              caption="Payments"
              rows={order.payments}
              rowKey={(p) => p.id}
              empty={
                <p className="text-ink-soft text-[15px]">
                  {order.total === 0
                    ? 'No payment needed: this is a $0 order.'
                    : 'No payment recorded yet.'}
                </p>
              }
              columns={[
                { key: 'provider', header: 'Provider', cell: (p) => humanize(p.provider) },
                { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
                {
                  key: 'amount',
                  header: 'Amount',
                  align: 'right',
                  cell: (p) => formatMoney(p.amount, p.currency),
                },
                {
                  key: 'ref',
                  header: 'Reference',
                  hideOnMobile: true,
                  cell: (p) => (
                    <span className="font-mono text-xs break-all">
                      {p.providerPaymentId ?? p.providerRef ?? '—'}
                    </span>
                  ),
                },
                {
                  key: 'date',
                  header: 'Date',
                  hideOnMobile: true,
                  cell: (p) => formatDateTime(p.paidAt ?? p.createdAt),
                },
              ]}
            />
            {order.payments.some((p) => p.failureReason) && (
              <p className="text-ink-soft mt-3 text-sm">
                {order.payments
                  .filter((p) => p.failureReason)
                  .map((p) => p.failureReason)
                  .join(' · ')}
              </p>
            )}
          </Section>

          <Section
            title="Emails"
            description="Every email this order triggered, and whether it was delivered."
          >
            <DataTable
              caption="Emails"
              rows={order.emails}
              rowKey={(e) => e.id}
              empty={<p className="text-ink-soft text-[15px]">No emails yet.</p>}
              columns={[
                {
                  key: 'subject',
                  header: 'Email',
                  cell: (e) => <span className="break-words">{e.subject}</span>,
                },
                { key: 'to', header: 'To', hideOnMobile: true, cell: (e) => e.recipient },
                { key: 'status', header: 'Status', cell: (e) => <StatusBadge status={e.status} /> },
                {
                  key: 'date',
                  header: 'Sent',
                  hideOnMobile: true,
                  cell: (e) => formatDateTime(e.sentAt ?? e.createdAt),
                },
              ]}
            />
          </Section>
        </div>

        <aside className="lg:border-ink/10 grid content-start gap-8 lg:border-l lg:pl-8">
          <div>
            <h2 className="mb-3 text-lg font-medium tracking-tight">Customer</h2>
            <Link href={`/customers/${order.customer.id}`} className="font-medium hover:underline">
              {order.customer.name ?? order.customer.email}
            </Link>
            {order.customer.name && (
              <p className="text-ink-soft text-sm break-all">{order.customer.email}</p>
            )}
            <p className="text-ink-soft mt-2 flex items-center gap-1.5 text-sm">
              <Icon name="github" className="size-4" />
              {order.customerGithubLogin ? `@${order.customerGithubLogin}` : 'GitHub not connected'}
            </p>
          </div>
          <div>
            <h2 className="mb-3 text-lg font-medium tracking-tight">Attribution</h2>
            <DescriptionList
              columns={1}
              items={[
                { label: 'First touch', value: touchLabel(order.attribution.first) },
                { label: 'Last touch', value: touchLabel(order.attribution.last) },
                order.attribution.first?.landingPage
                  ? {
                      label: 'Landing page',
                      value: (
                        <span className="text-sm break-all">
                          {order.attribution.first.landingPage}
                        </span>
                      ),
                    }
                  : null,
              ]}
            />
            <p className="text-ink-soft mt-2 text-xs">
              Measured by this store (first-party). Ad platforms attribute differently.
            </p>
          </div>
          <DescriptionList
            columns={1}
            items={[
              {
                label: 'Source',
                value: order.source === 'ADMIN' ? 'Created by admin' : 'Checkout',
              },
              { label: 'Payment provider', value: humanize(order.provider) },
              order.createdBy ? { label: 'Created by', value: order.createdBy.email } : null,
              order.couponCode ? { label: 'Coupon', value: order.couponCode } : null,
              { label: 'Paid', value: formatDateTime(order.paidAt) },
              order.completedAt
                ? { label: 'Completed', value: formatDateTime(order.completedAt) }
                : null,
              order.cancelledAt
                ? { label: 'Cancelled', value: formatDateTime(order.cancelledAt) }
                : null,
              order.refundedAt
                ? { label: 'Refunded', value: formatDateTime(order.refundedAt) }
                : null,
            ]}
          />
          <div>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-lg font-medium tracking-tight">Internal note</h2>
              <ActionButton
                size="sm"
                variant="ghost"
                onClick={() => {
                  setNote(order.note ?? '');
                  setNoteOpen(true);
                }}
              >
                {order.note ? 'Edit' : 'Add'}
              </ActionButton>
            </div>
            <p className="text-ink-soft text-[15px] whitespace-pre-wrap">
              {order.note ?? 'No note.'}
            </p>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm === 'cancel'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Cancel order #${order.number}?`}
        description={`Access is revoked and the customer is emailed.${order.paymentStatus === 'PAID' ? ' The payment is not refunded; use Refund for that.' : ''}`}
        confirmLabel="Cancel order"
        tone="danger"
        onConfirm={() => doAction('cancel', 'Order cancelled.', 'cancel')}
      />
      <ConfirmDialog
        open={confirm === 'refund'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Refund ${formatMoney(order.total, order.currency)}?`}
        description={
          order.provider === 'STRIPE'
            ? 'The payment is refunded through Stripe, access is revoked and the customer is emailed.'
            : 'This records the refund (return the money outside the store), revokes access and emails the customer.'
        }
        confirmLabel="Refund order"
        tone="danger"
        onConfirm={() => doAction('refund', 'Order refunded.', 'refund')}
      />
      <Dialog
        open={noteOpen}
        onOpenChange={setNoteOpen}
        title="Internal note"
        description="Only visible to the team."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setNoteOpen(false)}>
              Cancel
            </ActionButton>
            <ActionButton
              loading={action.isBusy('note')}
              onClick={async () => {
                const res = await action.run(
                  () =>
                    api.patch<AdminOrderDetail>(`/v1/admin/orders/${order.id}`, {
                      note: note.trim() || null,
                    }),
                  {
                    key: 'note',
                  },
                );
                if (res) {
                  setData(res);
                  setNoteOpen(false);
                }
              }}
            >
              Save note
            </ActionButton>
          </>
        }
      >
        <Field label="Note">
          {(f) => (
            <Textarea {...f} rows={5} value={note} onChange={(e) => setNote(e.target.value)} />
          )}
        </Field>
      </Dialog>
    </>
  );
}
