import type { MetadataRoute } from "next";
import { publishedArticles } from "@/lib/content/journal";
import { getCategories, getProducts } from "@/lib/services/catalog";
import { absoluteUrl } from "@/lib/seo/metadata";

export const dynamic = "force-dynamic";

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
    // Seuls les articles déjà en ligne : les articles programmés apparaissent à leur date.
    ...publishedArticles().map((a) => ({
      url: absoluteUrl(`/journal/${a.slug}`),
      lastModified: new Date(a.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
