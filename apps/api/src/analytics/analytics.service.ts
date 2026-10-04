import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import type {
  AnalyticsEventName,
  CollectInput,
  ConfirmedPurchase,
  Ecommerce,
  Touch,
} from '@shimanto/types';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { Prisma } from '../generated/prisma/client.js';
import { JobsService } from '../jobs/jobs.types.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { cleanTouch } from './attribution.js';
import { type DispatchEvent, type TrackingContext, eventIds } from './events.js';
import { ANALYTICS_PROVIDERS, type AnalyticsProvider } from './providers.js';
import { TrackingSettingsService } from './tracking-settings.service.js';

/** Deliveries are retried up to this many times (queue retries + admin "retry"). */
export const MAX_DELIVERY_ATTEMPTS = 5;

interface RecordInput {
  name: AnalyticsEventName;
  eventId: string;
  origin?: 'server' | 'browser';
  customerId?: string | null;
  orderId?: string | null;
  productId?: string | null;
  value?: number | null;
  currency?: string | null;
  touch?: Touch | null;
  pageUrl?: string | null;
  ecommerce?: Ecommerce | null;
  tracking?: TrackingContext | null;
  /** Admin-created orders etc.: stored internally, never sent to marketing providers. */
  internalOnly?: boolean;
  /** False = store only (browser events already went to GA4/Meta from the browser). */
  external?: boolean;
  metadata?: Record<string, unknown>;
}

type OrderForEvent = Prisma.OrderGetPayload<{ include: { items: true } }>;

/**
 * The central analytics layer. Business code calls `trackPurchase`, `trackRefund`… and nothing
 * else. Each event is stored once (deterministic event id) in the internal database, then one
 * delivery per enabled provider (GA4, Meta CAPI) is queued and sent in the background.
 *
 * Nothing here can fail a sale: every public method catches and logs its own errors.
 */
@Injectable()
export class AnalyticsService implements OnModuleInit {
  private readonly logger = new Logger('Analytics');

  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: TrackingSettingsService,
    private readonly jobs: JobsService,
    @Inject(ANALYTICS_PROVIDERS) private readonly providers: AnalyticsProvider[],
    @Inject(ENV) private readonly env: Env,
  ) {}

  onModuleInit() {
    this.jobs.register('analytics.deliver', ({ eventId }) => this.deliver(eventId));
  }

  /** Runs an analytics step without ever letting it break the caller. */
  private async safe<T>(label: string, fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn();
    } catch (error) {
      this.logger.warn(`${label} failed: ${(error as Error).message}`);
      return null;
    }
  }

  // ───────────── Recording ─────────────

  /** Stores an event once and queues its provider deliveries. Returns false for a duplicate. */
  private async record(input: RecordInput): Promise<boolean> {
    const touch = cleanTouch(input.touch);
    let event;
    try {
      event = await this.prisma.analyticsEvent.create({
        data: {
          name: input.name,
          eventId: input.eventId,
          origin: input.origin ?? 'server',
          customerId: input.customerId ?? null,
          orderId: input.orderId ?? null,
          productId: input.productId ?? null,
          value: input.value ?? input.ecommerce?.value ?? null,
          currency: input.currency ?? input.ecommerce?.currency ?? null,
          anonymousId: input.tracking?.anonymousId ?? null,
          sessionId: input.tracking?.sessionId ?? null,
          source: touch?.source ?? null,
          medium: touch?.medium ?? null,
          campaign: touch?.campaign ?? null,
          content: touch?.content ?? null,
          term: touch?.term ?? null,
          referrer: touch?.referrer ?? null,
          landingPage: touch?.landingPage ?? null,
          pageUrl: input.pageUrl?.slice(0, 2000) ?? null,
          metadata: {
            ...(input.metadata ?? {}),
            ...(input.ecommerce ? { ecommerce: input.ecommerce } : {}),
            ...(input.tracking ? { tracking: input.tracking } : {}),
            ...(input.internalOnly ? { internalOnly: true } : {}),
          } as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        return false;
      throw error;
    }

    if (input.external === false) return true;
    const settings = await this.settings.get();
    const dispatch = this.toDispatch(event, null);
    const rows = this.providers
      .filter((p) => p.configured(settings, this.env))
      .map((p) => {
        const reason = p.skipReason(dispatch, settings);
        return {
          eventId: event.id,
          provider: p.name,
          status: reason ? ('SKIPPED' as const) : ('PENDING' as const),
          lastError: reason,
        };
      });
    if (rows.length) await this.prisma.analyticsDelivery.createMany({ data: rows });
    if (rows.some((r) => r.status === 'PENDING')) {
      await this.jobs.enqueue('analytics.deliver', { eventId: event.id });
    } else {
      await this.minimise(event.id);
    }
    return true;
  }

  private toDispatch(
    event: Prisma.AnalyticsEventGetPayload<object>,
    email: string | null,
  ): DispatchEvent {
    const meta = (event.metadata ?? {}) as {
      ecommerce?: Ecommerce;
      tracking?: TrackingContext;
      internalOnly?: boolean;
    };
    return {
      name: event.name as AnalyticsEventName,
      eventId: event.eventId,
      occurredAt: event.createdAt,
      customerId: event.customerId,
      email,
      ecommerce: meta.ecommerce ?? null,
      tracking: { ...(meta.tracking ?? {}), pageUrl: meta.tracking?.pageUrl ?? event.pageUrl },
      attribution:
        event.source || event.medium || event.campaign
          ? { source: event.source, medium: event.medium, campaign: event.campaign }
          : null,
      internalOnly: Boolean(meta.internalOnly),
    };
  }

  // ───────────── Delivery (queue job) ─────────────

  /**
   * Sends pending deliveries of one event. A failure is recorded on its delivery and rethrown
   * so the queue retries it; other providers and the order are unaffected.
   */
  async deliver(eventId: string): Promise<void> {
    const event = await this.prisma.analyticsEvent.findUnique({
      where: { id: eventId },
      include: {
        deliveries: {
          where: { status: { in: ['PENDING', 'FAILED'] }, attempts: { lt: MAX_DELIVERY_ATTEMPTS } },
        },
        customer: { select: { email: true } },
      },
    });
    if (!event || event.deliveries.length === 0) return;
    const settings = await this.settings.get();
    const dispatch = this.toDispatch(event, event.customer?.email ?? null);
    let failed = 0;

    for (const delivery of event.deliveries) {
      const provider = this.providers.find((p) => p.name === delivery.provider);
      if (!provider || !provider.configured(settings, this.env)) {
        await this.prisma.analyticsDelivery.update({
          where: { id: delivery.id },
          data: { status: 'SKIPPED', lastError: 'Provider disabled' },
        });
        continue;
      }
      try {
        await provider.send(dispatch, settings, this.env);
        await this.prisma.analyticsDelivery.update({
          where: { id: delivery.id },
          data: { status: 'SENT', sentAt: new Date(), lastError: null, attempts: { increment: 1 } },
        });
      } catch (error) {
        failed++;
        const message = (error as Error).message.replace(
          /access_token=[^&\s]+/g,
          'access_token=***',
        );
        this.logger.warn(`${provider.name} delivery of ${event.eventId} failed: ${message}`);
        await this.prisma.analyticsDelivery.update({
          where: { id: delivery.id },
          data: { status: 'FAILED', lastError: message.slice(0, 500), attempts: { increment: 1 } },
        });
      }
    }
    if (failed) throw new Error(`${failed} analytics deliveries failed for ${event.eventId}`);
    await this.minimise(event.id);
  }

  /** Once nothing is left to send, drop the IP and user agent kept only for Meta matching. */
  private async minimise(id: string) {
    const pending = await this.prisma.analyticsDelivery.count({
      where: { eventId: id, status: { in: ['PENDING', 'FAILED'] } },
    });
    if (pending) return;
    const event = await this.prisma.analyticsEvent.findUnique({
      where: { id },
      select: { metadata: true },
    });
    const meta = event?.metadata as { tracking?: TrackingContext } | null;
    if (!meta?.tracking?.ip && !meta?.tracking?.userAgent) return;
    const { ip: _ip, userAgent: _ua, ...tracking } = meta.tracking;
    await this.prisma.analyticsEvent.update({
      where: { id },
      data: { metadata: { ...meta, tracking } as Prisma.InputJsonValue },
    });
  }

  /** Admin: send a failed delivery again. */
  async retryDelivery(deliveryId: string) {
    const delivery = await this.prisma.analyticsDelivery.update({
      where: { id: deliveryId },
      data: { status: 'PENDING', attempts: 0, lastError: null },
    });
    await this.jobs.enqueue('analytics.deliver', { eventId: delivery.eventId });
  }

  // ───────────── Commerce ─────────────

  private orderEcommerce(order: OrderForEvent): Ecommerce {
    return {
      transaction_id: String(order.number),
      value: order.total,
      currency: order.currency,
      ...(order.discount ? { discount: order.discount } : {}),
      ...(order.couponCode ? { coupon: order.couponCode } : {}),
      items: order.items.map((i) => ({
        item_id: i.productSlug,
        item_name: i.productName,
        price: i.unitPrice,
        quantity: i.quantity,
        ...(i.discount ? { discount: Math.round(i.discount / i.quantity) } : {}),
        item_category: i.productType.toLowerCase(),
      })),
    };
  }

  private orderTouch(order: OrderForEvent): Touch {
    return {
      source: order.lastSource ?? order.firstSource,
      medium: order.lastMedium ?? order.firstMedium,
      campaign: order.lastCampaign ?? order.firstCampaign,
      content: order.lastContent ?? order.firstContent,
      term: order.lastTerm ?? order.firstTerm,
      landingPage: order.landingPage,
      referrer: order.referrer,
    };
  }

  /** The confirmed purchase as browser pixels should echo it (same event id as the server). */
  async purchasePayload(orderId: string): Promise<ConfirmedPurchase | null> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return null;
    return { event_id: eventIds.purchase(order.id), ecommerce: this.orderEcommerce(order) };
  }

  /**
   * Purchase, from the server's order confirmation ($0 or paid, never a success page). Stored
   * internally and sent to GA4 (Measurement Protocol) and Meta CAPI with `purchase_<orderId>`.
   */
  trackPurchase(orderId: string) {
    return this.safe('trackPurchase', async () => {
      const order = await this.prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });
      return this.record({
        name: 'purchase',
        eventId: eventIds.purchase(order.id),
        customerId: order.customerId,
        orderId: order.id,
        ecommerce: this.orderEcommerce(order),
        touch: this.orderTouch(order),
        tracking: (order.tracking as TrackingContext | null) ?? null,
        internalOnly: order.source === 'ADMIN',
        metadata: { free: order.total === 0, source: order.source, provider: order.provider },
      });
    });
  }

  /** Refund (once per order), after the refund is recorded. */
  trackRefund(orderId: string) {
    return this.safe('trackRefund', async () => {
      const order = await this.prisma.order.findUniqueOrThrow({
        where: { id: orderId },
        include: { items: true },
      });
      return this.record({
        name: 'refund',
        eventId: eventIds.refund(order.id),
        customerId: order.customerId,
        orderId: order.id,
        ecommerce: this.orderEcommerce(order),
        touch: this.orderTouch(order),
        tracking: (order.tracking as TrackingContext | null) ?? null,
        internalOnly: order.source === 'ADMIN',
      });
    });
  }

  // ───────────── Accounts, delivery, support ─────────────

  trackSignup(
    customerId: string,
    ctx: { tracking?: TrackingContext | null; touch?: Touch | null; method: string },
  ) {
    return this.safe('trackSignup', async () => {
      if (ctx.tracking?.anonymousId) await this.linkAnonymous(customerId, ctx.tracking.anonymousId);
      return this.record({
        name: 'sign_up',
        eventId: eventIds.signup(customerId),
        customerId,
        touch: ctx.touch,
        tracking: ctx.tracking,
        metadata: { method: ctx.method },
      });
    });
  }

  trackLogin(customerId: string, anonymousId?: string | null) {
    return this.safe('trackLogin', async () => {
      if (anonymousId) await this.linkAnonymous(customerId, anonymousId);
      return this.record({
        name: 'login',
        eventId: `login_${randomUUID()}`,
        customerId,
        external: false,
      });
    });
  }

  trackEmailVerified(customerId: string) {
    return this.safe('trackEmailVerified', () =>
      this.record({
        name: 'email_verified',
        eventId: eventIds.emailVerified(customerId),
        customerId,
        external: false,
      }),
    );
  }

  trackDownload(input: { customerId: string; orderId: string; productId: string; fileId: string }) {
    return this.safe('trackDownload', () =>
      this.record({
        name: 'download',
        eventId: `download_${randomUUID()}`,
        customerId: input.customerId,
        orderId: input.orderId,
        productId: input.productId,
        external: false,
        metadata: { fileId: input.fileId },
      }),
    );
  }

  trackGithubAccess(input: {
    deliveryId: string;
    customerId: string;
    orderId: string;
    productId: string;
  }) {
    return this.safe('trackGithubAccess', () =>
      this.record({
        name: 'github_access_granted',
        eventId: eventIds.githubAccess(input.deliveryId),
        customerId: input.customerId,
        orderId: input.orderId,
        productId: input.productId,
        external: false,
      }),
    );
  }

  trackSupportTicket(input: {
    ticketId: string;
    customerId: string;
    productId?: string | null;
    orderId?: string | null;
  }) {
    return this.safe('trackSupportTicket', () =>
      this.record({
        name: 'support_ticket_created',
        eventId: eventIds.supportTicket(input.ticketId),
        customerId: input.customerId,
        productId: input.productId ?? null,
        orderId: input.orderId ?? null,
        external: false,
      }),
    );
  }

  // ───────────── Browser collector ─────────────

  /**
   * First-party browser events (page views, product views, add to cart, checkout starts) for
   * internal traffic and funnel reports. Browser tags send these to GA4/Meta themselves.
   */
  collect(input: CollectInput, customerId: string | null) {
    return this.safe('collect', () =>
      this.record({
        name: input.event_name,
        eventId: input.event_id,
        origin: 'browser',
        customerId,
        pageUrl: input.page_url,
        touch: input.attribution ?? null,
        ecommerce: input.ecommerce ?? null,
        tracking: { anonymousId: input.anonymous_id, sessionId: input.session_id },
        external: false,
      }),
    );
  }

  /** A visitor became a known customer: their anonymous history now belongs to them. */
  async linkAnonymous(customerId: string, anonymousId: string) {
    await this.prisma.analyticsEvent.updateMany({
      where: { anonymousId, customerId: null },
      data: { customerId },
    });
  }
}
