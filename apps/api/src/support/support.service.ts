import { randomUUID } from 'node:crypto';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { Page, TicketDetail, TicketStatus, TicketSummary } from '@shimanto/types';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { ENTITLED_ORDER } from '../commerce/status.js';
import { cursorArgs, paginate } from '../common/cursor.js';
import { unprocessable } from '../common/validate.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type { Prisma } from '../generated/prisma/client.js';
import { EmailService } from '../mail/email.service.js';
import { safeName, sniff } from '../media/media.service.js';
import { PRIVATE_PREFIX, StorageService } from '../media/storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from '../settings/settings.service.js';

/** Screenshots, PDFs and ZIPs up to 10 MB: enough for a bug report, no executables. */
export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;
const ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/zip',
];

export interface Attachment {
  buffer: Buffer;
  originalname: string;
}

const summaryInclude = {
  product: { select: { id: true, name: true } },
  order: { select: { id: true, number: true } },
  customer: { select: { id: true, email: true, name: true } },
} satisfies Prisma.SupportTicketInclude;

const detailInclude = {
  ...summaryInclude,
  messages: {
    orderBy: { createdAt: 'asc' },
    include: {
      attachment: { select: { id: true, filename: true, size: true } },
      user: { select: { name: true, email: true } },
    },
  },
} satisfies Prisma.SupportTicketInclude;

type SummaryRow = Prisma.SupportTicketGetPayload<{ include: typeof summaryInclude }>;
type DetailRow = Prisma.SupportTicketGetPayload<{ include: typeof detailInclude }>;

function toSummary(t: SummaryRow): TicketSummary {
  return {
    id: t.id,
    number: t.number,
    subject: t.subject,
    status: t.status,
    product: t.product,
    order: t.order,
    customer: t.customer,
    lastMessageAt: t.lastMessageAt.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

const excerpt = (body: string) => (body.length > 280 ? `${body.slice(0, 277)}…` : body);

/**
 * Support tickets. Customers open and reply to their own tickets (optionally about a product or
 * order they own); admins reply and change status. Each step emails the other side once.
 */
@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly email: EmailService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private toDetail(t: DetailRow, storeName: string): TicketDetail {
    return {
      ...toSummary(t),
      messages: t.messages.map((m) => ({
        id: m.id,
        authorType: m.authorType,
        authorName:
          m.authorType === 'CUSTOMER'
            ? (t.customer.name ?? t.customer.email)
            : (m.user?.name ?? `${storeName} support`),
        body: m.body,
        createdAt: m.createdAt.toISOString(),
        attachment: m.attachment,
      })),
    };
  }

  private async saveAttachment(file: Attachment | undefined, ticketId: string) {
    if (!file) return null;
    if (file.buffer.length > ATTACHMENT_MAX_BYTES)
      unprocessable('Attachments can be up to 10 MB', 'file');
    const kind = sniff(file.buffer);
    if (!kind || !ATTACHMENT_TYPES.includes(kind.mime)) {
      unprocessable('Attach an image (JPEG, PNG, GIF, WebP), a PDF or a ZIP', 'file');
    }
    const filename = safeName(file.originalname, kind.ext);
    const key = `${PRIVATE_PREFIX}support/${ticketId}/${randomUUID()}/${filename}`;
    await this.storage.put(key, file.buffer, kind.mime);
    return this.prisma.media.create({
      data: { key, filename, mimeType: kind.mime, size: file.buffer.length },
    });
  }

  private async notifyAdmin(ticket: SummaryRow, messageId: string, body: string, isReply: boolean) {
    const general = await this.settings.general();
    const to = this.env.NOTIFY_EMAIL ?? general.supportEmail;
    if (!to) return;
    await this.email.send('adminTicketNotification', {
      to,
      ticketId: ticket.id,
      idempotencyKey: `ticket:${ticket.id}:message:${messageId}:admin`,
      data: {
        number: ticket.number,
        subject: ticket.subject,
        customer: ticket.customer.name
          ? `${ticket.customer.name} <${ticket.customer.email}>`
          : ticket.customer.email,
        excerpt: excerpt(body),
        url: `${this.env.ADMIN_URL}/tickets/${ticket.id}`,
        isReply,
      },
    });
  }

  // ───────────── Customer ─────────────

  async create(
    customerId: string,
    input: { subject: string; message: string; productId?: string; orderId?: string },
    file?: Attachment,
  ): Promise<TicketDetail> {
    // Only products and orders the customer owns can be referenced.
    if (input.orderId) {
      const owns = await this.prisma.order.count({ where: { id: input.orderId, customerId } });
      if (!owns) unprocessable('Order not found', 'orderId');
    }
    if (input.productId) {
      const owns = await this.prisma.orderItem.count({
        where: {
          productId: input.productId,
          order: { customerId, status: { in: ENTITLED_ORDER } },
        },
      });
      if (!owns) unprocessable('You can only ask about products you own', 'productId');
    }

    const ticket = await this.prisma.supportTicket.create({
      data: {
        customerId,
        subject: input.subject,
        productId: input.productId ?? null,
        orderId: input.orderId ?? null,
      },
      include: summaryInclude,
    });
    const attachment = await this.saveAttachment(file, ticket.id);
    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        authorType: 'CUSTOMER',
        body: input.message,
        attachmentId: attachment?.id ?? null,
      },
    });

    await this.email.send('ticketCreated', {
      to: ticket.customer.email,
      customerId,
      ticketId: ticket.id,
      idempotencyKey: `ticket:${ticket.id}:created`,
      data: {
        name: ticket.customer.name,
        number: ticket.number,
        subject: ticket.subject,
        url: `${this.env.PORTAL_URL}/support/${ticket.number}`,
      },
    });
    await this.notifyAdmin(ticket, message.id, input.message, false);
    await this.analytics.trackSupportTicket({
      ticketId: ticket.id,
      customerId,
      productId: ticket.productId,
      orderId: ticket.orderId,
    });
    return this.customerTicket(customerId, ticket.number);
  }

  async customerTickets(customerId: string): Promise<TicketSummary[]> {
    const rows = await this.prisma.supportTicket.findMany({
      where: { customerId },
      include: summaryInclude,
      orderBy: { lastMessageAt: 'desc' },
    });
    return rows.map(toSummary);
  }

  async customerTicket(customerId: string, number: number): Promise<TicketDetail> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { number, customerId },
      include: detailInclude,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.toDetail(ticket, (await this.settings.general()).storeName);
  }

  async customerReply(
    customerId: string,
    number: number,
    body: string,
    file?: Attachment,
  ): Promise<TicketDetail> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { number, customerId },
      include: summaryInclude,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === 'CLOSED') unprocessable('This ticket is closed. Please open a new one.');
    const attachment = await this.saveAttachment(file, ticket.id);
    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        authorType: 'CUSTOMER',
        body,
        attachmentId: attachment?.id ?? null,
      },
    });
    // A customer reply always puts the ticket back in the team's queue.
    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: 'OPEN', lastMessageAt: message.createdAt, resolvedAt: null },
    });
    await this.notifyAdmin(ticket, message.id, body, true);
    return this.customerTicket(customerId, number);
  }

  async customerAttachment(customerId: string, number: number, messageId: string) {
    const message = await this.prisma.supportMessage.findFirst({
      where: { id: messageId, ticket: { number, customerId } },
      include: { attachment: true },
    });
    if (!message?.attachment) throw new NotFoundException('Attachment not found');
    return {
      url: await this.storage.signedDownloadUrl(
        message.attachment.key,
        message.attachment.filename,
      ),
    };
  }

  // ───────────── Admin ─────────────

  async list(query: {
    status?: TicketStatus;
    q?: string;
    customerId?: string;
    limit: number;
    cursor?: string;
  }): Promise<Page<TicketSummary>> {
    const q = query.q?.trim().replace(/^#/, '');
    const rows = await this.prisma.supportTicket.findMany({
      where: {
        status: query.status,
        customerId: query.customerId,
        ...(q
          ? {
              OR: [
                { subject: { contains: q, mode: 'insensitive' } },
                { customer: { email: { contains: q, mode: 'insensitive' } } },
                ...(/^\d{1,9}$/.test(q) ? [{ number: Number(q) }] : []),
              ],
            }
          : {}),
      },
      include: summaryInclude,
      orderBy: [{ lastMessageAt: 'desc' }, { id: 'asc' }],
      ...cursorArgs(query.limit, query.cursor),
    });
    const page = paginate(rows, query.limit);
    return { items: page.items.map(toSummary), nextCursor: page.nextCursor };
  }

  async detail(id: string): Promise<TicketDetail> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return this.toDetail(ticket, (await this.settings.general()).storeName);
  }

  async adminReply(
    id: string,
    input: { message: string; status?: TicketStatus },
    actor: Actor & { type: 'user' },
    file?: Attachment,
  ): Promise<TicketDetail> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: summaryInclude,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    const attachment = await this.saveAttachment(file, ticket.id);
    const message = await this.prisma.supportMessage.create({
      data: {
        ticketId: id,
        authorType: 'ADMIN',
        userId: actor.id,
        body: input.message,
        attachmentId: attachment?.id ?? null,
      },
    });
    // Default: waiting for the customer.
    const status = input.status ?? 'PENDING';
    await this.prisma.supportTicket.update({
      where: { id },
      data: {
        status,
        lastMessageAt: message.createdAt,
        resolvedAt: status === 'RESOLVED' ? new Date() : null,
      },
    });
    await this.audit.record(actor, 'ticket.reply', 'SupportTicket', id, { status });
    await this.email.send('ticketReply', {
      to: ticket.customer.email,
      customerId: ticket.customer.id,
      ticketId: id,
      idempotencyKey: `ticket:${id}:message:${message.id}`,
      data: {
        name: ticket.customer.name,
        number: ticket.number,
        subject: ticket.subject,
        excerpt: excerpt(input.message),
        url: `${this.env.PORTAL_URL}/support/${ticket.number}`,
      },
    });
    if (status === 'RESOLVED' && ticket.status !== 'RESOLVED')
      await this.resolvedEmail(ticket, message.id);
    return this.detail(id);
  }

  async setStatus(id: string, status: TicketStatus, actor: Actor): Promise<TicketDetail> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: summaryInclude,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    if (ticket.status === status) return this.detail(id);
    await this.prisma.supportTicket.update({
      where: { id },
      data: { status, resolvedAt: status === 'RESOLVED' ? new Date() : null },
    });
    await this.audit.record(actor, 'ticket.status', 'SupportTicket', id, {
      from: ticket.status,
      to: status,
    });
    if (status === 'RESOLVED') await this.resolvedEmail(ticket, String(Date.now()));
    return this.detail(id);
  }

  private resolvedEmail(ticket: SummaryRow, marker: string) {
    return this.email.send('ticketResolved', {
      to: ticket.customer.email,
      customerId: ticket.customer.id,
      ticketId: ticket.id,
      idempotencyKey: `ticket:${ticket.id}:resolved:${marker}`,
      data: {
        name: ticket.customer.name,
        number: ticket.number,
        subject: ticket.subject,
        url: `${this.env.PORTAL_URL}/support/${ticket.number}`,
      },
    });
  }

  async adminAttachment(id: string, messageId: string) {
    const message = await this.prisma.supportMessage.findFirst({
      where: { id: messageId, ticketId: id },
      include: { attachment: true },
    });
    if (!message?.attachment) throw new NotFoundException('Attachment not found');
    return {
      url: await this.storage.signedDownloadUrl(
        message.attachment.key,
        message.attachment.filename,
      ),
    };
  }
}
