import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  CheckoutConfirmation,
  CheckoutQuote,
  CheckoutQuoteInput,
  CheckoutResult,
  PaymentOption,
} from '@shimanto/types';
import { CheckoutInputSchema } from '@shimanto/types';
import type { z } from 'zod';
import { customerFirstTouch, customerTouch, orderAttribution } from '../analytics/attribution.js';
import { AnalyticsService } from '../analytics/analytics.service.js';
import type { TrackingContext } from '../analytics/events.js';
import { TrackingSettingsService } from '../analytics/tracking-settings.service.js';
import { hashPassword } from '../auth/crypto.js';
import { TurnstileService } from '../common/turnstile.service.js';
import { unprocessable } from '../common/validate.js';
import { ENV } from '../config/config.module.js';
import type { Env } from '../config/env.js';
import { CustomerAuthService } from '../customers/customer-auth.service.js';
import type { Customer, Locale } from '../generated/prisma/client.js';
import { toPublicMedia } from '../media/media.mapper.js';
import { StorageService } from '../media/storage.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ManualPaymentsService } from './manual-payments.service.js';
import { OrdersService } from './orders.service.js';
import { PAYPAL_CURRENCIES, PaymentConfigService } from './payment-config.service.js';
import { type CheckoutSessionArgs, PaymentsGateway } from './payments.gateway.js';
import { PaymentsService } from './payments.service.js';
import { PaypalGateway } from './paypal.gateway.js';
import type { CartLine, PricedCart } from './pricing.js';
import { ENTITLED_ORDER } from './status.js';

type CheckoutInput = z.output<typeof CheckoutInputSchema>;

export interface CheckoutOutcome {
  result: CheckoutResult;
  /** A brand-new account with a password: the controller starts its session. */
  startSession?: Customer;
}

/**
 * Checkout: quote → customer → order → ($0) confirm + fulfil, (Stripe / PayPal) the provider's
 * payment page, or (manual) payment instructions, confirmed later by an admin.
 * Prices always come from the database; the browser only sends product slugs and a coupon code.
 */
@Injectable()
export class CheckoutService {
  private readonly logger = new Logger('Checkout');

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
    private readonly customers: CustomerAuthService,
    private readonly payments: PaymentsGateway,
    private readonly paypal: PaypalGateway,
    private readonly paymentConfig: PaymentConfigService,
    private readonly paymentEvents: PaymentsService,
    private readonly manualPayments: ManualPaymentsService,
    private readonly turnstile: TurnstileService,
    private readonly analytics: AnalyticsService,
    private readonly tracking: TrackingSettingsService,
    private readonly storage: StorageService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  private async cart(items: Array<{ slug: string; quantity?: number }>) {
    const slugs = items.map((i) => i.slug);
    const products = await this.prisma.product.findMany({
      where: { slug: { in: slugs }, status: 'PUBLISHED' },
      include: { cover: true },
    });
    const bySlug = new Map(products.map((p) => [p.slug, p]));
    const lines: CartLine[] = items.map((item) => {
      const product = bySlug.get(item.slug);
      if (!product) throw new NotFoundException(`"${item.slug}" is not available`);
      return { product, quantity: item.quantity ?? 1 };
    });
    return { lines, products: bySlug };
  }

  async quote(input: CheckoutQuoteInput): Promise<CheckoutQuote> {
    const { lines } = await this.cart(input.items);
    const cart = this.orders.price(lines, await this.orders.coupon(input.couponCode));
    return this.toQuote(
      cart,
      cart.total > 0 ? await this.paymentOptions(cart.currency) : [],
      (await this.paymentConfig.manual()).windowHours,
    );
  }

  /** Ways to pay in this currency, in a fixed order: card, PayPal, then the manual methods. */
  private async paymentOptions(currency: string): Promise<PaymentOption[]> {
    const [card, paypal, manual] = await Promise.all([
      this.payments.enabled(),
      this.paypal.enabled(),
      this.paymentConfig.manualMethods(currency),
    ]);
    return [
      ...(card
        ? [
            {
              id: 'stripe',
              type: 'stripe' as const,
              name: 'Card',
              description: 'Visa, Mastercard, Amex and more, on Stripe’s secure page.',
              manual: null,
            },
          ]
        : []),
      ...(paypal && PAYPAL_CURRENCIES.includes(currency)
        ? [
            {
              id: 'paypal',
              type: 'paypal' as const,
              name: 'PayPal',
              description: 'Your PayPal balance, bank or card, on PayPal.',
              manual: null,
            },
          ]
        : []),
      ...manual.map((method) => ({
        id: `manual:${method.id}`,
        type: 'manual' as const,
        name: method.name,
        description: method.description,
        manual: method,
      })),
    ];
  }

  private toQuote(
    cart: PricedCart,
    paymentOptions: PaymentOption[],
    paymentWindowHours: number,
  ): CheckoutQuote {
    return {
      currency: cart.currency,
      items: cart.items,
      subtotal: cart.subtotal,
      discount: cart.discount,
      total: cart.total,
      coupon: cart.coupon
        ? { code: cart.coupon.code, type: cart.coupon.type, value: cart.coupon.value }
        : null,
      couponError: cart.couponError,
      paymentRequired: cart.total > 0,
      requiresGithub: cart.requiresGithub,
      paymentOptions,
      paymentWindowHours,
    };
  }

  async checkout(
    input: CheckoutInput,
    ctx: { ip?: string; userAgent?: string; customerId: string | null },
  ): Promise<CheckoutOutcome> {
    // Honeypot: look successful, do nothing.
    if (input.website) {
      return {
        result: {
          kind: 'complete',
          orderNumber: 0,
          signedIn: false,
          portalUrl: this.env.PORTAL_URL,
        },
      };
    }
    if (!(await this.turnstile.verify(input.turnstileToken, ctx.ip))) {
      throw new BadRequestException('Human verification failed. Please try again.');
    }

    const { lines, products } = await this.cart(input.items);
    const cart = this.orders.price(lines, await this.orders.coupon(input.couponCode));
    if (input.couponCode && cart.couponError) unprocessable(cart.couponError, 'couponCode');
    const paid = cart.total > 0;
    let option: PaymentOption | undefined;
    if (paid) {
      const options = await this.paymentOptions(cart.currency);
      if (!options.length) unprocessable('Payments are not set up yet. Please check back soon.');
      option = input.paymentOption ? options.find((o) => o.id === input.paymentOption) : options[0];
      if (!option) {
        unprocessable(
          'That way to pay isn’t available. Please choose another one.',
          'paymentOption',
        );
      }
    }

    const { customer, created } = await this.resolveCustomer(input, ctx.customerId);
    const tracking = await this.trackingContext(input, ctx);

    // Owning a product already: $0 claims return the existing order, paid ones are refused.
    const owned = await this.prisma.orderItem.findMany({
      where: {
        productId: { in: cart.items.map((i) => i.productId) },
        order: { customerId: customer.id, status: { in: ENTITLED_ORDER } },
      },
      include: { order: { select: { number: true } } },
      orderBy: { createdAt: 'desc' },
    });
    if (owned.length) {
      const ownedIds = new Set(owned.map((o) => o.productId));
      if (!paid && cart.items.every((i) => ownedIds.has(i.productId))) {
        if (!ctx.customerId) await this.customers.requestLoginLink(customer.email);
        return {
          result: {
            kind: 'complete',
            orderNumber: owned[0]!.order.number,
            signedIn: Boolean(ctx.customerId),
            portalUrl: `${this.env.PORTAL_URL}/orders/${owned[0]!.order.number}`,
          },
        };
      }
      const names = owned.map((o) => o.productName).filter((n, i, all) => all.indexOf(n) === i);
      throw new ConflictException({
        message: `You already own ${names.join(', ')}. Find it in your customer portal.`,
        code: 'ALREADY_OWNED',
      });
    }

    const order = await this.orders.create({
      customerId: customer.id,
      cart,
      source: 'CHECKOUT',
      locale: input.locale as Locale,
      utm: input.utm,
      attribution: orderAttribution(input.attribution, input.utm, customerTouch(customer)),
      tracking,
      provider:
        option?.type === 'manual' ? 'MANUAL' : option?.type === 'paypal' ? 'PAYPAL' : 'STRIPE',
    });
    if (created) {
      await this.analytics.trackSignup(customer.id, {
        tracking,
        touch: input.attribution?.first ?? input.attribution?.last,
        method: 'checkout',
      });
    }
    const startSession = created && customer.passwordHash ? customer : undefined;
    if (startSession) await this.customers.sendVerifyWelcome(customer);

    if (!paid) {
      await this.orders.confirm(order.id, { paid: false, email: 'free' });
      return {
        result: {
          kind: 'complete',
          orderNumber: order.number,
          signedIn: Boolean(ctx.customerId) || Boolean(startSession),
          portalUrl: `${this.env.PORTAL_URL}/orders/${order.number}`,
          // Confirmed by the server just now: the browser may echo it to its pixels.
          purchase: await this.analytics.purchasePayload(order.id),
        },
        startSession,
      };
    }

    if (option!.type === 'manual') {
      const { windowHours } = await this.paymentConfig.manual();
      await this.manualPayments.start(order, option!.manual!, windowHours, input.manualProof);
      const signedIn = Boolean(ctx.customerId) || Boolean(startSession);
      // A guest without a password reaches the order (and the payment form) from this link.
      if (!signedIn) await this.customers.requestLoginLink(customer.email);
      return {
        result: {
          kind: 'manual',
          orderNumber: order.number,
          signedIn,
          portalUrl: `${this.env.PORTAL_URL}/orders/${order.number}`,
        },
        startSession,
      };
    }

    const prefix = input.locale === 'bn' ? '/bn' : '';
    const provider = option!.type === 'paypal' ? 'PAYPAL' : 'STRIPE';
    const args: CheckoutSessionArgs = {
      orderId: order.id,
      orderNumber: order.number,
      currency: cart.currency,
      customerEmail: customer.email,
      lines: cart.items.map((item) => {
        const product = products.get(item.slug)!;
        return {
          name: item.quantity > 1 ? `${item.name} × ${item.quantity}` : item.name,
          description: product.summary,
          imageUrl: toPublicMedia(product.cover, this.storage.publicUrl)?.url,
          amount: item.total,
        };
      }),
      // Stripe fills in {CHECKOUT_SESSION_ID}; the success page uses it to ask whether the
      // payment was confirmed (by the webhook) before any browser purchase event fires.
      // PayPal comes back to the API, which captures the payment and then redirects.
      successUrl:
        provider === 'PAYPAL'
          ? `${this.env.API_PUBLIC_URL}/v1/checkout/paypal/return`
          : `${this.env.SITE_URL}${prefix}/checkout/success?order=${order.number}&session={CHECKOUT_SESSION_ID}`,
      cancelUrl:
        provider === 'PAYPAL'
          ? `${this.env.API_PUBLIC_URL}/v1/checkout/paypal/cancel`
          : this.retryUrl(order.locale, cart.items),
    };
    let session: { id: string; url: string };
    try {
      session =
        provider === 'PAYPAL'
          ? await this.paypal.createCheckout(args)
          : await this.payments.createCheckout(args);
    } catch (error) {
      this.logger.error(
        `Could not start payment for order ${order.number}: ${(error as Error).message}`,
      );
      await this.prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', paymentStatus: 'FAILED', cancelledAt: new Date() },
      });
      unprocessable('We could not start the payment. Please try again in a moment.');
    }
    await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider,
        status: 'PENDING',
        amount: cart.total,
        currency: cart.currency,
        providerRef: session.id,
      },
    });
    return {
      result: { kind: 'redirect', url: session.url, orderNumber: order.number },
      startSession,
    };
  }

  private retryUrl(locale: Locale, items: Array<{ slug: string }>) {
    const prefix = locale === 'bn' ? '/bn' : '';
    return `${this.env.SITE_URL}${prefix}/checkout?items=${items.map((i) => i.slug).join(',')}&cancelled=1`;
  }

  /**
   * The buyer approved on PayPal and came back: capture the money, then send them to the success
   * page (which waits for the confirmation like after Stripe). Returns where to redirect.
   */
  async paypalReturn(paypalOrderId: string): Promise<string> {
    const payment = await this.prisma.payment.findUnique({
      where: { providerRef: paypalOrderId },
      include: { order: { include: { items: true } } },
    });
    if (!payment) return `${this.env.SITE_URL}/products`;
    const { order } = payment;
    const prefix = order.locale === 'bn' ? '/bn' : '';
    try {
      await this.paymentEvents.capturePaypal(paypalOrderId);
    } catch (error) {
      // E.g. the card behind PayPal was declined: back to checkout to try again.
      this.logger.warn(`PayPal capture for order ${order.number}: ${(error as Error).message}`);
      return this.retryUrl(
        order.locale,
        order.items.map((i) => ({ slug: i.productSlug })),
      );
    }
    return `${this.env.SITE_URL}${prefix}/checkout/success?order=${order.number}&session=${encodeURIComponent(paypalOrderId)}`;
  }

  /** The buyer cancelled on PayPal: the order is cancelled quietly, back to checkout. */
  async paypalCancel(paypalOrderId: string): Promise<string> {
    const payment = await this.prisma.payment.findUnique({
      where: { providerRef: paypalOrderId },
      include: { order: { include: { items: true } } },
    });
    if (!payment) return `${this.env.SITE_URL}/products`;
    const { order } = payment;
    const { count } = await this.prisma.order.updateMany({
      where: { id: order.id, status: 'PENDING', paymentStatus: 'PENDING' },
      data: { status: 'CANCELLED', paymentStatus: 'FAILED', cancelledAt: new Date() },
    });
    if (count) {
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: { status: 'FAILED', failureReason: 'Checkout cancelled' },
      });
    }
    return this.retryUrl(
      order.locale,
      order.items.map((i) => ({ slug: i.productSlug })),
    );
  }

  /**
   * Success-page check for a paid checkout. Knowing the payment session id is the proof of being
   * the payer. Returns the purchase (for browser pixels) only once the webhook confirmed it.
   */
  async confirmation(sessionId: string): Promise<CheckoutConfirmation> {
    const payment = await this.prisma.payment.findUnique({
      where: { providerRef: sessionId },
      include: { order: { select: { id: true, number: true, paymentStatus: true, status: true } } },
    });
    if (!payment) throw new NotFoundException('Checkout not found');
    const { order } = payment;
    const confirmed = order.paymentStatus === 'PAID' || order.paymentStatus === 'REFUNDED';
    return {
      orderNumber: order.number,
      status: confirmed ? 'confirmed' : order.status === 'CANCELLED' ? 'failed' : 'pending',
      purchase: confirmed ? await this.analytics.purchasePayload(order.id) : null,
    };
  }

  /**
   * Browser ids and consent kept on the order for server-side conversion events. The IP and user
   * agent are kept only with marketing consent (Meta matching) and dropped once sent.
   */
  private async trackingContext(
    input: CheckoutInput,
    ctx: { ip?: string; userAgent?: string },
  ): Promise<TrackingContext> {
    const a = input.attribution;
    const settings = await this.tracking.get();
    const marketing = a?.consent?.marketing ?? !settings.requireConsent;
    return {
      anonymousId: a?.anonymousId ?? null,
      sessionId: a?.sessionId ?? null,
      gaClientId: a?.gaClientId ?? null,
      fbp: marketing ? (a?.fbp ?? null) : null,
      fbc: marketing ? (a?.fbc ?? null) : null,
      userAgent: marketing ? (ctx.userAgent?.slice(0, 400) ?? null) : null,
      ip: marketing ? (ctx.ip ?? null) : null,
      pageUrl: `${this.env.SITE_URL}/checkout`,
      consent: a?.consent ?? null,
    };
  }

  /**
   * Signed in → that customer. Guest → an existing passwordless customer with the email, or a
   * new account (with a password when given). An email that belongs to a password account must
   * sign in first, so nobody can attach orders to someone else's account unnoticed.
   */
  private async resolveCustomer(
    input: CheckoutInput,
    customerId: string | null,
  ): Promise<{ customer: Customer; created: boolean }> {
    if (customerId) {
      const customer = await this.keepFirstTouch(
        await this.prisma.customer.findUniqueOrThrow({ where: { id: customerId } }),
        input,
      );
      return { customer, created: false };
    }
    if (!input.email) unprocessable('Enter your email address', 'email');
    const email = input.email.toLowerCase();
    const existing = await this.prisma.customer.findUnique({ where: { email } });
    if (existing) {
      if (existing.status !== 'ACTIVE') {
        throw new ForbiddenException('This account is disabled. Please contact support.');
      }
      if (existing.passwordHash) {
        throw new ConflictException({
          message: 'An account with this email already exists. Sign in to check out.',
          code: 'ACCOUNT_EXISTS',
        });
      }
      if (input.name && !existing.name) {
        await this.prisma.customer.update({
          where: { id: existing.id },
          data: { name: input.name },
        });
      }
      return { customer: await this.keepFirstTouch(existing, input), created: false };
    }
    const customer = await this.prisma.customer.create({
      data: {
        email,
        name: input.name || null,
        locale: input.locale as Locale,
        ...customerFirstTouch(input.attribution),
        ...(input.password
          ? { passwordHash: await hashPassword(input.password), lastLoginAt: new Date() }
          : {}),
      },
    });
    return { customer, created: true };
  }

  /** A customer with no first touch on file gets this visit's (first touch is never replaced). */
  private async keepFirstTouch(customer: Customer, input: CheckoutInput): Promise<Customer> {
    if (customerTouch(customer) || !input.attribution) return customer;
    const first = customerFirstTouch(input.attribution);
    if (!Object.keys(first).length) return customer;
    return this.prisma.customer.update({ where: { id: customer.id }, data: first });
  }
}
