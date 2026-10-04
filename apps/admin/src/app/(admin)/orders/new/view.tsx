'use client';

import type { AdminOrderDetail, AdminProduct } from '@shimanto/types';
import {
  ActionButton,
  Checkbox,
  Field,
  Input,
  LoadingState,
  Notice,
  PageHeader,
  Section,
  Select,
  Textarea,
  formatMoney,
} from '@shimanto/ui';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';

interface Line {
  key: number;
  productId: string;
  quantity: number;
  /** Price override in major units, as typed ("" = product price). */
  price: string;
}

export function NewOrderView() {
  const router = useRouter();
  const params = useSearchParams();
  const products = useApi<AdminProduct[]>('/v1/admin/products');
  const [email, setEmail] = useState(params.get('email') ?? '');
  const [name, setName] = useState('');
  const [lines, setLines] = useState<Line[]>([
    { key: 1, productId: params.get('product') ?? '', quantity: 1, price: '' },
  ]);
  const [coupon, setCoupon] = useState('');
  const [paidExternally, setPaidExternally] = useState(false);
  const [notify, setNotify] = useState(true);
  const [note, setNote] = useState('');
  const { run, isBusy, error, fields } = useAction();

  const available = useMemo(
    () => (products.data ?? []).filter((p) => p.status !== 'ARCHIVED'),
    [products.data],
  );
  const byId = new Map(available.map((p) => [p.id, p]));
  const estimate = lines.reduce((sum, line) => {
    const product = byId.get(line.productId);
    if (!product) return sum;
    const unit = line.price.trim() === '' ? product.price : Math.round(Number(line.price) * 100);
    return sum + (Number.isFinite(unit) ? unit : 0) * line.quantity;
  }, 0);
  const currency = byId.get(lines[0]?.productId ?? '')?.currency ?? 'USD';

  const update = (key: number, patch: Partial<Line>) =>
    setLines((all) => all.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const res = await run(() =>
      api.post<AdminOrderDetail>('/v1/admin/orders', {
        customerEmail: email,
        customerName: name || undefined,
        items: lines
          .filter((l) => l.productId)
          .map((l) => ({
            productId: l.productId,
            quantity: l.quantity,
            ...(l.price.trim() !== '' ? { unitPrice: Math.round(Number(l.price) * 100) } : {}),
          })),
        couponCode: coupon.trim() || undefined,
        paidExternally,
        note: note.trim() || undefined,
        notifyCustomer: notify,
      }),
    );
    if (res) router.push(`/orders/${res.id}`);
  };

  return (
    <>
      <PageHeader
        back={{ href: '/orders', label: 'Orders' }}
        title="New order"
        description="Gifts, offline sales and manual grants. It goes through the same order and delivery pipeline as checkout."
      />
      {products.loading && !products.data ? (
        <LoadingState rows={4} />
      ) : (
        <form onSubmit={onSubmit} className="max-w-3xl" noValidate>
          {error && (
            <Notice tone="danger" className="mb-6">
              {error}
            </Notice>
          )}
          <Section
            title="Customer"
            description="An account is created (with a sign-in link emailed) if the email is new."
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Email" error={fields.customerEmail}>
                {(f) => (
                  <Input
                    {...f}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                )}
              </Field>
              <Field label="Name" optional error={fields.customerName}>
                {(f) => <Input {...f} value={name} onChange={(e) => setName(e.target.value)} />}
              </Field>
            </div>
          </Section>

          <Section
            title="Products"
            description="Leave the price blank to charge the product’s price, or set 0 for a gift."
          >
            <div className="grid gap-4">
              {lines.map((line, index) => {
                const product = byId.get(line.productId);
                return (
                  <div
                    key={line.key}
                    className="grid items-end gap-3 sm:grid-cols-[minmax(0,1fr)_6rem_9rem_auto]"
                  >
                    <Field
                      label={index === 0 ? 'Product' : <span className="sr-only">Product</span>}
                      error={index === 0 ? fields.items : undefined}
                    >
                      {(f) => (
                        <Select
                          {...f}
                          required
                          value={line.productId}
                          onChange={(e) => update(line.key, { productId: e.target.value })}
                        >
                          <option value="">Choose a product…</option>
                          {available.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.name} · {formatMoney(p.price, p.currency, { free: 'Free' })}
                              {p.status !== 'PUBLISHED' ? ` (${p.status.toLowerCase()})` : ''}
                            </option>
                          ))}
                        </Select>
                      )}
                    </Field>
                    <Field label={index === 0 ? 'Qty' : <span className="sr-only">Quantity</span>}>
                      {(f) => (
                        <Input
                          {...f}
                          type="number"
                          min={1}
                          max={10}
                          value={line.quantity}
                          onChange={(e) =>
                            update(line.key, { quantity: Math.max(1, Number(e.target.value) || 1) })
                          }
                        />
                      )}
                    </Field>
                    <Field label={index === 0 ? 'Price' : <span className="sr-only">Price</span>}>
                      {(f) => (
                        <Input
                          {...f}
                          inputMode="decimal"
                          placeholder={product ? (product.price / 100).toFixed(2) : '0.00'}
                          value={line.price}
                          onChange={(e) =>
                            update(line.key, { price: e.target.value.replace(/[^\d.]/g, '') })
                          }
                        />
                      )}
                    </Field>
                    <ActionButton
                      variant="ghost"
                      size="md"
                      icon="trash"
                      aria-label="Remove product"
                      disabled={lines.length === 1}
                      onClick={() => setLines((all) => all.filter((l) => l.key !== line.key))}
                    />
                  </div>
                );
              })}
              <div>
                <ActionButton
                  size="sm"
                  variant="secondary"
                  icon="plus"
                  onClick={() =>
                    setLines((all) => [
                      ...all,
                      { key: Date.now(), productId: '', quantity: 1, price: '' },
                    ])
                  }
                >
                  Add product
                </ActionButton>
              </div>
            </div>
          </Section>

          <Section title="Payment">
            <div className="grid gap-5">
              <Field label="Coupon code" optional error={fields.couponCode}>
                {(f) => (
                  <Input
                    {...f}
                    className="max-w-xs uppercase"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                  />
                )}
              </Field>
              <p className="text-[15px]">
                Estimated total:{' '}
                <strong className="tabular-nums">
                  {formatMoney(estimate, currency, { free: 'Free' })}
                </strong>
                <span className="text-ink-soft">
                  {' '}
                  (before coupon; the server calculates the final amount)
                </span>
              </p>
              <Checkbox
                label="Paid outside the store"
                description="Required when the total is above zero, e.g. a bank transfer. Recorded as a manual payment."
                checked={paidExternally}
                onChange={(e) => setPaidExternally(e.target.checked)}
              />
              {fields.paidExternally && (
                <p className="text-create text-sm font-medium">{fields.paidExternally}</p>
              )}
            </div>
          </Section>

          <Section title="Notes & email">
            <div className="grid gap-5">
              <Field label="Internal note" optional>
                {(f) => (
                  <Textarea
                    {...f}
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                  />
                )}
              </Field>
              <Checkbox
                label="Email the order confirmation"
                description="Delivery emails (downloads, GitHub invitations) are always sent."
                checked={notify}
                onChange={(e) => setNotify(e.target.checked)}
              />
            </div>
          </Section>

          <div className="border-ink/10 flex gap-2 border-t pt-6">
            <ActionButton type="submit" loading={isBusy()}>
              Create order
            </ActionButton>
            <ActionButton variant="secondary" href="/orders">
              Cancel
            </ActionButton>
          </div>
        </form>
      )}
    </>
  );
}
