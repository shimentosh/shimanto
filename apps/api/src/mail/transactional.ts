import { type EmailContent, type LayoutContext, renderEmail } from './layout.js';

/**
 * Every transactional email the store sends, as data → content. Business logic never builds
 * HTML: it picks a template key and passes data; EmailService renders, records and queues it.
 */

export function formatMoney(amount: number, currency: string): string {
  if (amount === 0) return 'Free';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount / 100);
}

const hello = (name?: string | null) => (name ? `Hi ${name.split(' ')[0]},` : 'Hi there,');

export interface OrderMailData {
  name: string | null;
  orderNumber: number;
  items: Array<{ name: string; quantity: number; total: number }>;
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  couponCode?: string | null;
  orderUrl: string;
}

function orderLines(d: OrderMailData): Pick<EmailContent, 'items' | 'details'> {
  return {
    items: d.items.map((i) => ({
      name: i.quantity > 1 ? `${i.name} × ${i.quantity}` : i.name,
      amount: formatMoney(i.total, d.currency),
    })),
    details: [
      ...(d.discount > 0
        ? ([
            ['Subtotal', formatMoney(d.subtotal, d.currency)],
            [
              `Discount${d.couponCode ? ` (${d.couponCode})` : ''}`,
              `−${formatMoney(d.discount, d.currency)}`,
            ],
          ] as Array<[string, string]>)
        : []),
      ['Total', formatMoney(d.total, d.currency)],
    ],
  };
}

type Template<D> = (data: D) => { subject: string; content: EmailContent };

export const templates = {
  // ───────────── Account ─────────────
  welcome: ((d: {
    name: string | null;
    verifyUrl?: string | null;
    setPasswordUrl?: string | null;
    portalUrl: string;
  }) => ({
    subject: 'Welcome — your account is ready',
    content: {
      preview: 'Your account is ready. Everything you buy lives in one place.',
      heading: 'Welcome aboard',
      greeting: hello(d.name),
      paragraphs: [
        'Your account is ready. Orders, downloads, repository access and support all live in your customer portal.',
        ...(d.setPasswordUrl
          ? ['Set a password to sign in any time. The link below works for 7 days.']
          : d.verifyUrl
            ? ['Please confirm your email address so we know it’s really you.']
            : []),
      ],
      cta: d.setPasswordUrl
        ? { label: 'Set your password', url: d.setPasswordUrl }
        : d.verifyUrl
          ? { label: 'Verify email', url: d.verifyUrl }
          : { label: 'Open your portal', url: d.portalUrl },
      note:
        d.verifyUrl && !d.setPasswordUrl ? 'The verification link expires in 48 hours.' : undefined,
    },
  })) satisfies Template<never>,

  verifyEmail: ((d: { name: string | null; url: string; resend?: boolean }) => ({
    subject: d.resend ? 'Your new verification link' : 'Verify your email',
    content: {
      preview: 'Confirm your email address to finish setting up your account.',
      heading: d.resend ? 'Here’s a fresh link' : 'Confirm your email',
      greeting: hello(d.name),
      paragraphs: ['Tap the button to confirm this is your email address.'],
      cta: { label: 'Verify email', url: d.url },
      note: 'The link expires in 48 hours and works once. Didn’t create an account? Ignore this email.',
    },
  })) satisfies Template<never>,

  signInLink: ((d: { name: string | null; url: string; days: number }) => ({
    subject: 'Your sign-in link',
    content: {
      preview: 'Use this link to sign in to your customer portal.',
      heading: 'Sign in to your account',
      greeting: hello(d.name),
      paragraphs: [
        'Here’s the sign-in link you asked for. It opens your orders, downloads and support.',
      ],
      cta: { label: 'Sign in', url: d.url },
      note: `The link works once and expires in ${d.days} days. Didn’t ask for it? Ignore this email.`,
    },
  })) satisfies Template<never>,

  passwordReset: ((d: { name: string | null; url: string; minutes: number }) => ({
    subject: 'Reset your password',
    content: {
      preview: 'Use this link to choose a new password.',
      heading: 'Reset your password',
      greeting: hello(d.name),
      paragraphs: ['We received a request to reset the password for your account.'],
      cta: { label: 'Choose a new password', url: d.url },
      note: `The link expires in ${d.minutes} minutes and works once. If you didn’t ask for this, you can ignore this email; your password stays the same.`,
      tone: 'spark',
    },
  })) satisfies Template<never>,

  passwordChanged: ((d: { name: string | null; supportUrl: string }) => ({
    subject: 'Your password was changed',
    content: {
      preview: 'Your password was just changed.',
      heading: 'Password changed',
      greeting: hello(d.name),
      paragraphs: [
        'Your account password was just changed, and other signed-in devices were signed out.',
        'If this wasn’t you, reset your password right away and contact support.',
      ],
      cta: { label: 'Contact support', url: d.supportUrl },
      tone: 'spark',
    },
  })) satisfies Template<never>,

  newLogin: ((d: { name: string | null; when: string; device: string; resetUrl: string }) => ({
    subject: 'New sign-in to your account',
    content: {
      preview: `New sign-in on ${d.device}.`,
      heading: 'New sign-in',
      greeting: hello(d.name),
      paragraphs: ['Your account was just signed in to.'],
      details: [
        ['When', d.when],
        ['Device', d.device],
      ],
      note: 'If this was you, there’s nothing to do. If not, reset your password now.',
      cta: { label: 'Reset password', url: d.resetUrl },
      tone: 'spark',
    },
  })) satisfies Template<never>,

  // ───────────── Orders & payments ─────────────
  orderConfirmation: ((d: OrderMailData) => ({
    subject: `Order #${d.orderNumber} confirmed`,
    content: {
      preview: `Your order #${d.orderNumber} is confirmed and being delivered.`,
      eyebrow: `Order #${d.orderNumber}`,
      heading: 'Your order is confirmed',
      greeting: hello(d.name),
      paragraphs: [
        'Thanks! Your order is confirmed. We’re delivering it now; you’ll get an email for each product as it becomes available.',
      ],
      ...orderLines(d),
      cta: { label: 'View order', url: d.orderUrl },
    },
  })) satisfies Template<never>,

  freeOrderConfirmation: ((d: OrderMailData) => ({
    subject: `It’s yours: order #${d.orderNumber}`,
    content: {
      preview: 'Your free order is confirmed.',
      eyebrow: `Order #${d.orderNumber}`,
      heading: 'It’s yours',
      greeting: hello(d.name),
      paragraphs: [
        'Your order is confirmed; no payment was needed. We’re delivering it to your account now.',
      ],
      ...orderLines(d),
      cta: { label: 'View order', url: d.orderUrl },
    },
  })) satisfies Template<never>,

  paymentSuccessful: ((d: OrderMailData) => ({
    subject: `Payment received for order #${d.orderNumber}`,
    content: {
      preview: `We received your payment of ${formatMoney(d.total, d.currency)}.`,
      eyebrow: `Order #${d.orderNumber}`,
      heading: 'Payment received',
      greeting: hello(d.name),
      paragraphs: [
        'Thanks for your purchase. Your payment went through and your order is being delivered.',
      ],
      ...orderLines(d),
      cta: { label: 'View order', url: d.orderUrl },
    },
  })) satisfies Template<never>,

  paymentFailed: ((d: { name: string | null; orderNumber: number; retryUrl: string }) => ({
    subject: `Payment didn’t go through for order #${d.orderNumber}`,
    content: {
      preview: 'Your payment didn’t complete. You can try again any time.',
      eyebrow: `Order #${d.orderNumber}`,
      heading: 'Payment didn’t go through',
      greeting: hello(d.name),
      paragraphs: [
        'Your payment wasn’t completed, so nothing was charged. You can place the order again whenever you’re ready.',
      ],
      cta: { label: 'Try again', url: d.retryUrl },
      tone: 'create',
    },
  })) satisfies Template<never>,

  orderCancelled: ((d: {
    name: string | null;
    orderNumber: number;
    refunded: boolean;
    supportUrl: string;
  }) => ({
    subject: `Order #${d.orderNumber} ${d.refunded ? 'refunded' : 'cancelled'}`,
    content: {
      preview: `Order #${d.orderNumber} was ${d.refunded ? 'refunded' : 'cancelled'}.`,
      eyebrow: `Order #${d.orderNumber}`,
      heading: d.refunded ? 'Your order was refunded' : 'Your order was cancelled',
      greeting: hello(d.name),
      paragraphs: [
        d.refunded
          ? 'Your refund is on its way. Depending on your bank it can take 5–10 business days to appear.'
          : 'Your order was cancelled. If you think this is a mistake, just reply or contact support.',
      ],
      cta: { label: 'Contact support', url: d.supportUrl },
      tone: 'create',
    },
  })) satisfies Template<never>,

  // ───────────── Delivery ─────────────
  downloadAvailable: ((d: {
    name: string | null;
    productName: string;
    orderNumber: number;
    fileCount: number;
    url: string;
  }) => ({
    subject: `Your download is ready: ${d.productName}`,
    content: {
      preview: `${d.productName} is ready to download.`,
      eyebrow: `Order #${d.orderNumber}`,
      heading: 'Your download is ready',
      greeting: hello(d.name),
      paragraphs: [
        `${d.productName} is ready. ${d.fileCount === 1 ? 'Your file is' : `All ${d.fileCount} files are`} waiting in your customer portal, and you can download ${d.fileCount === 1 ? 'it' : 'them'} again any time.`,
      ],
      cta: { label: 'Go to downloads', url: d.url },
      note: 'Download links are created fresh each time you click, so they never expire in your inbox.',
    },
  })) satisfies Template<never>,

  githubAccessRequired: ((d: { name: string | null; productName: string; connectUrl: string }) => ({
    subject: `Connect GitHub to get ${d.productName}`,
    content: {
      preview: 'One step left: connect your GitHub account to receive repository access.',
      heading: 'Connect your GitHub account',
      greeting: hello(d.name),
      paragraphs: [
        `${d.productName} is delivered as access to a private GitHub repository.`,
        'Connect your GitHub account and we’ll send the repository invitation automatically.',
      ],
      cta: { label: 'Connect GitHub', url: d.connectUrl },
      tone: 'spark',
    },
  })) satisfies Template<never>,

  githubInvitationSent: ((d: {
    name: string | null;
    productName: string;
    login: string;
    invitationUrl: string;
  }) => ({
    subject: `GitHub invitation sent: ${d.productName}`,
    content: {
      preview: `Accept the GitHub invitation for @${d.login} to get the code.`,
      heading: 'Your repository invitation is on its way',
      greeting: hello(d.name),
      paragraphs: [
        `We invited your GitHub account @${d.login} to the private repository for ${d.productName}.`,
        'GitHub also emails you. Accept the invitation to get access; it expires after 7 days, and you can request a new one from your portal.',
      ],
      cta: { label: 'Open GitHub', url: d.invitationUrl },
    },
  })) satisfies Template<never>,

  githubAccessReady: ((d: { name: string | null; productName: string; repoUrl: string }) => ({
    subject: `Repository access ready: ${d.productName}`,
    content: {
      preview: 'You now have access to the repository.',
      heading: 'You have access',
      greeting: hello(d.name),
      paragraphs: [
        `Your GitHub account now has access to the repository for ${d.productName}. Clone it, star it, build with it.`,
      ],
      cta: { label: 'Open repository', url: d.repoUrl },
    },
  })) satisfies Template<never>,

  githubInvitationFailed: ((d: {
    name: string | null;
    productName: string;
    portalUrl: string;
  }) => ({
    subject: `Action needed: ${d.productName} delivery`,
    content: {
      preview: 'We couldn’t send your GitHub invitation yet.',
      heading: 'Your delivery needs attention',
      greeting: hello(d.name),
      paragraphs: [
        `We couldn’t send the GitHub repository invitation for ${d.productName} yet.`,
        'Check your connected GitHub account in the portal and try again. If it keeps failing, we’re on it too; you can also open a support ticket.',
      ],
      cta: { label: 'Open customer portal', url: d.portalUrl },
      tone: 'create',
    },
  })) satisfies Template<never>,

  // ───────────── Support ─────────────
  ticketCreated: ((d: { name: string | null; number: number; subject: string; url: string }) => ({
    subject: `[#${d.number}] We got your message: ${d.subject}`,
    content: {
      preview: 'Your support ticket is open. We’ll reply here.',
      eyebrow: `Ticket #${d.number}`,
      heading: 'We got your message',
      greeting: hello(d.name),
      paragraphs: [
        `Your ticket “${d.subject}” is open. We usually reply within one or two working days.`,
      ],
      cta: { label: 'View ticket', url: d.url },
    },
  })) satisfies Template<never>,

  ticketReply: ((d: {
    name: string | null;
    number: number;
    subject: string;
    excerpt: string;
    url: string;
  }) => ({
    subject: `[#${d.number}] New reply: ${d.subject}`,
    content: {
      preview: d.excerpt.slice(0, 120),
      eyebrow: `Ticket #${d.number}`,
      heading: 'You have a new reply',
      greeting: hello(d.name),
      paragraphs: [d.excerpt.length > 600 ? `${d.excerpt.slice(0, 600)}…` : d.excerpt],
      cta: { label: 'Read and reply', url: d.url },
    },
  })) satisfies Template<never>,

  ticketResolved: ((d: { name: string | null; number: number; subject: string; url: string }) => ({
    subject: `[#${d.number}] Resolved: ${d.subject}`,
    content: {
      preview: 'Your ticket was marked as resolved.',
      eyebrow: `Ticket #${d.number}`,
      heading: 'Ticket resolved',
      greeting: hello(d.name),
      paragraphs: [
        'We marked your ticket as resolved. If anything is still off, reply in the portal and it opens again.',
      ],
      cta: { label: 'View ticket', url: d.url },
    },
  })) satisfies Template<never>,

  adminTicketNotification: ((d: {
    number: number;
    subject: string;
    customer: string;
    excerpt: string;
    url: string;
    isReply: boolean;
  }) => ({
    subject: `[Support #${d.number}] ${d.isReply ? 'Customer replied' : 'New ticket'}: ${d.subject}`,
    content: {
      preview: `${d.customer}: ${d.excerpt.slice(0, 100)}`,
      eyebrow: `Ticket #${d.number}`,
      heading: d.isReply ? 'Customer replied' : 'New support ticket',
      paragraphs: [
        `From ${d.customer}`,
        d.excerpt.length > 600 ? `${d.excerpt.slice(0, 600)}…` : d.excerpt,
      ],
      cta: { label: 'Open in admin', url: d.url },
    },
  })) satisfies Template<never>,

  testEmail: ((d: { admin: string }) => ({
    subject: 'Test email from your store',
    content: {
      preview: 'Your email delivery works.',
      heading: 'Email delivery works',
      paragraphs: [`This test was sent by ${d.admin} from the admin settings.`],
    },
  })) satisfies Template<never>,
};

export type TemplateKey = keyof typeof templates;
export type TemplateData<K extends TemplateKey> = Parameters<(typeof templates)[K]>[0];

export function renderTemplate<K extends TemplateKey>(
  key: K,
  data: TemplateData<K>,
  ctx: LayoutContext,
): { subject: string; html: string; text: string } {
  const { subject, content } = (
    templates[key] as (d: TemplateData<K>) => { subject: string; content: EmailContent }
  )(data);
  return { subject, ...renderEmail(content, ctx) };
}
