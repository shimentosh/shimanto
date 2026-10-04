import {
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  UnprocessableEntityException,
} from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service.js';
import { type Actor, AuditService } from '../audit/audit.service.js';
import { unprocessable } from '../common/validate.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import type {
  Customer,
  Delivery,
  DeliveryStatus,
  DeliveryType,
  Order,
} from '../generated/prisma/client.js';
import { GitHubClient } from '../github/github.client.js';
import { JobsService } from '../jobs/jobs.types.js';
import { EmailService } from '../mail/email.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ENTITLED_ORDER, RETRYABLE, fulfillmentFor, orderStatusFor } from './status.js';

const SYSTEM: Actor = { type: 'system' };
/** Portal views re-check pending GitHub invitations at most this often. */
const SYNC_INTERVAL_MS = 2 * 60_000;

type DeliveryWithContext = Delivery & {
  order: Order;
  customer: Customer;
  product: { name: string; githubOwner: string | null; githubRepo: string | null };
};

const withContext = {
  order: true,
  customer: true,
  product: { select: { name: true, githubOwner: true, githubRepo: true } },
} as const;

/**
 * Turns an entitled order into deliveries, one per order item and delivery method:
 * private R2 files (READY at once) and GitHub repository access (invitation via the App).
 * Every step is idempotent: deliveries are unique per item + type, work on a delivery is claimed
 * with an optimistic lock, and emails carry idempotency keys, so retries never duplicate.
 */
@Injectable()
export class FulfillmentService implements OnModuleInit {
  private readonly logger = new Logger('Fulfillment');

  constructor(
    private readonly prisma: PrismaService,
    private readonly github: GitHubClient,
    private readonly email: EmailService,
    private readonly jobs: JobsService,
    private readonly audit: AuditService,
    private readonly analytics: AnalyticsService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit() {
    this.jobs.register('fulfillment.run', ({ orderId }) => this.run(orderId));
  }

  private portal(path: string) {
    return `${this.env.PORTAL_URL}${path}`;
  }

  /** Creates missing deliveries and processes every pending one. Safe to run any number of times. */
  async run(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { product: true } } },
    });
    if (!order || !ENTITLED_ORDER.includes(order.status)) return;

    for (const item of order.items) {
      const types: DeliveryType[] = [
        ...(item.product.deliverFiles ? (['R2'] as const) : []),
        ...(item.product.deliverGithub ? (['GITHUB'] as const) : []),
      ];
      for (const type of types) {
        await this.prisma.delivery.upsert({
          where: { orderItemId_type: { orderItemId: item.id, type } },
          create: {
            orderId,
            orderItemId: item.id,
            customerId: order.customerId,
            productId: item.productId,
            type,
            // Repository snapshot, from the product (admin-set). Never from customer input.
            ...(type === 'GITHUB'
              ? { githubOwner: item.product.githubOwner, githubRepo: item.product.githubRepo }
              : {}),
          },
          update: {},
        });
      }
    }

    const pending = await this.prisma.delivery.findMany({
      where: { orderId, status: { in: ['PENDING', 'ACTION_REQUIRED'] } },
      include: withContext,
      orderBy: { createdAt: 'asc' },
    });
    const readyFiles: string[] = [];
    let fileCount = 0;
    for (const delivery of pending) {
      if (delivery.type === 'R2') {
        const count = await this.deliverFiles(delivery);
        if (count > 0) {
          readyFiles.push(delivery.product.name);
          fileCount += count;
        }
      } else {
        await this.deliverGithub(delivery);
      }
    }

    if (readyFiles.length) {
      const customer = pending[0]!.customer;
      await this.email.send('downloadAvailable', {
        to: customer.email,
        customerId: order.customerId,
        orderId,
        idempotencyKey: `order:${orderId}:downloads`,
        data: {
          name: customer.name,
          productName: readyFiles.join(', '),
          orderNumber: order.number,
          fileCount,
          url: this.portal('/downloads'),
        },
      });
    }
    await this.recompute(orderId);
  }

  /** Claims a delivery for processing. False when someone else changed it first. */
  private async claim(delivery: Delivery): Promise<boolean> {
    const { count } = await this.prisma.delivery.updateMany({
      where: { id: delivery.id, attempts: delivery.attempts },
      data: { attempts: { increment: 1 } },
    });
    return count === 1;
  }

  // ───────────── R2 files ─────────────

  private async deliverFiles(delivery: DeliveryWithContext): Promise<number> {
    if (!(await this.claim(delivery))) return 0;
    const files = await this.prisma.productFile.count({ where: { productId: delivery.productId } });
    if (files === 0) {
      await this.prisma.delivery.update({
        where: { id: delivery.id },
        data: { status: 'FAILED', lastError: 'No files are attached to this product' },
      });
      return 0;
    }
    await this.prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: 'READY', lastError: null, deliveredAt: new Date(), revokedAt: null },
    });
    return files;
  }

  // ───────────── GitHub repository access ─────────────

  private async setGithub(id: string, status: DeliveryStatus, data: Partial<Delivery> = {}) {
    return this.prisma.delivery.update({
      where: { id },
      data: { status, lastSyncedAt: new Date(), ...data },
    });
  }

  private async deliverGithub(delivery: DeliveryWithContext): Promise<void> {
    if (!(await this.claim(delivery))) return;
    const { customer } = delivery;
    const owner = delivery.githubOwner ?? delivery.product.githubOwner;
    const repo = delivery.githubRepo ?? delivery.product.githubRepo;

    if (!owner || !repo) {
      await this.setGithub(delivery.id, 'FAILED', {
        lastError: 'The product has no GitHub repository configured',
      });
      return;
    }
    if (!this.github.mode) {
      await this.setGithub(delivery.id, 'FAILED', {
        githubOwner: owner,
        githubRepo: repo,
        lastError: 'GitHub delivery is not configured on the server (no App or token)',
      });
      return;
    }
    if (!customer.githubId || !customer.githubLogin) {
      await this.setGithub(delivery.id, 'ACTION_REQUIRED', {
        githubOwner: owner,
        githubRepo: repo,
        lastError: null,
      });
      await this.email.send('githubAccessRequired', {
        to: customer.email,
        customerId: customer.id,
        orderId: delivery.orderId,
        idempotencyKey: `order:${delivery.orderId}:github-required`,
        data: {
          name: customer.name,
          productName: delivery.product.name,
          connectUrl: this.portal('/account/github'),
        },
      });
      return;
    }

    // Already invited / granted for the same repository through another order: reuse it.
    const existing = await this.prisma.delivery.findFirst({
      where: {
        id: { not: delivery.id },
        customerId: customer.id,
        type: 'GITHUB',
        githubOwner: { equals: owner, mode: 'insensitive' },
        githubRepo: { equals: repo, mode: 'insensitive' },
        githubUserId: customer.githubId,
        status: { in: ['INVITATION_SENT', 'ACCEPTED'] },
      },
      orderBy: { updatedAt: 'desc' },
    });
    const identity = {
      githubOwner: owner,
      githubRepo: repo,
      githubUserId: customer.githubId,
      githubLogin: customer.githubLogin,
    };
    if (existing) {
      await this.setGithub(delivery.id, existing.status, {
        ...identity,
        githubInvitationId: existing.githubInvitationId,
        lastError: null,
        deliveredAt: new Date(),
        revokedAt: null,
      });
      if (existing.status === 'ACCEPTED') await this.accessReadyEmail(delivery, owner, repo);
      return;
    }

    try {
      const result = await this.github.invite(owner, repo, customer.githubLogin);
      if (result.kind === 'collaborator') {
        await this.setGithub(delivery.id, 'ACCEPTED', {
          ...identity,
          lastError: null,
          deliveredAt: new Date(),
          revokedAt: null,
        });
        await this.accessReadyEmail(delivery, owner, repo);
      } else {
        await this.setGithub(delivery.id, 'INVITATION_SENT', {
          ...identity,
          githubInvitationId: result.invitationId,
          lastError: null,
          deliveredAt: new Date(),
          revokedAt: null,
        });
        await this.email.send('githubInvitationSent', {
          to: customer.email,
          customerId: customer.id,
          orderId: delivery.orderId,
          idempotencyKey: `delivery:${delivery.id}:invited:${result.invitationId}`,
          data: {
            name: customer.name,
            productName: delivery.product.name,
            login: customer.githubLogin,
            invitationUrl: `https://github.com/${owner}/${repo}/invitations`,
          },
        });
      }
    } catch (error) {
      const message = (error as Error).message.slice(0, 500);
      this.logger.warn(`GitHub delivery ${delivery.id} failed: ${message}`);
      await this.setGithub(delivery.id, 'FAILED', { ...identity, lastError: message });
      await this.email.send('githubInvitationFailed', {
        to: customer.email,
        customerId: customer.id,
        orderId: delivery.orderId,
        idempotencyKey: `delivery:${delivery.id}:failed`,
        data: {
          name: customer.name,
          productName: delivery.product.name,
          portalUrl: this.portal(`/orders/${delivery.order.number}`),
        },
      });
    }
  }

  private async accessReadyEmail(delivery: DeliveryWithContext, owner: string, repo: string) {
    await this.analytics.trackGithubAccess({
      deliveryId: delivery.id,
      customerId: delivery.customerId,
      orderId: delivery.orderId,
      productId: delivery.productId,
    });
    return this.email.send('githubAccessReady', {
      to: delivery.customer.email,
      customerId: delivery.customerId,
      orderId: delivery.orderId,
      idempotencyKey: `delivery:${delivery.id}:ready`,
      data: {
        name: delivery.customer.name,
        productName: delivery.product.name,
        repoUrl: `https://github.com/${owner}/${repo}`,
      },
    });
  }

  // ───────────── Status sync, retry, revoke ─────────────

  private async load(deliveryId: string): Promise<DeliveryWithContext> {
    const delivery = await this.prisma.delivery.findUnique({
      where: { id: deliveryId },
      include: withContext,
    });
    if (!delivery) unprocessable('Delivery not found');
    return delivery;
  }

  /** Re-attempts a delivery (FAILED, EXPIRED, waiting for GitHub, or revoked by an admin). */
  async retry(deliveryId: string, actor: Actor, opts: { allowRevoked?: boolean } = {}) {
    const delivery = await this.load(deliveryId);
    if (!ENTITLED_ORDER.includes(delivery.order.status)) {
      unprocessable('This order is not active, so it can’t be delivered');
    }
    const allowed: DeliveryStatus[] = opts.allowRevoked ? [...RETRYABLE, 'REVOKED'] : RETRYABLE;
    if (!allowed.includes(delivery.status)) {
      unprocessable(
        `A delivery that is ${delivery.status.toLowerCase().replace('_', ' ')} can’t be retried`,
      );
    }
    // A fresh attempt: forget the previous invitation (it expired or was revoked).
    const reset = await this.prisma.delivery.update({
      where: { id: deliveryId },
      data: { status: 'PENDING', githubInvitationId: null, lastError: null },
      include: withContext,
    });
    if (reset.type === 'R2') await this.deliverFiles(reset);
    else await this.deliverGithub(reset);
    await this.recompute(delivery.orderId);
    await this.audit.record(actor, 'delivery.retry', 'Delivery', deliveryId, {
      orderId: delivery.orderId,
      from: delivery.status,
    });
    return this.prisma.delivery.findUniqueOrThrow({ where: { id: deliveryId } });
  }

  /** Checks GitHub for the invitation / access state (manual sync; webhooks do it automatically). */
  async refresh(deliveryId: string) {
    const delivery = await this.load(deliveryId);
    if (delivery.type !== 'GITHUB') return delivery;
    const owner = delivery.githubOwner;
    const repo = delivery.githubRepo;

    if (delivery.status === 'ACTION_REQUIRED' && delivery.customer.githubId) {
      await this.deliverGithub(delivery);
    } else if (owner && repo && delivery.githubLogin && this.github.mode) {
      try {
        if (delivery.status === 'INVITATION_SENT') {
          if (await this.github.hasAccess(owner, repo, delivery.githubLogin)) {
            await this.setGithub(delivery.id, 'ACCEPTED', { lastError: null });
            await this.accessReadyEmail(delivery, owner, repo);
          } else {
            const invitation = delivery.githubInvitationId
              ? await this.github.invitation(owner, repo, delivery.githubInvitationId)
              : null;
            if (!invitation || invitation.expired) {
              await this.setGithub(delivery.id, 'EXPIRED', {
                lastError: invitation
                  ? 'The invitation expired'
                  : 'The invitation was declined or cancelled',
              });
            } else {
              await this.setGithub(delivery.id, 'INVITATION_SENT');
            }
          }
        } else if (delivery.status === 'ACCEPTED') {
          if (!(await this.github.hasAccess(owner, repo, delivery.githubLogin))) {
            await this.setGithub(delivery.id, 'REVOKED', {
              lastError: 'Access was removed on GitHub',
              revokedAt: new Date(),
            });
          } else {
            await this.setGithub(delivery.id, 'ACCEPTED');
          }
        }
      } catch (error) {
        await this.prisma.delivery.update({
          where: { id: delivery.id },
          data: { lastError: (error as Error).message.slice(0, 500), lastSyncedAt: new Date() },
        });
      }
    }
    await this.recompute(delivery.orderId);
    return this.prisma.delivery.findUniqueOrThrow({ where: { id: deliveryId } });
  }

  /** Portal views call this: re-checks this customer's pending invitations, at most every 2 min. */
  async syncPending(customerId: string): Promise<void> {
    if (!this.github.mode) return;
    const stale = await this.prisma.delivery.findMany({
      where: {
        customerId,
        type: 'GITHUB',
        status: 'INVITATION_SENT',
        OR: [
          { lastSyncedAt: null },
          { lastSyncedAt: { lt: new Date(Date.now() - SYNC_INTERVAL_MS) } },
        ],
      },
      select: { id: true },
      take: 10,
    });
    for (const { id } of stale) await this.refresh(id);
  }

  /** After a customer connects GitHub: deliveries that were waiting on it continue automatically. */
  async continueForCustomer(customerId: string): Promise<void> {
    const waiting = await this.prisma.delivery.findMany({
      where: {
        customerId,
        type: 'GITHUB',
        status: { in: ['ACTION_REQUIRED', 'FAILED', 'EXPIRED'] },
        order: { status: { in: ENTITLED_ORDER } },
      },
      select: { id: true },
    });
    for (const { id } of waiting) {
      try {
        await this.retry(id, SYSTEM);
      } catch (error) {
        this.logger.warn(`Could not continue delivery ${id}: ${(error as Error).message}`);
      }
    }
  }

  /**
   * Removes access: R2 downloads stop at once; GitHub invitations are cancelled and collaborators
   * removed, unless another active order still grants the same repository.
   */
  async revoke(deliveryId: string, actor: Actor, reason: string): Promise<void> {
    const delivery = await this.load(deliveryId);
    if (delivery.status === 'REVOKED') return;
    const owner = delivery.githubOwner;
    const repo = delivery.githubRepo;

    if (delivery.type === 'GITHUB' && owner && repo && this.github.mode) {
      const stillGranted = await this.prisma.delivery.count({
        where: {
          id: { not: delivery.id },
          customerId: delivery.customerId,
          type: 'GITHUB',
          githubOwner: { equals: owner, mode: 'insensitive' },
          githubRepo: { equals: repo, mode: 'insensitive' },
          status: { in: ['INVITATION_SENT', 'ACCEPTED'] },
          order: { status: { in: ENTITLED_ORDER } },
        },
      });
      if (!stillGranted) {
        try {
          if (delivery.status === 'INVITATION_SENT' && delivery.githubInvitationId) {
            await this.github.cancelInvitation(owner, repo, delivery.githubInvitationId);
          } else if (delivery.status === 'ACCEPTED' && delivery.githubLogin) {
            await this.github.removeCollaborator(owner, repo, delivery.githubLogin);
          }
        } catch (error) {
          const message = `Revoke failed: ${(error as Error).message}`.slice(0, 500);
          await this.prisma.delivery.update({
            where: { id: delivery.id },
            data: { lastError: message },
          });
          throw new UnprocessableEntityException(message);
        }
      }
    }
    await this.prisma.delivery.update({
      where: { id: delivery.id },
      data: { status: 'REVOKED', revokedAt: new Date(), lastError: null },
    });
    await this.audit.record(actor, 'delivery.revoke', 'Delivery', deliveryId, {
      orderId: delivery.orderId,
      reason,
    });
    await this.recompute(delivery.orderId);
  }

  /** Revokes every delivery of an order (cancel / refund). Returns the ones that failed. */
  async revokeOrder(orderId: string, actor: Actor, reason: string): Promise<string[]> {
    const deliveries = await this.prisma.delivery.findMany({
      where: { orderId, status: { not: 'REVOKED' } },
      select: { id: true },
    });
    const failed: string[] = [];
    for (const { id } of deliveries) {
      try {
        await this.revoke(id, actor, reason);
      } catch {
        failed.push(id);
      }
    }
    return failed;
  }

  /** GitHub `member` webhook: a collaborator was added (invitation accepted) or removed. */
  async onMemberEvent(action: string, owner: string, repo: string, userId: string): Promise<void> {
    const where = {
      type: 'GITHUB' as const,
      githubOwner: { equals: owner, mode: 'insensitive' as const },
      githubRepo: { equals: repo, mode: 'insensitive' as const },
      githubUserId: userId,
    };
    if (action === 'added') {
      const accepted = await this.prisma.delivery.findMany({
        where: { ...where, status: { in: ['INVITATION_SENT', 'EXPIRED'] } },
        include: withContext,
      });
      for (const delivery of accepted) {
        await this.setGithub(delivery.id, 'ACCEPTED', { lastError: null });
        await this.accessReadyEmail(delivery, owner, repo);
        await this.recompute(delivery.orderId);
      }
    } else if (action === 'removed') {
      const removed = await this.prisma.delivery.findMany({
        where: { ...where, status: 'ACCEPTED' },
        select: { id: true, orderId: true },
      });
      for (const delivery of removed) {
        await this.setGithub(delivery.id, 'REVOKED', {
          lastError: 'Access was removed on GitHub',
          revokedAt: new Date(),
        });
        await this.recompute(delivery.orderId);
      }
    }
  }

  /** Order status + fulfillment status from its deliveries. Only for entitled orders. */
  async recompute(orderId: string): Promise<void> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { deliveries: { select: { status: true } } },
    });
    if (!order || !ENTITLED_ORDER.includes(order.status)) return;
    const fulfillmentStatus = fulfillmentFor(order.deliveries.map((d) => d.status));
    const status = orderStatusFor(fulfillmentStatus);
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        fulfillmentStatus,
        status,
        completedAt: status === 'COMPLETED' ? (order.completedAt ?? new Date()) : null,
      },
    });
  }
}
