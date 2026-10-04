'use client';

import type { AdminProduct, Coupon } from '@shimanto/types';
import {
  ActionButton,
  Checkbox,
  ConfirmDialog,
  DataTable,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  Input,
  LoadingState,
  Notice,
  PageHeader,
  Select,
  StatusBadge,
  formatDate,
  formatMoney,
} from '@shimanto/ui';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';

interface FormState {
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: string;
  currency: string;
  description: string;
  active: boolean;
  expiresAt: string;
  usageLimit: string;
  productIds: string[];
}

const empty: FormState = {
  code: '',
  type: 'PERCENT',
  value: '',
  currency: 'USD',
  description: '',
  active: true,
  expiresAt: '',
  usageLimit: '',
  productIds: [],
};

const describe = (c: Coupon) =>
  c.type === 'PERCENT' ? `${c.value}% off` : `${formatMoney(c.value, c.currency ?? 'USD')} off`;

export function CouponsView() {
  const { data, error, loading, reload } = useApi<Coupon[]>('/v1/admin/coupons');
  const products = useApi<AdminProduct[]>('/v1/admin/products');
  const action = useAction();
  const [editing, setEditing] = useState<Coupon | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Coupon | null>(null);
  const [form, setForm] = useState<FormState>(empty);

  const open = (coupon: Coupon | 'new') => {
    action.clear();
    setEditing(coupon);
    setForm(
      coupon === 'new'
        ? empty
        : {
            code: coupon.code,
            type: coupon.type,
            value:
              coupon.type === 'PERCENT' ? String(coupon.value) : (coupon.value / 100).toFixed(2),
            currency: coupon.currency ?? 'USD',
            description: coupon.description ?? '',
            active: coupon.active,
            expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '',
            usageLimit: coupon.usageLimit ? String(coupon.usageLimit) : '',
            productIds: coupon.products.map((p) => p.id),
          },
    );
  };

  const save = async () => {
    const value =
      form.type === 'PERCENT' ? Number(form.value) : Math.round(Number(form.value) * 100);
    const body = {
      code: form.code.trim().toUpperCase(),
      type: form.type,
      value,
      currency: form.type === 'FIXED' ? form.currency : null,
      description: form.description.trim() || null,
      active: form.active,
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59Z`).toISOString() : null,
      usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
      productIds: form.productIds,
    };
    const res = await action.run(
      () =>
        editing === 'new'
          ? api.post<Coupon>('/v1/admin/coupons', body)
          : api.patch<Coupon>(`/v1/admin/coupons/${(editing as Coupon).id}`, body),
      { key: 'save' },
    );
    if (res) {
      setEditing(null);
      reload();
    }
  };

  const f = action.fields;

  return (
    <>
      <PageHeader
        title="Coupons"
        description="Percentage or fixed discounts, optionally limited to products, dates or a number of uses. A 100% coupon makes a $0 order."
        actions={
          <ActionButton icon="plus" onClick={() => open('new')}>
            New coupon
          </ActionButton>
        }
      />
      {action.error && !editing && (
        <Notice tone="danger" className="mb-6">
          {action.error}
        </Notice>
      )}
      {loading && !data ? (
        <LoadingState rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <DataTable
          caption="Coupons"
          rows={data ?? []}
          rowKey={(c) => c.id}
          empty={
            <EmptyState
              spot="megaphone"
              title="No coupons yet"
              description="Create a code for a launch, a newsletter or a partner."
              action={<ActionButton onClick={() => open('new')}>New coupon</ActionButton>}
            />
          }
          columns={[
            {
              key: 'code',
              header: 'Code',
              cell: (c) => (
                <button
                  type="button"
                  onClick={() => open(c)}
                  className="text-left font-mono font-medium hover:underline"
                >
                  {c.code}
                </button>
              ),
            },
            { key: 'discount', header: 'Discount', cell: describe },
            {
              key: 'applies',
              header: 'Applies to',
              hideOnMobile: true,
              cell: (c) =>
                c.products.length ? c.products.map((p) => p.name).join(', ') : 'All products',
            },
            {
              key: 'usage',
              header: 'Used',
              align: 'right',
              hideOnMobile: true,
              cell: (c) => `${c.usedCount}${c.usageLimit ? ` / ${c.usageLimit}` : ''}`,
            },
            {
              key: 'expires',
              header: 'Expires',
              hideOnMobile: true,
              cell: (c) => (c.expiresAt ? formatDate(c.expiresAt) : 'Never'),
            },
            {
              key: 'status',
              header: 'Status',
              cell: (c) => {
                const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
                const usedUp = c.usageLimit !== null && c.usedCount >= c.usageLimit;
                return c.active && !expired && !usedUp ? (
                  <StatusBadge status="ACTIVE" />
                ) : (
                  <StatusBadge
                    status="ARCHIVED"
                    label={!c.active ? 'Inactive' : expired ? 'Expired' : 'Used up'}
                  />
                );
              },
            },
            {
              key: 'actions',
              header: <span className="sr-only">Actions</span>,
              align: 'right',
              cell: (c) => (
                <div className="flex justify-end gap-1">
                  <ActionButton size="sm" variant="ghost" onClick={() => open(c)}>
                    Edit
                  </ActionButton>
                  <ActionButton size="sm" variant="ghost" onClick={() => setDeleting(c)}>
                    Delete
                  </ActionButton>
                </div>
              ),
            },
          ]}
        />
      )}

      <Dialog
        open={editing !== null}
        onOpenChange={(o) => !o && setEditing(null)}
        title={editing === 'new' ? 'New coupon' : `Edit ${form.code}`}
        size="lg"
        footer={
          <>
            <ActionButton variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </ActionButton>
            <ActionButton loading={action.isBusy('save')} onClick={() => void save()}>
              Save coupon
            </ActionButton>
          </>
        }
      >
        <div className="grid gap-5">
          {action.error && <Notice tone="danger">{action.error}</Notice>}
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Code"
              error={f.code}
              hint="Letters, numbers, - and _. Customers type it at checkout."
            >
              {(p) => (
                <Input
                  {...p}
                  className="font-mono uppercase"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              )}
            </Field>
            <Field label="Description" optional error={f.description}>
              {(p) => (
                <Input
                  {...p}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Launch week"
                />
              )}
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Type">
              {(p) => (
                <Select
                  {...p}
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as FormState['type'] })}
                >
                  <option value="PERCENT">Percentage</option>
                  <option value="FIXED">Fixed amount</option>
                </Select>
              )}
            </Field>
            <Field label={form.type === 'PERCENT' ? 'Percent off' : 'Amount off'} error={f.value}>
              {(p) => (
                <Input
                  {...p}
                  inputMode="decimal"
                  value={form.value}
                  onChange={(e) =>
                    setForm({ ...form, value: e.target.value.replace(/[^\d.]/g, '') })
                  }
                />
              )}
            </Field>
            {form.type === 'FIXED' && (
              <Field label="Currency" error={f.currency}>
                {(p) => (
                  <Select
                    {...p}
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                  >
                    {['USD', 'EUR', 'GBP', 'BDT', 'INR'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                )}
              </Field>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Expires on" optional error={f.expiresAt}>
              {(p) => (
                <Input
                  {...p}
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                />
              )}
            </Field>
            <Field
              label="Usage limit"
              optional
              error={f.usageLimit}
              hint="Total uses across all customers."
            >
              {(p) => (
                <Input
                  {...p}
                  type="number"
                  min={1}
                  value={form.usageLimit}
                  onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                />
              )}
            </Field>
          </div>
          <fieldset>
            <legend className="text-[15px] font-medium">Products</legend>
            <p className="text-ink-soft mb-3 text-sm">
              Leave all unchecked to apply to every product.
            </p>
            <div className="grid max-h-48 gap-2 overflow-y-auto sm:grid-cols-2">
              {(products.data ?? []).map((p) => (
                <Checkbox
                  key={p.id}
                  label={p.name}
                  checked={form.productIds.includes(p.id)}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      productIds: e.target.checked
                        ? [...form.productIds, p.id]
                        : form.productIds.filter((x) => x !== p.id),
                    })
                  }
                />
              ))}
            </div>
          </fieldset>
          <Checkbox
            label="Active"
            description="Inactive coupons can’t be used."
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
          />
        </div>
      </Dialog>

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete ${deleting?.code ?? ''}?`}
        description="Coupons that were already used can’t be deleted; deactivate them instead."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={async () => {
          if (!deleting) return;
          const ok = await action.run(
            () => api.delete(`/v1/admin/coupons/${deleting.id}`).then(() => true),
            { key: 'delete' },
          );
          if (ok) reload();
        }}
      />
    </>
  );
}
