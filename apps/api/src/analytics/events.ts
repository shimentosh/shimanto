import { createHash } from 'node:crypto';
import type { AnalyticsEventName, Ecommerce, Touch } from '@shimanto/types';

/**
 * Deterministic event ids for business events. The same id is used internally (unique index),
 * by every provider, and by browser pixels, so a purchase is counted once everywhere.
 */
export const eventIds = {
  purchase: (orderId: string) => `purchase_${orderId}`,
  refund: (orderId: string) => `refund_${orderId}`,
  signup: (customerId: string) => `signup_${customerId}`,
  emailVerified: (customerId: string) => `email_verified_${customerId}`,
  githubAccess: (deliveryId: string) => `github_access_${deliveryId}`,
  supportTicket: (ticketId: string) => `support_ticket_${ticketId}`,
};

/** Consent + browser identifiers captured with a conversion (checkout, sign-up). */
export interface TrackingContext {
  anonymousId?: string | null;
  sessionId?: string | null;
  gaClientId?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  pageUrl?: string | null;
  consent?: { analytics: boolean; marketing: boolean } | null;
}

/** An event as providers receive it: the stored event plus what's needed to send it. */
export interface DispatchEvent {
  name: AnalyticsEventName;
  eventId: string;
  occurredAt: Date;
  customerId: string | null;
  /** Only for hashing (Meta advanced matching); never sent raw. */
  email: string | null;
  ecommerce: Ecommerce | null;
  tracking: TrackingContext;
  attribution: Touch | null;
  /** Marked e.g. for admin-created orders, which are not marketing conversions. */
  internalOnly: boolean;
}

/** Minor units → major units, respecting zero-decimal currencies (JPY, KRW…). */
export function toMajor(amount: number, currency: string): number {
  let digits = 2;
  try {
    digits =
      new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions()
        .maximumFractionDigits ?? 2;
  } catch {
    // Unknown currency: assume cents.
  }
  return Number((amount / 10 ** digits).toFixed(digits));
}

/** SHA-256 hex of a normalised value (Meta's hashing rules: trimmed, lower-case). */
export function hashForMeta(value: string): string {
  return createHash('sha256').update(value.trim().toLowerCase()).digest('hex');
}

/** GA client id from a `_ga` cookie value ("GA1.1.123.456" → "123.456"). */
export function gaClientIdFromCookie(value?: string | null): string | null {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length >= 4) return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  return /^\d+\.\d+$/.test(value) ? value : null;
}
