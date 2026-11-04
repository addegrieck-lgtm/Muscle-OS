import type { MetadataRoute } from "next";
import { ROOMS } from "@/lib/content/home";
import { ROOM_MIN_PRODUCTS, ROOM_SEO, roomProducts } from "@/lib/content/rooms-seo";
import { getCategories, getProducts } from "@/lib/services/catalog";
import { listPublishedArticles } from "@/lib/services/journal";
import { absoluteUrl } from "@/lib/seo/metadata";
import { LEGAL_PATHS, LEGAL_PENDING } from "@/lib/seo/legal";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [categories, products, articles] = await Promise.all([
    getCategories(),
    getProducts(),
    listPublishedArticles(),
  ]);
  const stat = [
    "/",
    "/collections",
    "/maison",
    "/restauration",
    "/avantages",
    "/journal",
    "/contact",
    "/livraison",
    "/avis-clients",
    "/retours",
    "/cgv",
    "/mentions-legales",
    "/confidentialite",
  ];
  return [
    ...stat
      .filter((p) => !(LEGAL_PENDING && LEGAL_PATHS.includes(p)))
      .map((p) => ({
        url: absoluteUrl(p),
        changeFrequency: "weekly" as const,
        priority: p === "/" ? 1 : 0.6,
      })),
    ...categories
      .filter((c) => products.some((p) => p.categorySlug === c.slug))
      .map((c) => ({
        url: absoluteUrl(`/collections/${c.slug}`),
        changeFrequency: "weekly" as const,
        priority: 0.8,
      })),
    // Entrées par pièce, seulement avec assez de pièces en ligne (sinon hors index).
    ...ROOMS.filter(
      (r) => ROOM_SEO[r.id] && roomProducts(r.slugs, products).length >= ROOM_MIN_PRODUCTS,
    ).map((r) => ({
      url: absoluteUrl(`/luminaires/${r.id}`),
      changeFrequency: "weekly" as const,
      priority: 0.7,
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
    ...articles.map((a) => ({
      url: absoluteUrl(`/journal/${a.slug}`),
      lastModified: new Date(a.publishedAt),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];
}
