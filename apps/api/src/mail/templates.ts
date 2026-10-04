import type { JobMap } from '../jobs/jobs.types.js';

type Mail = Omit<JobMap['mail.send'], 'to'>;
type Locale = 'en' | 'bn';

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

/** Minimal, client-safe HTML wrapper: one column, system fonts, brand cream. */
function layout(inner: string, lang: Locale) {
  return `<!doctype html><html lang="${lang}"><body style="margin:0;background:#F3EFE4;padding:32px 16px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#2C2E2A"><div style="max-width:560px;margin:0 auto;background:#fff;border-radius:20px;padding:32px;line-height:1.6;font-size:16px">${inner}</div></body></html>`;
}

export interface LeadMailData {
  id: string;
  intent: string;
  name: string;
  email: string;
  company?: string | null;
  budgetRange?: string | null;
  timeline?: string | null;
  message: string;
  source?: string | null;
  locale: Locale;
}

/** Internal notification to Shimanto. Reply-To is the lead, so replying just works. */
export function leadNotification(lead: LeadMailData, adminUrl: string): Mail {
  const rows: Array<[string, string | null | undefined]> = [
    ['Intent', lead.intent],
    ['Name', lead.name],
    ['Email', lead.email],
    ['Company', lead.company],
    ['Budget', lead.budgetRange],
    ['Timeline', lead.timeline],
    ['Language', lead.locale],
    ['From page', lead.source],
  ];
  const present = rows.filter(([, v]) => v);
  const text = `${present.map(([k, v]) => `${k}: ${v}`).join('\n')}\n\n${lead.message}\n\nOpen in admin: ${adminUrl}`;
  const html = layout(
    `<p style="margin:0 0 16px;font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#5B5E57">New lead</p>
     <table style="border-collapse:collapse;width:100%">${present
       .map(
         ([k, v]) =>
           `<tr><td style="padding:4px 12px 4px 0;color:#5B5E57">${k}</td><td style="padding:4px 0">${escape(v!)}</td></tr>`,
       )
       .join('')}</table>
     <p style="white-space:pre-wrap;margin:20px 0;padding:16px;background:#F3EFE4;border-radius:12px">${escape(lead.message)}</p>
     <p><a href="${adminUrl}" style="color:#2C2E2A">Open in admin →</a></p>`,
    'en',
  );
  return {
    subject: `New lead: ${lead.name} (${lead.intent.toLowerCase().replaceAll('_', ' ')})`,
    text,
    html,
    replyTo: lead.email,
  };
}

const autoReplyCopy = {
  en: {
    subject: 'Got your message',
    body: (name: string) =>
      `Hi ${name},\n\nThanks for reaching out. Your message landed safely and I read every one personally. You'll hear back from me within a few working days.\n\nIn the meantime, feel free to look around what I'm building.\n\nShimanto`,
  },
  bn: {
    subject: 'আপনার বার্তা পেয়েছি',
    body: (name: string) =>
      `হ্যালো ${name},\n\nযোগাযোগ করার জন্য ধন্যবাদ। আপনার বার্তা ঠিকঠাক পৌঁছেছে, আর প্রতিটি বার্তা আমি নিজেই পড়ি। কয়েক কর্মদিবসের মধ্যেই উত্তর পাবেন।\n\nততক্ষণে আমি কী কী বানাচ্ছি, ঘুরে দেখতে পারেন।\n\nসীমান্ত`,
  },
} as const;

/** Auto-reply to the lead, in their language. */
export function leadAutoReply(name: string, locale: Locale, siteUrl: string): Mail {
  const copy = autoReplyCopy[locale];
  const text = `${copy.body(name)}\n${siteUrl}`;
  const html = layout(
    `${copy
      .body(escape(name))
      .split('\n\n')
      .map((p) => `<p>${p.replaceAll('\n', '<br>')}</p>`)
      .join(
        '',
      )}<p><a href="${siteUrl}" style="color:#2C2E2A">${siteUrl.replace(/^https?:\/\//, '')}</a></p>`,
    locale,
  );
  return { subject: copy.subject, text, html };
}
