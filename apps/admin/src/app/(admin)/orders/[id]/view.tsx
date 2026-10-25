'use client';

import type { AdminDelivery, AdminOrderDetail, ManualPaymentState } from '@shimanto/types';
import {
  ActionButton,
  ConfirmDialog,
  CopyButton,
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

type Confirm = 'cancel' | 'refund' | 'confirm-payment' | 'reject-payment' | null;

type AdminPayment = AdminOrderDetail['payments'][number];
type ManualPayment = AdminPayment & { manual: NonNullable<AdminPayment['manual']> };

const PROVIDERS: Record<AdminPayment['provider'], string> = {
  FREE: 'Free',
  STRIPE: 'Stripe (card)',
  PAYPAL: 'PayPal',
  MANUAL: 'Manual',
};

const MANUAL_STATES: Record<
  ManualPaymentState,
  { label: string; tone: 'success' | 'info' | 'warning' | 'danger' | 'neutral' }
> = {
  AWAITING: { label: 'Awaiting payment', tone: 'neutral' },
  SUBMITTED: { label: 'Needs verification', tone: 'warning' },
  REJECTED: { label: 'Rejected, waiting for the customer', tone: 'danger' },
  CONFIRMED: { label: 'Confirmed', tone: 'success' },
  CLOSED: { label: 'Closed', tone: 'neutral' },
};

const REJECT_REASONS = [
  'No payment with this reference arrived.',
  'The amount doesn’t match the order total.',
  'The screenshot is unreadable or doesn’t show the transaction.',
  'The payment came from a different account than the one given.',
];

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

/** What the customer says they paid, with everything needed to check it against the account. */
function ManualPaymentPanel({
  order,
  payment,
  onConfirm,
  onReject,
  run,
  busy,
}: {
  order: AdminOrderDetail;
  payment: ManualPayment;
  onConfirm: () => void;
  onReject: () => void;
  run: ReturnType<typeof useAction>['run'];
  busy: string | null;
}) {
  const { manual } = payment;
  const state = MANUAL_STATES[manual.state];
  const open = order.status === 'PENDING' && order.paymentStatus === 'PENDING';
  const overdue = open && order.paymentDueAt && new Date(order.paymentDueAt) < new Date();
  const viewProof = async () => {
    // Open the tab first (popup blockers), then point it at the 5-minute signed link.
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    const res = await run(
      () => api.post<{ url: string }>(`/v1/admin/orders/${order.id}/payments/${payment.id}/proof`),
      { key: 'proof' },
    );
    if (res && tab) tab.location.href = res.url;
    else if (res) window.open(res.url, '_blank', 'noopener');
    else tab?.close();
  };

  return (
    <section
      aria-label="Manual payment"
      className={
        manual.state === 'SUBMITTED'
          ? 'border-spark/60 bg-spark/10 mb-8 rounded-[18px] border p-5'
          : 'border-ink/10 mb-8 rounded-[18px] border p-5'
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {manual.method.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- small admin-uploaded logo
            <img
              src={manual.method.logoUrl}
              alt=""
              className="size-10 shrink-0 rounded-[10px] object-contain"
            />
          ) : (
            <span className="bg-ink/[0.06] grid size-10 shrink-0 place-items-center rounded-[10px]">
              <Icon name="receipt" className="text-ink-soft size-5" />
            </span>
          )}
          <div className="min-w-0">
            <p className="text-ink-soft text-sm">Manual payment</p>
            <h2 className="text-lg font-medium tracking-tight">{manual.method.name}</h2>
          </div>
        </div>
        <div className="text-right">
          <p className="text-ink-soft text-sm">Expect</p>
          <p className="text-2xl font-medium tabular-nums">
            {formatMoney(payment.amount, payment.currency)}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={manual.state} label={state.label} tone={state.tone} />
        {overdue && <StatusBadge status="OVERDUE" label="Past the deadline" tone="danger" />}
      </div>

      {manual.duplicateOrders.length > 0 && (
        <Notice tone="danger" className="mt-4" title="This reference was used on another order">
          Also sent for{' '}
          {manual.duplicateOrders.map((n, i) => (
            <span key={n}>
              {i > 0 && ', '}
              <Link href={`/orders?q=${n}`} className="font-medium underline underline-offset-4">
                #{n}
              </Link>
            </span>
          ))}
          . One transaction can only pay for one order: check carefully before confirming.
        </Notice>
      )}
      {manual.rejectedReason && manual.state !== 'CONFIRMED' && (
        <Notice tone="info" className="mt-4" title="Last rejection">
          {manual.rejectedReason}
        </Notice>
      )}

      <dl className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
        <div>
          <dt className="text-ink-soft text-sm">{manual.method.referenceLabel}</dt>
          <dd className="mt-0.5 flex flex-wrap items-center gap-2">
            {manual.reference ? (
              <>
                <span className="font-mono text-[15px] break-all">{manual.reference}</span>
                <CopyButton value={manual.reference} />
              </>
            ) : (
              <span className="text-ink-soft">Not sent yet</span>
            )}
          </dd>
        </div>
        {manual.method.senderLabel && (
          <div>
            <dt className="text-ink-soft text-sm">{manual.method.senderLabel}</dt>
            <dd className="mt-0.5 flex flex-wrap items-center gap-2">
              {manual.senderAccount ? (
                <>
                  <span className="font-mono text-[15px] break-all">{manual.senderAccount}</span>
                  <CopyButton value={manual.senderAccount} />
                </>
              ) : (
                <span className="text-ink-soft">Not sent yet</span>
              )}
            </dd>
          </div>
        )}
        <div>
          <dt className="text-ink-soft text-sm">Sent</dt>
          <dd className="mt-0.5">
            {manual.submittedAt ? formatDateTime(manual.submittedAt) : '—'}
          </dd>
        </div>
        <div>
          <dt className="text-ink-soft text-sm">Pay by</dt>
          <dd className="mt-0.5">
            {order.paymentDueAt ? formatDateTime(order.paymentDueAt) : '—'}
            {open && manual.state === 'SUBMITTED' && (
              <span className="text-ink-soft block text-sm">
                Not cancelled automatically while it waits for you.
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-ink-soft text-sm">Screenshot / receipt</dt>
          <dd className="mt-0.5">
            {manual.proof ? (
              <ActionButton
                size="sm"
                variant="secondary"
                icon="eye"
                loading={busy === 'proof'}
                onClick={() => void viewProof()}
              >
                View {manual.proof.mimeType === 'application/pdf' ? 'receipt' : 'screenshot'}
              </ActionButton>
            ) : (
              <span className="text-ink-soft">
                {manual.method.proof === 'OFF' ? 'Not asked for' : 'None attached'}
              </span>
            )}
          </dd>
        </div>
        {manual.method.fields.length > 0 && (
          <div>
            <dt className="text-ink-soft text-sm">Paid to</dt>
            <dd className="mt-0.5 text-[15px]">
              {manual.method.fields.map((f) => (
                <span key={f.label} className="block">
                  <span className="text-ink-soft">{f.label}:</span> {f.value}
                </span>
              ))}
            </dd>
          </div>
        )}
      </dl>

      {open && (manual.state === 'SUBMITTED' || manual.state === 'AWAITING') && (
        <div className="border-ink/10 mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
          <ActionButton size="sm" icon="check" onClick={onConfirm}>
            Confirm payment
          </ActionButton>
          {manual.state === 'SUBMITTED' && (
            <ActionButton size="sm" variant="secondary" onClick={onReject}>
              Reject
            </ActionButton>
          )}
          <p className="text-ink-soft text-sm">
            {manual.state === 'SUBMITTED'
              ? 'Check your account for this reference and amount first.'
              : 'Confirm only once the money is in your account.'}
          </p>
        </div>
      )}
    </section>
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
  const [rejectReason, setRejectReason] = useState('');

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
  // The latest manual payment (a checkout order has one; admin-created orders have none).
  const manualPayment = [...order.payments]
    .reverse()
    .find((p): p is ManualPayment => p.manual !== null);
  const reviewable =
    manualPayment &&
    order.status === 'PENDING' &&
    order.paymentStatus === 'PENDING' &&
    (manualPayment.manual.state === 'SUBMITTED' || manualPayment.manual.state === 'AWAITING');

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
            {reviewable && manualPayment.manual.state === 'SUBMITTED' && (
              <ActionButton size="sm" icon="check" onClick={() => setConfirm('confirm-payment')}>
                Confirm payment
              </ActionButton>
            )}
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

      {manualPayment && (
        <ManualPaymentPanel
          order={order}
          payment={manualPayment}
          onConfirm={() => setConfirm('confirm-payment')}
          onReject={() => {
            setRejectReason('');
            setConfirm('reject-payment');
          }}
          run={action.run}
          busy={action.busy}
        />
      )}

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
                {
                  key: 'provider',
                  header: 'Provider',
                  cell: (p) => (p.manual ? p.manual.method.name : PROVIDERS[p.provider]),
                },
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
                      {p.manual?.reference ?? p.providerPaymentId ?? p.providerRef ?? '—'}
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
              {
                label: 'Payment provider',
                value: manualPayment ? manualPayment.manual.method.name : PROVIDERS[order.provider],
              },
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
        open={confirm === 'confirm-payment'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Confirm ${formatMoney(order.total, order.currency)} received?`}
        description={`Only confirm once the money is in your account${manualPayment?.manual.reference ? ` with reference ${manualPayment.manual.reference}` : ''}. The order is delivered right away and the customer gets a receipt.`}
        confirmLabel="Confirm payment"
        onConfirm={() =>
          doAction('payment/confirm', 'Payment confirmed. Delivering now.', 'confirm-payment')
        }
      />
      <Dialog
        open={confirm === 'reject-payment'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title="Reject this payment?"
        description="The customer is emailed your reason and can send their payment details again. The order stays open, with at least a day to fix it."
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setConfirm(null)}>
              Cancel
            </ActionButton>
            <ActionButton
              loading={action.isBusy('reject-payment')}
              disabled={rejectReason.trim().length < 3}
              onClick={async () => {
                const res = await action.run(
                  () =>
                    api.post<AdminOrderDetail>(`/v1/admin/orders/${order.id}/payment/reject`, {
                      reason: rejectReason.trim(),
                    }),
                  { key: 'reject-payment', success: 'Payment rejected. The customer was emailed.' },
                );
                if (res) {
                  setData(res);
                  setConfirm(null);
                }
              }}
            >
              Reject payment
            </ActionButton>
          </>
        }
      >
        <div className="grid gap-3">
          <div className="flex flex-wrap gap-1.5">
            {REJECT_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRejectReason(r)}
                className="bg-ink/[0.05] text-ink-soft hover:text-ink rounded-pill px-3 py-1 text-left text-sm"
              >
                {r}
              </button>
            ))}
          </div>
          <Field label="Reason (sent to the customer)" error={action.fields.reason}>
            {(f) => (
              <Textarea
                {...f}
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            )}
          </Field>
        </div>
      </Dialog>
      <ConfirmDialog
        open={confirm === 'refund'}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={`Refund ${formatMoney(order.total, order.currency)}?`}
        description={
          order.provider === 'STRIPE' || order.provider === 'PAYPAL'
            ? `The payment is refunded through ${order.provider === 'STRIPE' ? 'Stripe' : 'PayPal'}, access is revoked and the customer is emailed.`
            : 'This records the refund (send the money back yourself, e.g. by bKash or bank transfer), revokes access and emails the customer.'
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
