'use client';

import type { DeliveryView, OwnedProduct } from '@shimanto/types';
import {
  ActionButton,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
  formatDate,
  humanize,
} from '@shimanto/ui';
import Link from 'next/link';
import { DeliveryBlock } from '@/components/delivery';
import { SITE_URL } from '@/lib/config';
import { useApi } from '@/lib/use-api';

export function ProductsView() {
  const { data, error, loading, reload, setData } = useApi<OwnedProduct[]>('/v1/account/products');

  const replace = (next: DeliveryView) => {
    if (!data) return;
    setData(
      data.map((p) => ({
        ...p,
        deliveries: p.deliveries.map((d) => (d.id === next.id ? next : d)),
      })),
    );
  };

  return (
    <>
      <PageHeader
        title="My products"
        description="Everything you own. Files download fresh every time; repository access is managed here too."
      />
      {loading && !data ? (
        <LoadingState rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => void reload()} />
      ) : !data?.length ? (
        <EmptyState
          spot="toolbox"
          title="Nothing here yet"
          description="Products from your orders appear here as soon as they’re confirmed."
          action={<ActionButton href={`${SITE_URL}/products`}>Browse the store</ActionButton>}
        />
      ) : (
        <ul className="divide-ink/10 divide-y">
          {data.map((p) => (
            <li
              key={p.productId}
              className="grid gap-6 py-8 first:pt-0 md:grid-cols-[16rem_minmax(0,1fr)]"
            >
              <div>
                <h2 className="text-xl font-medium tracking-tight">{p.name}</h2>
                <p className="text-ink-soft mt-1 text-sm">
                  {humanize(p.type)}
                  {p.version && ` · v${p.version}`}
                </p>
                <p className="text-ink-soft mt-3 text-sm">
                  <Link
                    href={`/orders/${p.orderNumber}`}
                    className="hover:text-ink underline underline-offset-4"
                  >
                    Order #{p.orderNumber}
                  </Link>{' '}
                  · {formatDate(p.purchasedAt)}
                </p>
              </div>
              <div className="grid gap-6">
                {p.deliveries.length ? (
                  p.deliveries.map((d) => (
                    <DeliveryBlock key={d.id} delivery={d} onChange={replace} />
                  ))
                ) : (
                  <p className="text-ink-soft text-[15px]">Preparing your delivery…</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
