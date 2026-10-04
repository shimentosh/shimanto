import Stripe from 'stripe';
import type { Env } from '../config/env.js';
import { StripeGateway } from './payments.gateway.js';

const WEBHOOK_SECRET = 'whsec_test_secret';
const env = { STRIPE_SECRET_KEY: 'sk_test_123', STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET } as Env;
const stripe = new Stripe('sk_test_123');

/** A body + header pair signed exactly the way Stripe signs deliveries. */
function signed(event: Record<string, unknown>) {
  const payload = JSON.stringify(event);
  return {
    body: Buffer.from(payload),
    signature: stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET }),
  };
}

const session = (overrides: Record<string, unknown>) => ({
  id: 'cs_1',
  object: 'checkout.session',
  metadata: { orderId: 'order_1' },
  client_reference_id: 'order_1',
  payment_status: 'paid',
  payment_intent: 'pi_1',
  amount_total: 4900,
  currency: 'usd',
  ...overrides,
});

describe('StripeGateway.parseWebhook (real SDK signature verification)', () => {
  const gateway = new StripeGateway(env);

  it('maps a paid checkout to checkout.paid', () => {
    const { body, signature } = signed({
      id: 'evt_1',
      type: 'checkout.session.completed',
      data: { object: session({}) },
    });
    expect(gateway.parseWebhook(body, signature)).toEqual({
      id: 'evt_1',
      type: 'checkout.paid',
      orderId: 'order_1',
      sessionId: 'cs_1',
      paymentRef: 'pi_1',
      amount: 4900,
      currency: 'USD',
    });
  });

  it('does not fulfil a completed-but-unpaid session (async payment still pending)', () => {
    const { body, signature } = signed({
      id: 'evt_2',
      type: 'checkout.session.completed',
      data: { object: session({ payment_status: 'unpaid' }) },
    });
    expect(gateway.parseWebhook(body, signature).type).toBe('ignored');
  });

  it('maps expiry to checkout.failed and refunds to charge.refunded', () => {
    const expired = signed({
      id: 'evt_3',
      type: 'checkout.session.expired',
      data: { object: session({ payment_status: 'unpaid' }) },
    });
    expect(gateway.parseWebhook(expired.body, expired.signature)).toMatchObject({
      type: 'checkout.failed',
      orderId: 'order_1',
      reason: 'expired',
    });

    const failed = signed({
      id: 'evt_3b',
      type: 'checkout.session.async_payment_failed',
      data: { object: session({ payment_status: 'unpaid' }) },
    });
    expect(gateway.parseWebhook(failed.body, failed.signature)).toMatchObject({
      type: 'checkout.failed',
      reason: 'failed',
    });

    const refunded = signed({
      id: 'evt_4',
      type: 'charge.refunded',
      data: { object: { id: 'ch_1', object: 'charge', payment_intent: 'pi_1', refunded: true } },
    });
    expect(gateway.parseWebhook(refunded.body, refunded.signature)).toEqual({
      id: 'evt_4',
      type: 'charge.refunded',
      paymentRef: 'pi_1',
    });
  });

  it('rejects forged or tampered payloads', () => {
    const { body, signature } = signed({
      id: 'evt_5',
      type: 'checkout.session.completed',
      data: { object: session({}) },
    });
    const tampered = Buffer.from(body.toString().replace('pi_1', 'pi_evil'));
    expect(() => gateway.parseWebhook(tampered, signature)).toThrow();
    expect(() => gateway.parseWebhook(body, 't=1,v1=deadbeef')).toThrow();
  });

  it('is disabled without a secret key', () => {
    expect(new StripeGateway({} as Env).enabled).toBe(false);
  });
});
