'use client';

import type { DeliveryView, OrderDetail } from '@shimanto/types';
import {
  ActionButton,
  DescriptionList,
  ErrorState,
  LoadingState,
  Notice,
  OrderSummary,
  PageHeader,
  Section,
  StatusBadge,
  formatDateTime,
  humanize,
} from '@shimanto/ui';
import { useParams } from 'next/navigation';
import { DeliveryBlock } from '@/components/delivery';
import { useApi } from '@/lib/use-api';

const paymentText: Record<string, string> = {
  PAID: 'Paid',
  NOT_REQUIRED: 'No payment needed',
  PENDING: 'Awaiting payment',
  FAILED: 'Payment failed',
  REFUNDED: 'Refunded',
};

export function OrderView() {
  const { number } = useParams<{ number: string }>();
  const {
    data: order,
    error,
    loading,
    reload,
    setData,
  } = useApi<OrderDetail>(`/v1/account/orders/${number}`);

  const replaceDelivery = (next: DeliveryView) => {
    if (!order) return;
    setData({ ...order, deliveries: order.deliveries.map((d) => (d.id === next.id ? next : d)) });
    void reload();
  };

  if (loading && !order) return <LoadingState rows={6} />;
  if (error || !order)
    return (
      <ErrorState
        title="Order not found"
        message={error ?? undefined}
        onRetry={() => void reload()}
      />
    );

  const byItem = new Map<string, DeliveryView[]>();
  for (const d of order.deliveries)
    byItem.set(d.productId, [...(byItem.get(d.productId) ?? []), d]);
  const active = ['PAID', 'PROCESSING', 'COMPLETED'].includes(order.status);

  return (
    <>
      <PageHeader
        back={{ href: '/orders', label: 'All orders' }}
        eyebrow={
          <>
            <StatusBadge status={order.status} />
            <span>Placed {formatDateTime(order.createdAt)}</span>
          </>
        }
        title={`Order #${order.number}`}
        actions={
          <ActionButton
            variant="secondary"
            size="sm"
            icon="chat"
            href={`/support/new?order=${order.id}`}
          >
            Get help with this order
          </ActionButton>
        }
      />

      {order.status === 'PENDING' && order.paymentStatus === 'PENDING' && (
        <Notice tone="info" className="mb-6" title="Waiting for payment confirmation">
          This usually takes a few seconds. We’ll email you as soon as the payment is confirmed.
        </Notice>
      )}
      {order.status === 'CANCELLED' && (
        <Notice tone="warning" className="mb-6">
          This order was cancelled, so its products are no longer available.
        </Notice>
      )}
      {order.status === 'REFUNDED' && (
        <Notice tone="info" className="mb-6">
          This order was refunded, so its products are no longer available.
        </Notice>
      )}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div>
          <Section
            title="Delivery"
            description={
              active ? 'Download your files and manage repository access here.' : undefined
            }
          >
            {order.items.length === 0 ? null : (
              <ul className="grid gap-8">
                {order.items.map((item) => {
                  const deliveries = byItem.get(item.productId) ?? [];
                  return (
                    <li key={item.id}>
                      <h3 className="text-lg font-medium tracking-tight">{item.productName}</h3>
                      <p className="text-ink-soft text-sm">{humanize(item.productType)}</p>
                      <div className="mt-4 grid gap-6">
                        {deliveries.length ? (
                          deliveries.map((d) => (
                            <DeliveryBlock key={d.id} delivery={d} onChange={replaceDelivery} />
                          ))
                        ) : (
                          <p className="text-ink-soft text-[15px]">
                            {active
                              ? 'Preparing your delivery…'
                              : 'Delivery starts once the payment is confirmed.'}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        </div>

        <aside className="lg:border-ink/10 lg:border-l lg:pl-8">
          <h2 className="mb-4 text-lg font-medium tracking-tight">Summary</h2>
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
            }))}
          />
          <DescriptionList
            columns={1}
            className="border-ink/10 mt-6 border-t pt-6"
            items={[
              {
                label: 'Payment',
                value: paymentText[order.paymentStatus] ?? humanize(order.paymentStatus),
              },
              order.paidAt ? { label: 'Paid on', value: formatDateTime(order.paidAt) } : null,
              { label: 'Delivery', value: <StatusBadge status={order.fulfillmentStatus} /> },
            ]}
          />
        </aside>
      </div>
    </>
  );
}
