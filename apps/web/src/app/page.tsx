import {
  CreativeSection,
  HeroSection,
  ManifestoSection,
  NowSection,
  ProductsSection,
  SocialSection,
  WorkSection,
  WritingSection,
} from '@/components/home/sections';

/**
 * Homepage, brief §4 ①–⑨ (⑩ "As seen in" stays hidden until there is real press; ⑪ is the
 * layout footer). Server-rendered with seed copy; Phase 4 adds the intro, GSAP choreography and
 * the 3D hero scene on top of this markup.
 */
export default function HomePage() {
  return (
    <main id="main">
      <HeroSection />
      <ManifestoSection />
      <WorkSection />
      <ProductsSection />
      <WritingSection />
      <NowSection />
      <CreativeSection />
      <SocialSection />
    </main>
  );
}
