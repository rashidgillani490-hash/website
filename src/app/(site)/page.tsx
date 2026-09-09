import {
  getSiteContent,
  getFeaturedProducts,
  getCollections,
  getOlfactiveFamilies,
  getTestimonials,
} from "@/lib/cms";
import { Hero } from "@/components/home/Hero";
import { BrandIntro } from "@/components/home/BrandIntro";
import { FeaturedFragrances } from "@/components/home/FeaturedFragrances";
import { CollectionsSection } from "@/components/home/CollectionsSection";
import { ShowcaseThree } from "@/components/home/ShowcaseThree";
import { NotesSection } from "@/components/home/NotesSection";
import { BrandStory } from "@/components/home/BrandStory";
import { WhyChooseUs } from "@/components/home/WhyChooseUs";
import { Testimonials } from "@/components/home/Testimonials";
import { CtaSection } from "@/components/home/CtaSection";

export default async function HomePage() {
  const [site, featured, collections, families, testimonials] = await Promise.all([
    getSiteContent(),
    getFeaturedProducts(4),
    getCollections(),
    getOlfactiveFamilies(),
    getTestimonials(),
  ]);

  return (
    <>
      <Hero hero={site.hero} />
      <BrandIntro intro={site.intro} />
      <FeaturedFragrances products={featured} />
      <CollectionsSection collections={collections} />
      <ShowcaseThree products={featured} />
      <NotesSection families={families} />
      <BrandStory story={site.story} />
      <WhyChooseUs values={site.values} />
      <Testimonials items={testimonials} />
      <CtaSection />
    </>
  );
}
