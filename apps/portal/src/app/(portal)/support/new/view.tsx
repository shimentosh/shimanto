'use client';

import { errorMessage, fieldErrors } from '@shimanto/sdk';
import type { OrderSummary, OwnedProduct, TicketDetail } from '@shimanto/types';
import {
  ActionButton,
  Field,
  FileDrop,
  Input,
  Notice,
  PageHeader,
  Select,
  Textarea,
} from '@shimanto/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useState } from 'react';
import { analytics } from '@/lib/analytics';
import { api } from '@/lib/api';
import { useApi } from '@/lib/use-api';

export function NewTicketView() {
  const params = useSearchParams();
  const router = useRouter();
  const products = useApi<OwnedProduct[]>('/v1/account/products');
  const orders = useApi<OrderSummary[]>('/v1/account/orders');

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [productId, setProductId] = useState(params.get('product') ?? '');
  const [orderId, setOrderId] = useState(params.get('order') ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFields({});
    const form = new FormData();
    form.set('subject', subject);
    form.set('message', message);
    if (productId) form.set('productId', productId);
    if (orderId) form.set('orderId', orderId);
    if (file) form.set('file', file);
    try {
      const ticket = await api.upload<TicketDetail>('/v1/account/tickets', form);
      analytics.trackSupportTicketCreated(ticket.number);
      router.replace(`/support/${ticket.number}?created=1`);
    } catch (e) {
      const byField = fieldErrors(e);
      setFields(byField);
      setError(Object.keys(byField).length ? null : errorMessage(e));
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader
        back={{ href: '/support', label: 'Support' }}
        title="New ticket"
        description="Tell us what’s going on. Screenshots help."
      />
      <form onSubmit={onSubmit} className="grid max-w-2xl gap-6" noValidate>
        {error && <Notice tone="danger">{error}</Notice>}
        <Field label="Subject" error={fields.subject}>
          {(f) => (
            <Input
              {...f}
              required
              maxLength={160}
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. The download link gives an error"
            />
          )}
        </Field>
        <div className="grid gap-6 sm:grid-cols-2">
          <Field label="Product" optional error={fields.productId}>
            {(f) => (
              <Select {...f} value={productId} onChange={(e) => setProductId(e.target.value)}>
                <option value="">Not about a product</option>
                {products.data?.map((p) => (
                  <option key={p.productId} value={p.productId}>
                    {p.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Order" optional error={fields.orderId}>
            {(f) => (
              <Select {...f} value={orderId} onChange={(e) => setOrderId(e.target.value)}>
                <option value="">Not about an order</option>
                {orders.data?.map((o) => (
                  <option key={o.id} value={o.id}>
                    #{o.number} · {o.items.map((i) => i.productName).join(', ')}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        <Field label="Message" error={fields.message} hint="At least 10 characters.">
          {(f) => (
            <Textarea
              {...f}
              required
              rows={7}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          )}
        </Field>
        <div className="grid gap-1.5">
          <span className="text-[15px] font-medium">
            Attachment <span className="text-ink-soft font-normal">(optional)</span>
          </span>
          <FileDrop
            file={file}
            onFile={setFile}
            accept="image/png,image/jpeg,image/gif,image/webp,application/pdf,application/zip"
            hint="Image, PDF or ZIP, up to 10 MB"
          />
          {fields.file && <p className="text-create text-sm font-medium">{fields.file}</p>}
        </div>
        <div>
          <ActionButton type="submit" loading={busy} icon="send">
            Send to support
          </ActionButton>
        </div>
      </form>
    </>
  );
}
