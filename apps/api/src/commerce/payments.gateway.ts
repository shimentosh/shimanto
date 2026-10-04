import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';

export interface CheckoutLine {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  /** Line total after discount, minor units. */
  amount: number;
}

export interface CheckoutSessionArgs {
  orderId: string;
  orderNumber: number;
  lines: CheckoutLine[];
  currency: string;
  customerEmail: string;
  successUrl: string;
  cancelUrl: string;
}

/** Normalised webhook events: only the ones the order lifecycle cares about. */
export type PaymentEvent =
  | {
      id: string;
      type: 'checkout.paid';
      orderId: string;
      sessionId: string;
      paymentRef: string | null;
      /** What the provider actually charged, checked against the order before fulfilling. */
      amount: number;
      currency: string;
    }
  | {
      id: string;
      type: 'checkout.failed';
      orderId: string;
      sessionId: string;
      /** `expired`: abandoned checkout. `failed`: the payment itself failed. */
      reason: 'expired' | 'failed';
    }
  | { id: string; type: 'charge.refunded'; paymentRef: string }
  | { id: string; type: 'ignored'; stripeType: string };

/**
 * Payment provider port. Only providers that are configured are enabled: Stripe when its keys
 * are set. Tests swap in a fake. Secrets never leave the server.
 */
export abstract class PaymentsGateway {
  abstract readonly enabled: boolean;
  abstract createCheckout(args: CheckoutSessionArgs): Promise<{ id: string; url: string }>;
  /** Best effort: stops an open checkout session from being paid (order cancelled meanwhile). */
  abstract cancelCheckout(sessionId: string): Promise<void>;
  /** Verifies the signature and maps the event. Throws on a bad signature. */
  abstract parseWebhook(rawBody: Buffer, signature: string): PaymentEvent;
  abstract refund(paymentRef: string): Promise<void>;
  /** Connectivity check for the admin settings page. */
  abstract check(): Promise<{ ok: boolean; message: string }>;
}

@Injectable()
export class StripeGateway extends PaymentsGateway {
  private readonly stripe?: Stripe;

  constructor(@Inject(ENV) private readonly env: Env) {
    super();
    if (env.STRIPE_SECRET_KEY) this.stripe = new Stripe(env.STRIPE_SECRET_KEY);
  }

  get enabled() {
    return Boolean(this.stripe);
  }

  private client(): Stripe {
    if (!this.stripe) throw new ServiceUnavailableException('Card payments are not configured yet');
    return this.stripe;
  }

  async createCheckout(args: CheckoutSessionArgs) {
    const session = await this.client().checkout.sessions.create(
      {
        mode: 'payment',
        client_reference_id: args.orderId,
        customer_email: args.customerEmail,
        locale: 'auto',
        // Lines carry their discounted totals, so Stripe charges exactly the order total.
        line_items: args.lines
          .filter((line) => line.amount > 0)
          .map((line) => ({
            quantity: 1,
            price_data: {
              currency: args.currency.toLowerCase(),
              unit_amount: line.amount,
              product_data: {
                name: line.name,
                ...(line.description ? { description: line.description } : {}),
                ...(line.imageUrl ? { images: [line.imageUrl] } : {}),
              },
            },
          })),
        metadata: { orderId: args.orderId, orderNumber: String(args.orderNumber) },
        payment_intent_data: { metadata: { orderId: args.orderId } },
        success_url: args.successUrl,
        cancel_url: args.cancelUrl,
        // Unpaid sessions expire in 1 hour, and the webhook cancels the order.
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
      },
      // Safe retries: the same order never creates two sessions.
      { idempotencyKey: `checkout:${args.orderId}` },
    );
    if (!session.url) throw new ServiceUnavailableException('Stripe did not return a checkout URL');
    return { id: session.id, url: session.url };
  }

  async cancelCheckout(sessionId: string) {
    try {
      await this.client().checkout.sessions.expire(sessionId);
    } catch {
      // Already expired or completed: nothing to stop.
    }
  }

  parseWebhook(rawBody: Buffer, signature: string): PaymentEvent {
    if (!this.env.STRIPE_WEBHOOK_SECRET)
      throw new ServiceUnavailableException('Webhook secret not configured');
    const event = this.client().webhooks.constructEvent(
      rawBody,
      signature,
      this.env.STRIPE_WEBHOOK_SECRET,
    );

    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId ?? session.client_reference_id;
        // "completed" fires before async methods (e.g. bank debits) settle, so only fulfil when paid.
        if (!orderId || session.payment_status !== 'paid')
          return { id: event.id, type: 'ignored', stripeType: event.type };
        const paymentRef =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : (session.payment_intent?.id ?? null);
        return {
          id: event.id,
          type: 'checkout.paid',
          orderId,
          sessionId: session.id,
          paymentRef,
          amount: session.amount_total ?? 0,
          currency: (session.currency ?? '').toUpperCase(),
        };
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const session = event.data.object;
        const orderId = session.metadata?.orderId ?? session.client_reference_id;
        if (!orderId) return { id: event.id, type: 'ignored', stripeType: event.type };
        return {
          id: event.id,
          type: 'checkout.failed',
          orderId,
          sessionId: session.id,
          reason: event.type === 'checkout.session.expired' ? 'expired' : 'failed',
        };
      }
      case 'charge.refunded': {
        const charge = event.data.object;
        const paymentRef =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (!paymentRef || !charge.refunded)
          return { id: event.id, type: 'ignored', stripeType: event.type };
        return { id: event.id, type: 'charge.refunded', paymentRef };
      }
      default:
        return { id: event.id, type: 'ignored', stripeType: event.type };
    }
  }

  async refund(paymentRef: string) {
    await this.client().refunds.create(
      { payment_intent: paymentRef },
      { idempotencyKey: `refund:${paymentRef}` },
    );
  }

  async check() {
    if (!this.stripe) return { ok: false, message: 'Stripe is not configured (STRIPE_SECRET_KEY)' };
    try {
      await this.stripe.balance.retrieve();
      return {
        ok: true,
        message: this.env.STRIPE_WEBHOOK_SECRET
          ? 'Connected to Stripe; webhook secret set'
          : 'Connected to Stripe, but STRIPE_WEBHOOK_SECRET is missing',
      };
    } catch (error) {
      return { ok: false, message: `Stripe rejected the key: ${(error as Error).message}` };
    }
  }
}
