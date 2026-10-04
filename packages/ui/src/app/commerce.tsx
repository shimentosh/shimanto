'use client';

import { type ReactNode, useId, useRef, useState } from 'react';
import { cn } from '../lib/cn';
import { Icon } from '../components/art/icon';
import { formatBytes, formatDateTime, formatMoney } from './format';

export interface OrderSummaryLine {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  meta?: ReactNode;
}

/** Line items and totals, receipt-style. */
export function OrderSummary({
  lines,
  subtotal,
  discount,
  total,
  currency,
  couponCode,
  className,
}: {
  lines: OrderSummaryLine[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  couponCode?: string | null;
  className?: string;
}) {
  return (
    <div className={cn('text-[15px]', className)}>
      <ul className="divide-ink/[0.07] divide-y">
        {lines.map((line) => (
          <li key={line.id} className="flex items-start justify-between gap-4 py-3 first:pt-0">
            <div className="min-w-0">
              <p className="font-medium">
                {line.name}
                {line.quantity > 1 && (
                  <span className="text-ink-soft font-normal"> × {line.quantity}</span>
                )}
              </p>
              {line.meta && <div className="text-ink-soft mt-0.5 text-sm">{line.meta}</div>}
            </div>
            <div className="text-right tabular-nums">
              {line.discount > 0 && (
                <p className="text-ink-soft text-sm line-through">
                  {formatMoney(line.unitPrice * line.quantity, currency)}
                </p>
              )}
              <p>{formatMoney(line.total, currency, { free: 'Free' })}</p>
            </div>
          </li>
        ))}
      </ul>
      <dl className="border-ink/10 mt-3 grid gap-1.5 border-t pt-3 tabular-nums">
        {discount > 0 && (
          <>
            <div className="text-ink-soft flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatMoney(subtotal, currency)}</dd>
            </div>
            <div className="text-ink-soft flex justify-between">
              <dt>Discount{couponCode ? ` (${couponCode})` : ''}</dt>
              <dd>−{formatMoney(discount, currency)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between text-[17px] font-medium">
          <dt>Total</dt>
          <dd>{formatMoney(total, currency, { free: 'Free' })}</dd>
        </div>
      </dl>
    </div>
  );
}

export interface ConversationMessage {
  id: string;
  authorType: 'CUSTOMER' | 'ADMIN';
  authorName: string;
  body: string;
  createdAt: string;
  attachment: { id: string; filename: string; size: number } | null;
}

/**
 * A support thread. `viewer` decides which side is "you": the customer portal shows the
 * customer's messages on the right; the admin shows the team's.
 */
export function SupportConversation({
  messages,
  viewer,
  onOpenAttachment,
}: {
  messages: ConversationMessage[];
  viewer: 'CUSTOMER' | 'ADMIN';
  onOpenAttachment?: (message: ConversationMessage) => void;
}) {
  return (
    <ol className="grid gap-5" aria-label="Conversation">
      {messages.map((m) => {
        const mine = m.authorType === viewer;
        return (
          <li key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
            <article className={cn('max-w-[min(38rem,92%)]', mine && 'text-right')}>
              <header
                className="text-ink-soft mb-1.5 flex items-center gap-2 text-[13px]"
                style={{ justifyContent: mine ? 'flex-end' : 'flex-start' }}
              >
                <span className="text-ink font-medium">{m.authorName}</span>
                {m.authorType === 'ADMIN' && (
                  <span className="bg-build/25 rounded-pill text-ink px-1.5 text-[11px] font-medium">
                    Team
                  </span>
                )}
                <time dateTime={m.createdAt}>{formatDateTime(m.createdAt)}</time>
              </header>
              <div
                className={cn(
                  'rounded-[18px] px-4 py-3 text-left text-[15px] leading-relaxed break-words whitespace-pre-wrap',
                  mine ? 'bg-ink text-canvas rounded-tr-[6px]' : 'bg-canvas rounded-tl-[6px]',
                )}
              >
                {m.body}
              </div>
              {m.attachment && (
                <button
                  type="button"
                  onClick={() => onOpenAttachment?.(m)}
                  className="text-ink-soft hover:text-ink mt-2 inline-flex items-center gap-1.5 text-sm underline-offset-4 hover:underline"
                >
                  <Icon name="paperclip" className="size-4" />
                  {m.attachment.filename}
                  <span className="text-ink-soft">({formatBytes(m.attachment.size)})</span>
                </button>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

/** File picker with drag & drop. Shows the chosen file; `accept` limits the picker. */
export function FileDrop({
  file,
  onFile,
  accept,
  hint,
  label = 'Choose a file or drop it here',
  disabled,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
  accept?: string;
  hint?: ReactNode;
  label?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div>
      <label
        htmlFor={id}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          const dropped = e.dataTransfer.files[0];
          if (dropped && !disabled) onFile(dropped);
        }}
        className={cn(
          'border-ink/20 hover:border-ink/40 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[16px] border border-dashed px-4 py-7 text-center transition-colors',
          over && 'border-ink bg-ink/[0.03]',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <Icon name="upload" className="text-ink-soft size-6" />
        {file ? (
          <span className="text-[15px]">
            <span className="font-medium">{file.name}</span>{' '}
            <span className="text-ink-soft">({formatBytes(file.size)})</span>
          </span>
        ) : (
          <span className="text-[15px] font-medium">{label}</span>
        )}
        {hint && <span className="text-ink-soft text-sm">{hint}</span>}
      </label>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {file && (
        <button
          type="button"
          onClick={() => {
            onFile(null);
            if (input.current) input.current.value = '';
          }}
          className="text-ink-soft hover:text-ink mt-2 text-sm underline-offset-4 hover:underline"
        >
          Remove file
        </button>
      )}
    </div>
  );
}

/** Copy-to-clipboard for ids, links and codes. */
export function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="text-ink-soft hover:text-ink inline-flex items-center gap-1 text-sm"
      aria-label={copied ? 'Copied' : label}
    >
      <Icon name={copied ? 'check' : 'copy'} className="size-4" />
      <span aria-live="polite">{copied ? 'Copied' : label}</span>
    </button>
  );
}
