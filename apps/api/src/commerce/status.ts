import type { DeliveryStatus, FulfillmentStatus, OrderStatus } from '../generated/prisma/client.js';

/** Deliveries the customer fully has: files ready to download, repository access accepted. */
export const DONE: DeliveryStatus[] = ['READY', 'ACCEPTED'];
/** Deliveries a customer or admin can (re)try. */
export const RETRYABLE: DeliveryStatus[] = ['PENDING', 'ACTION_REQUIRED', 'FAILED', 'EXPIRED'];
/** Orders whose products the customer is entitled to. */
export const ENTITLED_ORDER: OrderStatus[] = ['PAID', 'PROCESSING', 'COMPLETED'];

/**
 * Order fulfillment from its deliveries. INVITATION_SENT counts as delivered (we did our part)
 * but not complete until the customer accepts it on GitHub.
 */
export function fulfillmentFor(statuses: DeliveryStatus[]): FulfillmentStatus {
  const active = statuses.filter((s) => s !== 'REVOKED');
  if (active.length === 0) return 'COMPLETED';
  const done = active.filter((s) => DONE.includes(s)).length;
  const delivered = done + active.filter((s) => s === 'INVITATION_SENT').length;
  if (done === active.length) return 'COMPLETED';
  if (delivered === active.length) return 'DELIVERED';
  if (delivered > 0) return 'PARTIALLY_DELIVERED';
  if (active.every((s) => s === 'FAILED')) return 'FAILED';
  return 'PROCESSING';
}

/** An entitled order is COMPLETED once everything is delivered and accepted, PROCESSING until then. */
export function orderStatusFor(fulfillment: FulfillmentStatus): OrderStatus {
  return fulfillment === 'COMPLETED' ? 'COMPLETED' : 'PROCESSING';
}
