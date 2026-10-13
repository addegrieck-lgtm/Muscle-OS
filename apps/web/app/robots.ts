import type { MetadataRoute } from "next";
import { INDEXABLE } from "@/lib/preview";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // L'aperçu GitHub Pages ne doit pas être indexé : il ferait doublon avec le site public.
  if (!INDEXABLE) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    // Espaces privés et parcours de paiement : inutiles dans les résultats (ils portent aussi un noindex).
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/account", "/compte", "/checkout", "/login", "/boutique/panier", "/invite/", "/empires/creer"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
