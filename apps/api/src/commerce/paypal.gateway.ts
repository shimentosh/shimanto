import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { type PaypalConfig, PaymentConfigService } from './payment-config.service.js';
import type { CheckoutSessionArgs, PaymentEvent } from './payments.gateway.js';

/** A capture as PayPal reports it, amounts in the store's minor units. */
export interface PaypalCapture {
  /** PayPal order id (the checkout session). */
  paypalOrderId: string;
  /** Our order id (custom_id). */
  orderId: string | null;
  status: 'COMPLETED' | 'PENDING' | 'DECLINED' | 'FAILED' | 'OTHER';
  captureId: string | null;
  amount: number;
  currency: string;
}

/** Webhook headers PayPal signs with (lower-cased). */
export type PaypalHeaders = Record<string, string | undefined>;

/**
 * PayPal Checkout port (Orders v2): create an order → the buyer approves on PayPal → we capture.
 * Tests swap in a fake.
 */
export abstract class PaypalGateway {
  abstract enabled(): Promise<boolean>;
  abstract createCheckout(args: CheckoutSessionArgs): Promise<{ id: string; url: string }>;
  /** Captures an approved order (idempotent: an already captured order returns its capture). */
  abstract capture(paypalOrderId: string): Promise<PaypalCapture>;
  /** Verifies the webhook with PayPal and maps the event. Throws when it isn't genuine. */
  abstract parseWebhook(headers: PaypalHeaders, rawBody: Buffer): Promise<PaymentEvent>;
  abstract refund(captureId: string): Promise<void>;
  abstract check(): Promise<{ ok: boolean; message: string }>;
}

/** Currencies without minor units at PayPal. */
const ZERO_DECIMAL = new Set(['HUF', 'JPY', 'TWD']);

/** Store amounts are always in hundredths; PayPal wants a decimal string. */
export function toPaypalValue(amount: number, currency: string): string {
  return ZERO_DECIMAL.has(currency) ? String(Math.round(amount / 100)) : (amount / 100).toFixed(2);
}

export function fromPaypalValue(value: string): number {
  return Math.round(Number.parseFloat(value) * 100);
}

interface PaypalLink {
  href: string;
  rel: string;
}
interface PaypalMoney {
  currency_code: string;
  value: string;
}
interface PaypalCaptureResource {
  id: string;
  status: string;
  amount?: PaypalMoney;
  custom_id?: string;
  links?: PaypalLink[];
  supplementary_data?: { related_ids?: { order_id?: string } };
}
interface PaypalOrderResource {
  id: string;
  status: string;
  links?: PaypalLink[];
  purchase_units?: Array<{
    custom_id?: string;
    payments?: { captures?: PaypalCaptureResource[] };
  }>;
}

@Injectable()
export class HttpPaypalGateway extends PaypalGateway {
  private readonly logger = new Logger('PayPal');
  private token?: { key: string; value: string; expiresAt: number };

  constructor(private readonly config: PaymentConfigService) {
    super();
  }

  async enabled() {
    return Boolean(await this.config.paypal());
  }

  private base(config: PaypalConfig) {
    return config.mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  }

  private async credentials(forNewCheckout = false): Promise<PaypalConfig> {
    const config = forNewCheckout
      ? await this.config.paypal()
      : await this.config.paypalCredentials();
    if (!config) throw new ServiceUnavailableException('PayPal is not configured yet');
    return config;
  }

  private async accessToken(config: PaypalConfig): Promise<string> {
    const key = `${config.mode}:${config.clientId}`;
    if (this.token?.key === key && this.token.expiresAt > Date.now() + 60_000) {
      return this.token.value;
    }
    const res = await fetch(`${this.base(config)}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const body = (await res.json().catch(() => ({}))) as {
      access_token?: string;
      expires_in?: number;
      error_description?: string;
    };
    if (!res.ok || !body.access_token) {
      throw new ServiceUnavailableException(
        `PayPal rejected the credentials: ${body.error_description ?? res.status}`,
      );
    }
    this.token = {
      key,
      value: body.access_token,
      expiresAt: Date.now() + (body.expires_in ?? 300) * 1000,
    };
    return body.access_token;
  }

  private async call<T>(
    config: PaypalConfig,
    method: 'GET' | 'POST',
    path: string,
    body?: unknown,
    requestId?: string,
  ): Promise<{ status: number; data: T }> {
    const res = await fetch(`${this.base(config)}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await this.accessToken(config)}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        // Idempotency: a retried call with the same id returns the first result.
        ...(requestId ? { 'PayPal-Request-Id': requestId } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const data = (await res.json().catch(() => ({}))) as T;
    return { status: res.status, data };
  }

  private fail(what: string, status: number, data: unknown): never {
    const detail = (data as { details?: Array<{ issue?: string }>; message?: string }) ?? {};
    const issue = detail.details?.[0]?.issue ?? detail.message ?? String(status);
    this.logger.error(`${what} failed (${status}): ${JSON.stringify(data).slice(0, 500)}`);
    throw new ServiceUnavailableException(`PayPal: ${what} failed (${issue})`);
  }

  async createCheckout(args: CheckoutSessionArgs) {
    const config = await this.credentials(true);
    const value = (amount: number) => ({
      currency_code: args.currency,
      value: toPaypalValue(amount, args.currency),
    });
    const lines = args.lines.filter((line) => line.amount > 0);
    const total = lines.reduce((sum, line) => sum + line.amount, 0);
    const { status, data } = await this.call<PaypalOrderResource>(
      config,
      'POST',
      '/v2/checkout/orders',
      {
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: args.orderId,
            custom_id: args.orderId,
            invoice_id: `order-${args.orderId}`,
            description: `Order #${args.orderNumber}`,
            amount: { ...value(total), breakdown: { item_total: value(total) } },
            items: lines.map((line) => ({
              name: line.name.slice(0, 127),
              quantity: '1',
              unit_amount: value(line.amount),
              category: 'DIGITAL_GOODS',
            })),
          },
        ],
        payment_source: {
          paypal: {
            email_address: args.customerEmail,
            experience_context: {
              user_action: 'PAY_NOW',
              shipping_preference: 'NO_SHIPPING',
              return_url: args.successUrl,
              cancel_url: args.cancelUrl,
            },
          },
        },
      },
      `checkout:${args.orderId}`,
    );
    if (status >= 300) this.fail('creating the order', status, data);
    const url = data.links?.find((l) => l.rel === 'payer-action' || l.rel === 'approve')?.href;
    if (!url) this.fail('creating the order (no approval link)', status, data);
    return { id: data.id, url };
  }

  async capture(paypalOrderId: string): Promise<PaypalCapture> {
    const config = await this.credentials();
    const id = encodeURIComponent(paypalOrderId);
    let { status, data } = await this.call<PaypalOrderResource>(
      config,
      'POST',
      `/v2/checkout/orders/${id}/capture`,
      {},
      `capture:${paypalOrderId}`,
    );
    if (status === 422) {
      // Already captured (e.g. by the webhook a moment earlier): read the order instead.
      ({ status, data } = await this.call<PaypalOrderResource>(
        config,
        'GET',
        `/v2/checkout/orders/${id}`,
      ));
    }
    if (status >= 300) this.fail('capturing the payment', status, data);
    const unit = data.purchase_units?.[0];
    const capture = unit?.payments?.captures?.[0];
    const known = ['COMPLETED', 'PENDING', 'DECLINED', 'FAILED'];
    return {
      paypalOrderId: data.id,
      orderId: capture?.custom_id ?? unit?.custom_id ?? null,
      status: (capture && known.includes(capture.status)
        ? capture.status
        : 'OTHER') as PaypalCapture['status'],
      captureId: capture?.id ?? null,
      amount: capture?.amount ? fromPaypalValue(capture.amount.value) : 0,
      currency: capture?.amount?.currency_code ?? '',
    };
  }

  async parseWebhook(headers: PaypalHeaders, rawBody: Buffer): Promise<PaymentEvent> {
    const config = await this.credentials();
    if (!config.webhookId) throw new ServiceUnavailableException('PayPal webhook id not set');
    const event = JSON.parse(rawBody.toString('utf8')) as {
      id: string;
      event_type: string;
      resource: PaypalCaptureResource & PaypalOrderResource;
    };
    const { status, data } = await this.call<{ verification_status?: string }>(
      config,
      'POST',
      '/v1/notifications/verify-webhook-signature',
      {
        auth_algo: headers['paypal-auth-algo'],
        cert_url: headers['paypal-cert-url'],
        transmission_id: headers['paypal-transmission-id'],
        transmission_sig: headers['paypal-transmission-sig'],
        transmission_time: headers['paypal-transmission-time'],
        webhook_id: config.webhookId,
        webhook_event: event,
      },
    );
    if (status >= 300 || data.verification_status !== 'SUCCESS') {
      throw new Error('PayPal could not verify this webhook');
    }

    const r = event.resource;
    switch (event.event_type) {
      case 'CHECKOUT.ORDER.APPROVED':
        return { id: event.id, type: 'checkout.approved', sessionId: r.id };
      case 'PAYMENT.CAPTURE.COMPLETED': {
        const orderId = r.custom_id;
        const paypalOrderId = r.supplementary_data?.related_ids?.order_id;
        if (!orderId || !paypalOrderId || !r.amount) break;
        return {
          id: event.id,
          type: 'checkout.paid',
          orderId,
          sessionId: paypalOrderId,
          paymentRef: r.id,
          amount: fromPaypalValue(r.amount.value),
          currency: r.amount.currency_code,
        };
      }
      case 'PAYMENT.CAPTURE.DECLINED':
      case 'PAYMENT.CAPTURE.DENIED': {
        const orderId = r.custom_id;
        const paypalOrderId = r.supplementary_data?.related_ids?.order_id;
        if (!orderId || !paypalOrderId) break;
        return {
          id: event.id,
          type: 'checkout.failed',
          orderId,
          sessionId: paypalOrderId,
          reason: 'failed',
        };
      }
      case 'PAYMENT.CAPTURE.REFUNDED': {
        // The refund links "up" to the capture it refunds.
        const up = r.links?.find((l) => l.rel === 'up')?.href;
        const captureId = up?.split('/captures/')[1]?.split(/[/?]/)[0];
        if (!captureId) break;
        return { id: event.id, type: 'charge.refunded', paymentRef: captureId };
      }
    }
    return { id: event.id, type: 'ignored', stripeType: event.event_type };
  }

  async refund(captureId: string) {
    const config = await this.credentials();
    const { status, data } = await this.call(
      config,
      'POST',
      `/v2/payments/captures/${encodeURIComponent(captureId)}/refund`,
      {},
      `refund:${captureId}`,
    );
    if (status >= 300) this.fail('refunding the payment', status, data);
  }

  async check() {
    const config = await this.config.paypalCredentials();
    if (!config) return { ok: false, message: 'PayPal has no client id and secret yet' };
    try {
      await this.accessToken(config);
      return {
        ok: true,
        message: `Connected to PayPal (${config.mode})${config.webhookId ? '; webhook id set' : ', but the webhook id is missing'}`,
      };
    } catch (error) {
      return { ok: false, message: (error as Error).message };
    }
  }
}
