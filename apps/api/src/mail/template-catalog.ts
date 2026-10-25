import type { EmailTemplateGroup } from '@shimanto/types';
import type { OrderMailData, TemplateData, TemplateKey } from './transactional.js';

interface Urls {
  portal: string;
  admin: string;
}

interface Entry<K extends TemplateKey> {
  group: EmailTemplateGroup;
  name: string;
  /** When the store sends it, in plain words. */
  trigger: string;
  audience: 'customer' | 'admin';
  /** Believable data for the admin preview and "send this to me". Nothing here is real. */
  sample: (urls: Urls) => TemplateData<K>;
}

const order = (u: Urls): OrderMailData => ({
  name: 'Ayesha Rahman',
  orderNumber: 1042,
  items: [
    { name: 'Content OS', quantity: 1, total: 4900 },
    { name: 'Founder Notion Templates', quantity: 2, total: 3800 },
  ],
  subtotal: 8700,
  discount: 870,
  total: 7830,
  currency: 'USD',
  couponCode: 'LAUNCH10',
  orderUrl: `${u.portal}/orders/1042`,
});

/**
 * Every transactional template with how it's grouped in the admin and sample data to preview it.
 * Typed against `templates`, so a new template can't ship without an entry here.
 */
export const templateCatalog: { [K in TemplateKey]: Entry<K> } = {
  // ───────────── Account ─────────────
  welcome: {
    group: 'account',
    name: 'Welcome',
    trigger:
      'A customer account is created. Asks to verify the email, or to set a password for accounts made at checkout.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      verifyUrl: `${u.portal}/verify?token=sample`,
      portalUrl: u.portal,
    }),
  },
  verifyEmail: {
    group: 'account',
    name: 'Verify email',
    trigger: 'A customer asks for a new verification link.',
    audience: 'customer',
    sample: (u) => ({ name: 'Ayesha Rahman', url: `${u.portal}/verify?token=sample` }),
  },
  signInLink: {
    group: 'account',
    name: 'Sign-in link',
    trigger: 'A customer asks for an email sign-in link.',
    audience: 'customer',
    sample: (u) => ({ name: 'Ayesha Rahman', url: `${u.portal}/login?token=sample`, days: 7 }),
  },
  passwordReset: {
    group: 'account',
    name: 'Password reset',
    trigger: 'A customer asks to reset their password.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      url: `${u.portal}/reset-password?token=sample`,
      minutes: 30,
    }),
  },
  passwordChanged: {
    group: 'account',
    name: 'Password changed',
    trigger: 'A customer’s password is changed.',
    audience: 'customer',
    sample: (u) => ({ name: 'Ayesha Rahman', supportUrl: `${u.portal}/support` }),
  },
  newLogin: {
    group: 'account',
    name: 'New sign-in',
    trigger: 'A customer signs in from a device we haven’t seen before.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      when: 'Oct 26, 2026, 10:24 AM',
      device: 'Chrome on macOS',
      resetUrl: `${u.portal}/forgot-password`,
    }),
  },

  // ───────────── Orders & payments ─────────────
  orderConfirmation: {
    group: 'orders',
    name: 'Order confirmation',
    trigger: 'You confirm an order from the admin, or resend its confirmation.',
    audience: 'customer',
    sample: order,
  },
  freeOrderConfirmation: {
    group: 'orders',
    name: 'Free order confirmation',
    trigger: 'An order with nothing to pay is placed.',
    audience: 'customer',
    sample: (u) => ({ ...order(u), discount: 0, subtotal: 0, total: 0, couponCode: null }),
  },
  paymentSuccessful: {
    group: 'orders',
    name: 'Payment received',
    trigger: 'A payment goes through. This is the customer’s receipt.',
    audience: 'customer',
    sample: order,
  },
  manualPaymentInstructions: {
    group: 'orders',
    name: 'Manual payment instructions',
    trigger: 'A customer chooses manual payment at checkout.',
    audience: 'customer',
    sample: (u) => ({
      ...order(u),
      method: 'bKash',
      fields: [
        ['bKash number', '01XXXXXXXXX'],
        ['Account type', 'Personal'],
      ],
      steps: [
        'Open bKash and choose Send Money.',
        'Send the exact amount to the number above.',
        'Copy the transaction ID from the confirmation.',
      ],
      referenceLabel: 'transaction ID',
      due: 'by Oct 27, 2026, 10:00 AM',
    }),
  },
  manualPaymentReminder: {
    group: 'orders',
    name: 'Manual payment reminder',
    trigger: 'A manual payment hasn’t arrived and the deadline is getting close.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      orderNumber: 1042,
      amount: '$78.30',
      method: 'bKash',
      due: 'by Oct 27, 2026, 10:00 AM',
      orderUrl: `${u.portal}/orders/1042`,
    }),
  },
  manualPaymentRejected: {
    group: 'orders',
    name: 'Manual payment not confirmed',
    trigger: 'You reject a customer’s manual payment details from the admin.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      orderNumber: 1042,
      reason: 'No bKash payment with that transaction ID reached our account.',
      due: 'by Oct 27, 2026, 10:00 AM',
      orderUrl: `${u.portal}/orders/1042`,
    }),
  },
  adminManualPayment: {
    group: 'orders',
    name: 'Manual payment to verify',
    trigger: 'A customer sends the transaction details for a manual payment.',
    audience: 'admin',
    sample: (u) => ({
      orderNumber: 1042,
      customer: 'Ayesha Rahman <ayesha@example.com>',
      amount: '$78.30',
      method: 'bKash',
      reference: 'TXN8K2L9Q',
      senderAccount: '01XXXXXXXXX',
      hasProof: true,
      url: `${u.admin}/orders`,
    }),
  },
  paymentFailed: {
    group: 'orders',
    name: 'Payment failed',
    trigger: 'A payment fails. Abandoned checkouts are cancelled quietly, without this email.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      orderNumber: 1042,
      retryUrl: `${u.portal}/orders/1042`,
    }),
  },
  orderCancelled: {
    group: 'orders',
    name: 'Order cancelled or refunded',
    trigger: 'An order is cancelled or refunded.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      orderNumber: 1042,
      refunded: true,
      supportUrl: `${u.portal}/support`,
    }),
  },

  // ───────────── Delivery ─────────────
  downloadAvailable: {
    group: 'delivery',
    name: 'Download ready',
    trigger: 'A product with files is delivered.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      productName: 'Content OS',
      orderNumber: 1042,
      fileCount: 3,
      url: `${u.portal}/downloads`,
    }),
  },
  githubAccessRequired: {
    group: 'delivery',
    name: 'Connect GitHub',
    trigger: 'A repository product is bought before GitHub is connected.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      productName: 'Content OS source code',
      connectUrl: `${u.portal}/account`,
    }),
  },
  githubInvitationSent: {
    group: 'delivery',
    name: 'GitHub invitation sent',
    trigger: 'The repository invitation is sent to the customer’s GitHub account.',
    audience: 'customer',
    sample: () => ({
      name: 'Ayesha Rahman',
      productName: 'Content OS source code',
      login: 'ayesha-dev',
      invitationUrl: 'https://github.com/notifications',
    }),
  },
  githubAccessReady: {
    group: 'delivery',
    name: 'Repository access ready',
    trigger:
      'The customer’s GitHub account gets access: invitation accepted, or already a collaborator.',
    audience: 'customer',
    sample: () => ({
      name: 'Ayesha Rahman',
      productName: 'Content OS source code',
      repoUrl: 'https://github.com/example/content-os',
    }),
  },
  githubInvitationFailed: {
    group: 'delivery',
    name: 'GitHub delivery needs attention',
    trigger: 'The repository invitation couldn’t be sent.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      productName: 'Content OS source code',
      portalUrl: u.portal,
    }),
  },

  // ───────────── Support ─────────────
  ticketCreated: {
    group: 'support',
    name: 'Ticket received',
    trigger: 'A customer opens a support ticket.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      number: 318,
      subject: 'Can’t find the Notion import guide',
      url: `${u.portal}/support/318`,
    }),
  },
  ticketReply: {
    group: 'support',
    name: 'New reply',
    trigger: 'You reply to a customer’s ticket.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      number: 318,
      subject: 'Can’t find the Notion import guide',
      excerpt:
        'Hi Ayesha, the import guide is the second file in your download, “Start here.pdf”. Page 3 walks through the Notion import step by step.',
      url: `${u.portal}/support/318`,
    }),
  },
  ticketResolved: {
    group: 'support',
    name: 'Ticket resolved',
    trigger: 'A ticket is marked as resolved.',
    audience: 'customer',
    sample: (u) => ({
      name: 'Ayesha Rahman',
      number: 318,
      subject: 'Can’t find the Notion import guide',
      url: `${u.portal}/support/318`,
    }),
  },
  adminTicketNotification: {
    group: 'support',
    name: 'Support alert',
    trigger: 'A customer opens a ticket or replies to one.',
    audience: 'admin',
    sample: (u) => ({
      number: 318,
      subject: 'Can’t find the Notion import guide',
      customer: 'Ayesha Rahman <ayesha@example.com>',
      excerpt: 'I bought Content OS yesterday but can’t find the guide for importing into Notion.',
      url: `${u.admin}/tickets`,
      isReply: false,
    }),
  },

  // ───────────── System ─────────────
  testEmail: {
    group: 'system',
    name: 'Test email',
    trigger: 'You send a test from Settings → Emails.',
    audience: 'admin',
    sample: () => ({ admin: 'you@example.com' }),
  },
};

export const isTemplateKey = (key: string): key is TemplateKey =>
  Object.hasOwn(templateCatalog, key);
