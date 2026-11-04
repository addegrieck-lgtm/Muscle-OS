import type { Product, ShippingSettings } from "@/types/catalog";
import { categoryLabel } from "@/lib/navigation";
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
    // Image matricielle carrée : format le plus sûr pour le logo affiché par Google.
    logo: absoluteUrl("/brand/icone-512.png"),
    // Profils officiels de la maison (relient le site à ses comptes pour les moteurs).
    sameAs: ["https://www.pinterest.com/MaisonLumeance/"],
  };
}

/** Nom du site affiché par Google au-dessus des résultats. */
export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    alternateName: "Maison LUMÉANCE",
    url: absoluteUrl("/"),
    inLanguage: "fr-FR",
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
/** Dimension en millimètres → valeur schema.org en centimètres. */
const cm = (mm: number | undefined) =>
  typeof mm === "number"
    ? { "@type": "QuantitativeValue", value: mm / 10, unitCode: "CMT" }
    : undefined;

/** Frais de livraison réels de la boutique pour un prix donné (null : inconnu). */
export function shippingRate(s: ShippingSettings | undefined, price: number): number | null {
  if (!s) return null;
  if (s.standardAmount === 0) return 0;
  if (s.freeThreshold > 0 && price >= s.freeThreshold) return 0;
  return s.standardAmount;
}

/**
 * Fiche produit en données structurées : uniquement des informations du catalogue (prix,
 * disponibilité, dimensions, matériaux, finitions), la livraison et le droit de rétractation de
 * 14 jours affichés sur le site, et la note moyenne SEULEMENT s'il existe de vrais avis vérifiés.
 */
export function productJsonLd(
  p: Product,
  reviews: PublicReview[] = [],
  shipping?: ShippingSettings,
) {
  if (p.isDemo) return null;
  const { min: low } = priceRange(p);
  const rate = shippingRate(shipping, low);
  const countries = shipping?.countries.length ? shipping.countries : ["FR"];
  const offerExtras = {
    itemCondition: "https://schema.org/NewCondition",
    seller: { "@type": "Organization", name: SITE_NAME },
    ...(rate !== null
      ? {
          shippingDetails: {
            "@type": "OfferShippingDetails",
            shippingRate: {
              "@type": "MonetaryAmount",
              value: (rate / 100).toFixed(2),
              currency: "EUR",
            },
            shippingDestination: countries.map((c) => ({
              "@type": "DefinedRegion",
              addressCountry: c,
            })),
          },
        }
      : {}),
    // Droit de rétractation légal de 14 jours (page Retours) ; frais de retour non précisés.
    hasMerchantReturnPolicy: {
      "@type": "MerchantReturnPolicy",
      applicableCountry: countries,
      returnPolicyCategory: "https://schema.org/MerchantReturnFiniteReturnWindow",
      merchantReturnDays: 14,
      returnMethod: "https://schema.org/ReturnByMail",
    },
  };
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    sku: p.reference,
    description: p.shortDescription ?? undefined,
    brand: { "@type": "Brand", name: SITE_NAME },
    image: p.images.map((i) => (/^https?:\/\//.test(i.url) ? i.url : absoluteUrl(i.url))),
    url: absoluteUrl(`/produit/${p.slug}`),
    category: p.categorySlug ? categoryLabel(p.categorySlug) : undefined,
    material: p.materials.join(", ") || undefined,
    color: p.finishes.join(", ") || undefined,
    height: cm(p.dimensions.height),
    width: cm(p.dimensions.width ?? p.dimensions.diameter),
    depth: cm(p.dimensions.depth ?? p.dimensions.diameter),
    weight:
      typeof p.weight === "number"
        ? { "@type": "QuantitativeValue", value: p.weight / 1000, unitCode: "KGM" }
        : undefined,
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
            ...offerExtras,
          }
        : {
            "@type": "AggregateOffer",
            url: absoluteUrl(`/produit/${p.slug}`),
            priceCurrency: "EUR",
            lowPrice: (low / 100).toFixed(2),
            highPrice: (high / 100).toFixed(2),
            offerCount: p.variants.filter((v) => v.active).length,
            availability,
            ...offerExtras,
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
