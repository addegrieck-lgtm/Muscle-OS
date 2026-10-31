import type { Product } from "@/types/catalog";
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

/** Données Product : uniquement des informations réelles. Pas d'avis, pas de note, pas de
 * disponibilité inventée ; aucune donnée structurée pour les fiches de démonstration. */
export function productJsonLd(p: Product) {
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
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/produit/${p.slug}`),
      priceCurrency: "EUR",
      price: (p.price / 100).toFixed(2),
      availability:
        p.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
  };
}

/** Sérialisation sûre pour <script type="application/ld+json">. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
