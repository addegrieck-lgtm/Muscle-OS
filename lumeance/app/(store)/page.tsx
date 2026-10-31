import { Collections } from "@/components/home/Collections";
import { Hero } from "@/components/home/Hero";
import { Immersive } from "@/components/home/Immersive";
import { Manifesto } from "@/components/home/Manifesto";
import { Materials } from "@/components/home/Materials";
import { Newsletter } from "@/components/home/Newsletter";
import { Signature } from "@/components/home/Signature";
import { Intro } from "@/components/motion/Intro";
import { getCategories, getFeaturedProducts } from "@/lib/services/catalog";
import { getHomeContent } from "@/lib/services/content";
import { DEFAULT_DESCRIPTION, pageMetadata } from "@/lib/seo/metadata";

export const revalidate = 300;

export const metadata = pageMetadata({
  title: "LUMÉANCE — L’art de révéler la lumière",
  description: DEFAULT_DESCRIPTION,
  path: "/",
});

export default async function HomePage() {
  const [content, categories, featured] = await Promise.all([
    getHomeContent(),
    getCategories(),
    getFeaturedProducts(3),
  ]);
  return (
    <>
      <Intro />
      <Hero content={content} />
      <Manifesto content={content} />
      <Collections categories={categories} />
      <Signature products={featured} />
      <Immersive quote={content.immersiveQuote} />
      <Materials />
      <Newsletter title={content.newsletterTitle} />
    </>
  );
}
