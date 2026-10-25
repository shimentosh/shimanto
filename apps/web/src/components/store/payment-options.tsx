'use client';

import type { ManualMethodView, PaymentOption } from '@shimanto/types';
import { CopyButton, Icon, cn } from '@shimanto/ui';
import { useId, useState } from 'react';
import { formatPrice } from '@/lib/store';

const inputClass =
  'border-ink/15 placeholder:text-ink-soft/70 rounded-button w-full border bg-transparent px-4 py-3 text-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[var(--create)]';

export interface ManualProofDraft {
  reference: string;
  senderAccount: string;
}

/** Card / PayPal get a small text mark; manual methods show their uploaded logo. */
function OptionMark({ option }: { option: PaymentOption }) {
  if (option.manual?.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- store-uploaded logo, any host
      <img
        src={option.manual.logoUrl}
        alt=""
        className="size-10 shrink-0 rounded-[10px] bg-white object-contain p-1"
      />
    );
  }
  const label =
    option.type === 'stripe'
      ? 'Card'
      : option.type === 'paypal'
        ? 'PayPal'
        : option.manual?.kind === 'BANK_TRANSFER'
          ? 'Bank'
          : option.name.slice(0, 5);
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-10 min-w-10 shrink-0 items-center justify-center rounded-[10px] px-2 text-xs font-semibold',
        option.type === 'paypal' ? 'bg-[#ffc439] text-[#003087]' : 'bg-ink/[0.07]',
      )}
    >
      {option.type === 'stripe' ? <Icon name="lock" className="size-4" /> : label}
    </span>
  );
}

/** How to pay a manual method: amount, account details to copy, QR and the steps. */
export function ManualPaymentDetails({
  method,
  total,
  currency,
  windowHours,
}: {
  method: ManualMethodView;
  total: number;
  currency: string;
  windowHours: number;
}) {
  const steps = method.instructions
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const amount = formatPrice(total, currency);
  return (
    <div className="bg-paper mt-3 rounded-[16px] px-5 py-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-ink-soft text-sm">Amount to pay</p>
          <p className="text-3xl font-medium tracking-[-0.03em] tabular-nums">{amount}</p>
        </div>
        <CopyButton value={amount.replace(/[^\d.,]/g, '')} label="Copy amount" />
      </div>

      <div className="mt-5 grid gap-5 sm:grid-cols-[minmax(0,1fr)_auto]">
        {method.fields.length > 0 && (
          <dl className="divide-ink/[0.08] divide-y">
            {method.fields.map((field) => (
              <div
                key={`${field.label}:${field.value}`}
                className="flex items-center justify-between gap-4 py-2.5 first:pt-0"
              >
                <div className="min-w-0">
                  <dt className="text-ink-soft text-sm">{field.label}</dt>
                  <dd className="truncate text-lg font-medium tabular-nums">{field.value}</dd>
                </div>
                <CopyButton value={field.value} />
              </div>
            ))}
          </dl>
        )}
        {method.qrUrl && (
          <figure className="justify-self-start">
            {/* eslint-disable-next-line @next/next/no-img-element -- store-uploaded QR code */}
            <img
              src={method.qrUrl}
              alt={`${method.name} QR code`}
              className="size-36 rounded-[12px] bg-white object-contain p-2"
            />
            <figcaption className="text-ink-soft mt-1.5 text-center text-xs">
              Scan to pay
            </figcaption>
          </figure>
        )}
      </div>

      {steps.length > 0 && (
        <ol className="mt-5 space-y-2">
          {steps.map((step, i) => (
            <li key={`${i}:${step}`} className="flex gap-3 text-[15px]">
              <span className="bg-ink text-canvas flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium tabular-nums">
                {i + 1}
              </span>
              <span className="pt-0.5">{step}</span>
            </li>
          ))}
        </ol>
      )}

      <p className="text-ink-soft mt-5 flex gap-2 text-sm">
        <Icon name="clock" className="mt-0.5 size-4 shrink-0" />
        <span>
          Pay within {windowHours} hour{windowHours === 1 ? '' : 's'} of placing the order, or it’s
          cancelled. We deliver as soon as we confirm the payment.
        </span>
      </p>
    </div>
  );
}

/** Optional: the buyer already paid, so the transaction details can come with the order. */
function ProofNow({
  method,
  proof,
  onProof,
}: {
  method: ManualMethodView;
  proof: ManualProofDraft;
  onProof: (proof: ManualProofDraft) => void;
}) {
  const id = useId();
  const [open, setOpen] = useState(Boolean(proof.reference));
  return (
    <div className="border-ink/10 mt-3 rounded-[16px] border px-5 py-4">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-proof`}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-3 text-left font-medium"
      >
        Already paid? Add the transaction details now
        <Icon
          name="chevronDown"
          className={cn('size-4 shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div id={`${id}-proof`} className="mt-4 space-y-4">
          <div>
            <label htmlFor={`${id}-reference`} className="mb-2 block font-medium">
              {method.referenceLabel}
            </label>
            <input
              id={`${id}-reference`}
              autoComplete="off"
              value={proof.reference}
              onChange={(e) => onProof({ ...proof, reference: e.target.value })}
              className={inputClass}
            />
          </div>
          {method.senderLabel && (
            <div>
              <label htmlFor={`${id}-sender`} className="mb-2 block font-medium">
                {method.senderLabel}
              </label>
              <input
                id={`${id}-sender`}
                autoComplete="off"
                value={proof.senderAccount}
                onChange={(e) => onProof({ ...proof, senderAccount: e.target.value })}
                className={inputClass}
              />
            </div>
          )}
          <p className="text-ink-soft text-sm">
            Optional. You can also add them later on your order page
            {method.proof !== 'OFF' ? ', where you can upload a screenshot of the payment too' : ''}
            .
          </p>
        </div>
      )}
    </div>
  );
}

/** Ways to pay as selectable cards; the chosen manual method expands with how to pay. */
export function PaymentOptions({
  options,
  selected,
  onSelect,
  total,
  currency,
  windowHours,
  proof,
  onProof,
}: {
  options: PaymentOption[];
  selected: PaymentOption | null;
  onSelect: (id: string) => void;
  total: number;
  currency: string;
  windowHours: number;
  proof: ManualProofDraft;
  onProof: (proof: ManualProofDraft) => void;
}) {
  const id = useId();
  if (!options.length) {
    return (
      <p role="alert" className="bg-spark/30 rounded-[14px] px-4 py-3">
        Payments aren’t set up yet. Please check back soon.
      </p>
    );
  }
  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="How do you want to pay?" className="space-y-2.5">
        {options.map((option) => {
          const checked = selected?.id === option.id;
          return (
            <label
              key={option.id}
              className={cn(
                'flex cursor-pointer items-center gap-4 rounded-[16px] border px-4 py-3.5 transition-colors',
                checked ? 'border-ink/70 bg-ink/[0.03]' : 'border-ink/10 hover:border-ink/30',
              )}
            >
              <input
                type="radio"
                name={`${id}-payment`}
                value={option.id}
                checked={checked}
                onChange={() => onSelect(option.id)}
                className="accent-ink size-4 shrink-0"
              />
              <OptionMark option={option} />
              <span className="min-w-0">
                <span className="block font-medium">{option.name}</span>
                {option.description && (
                  <span className="text-ink-soft block text-sm">{option.description}</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {selected?.manual && (
        <>
          <ManualPaymentDetails
            method={selected.manual}
            total={total}
            currency={currency}
            windowHours={windowHours}
          />
          <ProofNow method={selected.manual} proof={proof} onProof={onProof} />
        </>
      )}
    </div>
  );
}
