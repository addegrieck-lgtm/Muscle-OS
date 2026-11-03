import type { MetadataRoute } from "next";
import { publicEnv } from "@/lib/env";
import { absoluteUrl } from "@/lib/seo/metadata";

export default function robots(): MetadataRoute.Robots {
  if (!publicEnv.NEXT_PUBLIC_INDEXABLE) {
    // Pré-production : rien n'est indexé tant que le domaine et le contenu ne sont pas validés.
    // Exception : le robot de Pinterest lit les pages publiques (revendication du site,
    // épingles enrichies), sans ouvrir l'indexation aux moteurs de recherche.
    return {
      rules: [
        {
          userAgent: "Pinterestbot",
          allow: "/",
          disallow: ["/admin", "/api", "/panier", "/compte"],
        },
        { userAgent: "*", disallow: "/" },
      ],
    };
  }
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/panier", "/compte"] },
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
