import { LegalPage } from '@/components/page/legal-page';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Terms of use',
  description: 'The ground rules for using shimanto.xyz and the products sold here.',
  path: '/legal/terms',
});

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of use"
      path="/legal/terms"
      updated={{ iso: '2026-09', label: 'September 2026' }}
      intro="By using shimanto.xyz you agree to these terms. They are written to be read, not to trick anyone."
      sections={[
        {
          heading: 'Using the site',
          paragraphs: [
            'You are welcome to read, share and link to anything here. Please don’t try to break, overload or scrape the site in ways that harm it or other visitors.',
          ],
        },
        {
          heading: 'Content and ownership',
          paragraphs: [
            'Writing, playbooks, designs, music and other content on this site belong to Shimanto unless stated otherwise. Quote and share with a link back; don’t republish whole pieces as your own.',
            'Free templates and resources come with the licence stated on their page.',
          ],
        },
        {
          heading: 'Products and licences',
          paragraphs: [
            'Each product page states what you get and the licence that comes with it. Unless that page says otherwise, a licence is for you or your organisation and may not be resold or redistributed.',
          ],
        },
        {
          heading: 'Advice, not guarantees',
          paragraphs: [
            'Notes, playbooks and experiments share what worked for me. They are not professional financial, legal or tax advice, and results depend on your situation.',
          ],
        },
        {
          heading: 'Liability',
          paragraphs: [
            'The site and its free content are provided as they are. As far as the law allows, liability for any purchase is limited to the amount you paid for it.',
          ],
        },
        {
          heading: 'Changes',
          paragraphs: [
            'These terms may be updated as the site grows. The date at the top always shows the latest version.',
          ],
        },
      ]}
    />
  );
}
