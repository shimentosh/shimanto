import { describe, expect, it } from 'vitest';
import {
  AdminOrderCreateSchema,
  ChangePasswordInputSchema,
  CheckoutInputSchema,
  CouponCodeSchema,
  CouponInputSchema,
  GitHubRepoSchema,
  ProductInputSchema,
  RegisterInputSchema,
  TicketCreateInputSchema,
} from './index.js';

const product = { slug: 'saas-kit', name: 'SaaS Kit', price: 4900 };

describe('products', () => {
  it('requires a repository for GitHub delivery and a higher compare-at price', () => {
    expect(ProductInputSchema.safeParse({ ...product, deliverGithub: true }).success).toBe(false);
    expect(
      ProductInputSchema.safeParse({
        ...product,
        deliverGithub: true,
        githubOwner: 'acme',
        githubRepo: 'saas-kit',
      }).success,
    ).toBe(true);
    expect(ProductInputSchema.safeParse({ ...product, compareAtPrice: 4900 }).success).toBe(false);
    expect(ProductInputSchema.parse(product)).toMatchObject({
      type: 'DIGITAL_PRODUCT',
      currency: 'USD',
      deliverFiles: false,
    });
  });

  it('only accepts real GitHub repository names', () => {
    expect(GitHubRepoSchema.safeParse('saas-kit.v2').success).toBe(true);
    expect(GitHubRepoSchema.safeParse('../other').success).toBe(false);
    expect(GitHubRepoSchema.safeParse('owner/repo').success).toBe(false);
  });
});

describe('checkout', () => {
  it('takes product slugs only (never prices) and upper-cases coupons', () => {
    const parsed = CheckoutInputSchema.parse({
      items: [{ slug: 'saas-kit', price: 1 }],
      couponCode: 'launch-50',
      turnstileToken: 't',
    });
    expect(parsed.items).toEqual([{ slug: 'saas-kit', quantity: 1 }]);
    expect(parsed.couponCode).toBe('LAUNCH-50');
    expect(CouponCodeSchema.safeParse('no spaces').success).toBe(false);
  });

  it('caps percentage coupons at 100', () => {
    expect(CouponInputSchema.safeParse({ code: 'ALL', type: 'PERCENT', value: 101 }).success).toBe(
      false,
    );
    expect(CouponInputSchema.safeParse({ code: 'ALL', type: 'PERCENT', value: 100 }).success).toBe(
      true,
    );
  });

  it('defaults admin orders to notify the customer and not paid externally', () => {
    expect(
      AdminOrderCreateSchema.parse({ customerEmail: 'a@b.co', items: [{ productId: 'p1' }] }),
    ).toMatchObject({
      paidExternally: false,
      notifyCustomer: true,
      items: [{ productId: 'p1', quantity: 1 }],
    });
  });
});

describe('accounts and support', () => {
  it('requires matching, long-enough passwords', () => {
    const base = {
      name: 'Rina',
      email: 'rina@example.com',
      password: 'long-enough',
      confirmPassword: 'long-enough',
    };
    expect(RegisterInputSchema.safeParse(base).success).toBe(true);
    expect(RegisterInputSchema.safeParse({ ...base, confirmPassword: 'different' }).success).toBe(
      false,
    );
    expect(
      RegisterInputSchema.safeParse({ ...base, password: 'short', confirmPassword: 'short' })
        .success,
    ).toBe(false);
    expect(
      ChangePasswordInputSchema.safeParse({
        password: 'new-password',
        confirmPassword: 'new-password',
      }).success,
    ).toBe(true);
  });

  it('treats empty multipart ids as not set', () => {
    expect(
      TicketCreateInputSchema.parse({
        subject: 'Help me',
        message: 'The download fails every time.',
        productId: '',
      }),
    ).toMatchObject({ productId: undefined });
  });
});
