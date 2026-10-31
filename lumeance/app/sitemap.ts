import type { MetadataRoute } from "next";
import { ARTICLES } from "@/lib/content/journal";
import { getCategories, getProducts } from "@/lib/services/catalog";
import { absoluteUrl } from "@/lib/seo/metadata";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products] = await Promise.all([getCategories(), getProducts()]);
  const stat = [
    "/",
    "/collections",
    "/maison",
    "/journal",
    "/contact",
    "/livraison",
    "/retours",
    "/cgv",
    "/mentions-legales",
    "/confidentialite",
  ];
  return [
    ...stat.map((p) => ({
      url: absoluteUrl(p),
      changeFrequency: "weekly" as const,
      priority: p === "/" ? 1 : 0.6,
    })),
    ...categories.map((c) => ({
      url: absoluteUrl(`/collections/${c.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    // Les fiches fictives de démonstration ne sont jamais déclarées.
    ...products
      .filter((p) => !p.isDemo)
      .map((p) => ({
        url: absoluteUrl(`/produit/${p.slug}`),
        changeFrequency: "weekly" as const,
        priority: 0.7,
      })),
    ...ARTICLES.map((a) => ({
      url: absoluteUrl(`/journal/${a.slug}`),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
