import { csvCell } from '../leads/leads.service.js';
import { leadAutoReply, leadNotification } from '../mail/templates.js';
import { formatMoney, renderTemplate } from '../mail/transactional.js';
import { safeName, sniff } from '../media/media.service.js';
import { signRevalidation } from '../revalidate/revalidate.service.js';

describe('csvCell', () => {
  it('quotes values and escapes quotes', () => {
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('""');
    expect(csvCell(new Date('2026-01-02T03:04:05Z'))).toBe('"2026-01-02T03:04:05.000Z"');
  });

  it.each(['=1+1', '+SUM(A1)', '-2', '@cmd'])('neutralises formula-like %s', (value) => {
    expect(csvCell(value)).toBe(`"'${value}"`);
  });
});

describe('file sniffing', () => {
  it('identifies files by their bytes, not their name', () => {
    expect(sniff(Buffer.from('%PDF-1.7 rest'))?.mime).toBe('application/pdf');
    expect(sniff(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.mime).toBe(
      'image/png',
    );
    expect(sniff(Buffer.from('PK\x03\x04rest', 'binary'))?.mime).toBe('application/zip');
    expect(sniff(Buffer.from('<svg></svg>'))).toBeUndefined();
    expect(sniff(Buffer.from('#!/bin/sh'))).toBeUndefined();
  });

  it('makes safe, readable filenames with the sniffed extension', () => {
    expect(safeName('Founder Guide (v2).PDF', 'pdf')).toBe('founder-guide-v2.pdf');
    expect(safeName('../../etc/passwd', 'pdf')).toBe('passwd.pdf');
    expect(safeName('স্বাগতম.png', 'png')).toBe('file.png');
  });
});

describe('mail templates', () => {
  it('formats receipt amounts and marks free orders', () => {
    expect(formatMoney(4900, 'USD')).toBe('$49.00');
    expect(formatMoney(0, 'USD')).toBe('Free');
  });

  it('escapes user input in HTML emails', () => {
    const mail = leadNotification(
      {
        id: 'l1',
        intent: 'OTHER',
        name: '<script>x</script>',
        email: 'a@b.co',
        message: 'hi <b>',
        locale: 'en',
      },
      'http://admin/leads/l1',
    );
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.replyTo).toBe('a@b.co');
  });

  it('writes to leads in their language', () => {
    expect(leadAutoReply('Rina', 'bn', 'https://shimanto.xyz').text).toContain('হ্যালো Rina');
  });

  const ctx = {
    storeName: 'Shimanto',
    siteUrl: 'https://shimanto.xyz',
    supportUrl: 'https://portal/support',
  };

  it('renders order emails with line items, discount and a link to the order', () => {
    const mail = renderTemplate(
      'paymentSuccessful',
      {
        name: 'Rina Das',
        orderNumber: 7,
        items: [{ name: 'Content OS', quantity: 1, total: 4900 }],
        subtotal: 4900,
        discount: 900,
        total: 4000,
        currency: 'USD',
        couponCode: 'SAVE9',
        orderUrl: 'https://portal/orders/7',
      },
      ctx,
    );
    expect(mail.subject).toContain('#7');
    expect(mail.text).toContain('Hi Rina,');
    expect(mail.text).toContain('Content OS');
    expect(mail.text).toContain('$40.00');
    expect(mail.text).toContain('SAVE9');
    expect(mail.html).toContain('https://portal/orders/7');
  });

  it('escapes customer-provided text in transactional emails', () => {
    const mail = renderTemplate(
      'ticketReply',
      {
        name: '<img src=x>',
        number: 3,
        subject: '<b>help</b>',
        excerpt: '<script>alert(1)</script>',
        url: 'https://portal/support/3',
      },
      ctx,
    );
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).not.toContain('<img src=x>');
    expect(mail.html).toContain('&lt;script&gt;');
  });
});

describe('signRevalidation', () => {
  it('is deterministic and bound to the timestamp', () => {
    const a = signRevalidation('secret', '1000', '{"tags":["products"]}');
    expect(a).toBe(signRevalidation('secret', '1000', '{"tags":["products"]}'));
    expect(a).not.toBe(signRevalidation('secret', '1001', '{"tags":["products"]}'));
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
