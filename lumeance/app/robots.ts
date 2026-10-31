import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { absoluteUrl } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  if (!publicEnv.NEXT_PUBLIC_INDEXABLE) {
    // Pré-production : rien n'est indexé tant que le domaine et le contenu ne sont pas validés.
    return { rules: { userAgent: "*", disallow: "/" } };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/panier"] },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
