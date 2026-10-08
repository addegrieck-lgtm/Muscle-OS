import type { MetadataRoute } from "next";
import { PREVIEW } from "@/lib/preview";
import { SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  // L'aperçu ne doit pas être indexé : il ferait doublon avec le futur site officiel.
  if (PREVIEW) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/account", "/compte", "/checkout", "/login", "/boutique/panier", "/invite/", "/empires/creer"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
