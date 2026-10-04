import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  CustomerDashboard,
  DownloadItem,
  OrderDetail,
  OrderSummary,
  OwnedProduct,
} from '@shimanto/types';
import { AnalyticsService } from '../analytics/analytics.service.js';
import type { Actor } from '../audit/audit.service.js';
import { FulfillmentService } from '../commerce/fulfillment.service.js';
import { ENTITLED_ORDER } from '../commerce/status.js';
import {
  deliveryInclude,
  orderDetailInclude,
  orderSummaryInclude,
  toDeliveryView,
  toOrderDetail,
  toOrderSummary,
} from '../commerce/views.js';
import { unprocessable } from '../common/validate.js';
import { StorageService } from '../media/storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/**
 * Everything the customer portal shows. Every query is scoped by the signed-in customer's id
 * (from the session, never from the request), so one customer can't read another's orders.
 */
@Injectable()
export class AccountService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fulfillment: FulfillmentService,
    private readonly storage: StorageService,
    private readonly analytics: AnalyticsService,
  ) {}

  private async githubConnected(customerId: string) {
    const c = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
      select: { githubId: true },
    });
    return Boolean(c.githubId);
  }

  async orders(customerId: string, take = 100): Promise<OrderSummary[]> {
    const rows = await this.prisma.order.findMany({
      // Unpaid checkouts that were abandoned are noise; everything else is shown.
      where: { customerId, NOT: { status: 'CANCELLED', paidAt: null, source: 'CHECKOUT' } },
      include: orderSummaryInclude,
      orderBy: { createdAt: 'desc' },
      take,
    });
    return rows.map(toOrderSummary);
  }

  async order(customerId: string, number: number): Promise<OrderDetail> {
    await this.fulfillment.syncPending(customerId);
    const order = await this.prisma.order.findFirst({
      where: { number, customerId },
      include: orderDetailInclude,
    });
    if (!order) throw new NotFoundException('Order not found');
    return toOrderDetail(order, await this.githubConnected(customerId));
  }

  async products(customerId: string): Promise<OwnedProduct[]> {
    const connected = await this.githubConnected(customerId);
    const items = await this.prisma.orderItem.findMany({
      where: { order: { customerId, status: { in: ENTITLED_ORDER } } },
      include: {
        order: { select: { number: true, createdAt: true, paidAt: true } },
        product: { select: { name: true, slug: true, type: true, version: true } },
        deliveries: { include: deliveryInclude, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const seen = new Set<string>();
    const owned: OwnedProduct[] = [];
    for (const item of items) {
      if (seen.has(item.productId)) continue;
      seen.add(item.productId);
      owned.push({
        productId: item.productId,
        name: item.product.name,
        slug: item.product.slug,
        type: item.product.type,
        version: item.product.version,
        purchasedAt: (item.order.paidAt ?? item.order.createdAt).toISOString(),
        orderNumber: item.order.number,
        deliveries: item.deliveries.map((d) =>
          toDeliveryView(d, { orderActive: true, githubConnected: connected }),
        ),
      });
    }
    return owned;
  }

  async downloads(customerId: string): Promise<DownloadItem[]> {
    const products = await this.products(customerId);
    return products.flatMap((p) =>
      p.deliveries.flatMap((d) =>
        d.files.map((f) => ({
          ...f,
          deliveryId: d.id,
          productId: p.productId,
          productName: p.name,
          orderNumber: p.orderNumber,
        })),
      ),
    );
  }

  async dashboard(customerId: string): Promise<CustomerDashboard> {
    await this.fulfillment.syncPending(customerId);
    const [recentOrders, products, actionRequired, tickets] = await Promise.all([
      this.orders(customerId, 5),
      this.products(customerId),
      this.prisma.delivery.count({
        where: {
          customerId,
          type: 'GITHUB',
          status: { in: ['ACTION_REQUIRED', 'FAILED', 'EXPIRED'] },
          order: { status: { in: ENTITLED_ORDER } },
        },
      }),
      this.prisma.supportTicket.findMany({
        where: { customerId, status: { in: ['OPEN', 'PENDING'] } },
        orderBy: { lastMessageAt: 'desc' },
        take: 5,
      }),
    ]);
    return {
      recentOrders,
      products,
      downloadCount: products.reduce(
        (sum, p) => sum + p.deliveries.reduce((n, d) => n + d.files.length, 0),
        0,
      ),
      actionRequired,
      openTickets: tickets.map((t) => ({
        number: t.number,
        subject: t.subject,
        status: t.status,
        lastMessageAt: t.lastMessageAt.toISOString(),
      })),
    };
  }

  /**
   * A 5-minute signed URL, only for a file of this customer's READY file delivery on an active
   * order. The file must belong to the delivered product: ids from the URL are never trusted alone.
   */
  async downloadUrl(
    customerId: string,
    deliveryId: string,
    fileId: string,
  ): Promise<{ url: string }> {
    const delivery = await this.prisma.delivery.findFirst({
      where: {
        id: deliveryId,
        customerId,
        type: 'R2',
        status: 'READY',
        order: { status: { in: ENTITLED_ORDER } },
      },
    });
    const file = delivery
      ? await this.prisma.productFile.findFirst({
          where: { id: fileId, productId: delivery.productId },
          include: { media: true },
        })
      : null;
    if (!delivery || !file) throw new NotFoundException('This download isn’t available');
    await this.analytics.trackDownload({
      customerId,
      orderId: delivery.orderId,
      productId: delivery.productId,
      fileId: file.id,
    });
    return { url: await this.storage.signedDownloadUrl(file.media.key, file.media.filename) };
  }

  private async ownDelivery(customerId: string, deliveryId: string) {
    const delivery = await this.prisma.delivery.findFirst({
      where: { id: deliveryId, customerId },
      select: { id: true, type: true },
    });
    if (!delivery) throw new NotFoundException('Delivery not found');
    return delivery;
  }

  async retryDelivery(customerId: string, deliveryId: string) {
    const delivery = await this.ownDelivery(customerId, deliveryId);
    if (delivery.type !== 'GITHUB') unprocessable('Only repository access can be retried');
    const actor: Actor = { type: 'system' };
    await this.fulfillment.retry(deliveryId, actor);
    return this.deliveryView(customerId, deliveryId);
  }

  async refreshDelivery(customerId: string, deliveryId: string) {
    await this.ownDelivery(customerId, deliveryId);
    await this.fulfillment.refresh(deliveryId);
    return this.deliveryView(customerId, deliveryId);
  }

  private async deliveryView(customerId: string, deliveryId: string) {
    const d = await this.prisma.delivery.findFirstOrThrow({
      where: { id: deliveryId, customerId },
      include: { ...deliveryInclude, order: { select: { status: true } } },
    });
    return toDeliveryView(d, {
      orderActive: ENTITLED_ORDER.includes(d.order.status),
      githubConnected: await this.githubConnected(customerId),
    });
  }
}
