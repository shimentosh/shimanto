import { LegalPage } from '@/components/page/legal-page';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Privacy policy',
  description: 'What shimanto.xyz collects, why, and how you stay in control of it.',
  path: '/legal/privacy',
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      path="/legal/privacy"
      updated={{ iso: '2026-09', label: 'September 2026' }}
      intro="Short version: I collect as little as possible, only use it to reply to you or deliver what you bought, and never sell it."
      sections={[
        {
          heading: 'What is collected',
          paragraphs: ['Only what you give me, plus the minimum needed to keep the site running:'],
          list: [
            'Contact form: your name, email, optional company, budget range, timeline and message, plus the page you sent it from.',
            'Newsletter: your email address, if you subscribe.',
            'Purchases: your name, email and order details. Card details go straight to the payment provider and never touch this site.',
            'Technical data: standard server logs (such as IP address and browser) kept briefly for security and debugging.',
          ],
        },
        {
          heading: 'How it is used',
          paragraphs: [
            'To reply to your message, deliver products, licences and receipts, send the newsletter you asked for, and protect the site from spam and abuse. Nothing else.',
          ],
        },
        {
          heading: 'Cookies and local storage',
          paragraphs: [
            'The site stores your theme choice (light or dark) in your browser. There are no advertising cookies. If analytics are added, they will be privacy-friendly and this page will say so first.',
          ],
        },
        {
          heading: 'Services that process data',
          paragraphs: ['A few trusted providers handle data on my behalf, only as needed:'],
          list: [
            'Cloudflare Turnstile, to check form submissions come from people, not bots.',
            'The payment provider (such as Stripe) for checkout.',
            'An email provider to send replies, receipts and the newsletter.',
            'Hosting and database providers that run the site.',
          ],
        },
        {
          heading: 'How long it is kept',
          paragraphs: [
            'Messages are kept while we are in conversation and for a reasonable time after. Order records are kept as long as tax law requires. You can ask for anything else to be deleted at any time.',
          ],
        },
        {
          heading: 'Your rights',
          paragraphs: [
            'You can ask to see, correct, export or delete your data, and unsubscribe from emails with one click. Get in touch and it will be handled promptly.',
          ],
        },
      ]}
    />
  );
}
