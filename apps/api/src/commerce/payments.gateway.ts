import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { PaymentConfigService } from './payment-config.service.js';

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
  /** PayPal: the buyer approved the order; capturing it takes the money. */
  | { id: string; type: 'checkout.approved'; sessionId: string }
  | { id: string; type: 'charge.refunded'; paymentRef: string }
  | { id: string; type: 'ignored'; stripeType: string };

/**
 * Card payment port (Stripe). Enabled when switched on in the admin and a key is set (admin or
 * environment). Tests swap in a fake. Secrets never leave the server.
 */
export abstract class PaymentsGateway {
  abstract enabled(): Promise<boolean>;
  abstract createCheckout(args: CheckoutSessionArgs): Promise<{ id: string; url: string }>;
  /** Best effort: stops an open checkout session from being paid (order cancelled meanwhile). */
  abstract cancelCheckout(sessionId: string): Promise<void>;
  /** Verifies the signature and maps the event. Throws on a bad signature. */
  abstract parseWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent>;
  abstract refund(paymentRef: string): Promise<void>;
  /** Connectivity check for the admin settings page. */
  abstract check(): Promise<{ ok: boolean; message: string }>;
}

@Injectable()
export class StripeGateway extends PaymentsGateway {
  /** One client per key, so a key changed in the admin is used right away. */
  private clients = new Map<string, Stripe>();

  constructor(private readonly config: PaymentConfigService) {
    super();
  }

  private stripeFor(secretKey: string): Stripe {
    let client = this.clients.get(secretKey);
    if (!client) {
      client = new Stripe(secretKey);
      this.clients = new Map([[secretKey, client]]);
    }
    return client;
  }

  async enabled() {
    return Boolean(await this.config.stripe());
  }

  /** New checkouts need Stripe switched on; refunds and webhooks only need the key. */
  private async client(forNewCheckout = false): Promise<Stripe> {
    const config = forNewCheckout ? await this.config.stripe() : await this.config.stripeWebhook();
    if (!config) throw new ServiceUnavailableException('Card payments are not configured yet');
    return this.stripeFor(config.secretKey);
  }

  async createCheckout(args: CheckoutSessionArgs) {
    const stripe = await this.client(true);
    const session = await stripe.checkout.sessions.create(
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
      await (await this.client()).checkout.sessions.expire(sessionId);
    } catch {
      // Already expired or completed, or Stripe isn't configured: nothing to stop.
    }
  }

  async parseWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent> {
    const config = await this.config.stripeWebhook();
    if (!config?.webhookSecret)
      throw new ServiceUnavailableException('Webhook secret not configured');
    const event = this.stripeFor(config.secretKey).webhooks.constructEvent(
      rawBody,
      signature,
      config.webhookSecret,
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
    await (
      await this.client()
    ).refunds.create({ payment_intent: paymentRef }, { idempotencyKey: `refund:${paymentRef}` });
  }

  async check() {
    const config = await this.config.stripeWebhook();
    if (!config) return { ok: false, message: 'Stripe has no secret key yet' };
    try {
      await this.stripeFor(config.secretKey).balance.retrieve();
      return {
        ok: true,
        message: config.webhookSecret
          ? 'Connected to Stripe; webhook secret set'
          : 'Connected to Stripe, but the webhook signing secret is missing',
      };
    } catch (error) {
      return { ok: false, message: `Stripe rejected the key: ${(error as Error).message}` };
    }
  }
}
