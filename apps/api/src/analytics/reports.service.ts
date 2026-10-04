import { Injectable } from '@nestjs/common';
import type {
  AnalyticsEventRow,
  AttributionModel,
  Page,
  ProductReportRow,
  SalesReport,
  SourceReportRow,
} from '@shimanto/types';
import { cursorArgs, paginate } from '../common/cursor.js';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export interface Range {
  from: Date;
  to: Date;
}

type Money = Record<string, number>;

const add = (m: Money, currency: string, amount: number) => {
  m[currency] = (m[currency] ?? 0) + amount;
};

/** Orders the customer actually got (paid or $0), refunded ones included for gross figures. */
const CONFIRMED: Prisma.OrderWhereInput = {
  paymentStatus: { in: ['PAID', 'NOT_REQUIRED', 'REFUNDED'] },
};

/**
 * Admin reports. Money always comes from Orders + Payments (the source of truth); traffic and
 * funnels come from the internal events. GA4/Meta numbers are never used here.
 */
@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async sales(range: Range): Promise<SalesReport> {
    const inRange = { gte: range.from, lte: range.to };
    const [orders, refunded, newCustomers, traffic] = await Promise.all([
      this.prisma.order.findMany({
        where: { ...CONFIRMED, createdAt: inRange },
        select: { total: true, currency: true, paymentStatus: true, createdAt: true },
      }),
      this.prisma.order.findMany({
        where: { refundedAt: inRange, paymentStatus: 'REFUNDED' },
        select: { total: true, currency: true },
      }),
      this.prisma.customer.count({ where: { createdAt: inRange } }),
      this.prisma.$queryRaw<Array<{ visitors: bigint; sessions: bigint }>>`
        SELECT COUNT(DISTINCT "anonymousId") AS visitors, COUNT(DISTINCT "sessionId") AS sessions
        FROM "AnalyticsEvent"
        WHERE name = 'page_view' AND "createdAt" BETWEEN ${range.from} AND ${range.to}`,
    ]);

    const revenue: Money = {};
    const refunds: Money = {};
    const paidCount: Money = {};
    const daily = new Map<string, { orders: number; revenue: Money }>();
    let paidOrders = 0;
    let freeOrders = 0;
    for (const o of orders) {
      const day = o.createdAt.toISOString().slice(0, 10);
      const bucket = daily.get(day) ?? { orders: 0, revenue: {} };
      bucket.orders++;
      if (o.paymentStatus === 'NOT_REQUIRED') {
        freeOrders++;
      } else {
        paidOrders++;
        add(revenue, o.currency, o.total);
        add(paidCount, o.currency, 1);
        add(bucket.revenue, o.currency, o.total);
      }
      daily.set(day, bucket);
    }
    for (const r of refunded) add(refunds, r.currency, r.total);

    const netRevenue: Money = {};
    for (const c of new Set([...Object.keys(revenue), ...Object.keys(refunds)])) {
      netRevenue[c] = (revenue[c] ?? 0) - (refunds[c] ?? 0);
    }
    const averageOrderValue: Money = {};
    for (const [c, total] of Object.entries(revenue)) {
      averageOrderValue[c] = Math.round(total / (paidCount[c] ?? 1));
    }
    const sessions = Number(traffic[0]?.sessions ?? 0);

    // Every day in the range, so charts have no gaps.
    const days: SalesReport['daily'] = [];
    for (
      let d = new Date(range.from);
      d <= range.to && days.length < 400;
      d.setUTCDate(d.getUTCDate() + 1)
    ) {
      const key = d.toISOString().slice(0, 10);
      const bucket = daily.get(key);
      days.push({ date: key, orders: bucket?.orders ?? 0, revenue: bucket?.revenue ?? {} });
    }

    return {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
      revenue,
      refunds,
      netRevenue,
      averageOrderValue,
      orders: orders.length,
      paidOrders,
      freeOrders,
      refundedOrders: refunded.length,
      newCustomers,
      visitors: Number(traffic[0]?.visitors ?? 0),
      sessions,
      conversionRate: sessions ? Math.min(1, orders.length / sessions) : 0,
      daily: days,
    };
  }

  /** Funnel per product: events (by slug) + confirmed order items. */
  async products(range: Range): Promise<ProductReportRow[]> {
    const [funnel, items, products] = await Promise.all([
      this.prisma.$queryRaw<Array<{ slug: string; name: string; n: bigint }>>`
        SELECT item->>'item_id' AS slug, e.name AS name, COUNT(*) AS n
        FROM "AnalyticsEvent" e, jsonb_array_elements(e.metadata->'ecommerce'->'items') item
        WHERE e.name IN ('view_item', 'add_to_cart', 'begin_checkout')
          AND e."createdAt" BETWEEN ${range.from} AND ${range.to}
        GROUP BY 1, 2`,
      this.prisma.orderItem.findMany({
        where: { order: { ...CONFIRMED, createdAt: { gte: range.from, lte: range.to } } },
        select: {
          productId: true,
          productSlug: true,
          productName: true,
          total: true,
          order: { select: { currency: true } },
        },
      }),
      this.prisma.product.findMany({ select: { id: true, slug: true, name: true } }),
    ]);

    const rows = new Map<string, ProductReportRow>();
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const row = (slug: string, fallback?: { id: string; name: string }) => {
      const product = bySlug.get(slug);
      const key = product?.id ?? fallback?.id ?? slug;
      let r = rows.get(key);
      if (!r) {
        r = {
          productId: key,
          name: product?.name ?? fallback?.name ?? slug,
          views: 0,
          addToCart: 0,
          checkouts: 0,
          orders: 0,
          freeOrders: 0,
          revenue: {},
          conversionRate: 0,
        };
        rows.set(key, r);
      }
      return r;
    };
    for (const f of funnel) {
      if (!f.slug) continue;
      const r = row(f.slug);
      const n = Number(f.n);
      if (f.name === 'view_item') r.views += n;
      else if (f.name === 'add_to_cart') r.addToCart += n;
      else r.checkouts += n;
    }
    for (const i of items) {
      const r = row(i.productSlug, { id: i.productId, name: i.productName });
      r.orders++;
      if (i.total === 0) r.freeOrders++;
      else add(r.revenue, i.order.currency, i.total);
    }
    for (const r of rows.values()) r.conversionRate = r.views ? Math.min(1, r.orders / r.views) : 0;
    return [...rows.values()].sort((a, b) => b.orders - a.orders || b.views - a.views);
  }

  /** Orders and revenue by source / medium / campaign (first- or last-touch), plus visitors. */
  async sources(range: Range, model: AttributionModel): Promise<SourceReportRow[]> {
    const [orders, visitors] = await Promise.all([
      this.prisma.order.findMany({
        where: { ...CONFIRMED, createdAt: { gte: range.from, lte: range.to } },
        select: {
          total: true,
          currency: true,
          paymentStatus: true,
          firstSource: true,
          firstMedium: true,
          firstCampaign: true,
          lastSource: true,
          lastMedium: true,
          lastCampaign: true,
        },
      }),
      this.prisma.$queryRaw<
        Array<{ source: string | null; medium: string | null; campaign: string | null; n: bigint }>
      >`
        SELECT source, medium, campaign, COUNT(DISTINCT "anonymousId") AS n
        FROM "AnalyticsEvent"
        WHERE name = 'page_view' AND "createdAt" BETWEEN ${range.from} AND ${range.to}
        GROUP BY 1, 2, 3`,
    ]);
    const rows = new Map<string, SourceReportRow>();
    const row = (source?: string | null, medium?: string | null, campaign?: string | null) => {
      const s = source || '(direct)';
      const m = medium || '(none)';
      const c = campaign || '(not set)';
      const key = `${s}|${m}|${c}`;
      let r = rows.get(key);
      if (!r) {
        r = { source: s, medium: m, campaign: c, visitors: 0, orders: 0, revenue: {} };
        rows.set(key, r);
      }
      return r;
    };
    for (const v of visitors) row(v.source, v.medium, v.campaign).visitors += Number(v.n);
    for (const o of orders) {
      const r =
        model === 'first'
          ? row(o.firstSource, o.firstMedium, o.firstCampaign)
          : row(
              o.lastSource ?? o.firstSource,
              o.lastMedium ?? o.firstMedium,
              o.lastCampaign ?? o.firstCampaign,
            );
      r.orders++;
      if (o.paymentStatus !== 'NOT_REQUIRED') add(r.revenue, o.currency, o.total);
    }
    return [...rows.values()].sort((a, b) => b.orders - a.orders || b.visitors - a.visitors);
  }

  /** Recent events with their provider deliveries (debugging). */
  async events(query: {
    name?: string;
    status?: 'PENDING' | 'SENT' | 'FAILED' | 'SKIPPED';
    orderId?: string;
    origin?: 'server' | 'browser';
    limit: number;
    cursor?: string;
  }): Promise<Page<AnalyticsEventRow>> {
    const rows = await this.prisma.analyticsEvent.findMany({
      where: {
        name: query.name,
        orderId: query.orderId,
        origin: query.origin,
        ...(query.status ? { deliveries: { some: { status: query.status } } } : {}),
      },
      include: {
        customer: { select: { id: true, email: true, name: true } },
        order: { select: { id: true, number: true } },
        deliveries: { orderBy: { provider: 'asc' } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      ...cursorArgs(query.limit, query.cursor),
    });
    const page = paginate(rows, query.limit);
    return {
      nextCursor: page.nextCursor,
      items: page.items.map((e) => ({
        id: e.id,
        name: e.name,
        eventId: e.eventId,
        source: e.origin === 'browser' ? 'browser' : 'server',
        customer: e.customer,
        order: e.order,
        productId: e.productId,
        value: e.value,
        currency: e.currency,
        attribution: { source: e.source, medium: e.medium, campaign: e.campaign },
        deliveries: e.deliveries.map((d) => ({
          provider: d.provider,
          status: d.status,
          attempts: d.attempts,
          lastError: d.lastError,
          sentAt: d.sentAt?.toISOString() ?? null,
          id: d.id,
        })),
        createdAt: e.createdAt.toISOString(),
      })),
    };
  }
}
