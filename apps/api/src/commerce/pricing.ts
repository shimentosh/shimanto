/**
 * Cart pricing: pure functions, no database, so every rule is unit-tested. Amounts are integer
 * minor units (cents); discounts are rounded per line and never exceed a line's total.
 */

export interface PricedProduct {
  id: string;
  slug: string;
  name: string;
  type: 'SOFTWARE' | 'DIGITAL_PRODUCT' | 'SOURCE_CODE';
  price: number;
  currency: string;
  deliverFiles: boolean;
  deliverGithub: boolean;
}

export interface CartLine {
  product: PricedProduct;
  quantity: number;
  /** Admin override of the unit price (e.g. 0 for a gift). */
  unitPrice?: number;
}

export interface CouponRule {
  id: string;
  code: string;
  type: 'PERCENT' | 'FIXED';
  value: number;
  currency: string | null;
  active: boolean;
  expiresAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  /** Empty = every product. */
  productIds: string[];
}

export interface PricedLine {
  productId: string;
  slug: string;
  name: string;
  type: PricedProduct['type'];
  unitPrice: number;
  quantity: number;
  discount: number;
  total: number;
  deliveryMethods: Array<'R2' | 'GITHUB'>;
}

export interface PricedCart {
  currency: string;
  items: PricedLine[];
  subtotal: number;
  discount: number;
  total: number;
  /** The coupon, when it was applied. */
  coupon: CouponRule | null;
  /** Why the submitted coupon was not applied. */
  couponError: string | null;
  requiresGithub: boolean;
}

export class PricingError extends Error {}

/** Null when the coupon can be used for this cart, otherwise the reason it can't. */
export function couponProblem(
  coupon: CouponRule,
  currency: string,
  productIds: string[],
  now: Date,
): string | null {
  if (!coupon.active) return 'This coupon is no longer active';
  if (coupon.expiresAt && coupon.expiresAt <= now) return 'This coupon has expired';
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return 'This coupon has reached its usage limit';
  }
  if (coupon.type === 'FIXED' && coupon.currency && coupon.currency !== currency) {
    return `This coupon only works for ${coupon.currency} purchases`;
  }
  if (coupon.productIds.length && !productIds.some((id) => coupon.productIds.includes(id))) {
    return 'This coupon doesn’t apply to these products';
  }
  return null;
}

export function priceCart(
  lines: CartLine[],
  coupon: CouponRule | null | undefined,
  now = new Date(),
  /** Set when a code was submitted but no coupon exists. */
  unknownCode = false,
): PricedCart {
  if (lines.length === 0) throw new PricingError('Your cart is empty');
  const currency = lines[0]!.product.currency;
  if (lines.some((l) => l.product.currency !== currency)) {
    throw new PricingError('Products in different currencies can’t be bought together');
  }
  const ids = new Set<string>();
  for (const line of lines) {
    if (ids.has(line.product.id)) throw new PricingError(`${line.product.name} is listed twice`);
    ids.add(line.product.id);
  }

  const items: PricedLine[] = lines.map(({ product, quantity, unitPrice }) => {
    const unit = unitPrice ?? product.price;
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      type: product.type,
      unitPrice: unit,
      quantity,
      discount: 0,
      total: unit * quantity,
      deliveryMethods: [
        ...(product.deliverFiles ? (['R2'] as const) : []),
        ...(product.deliverGithub ? (['GITHUB'] as const) : []),
      ],
    };
  });

  let couponError: string | null = unknownCode ? 'This coupon code isn’t valid' : null;
  let applied: CouponRule | null = null;

  if (coupon) {
    couponError = couponProblem(coupon, currency, [...ids], now);
    const eligible = items.filter(
      (i) => i.total > 0 && (!coupon.productIds.length || coupon.productIds.includes(i.productId)),
    );
    const eligibleTotal = eligible.reduce((sum, i) => sum + i.total, 0);
    if (!couponError && eligibleTotal === 0) couponError = 'These products are already free';

    if (!couponError) {
      applied = coupon;
      if (coupon.type === 'PERCENT') {
        for (const item of eligible) {
          item.discount = Math.min(item.total, Math.round((item.total * coupon.value) / 100));
        }
      } else {
        // Spread a fixed amount across eligible lines in proportion to their totals.
        const amount = Math.min(coupon.value, eligibleTotal);
        let left = amount;
        eligible.forEach((item, index) => {
          const share =
            index === eligible.length - 1
              ? left
              : Math.min(left, Math.floor((amount * item.total) / eligibleTotal));
          item.discount = Math.min(item.total, share);
          left -= item.discount;
        });
      }
      for (const item of eligible) item.total -= item.discount;
    }
  }

  const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
  const discount = items.reduce((sum, i) => sum + i.discount, 0);
  return {
    currency,
    items,
    subtotal,
    discount,
    total: subtotal - discount,
    coupon: applied,
    couponError,
    requiresGithub: items.some((i) => i.deliveryMethods.includes('GITHUB')),
  };
}
