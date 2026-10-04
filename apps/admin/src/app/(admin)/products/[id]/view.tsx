'use client';

import type { AdminProduct } from '@shimanto/types';
import {
  ActionButton,
  ConfirmDialog,
  ErrorState,
  LoadingState,
  Notice,
  PageHeader,
  StatusBadge,
  formatDate,
  formatMoney,
} from '@shimanto/ui';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { ProductForm } from '@/components/product-form';
import { api } from '@/lib/api';
import { SITE_URL } from '@/lib/config';
import { useAction } from '@/lib/use-action';
import { useApi } from '@/lib/use-api';

export function ProductView() {
  const { id } = useParams<{ id: string }>();
  const created = useSearchParams().get('created') === '1';
  const router = useRouter();
  const {
    data: product,
    error,
    loading,
    reload,
    setData,
  } = useApi<AdminProduct>(`/v1/admin/products/${id}`);
  const action = useAction();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formKey, setFormKey] = useState(0);

  if (loading && !product) return <LoadingState rows={8} />;
  if (error || !product)
    return <ErrorState title="Product not found" message={error ?? undefined} onRetry={reload} />;

  const setStatus = async (kind: 'publish' | 'unpublish' | 'archive') => {
    const res = await action.run(
      () => api.post<AdminProduct>(`/v1/admin/products/${product.id}/${kind}`),
      {
        key: kind,
        success:
          kind === 'publish'
            ? 'Published: it’s live in the store.'
            : kind === 'archive'
              ? 'Archived.'
              : 'Moved back to draft.',
      },
    );
    if (res) setData(res);
  };

  return (
    <>
      <PageHeader
        back={{ href: '/products', label: 'Products' }}
        eyebrow={
          <>
            <StatusBadge status={product.status} />
            <span>
              {formatMoney(product.price, product.currency, { free: 'Free' })} · {product.sales}{' '}
              sold
              {product.publishedAt && ` · published ${formatDate(product.publishedAt)}`}
            </span>
          </>
        }
        title={product.name}
        actions={
          <>
            {product.status === 'PUBLISHED' && (
              <ActionButton
                size="sm"
                variant="secondary"
                icon="external"
                href={`${SITE_URL}/products/${product.slug}`}
                external
              >
                View in store
              </ActionButton>
            )}
            {product.status !== 'PUBLISHED' && (
              <ActionButton
                size="sm"
                loading={action.isBusy('publish')}
                onClick={() => void setStatus('publish')}
              >
                Publish
              </ActionButton>
            )}
            {product.status === 'PUBLISHED' && (
              <ActionButton
                size="sm"
                variant="secondary"
                loading={action.isBusy('unpublish')}
                onClick={() => void setStatus('unpublish')}
              >
                Unpublish
              </ActionButton>
            )}
            {product.status !== 'ARCHIVED' && (
              <ActionButton
                size="sm"
                variant="ghost"
                loading={action.isBusy('archive')}
                onClick={() => void setStatus('archive')}
              >
                Archive
              </ActionButton>
            )}
            {product.sales === 0 && (
              <ActionButton
                size="sm"
                variant="ghost"
                icon="trash"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </ActionButton>
            )}
          </>
        }
      />
      <div className="mb-6 grid gap-3">
        {created && !action.success && !action.error && (
          <Notice tone="success">
            Product created as a draft. Add its files or repository, then publish.
          </Notice>
        )}
        {action.error && <Notice tone="danger">{action.error}</Notice>}
        {action.success && <Notice tone="success">{action.success}</Notice>}
      </div>
      <div className="max-w-3xl">
        <ProductForm
          key={formKey}
          product={product}
          onSaved={(saved) => {
            setData(saved);
            setFormKey((k) => k + 1);
          }}
          onFilesChanged={reload}
        />
      </div>
      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={`Delete “${product.name}”?`}
        description="This can’t be undone. Products with orders can only be archived."
        confirmLabel="Delete product"
        tone="danger"
        onConfirm={async () => {
          const ok = await action.run(
            () => api.delete(`/v1/admin/products/${product.id}`).then(() => true),
            { key: 'delete' },
          );
          if (ok) router.replace('/products');
        }}
      />
    </>
  );
}
