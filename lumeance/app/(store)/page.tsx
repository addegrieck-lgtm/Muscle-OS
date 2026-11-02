import { Assurances } from "@/components/home/Assurances";
import { BeforeAfter } from "@/components/home/BeforeAfter";
import { Collections } from "@/components/home/Collections";
import { Hero } from "@/components/home/Hero";
import { HeroShowcase } from "@/components/home/HeroShowcase";
import { JournalTeaser } from "@/components/home/JournalTeaser";
import { Manifesto } from "@/components/home/Manifesto";
import { Materials } from "@/components/home/Materials";
import { Newest } from "@/components/home/Newest";
import { Newsletter } from "@/components/home/Newsletter";
import { Offers } from "@/components/home/Offers";
import { Professionals } from "@/components/home/Professionals";
import { Rooms } from "@/components/home/Rooms";
import { Signature } from "@/components/home/Signature";
import { SizeFinder } from "@/components/home/SizeFinder";
import { Intro } from "@/components/motion/Intro";
import { heroImage, heroProducts, newestProducts, sizeSuggestions } from "@/lib/content/home";
import { categoryLabel } from "@/lib/navigation";
import { getCategories, getFeaturedProducts, getProducts } from "@/lib/services/catalog";
import { getHomeContent } from "@/lib/services/content";
import { DEFAULT_DESCRIPTION, pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "LUMÉANCE — L’art de révéler la lumière",
  description: DEFAULT_DESCRIPTION,
  path: "/",
  absoluteTitle: true,
});

export default async function HomePage() {
  const [content, categories, featured, products] = await Promise.all([
    getHomeContent(),
    getCategories(),
    getFeaturedProducts(3),
    getProducts(),
  ]);
  const heroes = heroProducts(products);
  const slides = heroes.map((p) => ({
    slug: p.slug,
    name: p.name,
    category: categoryLabel(p.categorySlug),
    image: heroImage(p)!,
  }));
  const ba = products.find((p) => p.slug === "ginkgo") ?? heroes[0];
  return (
    <>
      <Intro />
      {slides.length ? (
        <HeroShowcase content={content} slides={slides} />
      ) : (
        <Hero content={content} />
      )}
      <Offers products={products} />
      <Assurances />
      <Rooms products={products} />
      <Manifesto content={content} />
      <Newest products={newestProducts(products)} />
      <SizeFinder items={sizeSuggestions(products)} />
      <Signature products={featured} />
      {ba && heroImage(ba) && <BeforeAfter image={heroImage(ba)!} name={ba.name} />}
      <Collections categories={categories} />
      <Professionals />
      <JournalTeaser />
      <Materials />
      <Newsletter title={content.newsletterTitle} />
    </>
  );
}
