import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { Prisma, type PaymentProvider } from '../generated/prisma/client.js';
import { EmailService } from '../mail/email.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersService } from './orders.service.js';
import { type PaymentEvent, PaymentsGateway } from './payments.gateway.js';
import { type PaypalHeaders, PaypalGateway } from './paypal.gateway.js';

const PROVIDER: Actor = { type: 'system' };

type Provider = Extract<PaymentProvider, 'STRIPE' | 'PAYPAL'>;

/**
 * Payment webhooks (Stripe, PayPal) and PayPal captures. Every event is verified with the
 * provider, each event id is processed once, and the charged amount must match the order before
 * anything is fulfilled. The browser's word ("payment succeeded") is never trusted.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentsGateway,
    private readonly paypal: PaypalGateway,
    private readonly orders: OrdersService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined): Promise<void> {
    if (!rawBody || !signature) throw new BadRequestException('Missing webhook signature');
    let event: PaymentEvent;
    try {
      event = await this.gateway.parseWebhook(rawBody, signature);
    } catch (error) {
      this.logger.warn(`Rejected Stripe webhook: ${(error as Error).message}`);
      throw new BadRequestException('Invalid webhook signature');
    }
    await this.process('STRIPE', event);
  }

  async handlePaypalWebhook(headers: PaypalHeaders, rawBody: Buffer | undefined): Promise<void> {
    if (!rawBody || !headers['paypal-transmission-sig']) {
      throw new BadRequestException('Missing webhook signature');
    }
    let event: PaymentEvent;
    try {
      event = await this.paypal.parseWebhook(headers, rawBody);
    } catch (error) {
      this.logger.warn(`Rejected PayPal webhook: ${(error as Error).message}`);
      throw new BadRequestException('Invalid webhook signature');
    }
    await this.process('PAYPAL', event);
  }

  /**
   * PayPal: the buyer approved (they came back to the return URL, or the webhook said so).
   * Captures the money and settles the order. Returns our order number, when known.
   */
  async capturePaypal(
    paypalOrderId: string,
  ): Promise<{ orderNumber: number | null; paid: boolean }> {
    const capture = await this.paypal.capture(paypalOrderId);
    const payment = await this.prisma.payment.findUnique({
      where: { providerRef: paypalOrderId },
      include: { order: { select: { id: true, number: true } } },
    });
    const orderId = payment?.order.id ?? capture.orderId;
    if (!orderId) return { orderNumber: null, paid: false };
    if (capture.status === 'COMPLETED' && capture.captureId) {
      await this.process('PAYPAL', {
        id: `paypal-capture:${capture.captureId}`,
        type: 'checkout.paid',
        orderId,
        sessionId: paypalOrderId,
        paymentRef: capture.captureId,
        amount: capture.amount,
        currency: capture.currency,
      });
    } else if (capture.status === 'DECLINED' || capture.status === 'FAILED') {
      await this.process('PAYPAL', {
        id: `paypal-capture-failed:${paypalOrderId}`,
        type: 'checkout.failed',
        orderId,
        sessionId: paypalOrderId,
        reason: 'failed',
      });
    }
    return {
      orderNumber: payment?.order.number ?? null,
      paid: capture.status === 'COMPLETED',
    };
  }

  private async process(provider: Provider, event: PaymentEvent): Promise<void> {
    if (event.type === 'ignored') return;
    if (event.type === 'checkout.approved') {
      await this.capturePaypal(event.sessionId);
      return;
    }

    // Providers retry deliveries; record each event id once so side effects run once.
    try {
      await this.prisma.processedWebhookEvent.create({
        data: { id: event.id, type: event.type, provider: provider.toLowerCase() },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return;
      throw error;
    }

    try {
      switch (event.type) {
        case 'checkout.paid':
          await this.paid(provider, event);
          break;
        case 'checkout.failed':
          await this.failed(event);
          break;
        case 'charge.refunded':
          await this.refunded(provider, event.paymentRef);
          break;
      }
    } catch (error) {
      // Let the provider retry: forget the event so the retry is processed.
      await this.prisma.processedWebhookEvent
        .delete({ where: { id: event.id } })
        .catch(() => undefined);
      throw error;
    }
  }

  private async paid(provider: Provider, event: Extract<PaymentEvent, { type: 'checkout.paid' }>) {
    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: { payments: true },
    });
    if (!order) {
      this.logger.warn(`Payment for unknown order ${event.orderId}`);
      return;
    }
    const payment =
      order.payments.find((p) => p.providerRef === event.sessionId) ??
      (await this.prisma.payment.create({
        data: {
          orderId: order.id,
          provider,
          amount: event.amount,
          currency: event.currency,
          providerRef: event.sessionId,
        },
      }));
    // PayPal reports one capture twice (our capture call, then its webhook).
    if (payment.status === 'PAID') return;

    if (event.amount !== order.total || event.currency !== order.currency) {
      const reason = `Charged ${event.amount} ${event.currency}, expected ${order.total} ${order.currency}`;
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', failureReason: reason, providerPaymentId: event.paymentRef },
      });
      await this.audit.record(PROVIDER, 'payment.mismatch', 'Order', order.id, { reason });
      this.logger.error(`Order #${order.number}: ${reason}. Not fulfilled; review it in admin.`);
      return;
    }

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'PAID',
        providerPaymentId: event.paymentRef,
        paidAt: new Date(),
        failureReason: null,
      },
    });
    await this.orders.confirm(order.id, { paid: true, email: 'paid', actor: PROVIDER });
  }

  private async failed(event: Extract<PaymentEvent, { type: 'checkout.failed' }>) {
    const order = await this.prisma.order.findUnique({
      where: { id: event.orderId },
      include: { customer: true, items: true },
    });
    if (!order || order.status !== 'PENDING') return;
    const reason = event.reason === 'expired' ? 'Checkout expired' : 'Payment failed';
    await this.prisma.payment.updateMany({
      where: { orderId: order.id, providerRef: event.sessionId, status: 'PENDING' },
      data: { status: 'FAILED', failureReason: reason },
    });
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED', paymentStatus: 'FAILED', cancelledAt: new Date() },
    });
    await this.audit.record(PROVIDER, 'order.paymentFailed', 'Order', order.id, { reason });
    // Abandoned checkouts are cancelled quietly; a real payment failure is worth telling.
    if (event.reason === 'failed') {
      await this.email.send('paymentFailed', {
        to: order.customer.email,
        customerId: order.customerId,
        orderId: order.id,
        idempotencyKey: `order:${order.id}:payment-failed`,
        data: {
          name: order.customer.name,
          orderNumber: order.number,
          retryUrl: `${this.env.SITE_URL}/checkout?items=${order.items.map((i) => i.productSlug).join(',')}`,
        },
      });
    }
  }

  private async refunded(provider: Provider, paymentRef: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { provider, providerPaymentId: paymentRef },
    });
    if (!payment) return;
    await this.orders.markRefunded(payment.orderId, PROVIDER, provider.toLowerCase());
  }
}
