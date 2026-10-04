'use client';

import type { AdminProduct } from '@shimanto/types';
import {
  ActionButton,
  DataTable,
  EmptyState,
  ErrorState,
  FilterChips,
  Icon,
  LoadingState,
  PageHeader,
  SearchInput,
  StatusBadge,
  formatMoney,
  humanize,
} from '@shimanto/ui';
import { useState } from 'react';
import { useApi } from '@/lib/use-api';

export function ProductsView() {
  const { data, error, loading, reload } = useApi<AdminProduct[]>('/v1/admin/products');
  const [status, setStatus] = useState<'' | 'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('');
  const [q, setQ] = useState('');

  const rows = (data ?? []).filter(
    (p) =>
      (!status || p.status === status) &&
      (!q || `${p.name} ${p.slug}`.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      <PageHeader
        title="Products"
        description="Software, digital products and source code. Each one is delivered as private files, a GitHub repository, or both."
        actions={
          <ActionButton icon="plus" href="/products/new">
            New product
          </ActionButton>
        }
      />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <FilterChips
          label="Status"
          value={status}
          onChange={setStatus}
          options={[
            { value: '', label: 'All' },
            { value: 'PUBLISHED', label: 'Published' },
            { value: 'DRAFT', label: 'Draft' },
            { value: 'ARCHIVED', label: 'Archived' },
          ]}
        />
        <SearchInput
          className="w-full sm:w-72"
          placeholder="Search products"
          aria-label="Search products"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      {loading && !data ? (
        <LoadingState rows={6} />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : (
        <DataTable
          caption="Products"
          rows={rows}
          rowKey={(p) => p.id}
          rowHref={(p) => `/products/${p.id}`}
          empty={
            <EmptyState
              spot="toolbox"
              title={data?.length ? 'No products match' : 'No products yet'}
              description={
                data?.length
                  ? 'Try another filter.'
                  : 'Create your first product, attach its files or repository, and publish it.'
              }
              action={
                !data?.length && <ActionButton href="/products/new">New product</ActionButton>
              }
            />
          }
          columns={[
            {
              key: 'name',
              header: 'Product',
              cell: (p) => (
                <div className="min-w-0">
                  <p className="truncate">{p.name}</p>
                  <p className="text-ink-soft truncate text-sm font-normal">/{p.slug}</p>
                </div>
              ),
            },
            { key: 'type', header: 'Type', hideOnMobile: true, cell: (p) => humanize(p.type) },
            {
              key: 'delivery',
              header: 'Delivery',
              hideOnMobile: true,
              cell: (p) => (
                <span className="text-ink-soft inline-flex items-center gap-3 text-sm">
                  {p.deliverFiles && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="file" className="size-4" />
                      {p.files.length}
                    </span>
                  )}
                  {p.deliverGithub && (
                    <span className="inline-flex items-center gap-1">
                      <Icon name="github" className="size-4" />
                      {p.githubRepo ?? '—'}
                    </span>
                  )}
                  {!p.deliverFiles && !p.deliverGithub && '—'}
                </span>
              ),
            },
            {
              key: 'sales',
              header: 'Sales',
              align: 'right',
              hideOnMobile: true,
              cell: (p) => p.sales,
            },
            { key: 'status', header: 'Status', cell: (p) => <StatusBadge status={p.status} /> },
            {
              key: 'price',
              header: 'Price',
              align: 'right',
              cell: (p) => formatMoney(p.price, p.currency, { free: 'Free' }),
            },
          ]}
        />
      )}
    </>
  );
}
