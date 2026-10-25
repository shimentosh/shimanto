import { randomUUID } from 'node:crypto';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import type { ManualMethodView, ManualPaymentSubmit } from '@shimanto/types';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { unprocessable } from '../common/validate.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type { Order, Payment, Prisma } from '../generated/prisma/client.js';
import { EmailService } from '../mail/email.service.js';
import { formatMoney } from '../mail/transactional.js';
import { safeName, sniff } from '../media/media.service.js';
import { PRIVATE_PREFIX, StorageService } from '../media/storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { OrdersService } from './orders.service.js';
import { PaymentsGateway } from './payments.gateway.js';
import { methodSnapshot } from './views.js';

/** Payment screenshots / receipts: images or a PDF, up to 10 MB. */
export const PROOF_MAX_BYTES = 10 * 1024 * 1024;
const PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
/** A rejected proof always leaves the buyer at least this long to send it again. */
const RESUBMIT_GRACE_MS = 24 * 60 * 60 * 1000;
/** Card / PayPal checkouts the buyer walked away from are cancelled after this. */
const ABANDONED_CHECKOUT_MS = 3 * 60 * 60 * 1000;
const SWEEP_EVERY_MS = 5 * 60 * 1000;
const SYSTEM: Actor = { type: 'system' };

export interface ProofFile {
  buffer: Buffer;
  originalname: string;
}

/** "within 48 hours (by 28 Oct 2026, 15:00 UTC)" for emails, where the reader's zone is unknown. */
function dueText(dueAt: Date | null, now = new Date()): string | null {
  if (!dueAt) return null;
  const hours = Math.max(1, Math.round((dueAt.getTime() - now.getTime()) / 3_600_000));
  const at = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  }).format(dueAt);
  return `within ${hours} hour${hours === 1 ? '' : 's'} (by ${at} UTC)`;
}

/**
 * Manual payments (bKash, bank transfer…): the buyer pays by hand and sends the transaction
 * reference (and a screenshot); an admin checks the money arrived and confirms or rejects it.
 * Confirming goes through `OrdersService.confirm`, like a provider webhook. Unpaid orders get a
 * reminder halfway to the deadline and are cancelled after it.
 */
@Injectable()
export class ManualPaymentsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('ManualPayments');
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly cards: PaymentsGateway,
    private readonly storage: StorageService,
    private readonly email: EmailService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit() {
    // Tests call sweep() themselves.
    if (this.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      this.sweep().catch((error: Error) => this.logger.error(`Sweep failed: ${error.message}`));
    }, SWEEP_EVERY_MS);
    this.timer.unref();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  private orderUrl(number: number) {
    return `${this.env.PORTAL_URL}/orders/${number}`;
  }

  // ───────────── Checkout ─────────────

  /**
   * After checkout created the order: records the pending manual payment with a snapshot of the
   * method, sets the deadline and emails how to pay. Proof sent at checkout is saved right away.
   */
  async start(
    order: Order,
    method: ManualMethodView,
    windowHours: number,
    proof?: ManualPaymentSubmit,
  ) {
    const dueAt = new Date(Date.now() + windowHours * 3_600_000);
    await this.prisma.$transaction([
      this.prisma.payment.create({
        data: {
          orderId: order.id,
          provider: 'MANUAL',
          status: 'PENDING',
          amount: order.total,
          currency: order.currency,
          method: method.id,
          methodDetails: method as unknown as Prisma.InputJsonValue,
        },
      }),
      this.prisma.order.update({ where: { id: order.id }, data: { paymentDueAt: dueAt } }),
    ]);
    const { email, mail } = await this.orders.mailData(order.id);
    await this.email.send('manualPaymentInstructions', {
      to: email,
      customerId: order.customerId,
      orderId: order.id,
      idempotencyKey: `order:${order.id}:manualPaymentInstructions`,
      data: {
        ...mail,
        method: method.name,
        fields: method.fields.map((f) => [f.label, f.value] as [string, string]),
        steps: method.instructions
          .split(/\n+/)
          .map((line) => line.trim())
          .filter(Boolean),
        referenceLabel: method.referenceLabel,
        due: dueText(dueAt),
      },
    });
    // Paid already: the proof comes with the order. A missing screenshot can follow later.
    if (proof) await this.submit(order.customerId, order.number, proof, undefined, true);
  }

  // ───────────── Customer ─────────────

  /** "I've paid": the transaction reference, the sending account and a screenshot. */
  async submit(
    customerId: string,
    number: number,
    input: ManualPaymentSubmit,
    file?: ProofFile,
    atCheckout = false,
  ) {
    const order = await this.prisma.order.findFirst({
      where: { number, customerId },
      include: {
        customer: true,
        payments: {
          where: { provider: 'MANUAL', status: 'PENDING' },
          include: { proof: { select: { id: true } } },
          take: 1,
        },
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    const payment = order.payments[0];
    if (order.status !== 'PENDING' || order.paymentStatus !== 'PENDING' || !payment) {
      unprocessable('This order is not waiting for a payment');
    }
    const method = methodSnapshot(payment);
    const sender = input.senderAccount?.trim() || null;
    if (method.senderLabel && !sender && !atCheckout) {
      unprocessable(`Enter the ${method.senderLabel.toLowerCase()}`, 'senderAccount');
    }
    const proof = file ? await this.saveProof(file, order.id) : null;
    if (method.proof === 'REQUIRED' && !proof && !payment.proof && !atCheckout) {
      unprocessable('Attach a screenshot or receipt of the payment', 'proof');
    }

    const now = new Date();
    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        reference: input.reference.trim(),
        senderAccount: sender,
        ...(proof ? { proofId: proof.id } : {}),
        submittedAt: now,
        rejectedReason: null,
      },
    });

    const general = await this.settings.general();
    const to = this.env.NOTIFY_EMAIL ?? general.supportEmail;
    if (to) {
      const { customer } = order;
      await this.email.send('adminManualPayment', {
        to,
        orderId: order.id,
        idempotencyKey: `order:${order.id}:manualSubmitted:${now.getTime()}`,
        data: {
          orderNumber: order.number,
          customer: customer.name ? `${customer.name} <${customer.email}>` : customer.email,
          amount: formatMoney(order.total, order.currency),
          method: method.name,
          reference: input.reference.trim(),
          senderAccount: sender,
          hasProof: Boolean(proof ?? payment.proof),
          url: `${this.env.ADMIN_URL}/orders/${order.id}`,
        },
      });
    }
  }

  private async saveProof(file: ProofFile, orderId: string) {
    if (file.buffer.length > PROOF_MAX_BYTES) unprocessable('Files can be up to 10 MB', 'proof');
    const kind = sniff(file.buffer);
    if (!kind || !PROOF_TYPES.includes(kind.mime)) {
      unprocessable('Attach a screenshot (JPEG, PNG, WebP) or a PDF receipt', 'proof');
    }
    const filename = safeName(file.originalname, kind.ext);
    const key = `${PRIVATE_PREFIX}payments/${orderId}/${randomUUID()}/${filename}`;
    await this.storage.put(key, file.buffer, kind.mime);
    return this.prisma.media.create({
      data: { key, filename, mimeType: kind.mime, size: file.buffer.length },
    });
  }

  // ───────────── Admin ─────────────

  private async pendingPayment(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { customer: true, payments: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (order.provider !== 'MANUAL' || order.paymentStatus !== 'PENDING') {
      unprocessable('Only manual-payment orders awaiting payment can be reviewed');
    }
    const payment = order.payments.find((p) => p.provider === 'MANUAL' && p.status === 'PENDING');
    return { order, payment };
  }

  /** The money arrived: the order is confirmed and delivered, and the buyer gets a receipt. */
  async confirm(orderId: string, actor: Actor) {
    const { order, payment } = await this.pendingPayment(orderId);
    const now = new Date();
    if (payment) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'PAID', paidAt: now, rejectedReason: null },
      });
    } else {
      await this.prisma.payment.create({
        data: {
          orderId,
          provider: 'MANUAL',
          status: 'PAID',
          amount: order.total,
          currency: order.currency,
          paidAt: now,
        },
      });
    }
    await this.audit.record(actor, 'payment.confirm', 'Order', orderId, {
      reference: payment?.reference ?? null,
    });
    // A cancelled-then-paid order is revived by confirm(), like a late provider payment.
    await this.orders.confirm(orderId, { paid: true, email: 'paid', actor });
  }

  /** The proof didn't match: the buyer is told why and can send it again. */
  async reject(orderId: string, reason: string, actor: Actor) {
    const { order, payment } = await this.pendingPayment(orderId);
    if (!payment?.submittedAt) unprocessable('There is no submitted payment to reject');
    const minimumDue = new Date(Date.now() + RESUBMIT_GRACE_MS);
    const dueAt =
      order.paymentDueAt && order.paymentDueAt > minimumDue ? order.paymentDueAt : minimumDue;
    await this.prisma.$transaction([
      this.prisma.payment.update({
        where: { id: payment.id },
        data: { submittedAt: null, rejectedReason: reason },
      }),
      this.prisma.order.update({
        where: { id: orderId },
        data: { paymentDueAt: dueAt, paymentRemindedAt: null },
      }),
    ]);
    await this.audit.record(actor, 'payment.reject', 'Order', orderId, {
      reference: payment.reference,
      reason,
    });
    await this.email.send('manualPaymentRejected', {
      to: order.customer.email,
      customerId: order.customerId,
      orderId,
      idempotencyKey: `order:${orderId}:manualRejected:${Date.now()}`,
      data: {
        name: order.customer.name,
        orderNumber: order.number,
        reason,
        due: dueText(dueAt),
        orderUrl: this.orderUrl(order.number),
      },
    });
  }

  /** A 5-minute link to the buyer's screenshot / receipt. */
  async proofUrl(orderId: string, paymentId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, orderId },
      include: { proof: true },
    });
    if (!payment?.proof) throw new NotFoundException('No proof attached');
    return { url: await this.storage.signedDownloadUrl(payment.proof.key, payment.proof.filename) };
  }

  // ───────────── Deadlines ─────────────

  /**
   * Reminds buyers halfway to the deadline, cancels manual orders nobody paid (unless proof is
   * waiting for review), and cancels card / PayPal checkouts abandoned for hours. Safe to run on
   * several instances: every step is a conditional update.
   */
  async sweep(now = new Date()) {
    const due = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        provider: 'MANUAL',
        source: 'CHECKOUT',
        paymentDueAt: { not: null },
      },
      include: {
        customer: true,
        payments: { where: { provider: 'MANUAL', status: 'PENDING' }, take: 1 },
      },
    });
    for (const order of due) {
      const payment = order.payments[0];
      // Proof sent: it's on the admin now, never cancelled for being slow to review.
      if (payment?.submittedAt) continue;
      const dueAt = order.paymentDueAt!;
      if (dueAt <= now) await this.expire(order.id, now);
      else if (!order.paymentRemindedAt && payment) {
        const window = dueAt.getTime() - order.createdAt.getTime();
        if (now.getTime() >= order.createdAt.getTime() + window / 2) {
          await this.remind(order, payment, now);
        }
      }
    }

    const abandoned = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'PENDING',
        provider: { in: ['STRIPE', 'PAYPAL'] },
        source: 'CHECKOUT',
        createdAt: { lt: new Date(now.getTime() - ABANDONED_CHECKOUT_MS) },
      },
      include: { payments: { where: { status: 'PENDING' } } },
    });
    for (const order of abandoned) {
      const { count } = await this.prisma.order.updateMany({
        where: { id: order.id, status: 'PENDING', paymentStatus: 'PENDING' },
        data: { status: 'CANCELLED', paymentStatus: 'FAILED', cancelledAt: now },
      });
      if (!count) continue;
      for (const p of order.payments) {
        if (p.provider === 'STRIPE' && p.providerRef)
          await this.cards.cancelCheckout(p.providerRef);
      }
      await this.prisma.payment.updateMany({
        where: { orderId: order.id, status: 'PENDING' },
        data: { status: 'FAILED', failureReason: 'Checkout abandoned' },
      });
      await this.audit.record(SYSTEM, 'order.paymentFailed', 'Order', order.id, {
        reason: 'Checkout abandoned',
      });
    }
  }

  private async remind(
    order: Order & { customer: { email: string; name: string | null } },
    payment: Payment,
    now: Date,
  ) {
    const { count } = await this.prisma.order.updateMany({
      where: { id: order.id, paymentRemindedAt: null },
      data: { paymentRemindedAt: now },
    });
    if (!count) return;
    await this.email.send('manualPaymentReminder', {
      to: order.customer.email,
      customerId: order.customerId,
      orderId: order.id,
      idempotencyKey: `order:${order.id}:manualReminder:${order.paymentDueAt!.getTime()}`,
      data: {
        name: order.customer.name,
        orderNumber: order.number,
        amount: formatMoney(order.total, order.currency),
        method: methodSnapshot(payment).name,
        due: dueText(order.paymentDueAt, now)!,
        orderUrl: this.orderUrl(order.number),
      },
    });
  }

  private async expire(orderId: string, now: Date) {
    const { count } = await this.prisma.order.updateMany({
      where: { id: orderId, status: 'PENDING', paymentStatus: 'PENDING' },
      data: { status: 'CANCELLED', paymentStatus: 'FAILED', cancelledAt: now },
    });
    if (!count) return;
    await this.prisma.payment.updateMany({
      where: { orderId, status: 'PENDING' },
      data: { status: 'FAILED', failureReason: 'Not paid before the deadline' },
    });
    await this.audit.record(SYSTEM, 'order.paymentExpired', 'Order', orderId);
    const { email, mail } = await this.orders.mailData(orderId);
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    await this.email.send('orderCancelled', {
      to: email,
      customerId: order.customerId,
      orderId,
      idempotencyKey: `order:${orderId}:cancelled`,
      data: {
        name: mail.name,
        orderNumber: order.number,
        refunded: false,
        unpaid: true,
        supportUrl: `${this.env.PORTAL_URL}/support`,
      },
    });
  }
}
