import { LegalPage } from '@/components/page/legal-page';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Refund policy',
  description: 'How refunds work for products bought on shimanto.xyz.',
  path: '/legal/refund',
});

export default function RefundPage() {
  return (
    <LegalPage
      title="Refund policy"
      path="/legal/refund"
      updated={{ iso: '2026-09', label: 'September 2026' }}
      intro="If something you bought doesn’t work as described, you shouldn’t pay for it. Here is how that works."
      sections={[
        {
          heading: 'Digital products',
          paragraphs: [
            'If a product doesn’t work as described and the problem can’t be fixed, you get a full refund when you ask within 14 days of purchase.',
            'Because digital files can’t be returned, refunds aren’t offered simply for a change of mind once a product has been downloaded or a licence activated.',
          ],
        },
        {
          heading: 'Subscriptions',
          paragraphs: [
            'You can cancel any time and keep access until the end of the period you paid for. Unused time isn’t refunded unless the service failed on my side.',
          ],
        },
        {
          heading: 'Services',
          paragraphs: [
            'Refund terms for custom work are agreed in writing before the project starts.',
          ],
        },
        {
          heading: 'How to ask',
          paragraphs: [
            'Get in touch with your order email and what went wrong. Approved refunds go back to the original payment method, in the currency you paid (USD or BDT). Timing depends on your bank or payment provider.',
          ],
        },
      ]}
    />
  );
}
