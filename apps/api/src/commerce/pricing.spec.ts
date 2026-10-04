import { type CartLine, type CouponRule, PricingError, priceCart } from './pricing.js';

const product = (id: string, price: number, extra: Partial<CartLine['product']> = {}) => ({
  id,
  slug: id,
  name: id.toUpperCase(),
  type: 'DIGITAL_PRODUCT' as const,
  price,
  currency: 'USD',
  deliverFiles: true,
  deliverGithub: false,
  ...extra,
});

const coupon = (extra: Partial<CouponRule> = {}): CouponRule => ({
  id: 'c1',
  code: 'SAVE',
  type: 'PERCENT',
  value: 10,
  currency: null,
  active: true,
  expiresAt: null,
  usageLimit: null,
  usedCount: 0,
  productIds: [],
  ...extra,
});

const now = new Date('2026-09-26T12:00:00Z');

describe('priceCart', () => {
  it('totals lines without a coupon', () => {
    const cart = priceCart(
      [
        { product: product('a', 4900), quantity: 1 },
        { product: product('b', 1000), quantity: 2 },
      ],
      null,
      now,
    );
    expect(cart).toMatchObject({ currency: 'USD', subtotal: 6900, discount: 0, total: 6900 });
    expect(cart.couponError).toBeNull();
    expect(cart.items[1]).toMatchObject({ unitPrice: 1000, quantity: 2, total: 2000 });
  });

  it('applies a percentage coupon per line, rounded', () => {
    const cart = priceCart(
      [
        { product: product('a', 999), quantity: 1 },
        { product: product('b', 1999), quantity: 1 },
      ],
      coupon({ value: 15 }),
      now,
    );
    expect(cart.items.map((i) => i.discount)).toEqual([150, 300]);
    expect(cart.total).toBe(999 + 1999 - 450);
    expect(cart.coupon?.code).toBe('SAVE');
  });

  it('makes a 100% coupon a $0 order', () => {
    const cart = priceCart(
      [{ product: product('a', 4900), quantity: 1 }],
      coupon({ value: 100 }),
      now,
    );
    expect(cart.total).toBe(0);
    expect(cart.discount).toBe(4900);
  });

  it('spreads a fixed coupon across lines and never below zero', () => {
    const cart = priceCart(
      [
        { product: product('a', 3000), quantity: 1 },
        { product: product('b', 1000), quantity: 1 },
      ],
      coupon({ type: 'FIXED', value: 2000, currency: 'USD' }),
      now,
    );
    expect(cart.items.map((i) => i.discount)).toEqual([1500, 500]);
    expect(cart.total).toBe(2000);

    const capped = priceCart(
      [{ product: product('a', 500), quantity: 1 }],
      coupon({ type: 'FIXED', value: 2000 }),
      now,
    );
    expect(capped.total).toBe(0);
    expect(capped.discount).toBe(500);
  });

  it('only discounts the products a coupon is limited to', () => {
    const cart = priceCart(
      [
        { product: product('a', 1000), quantity: 1 },
        { product: product('b', 1000), quantity: 1 },
      ],
      coupon({ value: 50, productIds: ['b'] }),
      now,
    );
    expect(cart.items.map((i) => i.discount)).toEqual([0, 500]);
  });

  it.each([
    [{ active: false }, 'no longer active'],
    [{ expiresAt: new Date('2026-09-01T00:00:00Z') }, 'expired'],
    [{ usageLimit: 3, usedCount: 3 }, 'usage limit'],
    [{ type: 'FIXED' as const, value: 100, currency: 'BDT' }, 'only works for BDT'],
    [{ productIds: ['zzz'] }, 'doesn’t apply'],
  ])('rejects an unusable coupon (%o) and charges full price', (extra, reason) => {
    const cart = priceCart([{ product: product('a', 1000), quantity: 1 }], coupon(extra), now);
    expect(cart.couponError).toContain(reason);
    expect(cart.coupon).toBeNull();
    expect(cart.total).toBe(1000);
  });

  it('reports an unknown code', () => {
    const cart = priceCart([{ product: product('a', 1000), quantity: 1 }], null, now, true);
    expect(cart.couponError).toContain('isn’t valid');
  });

  it('refuses mixed currencies and duplicate lines', () => {
    expect(() =>
      priceCart(
        [
          { product: product('a', 1000), quantity: 1 },
          { product: product('b', 1000, { currency: 'BDT' }), quantity: 1 },
        ],
        null,
        now,
      ),
    ).toThrow(PricingError);
    expect(() =>
      priceCart(
        [
          { product: product('a', 1000), quantity: 1 },
          { product: product('a', 1000), quantity: 1 },
        ],
        null,
        now,
      ),
    ).toThrow('listed twice');
  });

  it('honours admin price overrides and flags GitHub delivery', () => {
    const cart = priceCart(
      [{ product: product('a', 4900, { deliverGithub: true }), quantity: 1, unitPrice: 0 }],
      null,
      now,
    );
    expect(cart.total).toBe(0);
    expect(cart.requiresGithub).toBe(true);
    expect(cart.items[0]!.deliveryMethods).toEqual(['R2', 'GITHUB']);
  });
});
