import { Squiggle } from '@shimanto/ui';
import { EmptyState } from '@/components/page/empty-state';
import { PageHero } from '@/components/page/page-hero';
import { Section } from '@/components/page/section';
import { pageMetadata } from '@/lib/seo';

export const metadata = pageMetadata({
  title: 'Featured',
  description: 'Media, press, podcasts and talks featuring Shimanto.',
  path: '/featured',
});

export default function FeaturedPage() {
  return (
    <main id="main">
      <PageHero
        art="mic"
        eyebrow="Featured"
        stickers={['Press', 'Podcasts', 'Talks']}
        world="idea"
        crumbs={[{ label: 'Featured', href: '/featured' }]}
        title={
          <>
            Press, podcasts &amp; <Squiggle world="idea">talks</Squiggle>.
          </>
        }
        intro="Interviews, features and stages. Listed only when they have actually happened."
      />
      <Section className="pb-32 md:pb-40">
        <EmptyState
          art="megaphone"
          tone="idea"
          title="Nothing listed yet, by design."
          body="No logo walls of maybes. For interviews, podcasts or speaking, get in touch directly."
          cta={{ href: '/collaborate?intent=SPEAKING', label: 'Invite me to speak' }}
        />
      </Section>
    </main>
  );
}
