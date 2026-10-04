import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import { EmailService } from '../mail/email.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { OrdersService } from './orders.service.js';
import { type PaymentEvent, PaymentsGateway } from './payments.gateway.js';

const PROVIDER: Actor = { type: 'system' };

/**
 * Payment webhooks. The signature is verified against the raw body, each event id is processed
 * once, and the charged amount must match the order before anything is fulfilled. The browser's
 * word ("payment succeeded") is never trusted.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger('Payments');

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: PaymentsGateway,
    private readonly orders: OrdersService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  async handleWebhook(rawBody: Buffer | undefined, signature: string | undefined): Promise<void> {
    if (!rawBody || !signature) throw new BadRequestException('Missing webhook signature');
    let event: PaymentEvent;
    try {
      event = this.gateway.parseWebhook(rawBody, signature);
    } catch (error) {
      this.logger.warn(`Rejected webhook: ${(error as Error).message}`);
      throw new BadRequestException('Invalid webhook signature');
    }
    if (event.type === 'ignored') return;

    // Providers retry deliveries; record each event id once so side effects run once.
    try {
      await this.prisma.processedWebhookEvent.create({
        data: { id: event.id, type: event.type, provider: 'stripe' },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return;
      throw error;
    }

    try {
      switch (event.type) {
        case 'checkout.paid':
          await this.paid(event);
          break;
        case 'checkout.failed':
          await this.failed(event);
          break;
        case 'charge.refunded':
          await this.refunded(event.paymentRef);
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

  private async paid(event: Extract<PaymentEvent, { type: 'checkout.paid' }>) {
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
          provider: 'STRIPE',
          amount: event.amount,
          currency: event.currency,
          providerRef: event.sessionId,
        },
      }));

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

  private async refunded(paymentRef: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { providerPaymentId: paymentRef },
    });
    if (!payment) return;
    await this.orders.markRefunded(payment.orderId, PROVIDER, 'stripe');
  }
}
