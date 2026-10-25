'use client';

import { fieldErrors } from '@shimanto/sdk';
import type { ManualPaymentState, OrderDetail } from '@shimanto/types';
import {
  ActionButton,
  CopyButton,
  Field,
  FileDrop,
  Icon,
  Input,
  Notice,
  cn,
  formatDateTime,
  formatMoney,
} from '@shimanto/ui';
import { useEffect, useState } from 'react';
import { FormError, useFormSubmit } from '@/components/auth-form';
import { api } from '@/lib/api';

type ManualOrder = OrderDetail & { manualPayment: NonNullable<OrderDetail['manualPayment']> };

const MAX_BYTES = 10 * 1024 * 1024;

const steps = ['Order placed', 'Payment sent', 'Verified'];
const stepIndex: Record<ManualPaymentState, number> = {
  AWAITING: 0,
  REJECTED: 0,
  SUBMITTED: 1,
  CONFIRMED: 2,
  CLOSED: 0,
};

function Stepper({ state }: { state: ManualPaymentState }) {
  const current = stepIndex[state];
  return (
    <ol
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm"
      aria-label="Payment progress"
    >
      {steps.map((label, i) => {
        const done = i < current || (state === 'CONFIRMED' && i === current);
        const active = i === current && state !== 'CONFIRMED';
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={cn(
                'flex items-center gap-2',
                done || active ? 'text-ink font-medium' : 'text-ink-soft',
              )}
              aria-current={active ? 'step' : undefined}
            >
              <span
                className={cn(
                  'flex size-6 items-center justify-center rounded-full text-xs tabular-nums',
                  done
                    ? 'bg-ink text-canvas'
                    : active
                      ? 'border-ink border-2'
                      : 'border-ink/20 border',
                )}
              >
                {done ? <Icon name="check" className="size-3.5" /> : i + 1}
              </span>
              {label}
            </span>
            {i < steps.length - 1 && <span aria-hidden="true" className="bg-ink/15 h-px w-6" />}
          </li>
        );
      })}
    </ol>
  );
}

/** "Pay by Tue, 28 Oct, 21:00 · 1 day 4 hours left", ticking each minute. */
function Deadline({ dueAt }: { dueAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);
  const left = new Date(dueAt).getTime() - now;
  if (left <= 0) {
    return (
      <p className="text-sm font-medium text-[var(--create)]">
        The payment deadline ({formatDateTime(dueAt)}) has passed. Paid already? Send the details
        now; otherwise this order will be cancelled.
      </p>
    );
  }
  const hours = Math.floor(left / 3_600_000);
  const minutes = Math.floor((left % 3_600_000) / 60_000);
  const remaining =
    hours >= 24
      ? `${Math.floor(hours / 24)} day${hours >= 48 ? 's' : ''} ${hours % 24} h left`
      : hours > 0
        ? `${hours} h ${minutes} min left`
        : `${minutes} min left`;
  return (
    <p className={cn('flex items-center gap-2 text-sm', hours < 6 && 'font-medium')}>
      <Icon name="clock" className="size-4" />
      Pay by {formatDateTime(dueAt)} · {remaining}
    </p>
  );
}

function HowToPay({ order }: { order: ManualOrder }) {
  const { method } = order.manualPayment;
  const amount = formatMoney(order.total, order.currency);
  const instructions = method.instructions
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-ink-soft text-sm">Amount to pay</p>
            <p className="text-3xl font-medium tracking-tight tabular-nums">{amount}</p>
          </div>
          <CopyButton value={amount.replace(/[^\d.,]/g, '')} label="Copy amount" />
        </div>
        {method.fields.length > 0 && (
          <dl className="divide-ink/[0.08] mt-4 divide-y">
            {method.fields.map((field) => (
              <div
                key={`${field.label}:${field.value}`}
                className="flex items-center justify-between gap-4 py-2.5"
              >
                <div className="min-w-0">
                  <dt className="text-ink-soft text-sm">{field.label}</dt>
                  <dd className="truncate text-lg font-medium tabular-nums">{field.value}</dd>
                </div>
                <CopyButton value={field.value} />
              </div>
            ))}
            <div className="flex items-center justify-between gap-4 py-2.5">
              <div>
                <dt className="text-ink-soft text-sm">Reference / note</dt>
                <dd className="text-lg font-medium tabular-nums">Order #{order.number}</dd>
              </div>
              <CopyButton value={`Order #${order.number}`} />
            </div>
          </dl>
        )}
        {instructions.length > 0 && (
          <ol className="mt-4 space-y-2">
            {instructions.map((step, i) => (
              <li key={`${i}:${step}`} className="flex gap-3 text-[15px]">
                <span className="bg-ink text-canvas flex size-6 shrink-0 items-center justify-center rounded-full text-xs tabular-nums">
                  {i + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      {method.qrUrl && (
        <figure className="justify-self-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- store-uploaded QR code */}
          <img
            src={method.qrUrl}
            alt={`${method.name} QR code`}
            className="size-40 rounded-[12px] bg-white object-contain p-2"
          />
          <figcaption className="text-ink-soft mt-1.5 text-center text-xs">Scan to pay</figcaption>
        </figure>
      )}
    </div>
  );
}

function ProofForm({
  order,
  onChange,
  onCancel,
}: {
  order: ManualOrder;
  onChange: (next: OrderDetail) => void;
  onCancel?: () => void;
}) {
  const { method } = order.manualPayment;
  const [reference, setReference] = useState(order.manualPayment.reference ?? '');
  const [sender, setSender] = useState(order.manualPayment.senderAccount ?? '');
  const [file, setFile] = useState<File | null>(null);
  const { busy, error, fields, submit } = useFormSubmit();
  const [fileError, setFileError] = useState<string | null>(null);
  const needsFile = method.proof === 'REQUIRED' && !order.manualPayment.proof;

  const onSubmit = submit(async () => {
    setFileError(null);
    if (file && file.size > MAX_BYTES) {
      setFileError('Files can be up to 10 MB.');
      return;
    }
    if (needsFile && !file) {
      setFileError('Attach a screenshot or receipt of the payment.');
      return;
    }
    const form = new FormData();
    form.set('reference', reference.trim());
    if (sender.trim()) form.set('senderAccount', sender.trim());
    if (file) form.set('proof', file);
    try {
      onChange(
        await api.upload<OrderDetail>(`/v1/account/orders/${order.number}/manual-payment`, form),
      );
    } catch (e) {
      const byField = fieldErrors(e);
      if (byField.proof) setFileError(byField.proof);
      throw e;
    }
  });

  return (
    <form onSubmit={onSubmit} className="grid max-w-lg gap-4" noValidate>
      <FormError error={error} />
      <Field
        label={method.referenceLabel}
        error={fields.reference}
        hint="Copy it from the payment confirmation (SMS, app or bank statement)."
      >
        {(f) => (
          <Input
            {...f}
            required
            autoComplete="off"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
          />
        )}
      </Field>
      {method.senderLabel && (
        <Field label={method.senderLabel} error={fields.senderAccount}>
          {(f) => (
            <Input
              {...f}
              required
              autoComplete="off"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
            />
          )}
        </Field>
      )}
      {method.proof !== 'OFF' && (
        <div>
          <p className="mb-2 font-medium">
            Screenshot or receipt{' '}
            {method.proof === 'OPTIONAL' && (
              <span className="text-ink-soft font-normal">(optional)</span>
            )}
          </p>
          <FileDrop
            file={file}
            onFile={(next) => {
              setFile(next);
              setFileError(null);
            }}
            accept="image/jpeg,image/png,image/webp,application/pdf"
            label="Choose a screenshot or PDF"
            hint={
              order.manualPayment.proof && !file
                ? `Already sent: ${order.manualPayment.proof.filename}. Choose a file to replace it.`
                : 'JPEG, PNG, WebP or PDF, up to 10 MB'
            }
          />
          {fileError && (
            <p role="alert" className="mt-2 text-sm font-medium text-[var(--create)]">
              {fileError}
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <ActionButton type="submit" loading={busy} icon="send">
          Send payment details
        </ActionButton>
        {onCancel && (
          <ActionButton variant="ghost" onClick={onCancel}>
            Cancel
          </ActionButton>
        )}
      </div>
    </form>
  );
}

/**
 * Manual payment (bKash, bank transfer…) on the order page: how to pay, the deadline, and the
 * form for the transaction details and a screenshot. Shown while the payment is open.
 */
export function ManualPaymentPanel({
  order,
  onChange,
}: {
  order: ManualOrder;
  onChange: (next: OrderDetail) => void;
}) {
  const payment = order.manualPayment;
  const { method, state } = payment;
  const [editing, setEditing] = useState(false);

  if (state === 'CLOSED') return null;
  if (state === 'CONFIRMED') {
    return (
      <Notice tone="success" className="mb-6" title="Payment confirmed">
        We received your {method.name} payment{payment.reference ? ` (${payment.reference})` : ''}.
        Thank you!
      </Notice>
    );
  }

  return (
    <section
      aria-labelledby="manual-payment-title"
      className="border-ink/10 mb-8 rounded-[20px] border p-5 md:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {method.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- store-uploaded logo
            <img
              src={method.logoUrl}
              alt=""
              className="size-11 rounded-[10px] bg-white object-contain p-1"
            />
          ) : (
            <span className="bg-ink/[0.07] flex size-11 items-center justify-center rounded-[10px]">
              <Icon
                name={method.kind === 'BANK_TRANSFER' ? 'briefcase' : 'send'}
                className="size-5"
              />
            </span>
          )}
          <div>
            <h2 id="manual-payment-title" className="text-xl font-medium tracking-tight">
              {state === 'SUBMITTED' ? 'We’re checking your payment' : `Pay with ${method.name}`}
            </h2>
            {method.description && state !== 'SUBMITTED' && (
              <p className="text-ink-soft text-sm">{method.description}</p>
            )}
          </div>
        </div>
        <Stepper state={state} />
      </div>

      {state === 'REJECTED' && payment.rejectedReason && (
        <Notice tone="danger" className="mt-5" title="We couldn’t confirm your payment">
          {payment.rejectedReason} Please check the details and send them again.
        </Notice>
      )}

      {state === 'SUBMITTED' && !editing ? (
        <div className="mt-5">
          <p className="text-[15px]">
            Thanks! We’ll deliver your order as soon as we confirm the payment, usually within a
            day. You’ll get an email.
          </p>
          <dl className="bg-ink/[0.03] mt-4 grid gap-3 rounded-[14px] px-4 py-3 text-[15px] sm:grid-cols-2">
            <div>
              <dt className="text-ink-soft text-sm">{method.referenceLabel}</dt>
              <dd className="font-medium">{payment.reference}</dd>
            </div>
            {payment.senderAccount && (
              <div>
                <dt className="text-ink-soft text-sm">{method.senderLabel ?? 'Sent from'}</dt>
                <dd className="font-medium">{payment.senderAccount}</dd>
              </div>
            )}
            {payment.proof && (
              <div>
                <dt className="text-ink-soft text-sm">Screenshot</dt>
                <dd className="font-medium">{payment.proof.filename}</dd>
              </div>
            )}
            {payment.submittedAt && (
              <div>
                <dt className="text-ink-soft text-sm">Sent</dt>
                <dd className="font-medium">{formatDateTime(payment.submittedAt)}</dd>
              </div>
            )}
          </dl>
          <ActionButton
            size="sm"
            variant="secondary"
            className="mt-4"
            onClick={() => setEditing(true)}
          >
            Change details
          </ActionButton>
        </div>
      ) : (
        <>
          {state !== 'SUBMITTED' && payment.dueAt && (
            <div className="mt-4">
              <Deadline dueAt={payment.dueAt} />
            </div>
          )}
          {state !== 'SUBMITTED' && (
            <div className="border-ink/10 mt-5 border-t pt-5">
              <HowToPay order={order} />
            </div>
          )}
          <div className="border-ink/10 mt-6 border-t pt-5">
            <h3 className="mb-1 text-lg font-medium tracking-tight">
              {state === 'SUBMITTED' ? 'Update payment details' : 'Paid? Send us the details'}
            </h3>
            <p className="text-ink-soft mb-4 text-[15px]">
              We match them with the payment we received, then deliver your order.
            </p>
            <ProofForm
              order={order}
              onChange={(next) => {
                onChange(next);
                setEditing(false);
              }}
              onCancel={state === 'SUBMITTED' ? () => setEditing(false) : undefined}
            />
          </div>
        </>
      )}
    </section>
  );
}
