/**
 * Branded email layout, shared by every transactional template. Mirrors the website: warm cream
 * canvas, white card, near-black ink, a solid ink pill button and a green accent. Table-based and
 * inline-styled so it survives Gmail, Outlook and Apple Mail. Plain-text version generated alongside.
 */

export const BRAND = {
  canvas: '#F3EFE4',
  paper: '#FFFFFF',
  ink: '#2C2E2A',
  inkSoft: '#5B5E57',
  line: '#E6E0D3',
  build: '#8FD464',
  create: '#FF7059',
  spark: '#F4E311',
} as const;

export const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

export interface EmailContent {
  /** Hidden preview line shown by inbox list views. */
  preview: string;
  /** Small label above the heading ("Order #1042"). */
  eyebrow?: string;
  heading: string;
  greeting?: string;
  /** Plain-text paragraphs (escaped); blank lines are not needed. */
  paragraphs: string[];
  cta?: { label: string; url: string };
  /** Key/value rows (order totals, account details…). */
  details?: Array<[string, string]>;
  /** Line items: name + amount. */
  items?: Array<{ name: string; amount: string }>;
  /** Smaller print under the CTA (link expiry, security notes). */
  note?: string;
  /** Tone of the accent bar at the top. */
  tone?: 'build' | 'create' | 'spark';
}

export interface LayoutContext {
  storeName: string;
  siteUrl: string;
  supportUrl: string;
}

export interface RenderedEmail {
  html: string;
  text: string;
}

export function renderEmail(content: EmailContent, ctx: LayoutContext): RenderedEmail {
  const accent = BRAND[content.tone ?? 'build'];
  const p = (text: string) =>
    `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${BRAND.ink}">${escapeHtml(text)}</p>`;

  const items = content.items?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 20px;border-top:1px solid ${BRAND.line}">${content.items
        .map(
          (item) =>
            `<tr><td style="padding:12px 0;border-bottom:1px solid ${BRAND.line};font-size:15px;color:${BRAND.ink}">${escapeHtml(item.name)}</td><td align="right" style="padding:12px 0;border-bottom:1px solid ${BRAND.line};font-size:15px;color:${BRAND.ink};white-space:nowrap">${escapeHtml(item.amount)}</td></tr>`,
        )
        .join('')}</table>`
    : '';

  const details = content.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;background:${BRAND.canvas};border-radius:12px">${content.details
        .map(
          ([k, v]) =>
            `<tr><td style="padding:8px 16px;font-size:14px;color:${BRAND.inkSoft}">${escapeHtml(k)}</td><td align="right" style="padding:8px 16px;font-size:14px;color:${BRAND.ink};font-weight:600">${escapeHtml(v)}</td></tr>`,
        )
        .join('')}</table>`
    : '';

  const cta = content.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px"><tr><td style="border-radius:999px;background:${BRAND.ink}"><a href="${escapeHtml(content.cta.url)}" style="display:inline-block;padding:13px 24px;font-size:15px;font-weight:600;color:${BRAND.canvas};text-decoration:none;border-radius:999px">${escapeHtml(content.cta.label)} &rarr;</a></td></tr></table>`
    : '';

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${escapeHtml(content.heading)}</title></head>
<body style="margin:0;padding:0;background:${BRAND.canvas};font-family:'Inter Tight',system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:${BRAND.ink}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(content.preview)}&#8199;&#65279;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.canvas}"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
<tr><td style="padding:0 4px 16px;font-size:18px;font-weight:600;letter-spacing:-0.02em;color:${BRAND.ink}">${escapeHtml(ctx.storeName)}</td></tr>
<tr><td style="background:${BRAND.paper};border-radius:20px;overflow:hidden">
<div style="height:6px;background:${accent}"></div>
<div style="padding:32px">
${content.eyebrow ? `<p style="margin:0 0 8px;font-size:13px;color:${BRAND.inkSoft}">${escapeHtml(content.eyebrow)}</p>` : ''}
<h1 style="margin:0 0 20px;font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.03em;color:${BRAND.ink}">${escapeHtml(content.heading)}</h1>
${content.greeting ? p(content.greeting) : ''}
${content.paragraphs.map(p).join('\n')}
${items}${details}${cta}
${content.note ? `<p style="margin:0;font-size:13px;line-height:1.6;color:${BRAND.inkSoft}">${escapeHtml(content.note)}</p>` : ''}
</div></td></tr>
<tr><td style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:${BRAND.inkSoft}">
Questions? <a href="${escapeHtml(ctx.supportUrl)}" style="color:${BRAND.ink}">Contact support</a> · <a href="${escapeHtml(ctx.siteUrl)}" style="color:${BRAND.ink}">${escapeHtml(ctx.siteUrl.replace(/^https?:\/\//, ''))}</a><br>
You're receiving this email because of activity on your ${escapeHtml(ctx.storeName)} account.
</td></tr>
</table></td></tr></table></body></html>`;

  const text = [
    content.eyebrow,
    content.heading,
    '',
    content.greeting,
    ...content.paragraphs,
    ...(content.items?.map((i) => `- ${i.name}: ${i.amount}`) ?? []),
    ...(content.details?.map(([k, v]) => `${k}: ${v}`) ?? []),
    content.cta ? `\n${content.cta.label}: ${content.cta.url}` : undefined,
    content.note ? `\n${content.note}` : undefined,
    '',
    `— ${ctx.storeName} · ${ctx.siteUrl}`,
    `Support: ${ctx.supportUrl}`,
  ]
    .filter((line) => line !== undefined)
    .join('\n');

  return { html, text };
}
