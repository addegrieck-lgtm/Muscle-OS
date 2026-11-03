import type { Product } from "@/types/catalog";
import { priceRange } from "@/lib/catalog/price-range";
import { summarize, type PublicReview } from "@/lib/services/reviews";
import { absoluteUrl, DEFAULT_DESCRIPTION, SITE_NAME } from "./metadata";

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    slogan: "L’art de révéler la lumière.",
    description: DEFAULT_DESCRIPTION,
    url: absoluteUrl("/"),
    logo: absoluteUrl("/brand/logo-principal-ivoire.svg"),
    // Profils officiels de la maison (relient le site à ses comptes pour les moteurs).
    sameAs: ["https://www.pinterest.com/MaisonLumeance/"],
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.path),
    })),
  };
}

/** Données Product : uniquement des informations réelles. Note et avis seulement s'il existe des
 * avis vérifiés publiés ; aucune donnée structurée pour les fiches de démonstration. */
export function productJsonLd(p: Product, reviews: PublicReview[] = []) {
  if (p.isDemo) return null;
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.reference,
    description: p.shortDescription ?? undefined,
    brand: { "@type": "Brand", name: SITE_NAME },
    image: p.images.map((i) => i.url),
    material: p.materials.join(", ") || undefined,
    offers: (() => {
      const { min: low, max: high } = priceRange(p);
      const inStock =
        p.stockQuantity > 0 || p.variants.some((v) => v.active && v.stockQuantity > 0);
      const availability = inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
      return low === high
        ? {
            "@type": "Offer",
            url: absoluteUrl(`/produit/${p.slug}`),
            priceCurrency: "EUR",
            price: (low / 100).toFixed(2),
            availability,
          }
        : {
            "@type": "AggregateOffer",
            url: absoluteUrl(`/produit/${p.slug}`),
            priceCurrency: "EUR",
            lowPrice: (low / 100).toFixed(2),
            highPrice: (high / 100).toFixed(2),
            offerCount: p.variants.filter((v) => v.active).length,
            availability,
          };
    })(),
    ...(reviews.length
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: summarize(reviews).average,
            reviewCount: reviews.length,
            bestRating: 5,
            worstRating: 1,
          },
          review: reviews.slice(0, 10).map((r) => ({
            "@type": "Review",
            author: { "@type": "Person", name: r.authorName },
            datePublished: (r.publishedAt ?? r.purchasedAt).slice(0, 10),
            reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
            ...(r.title ? { name: r.title } : {}),
            reviewBody: r.body,
          })),
        }
      : {}),
  };
}

/** Sérialisation sûre pour <script type="application/ld+json">. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
