import type { MetadataRoute } from "next";
import { LEADERBOARD_CATEGORIES } from "@vaeloria/config";
import { GUIDES } from "@/content/guides";
import { api, orNull } from "@/lib/api";
import { SITE_URL } from "@/lib/seo";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticPaths: [string, number, MetadataRoute.Sitemap[number]["changeFrequency"]][] = [
    ["/", 1, "daily"], ["/pvp", 0.8, "monthly"], ["/factions", 0.8, "monthly"], ["/seasons", 0.8, "weekly"], ["/leaderboards", 0.7, "hourly"],
    ["/events", 0.7, "daily"], ["/news", 0.7, "daily"], ["/guides", 0.8, "monthly"], ["/faq", 0.6, "monthly"], ["/beta", 0.6, "weekly"],
    ["/boutique", 0.8, "daily"], ["/rules", 0.4, "monthly"], ["/staff", 0.3, "monthly"], ["/support", 0.4, "monthly"], ["/status", 0.3, "hourly"],
    ["/discord", 0.4, "monthly"], ["/creators", 0.3, "monthly"],
    ["/mentions-legales", 0.1, "yearly"], ["/confidentialite", 0.1, "yearly"], ["/cookies", 0.1, "yearly"], ["/cgv", 0.1, "yearly"], ["/contact", 0.2, "yearly"],
  ];
  const entries: MetadataRoute.Sitemap = staticPaths.map(([p, priority, changeFrequency]) => ({ url: `${SITE_URL}${p}`, lastModified: now, priority, changeFrequency }));
  entries.push(...LEADERBOARD_CATEGORIES.map((c) => ({ url: `${SITE_URL}/leaderboards/${c.id}`, lastModified: now, changeFrequency: "hourly" as const, priority: 0.5 })));
  entries.push(...GUIDES.map((g) => ({ url: `${SITE_URL}/guides/${g.slug}`, changeFrequency: "monthly" as const, priority: 0.7 })));

  const catalog = await orNull(api.shopCatalog());
  entries.push(...(catalog?.categories ?? []).map((c) => ({ url: `${SITE_URL}/boutique/${c.slug}`, changeFrequency: "weekly" as const, priority: 0.7 })));
  entries.push(...(catalog?.products ?? []).map((p) => ({ url: `${SITE_URL}/boutique/produit/${p.slug}`, changeFrequency: "weekly" as const, priority: 0.5 })));

  const news = await orNull(api.news(1));
  entries.push(...(news?.items ?? []).map((a) => ({ url: `${SITE_URL}/news/${a.slug}`, lastModified: new Date(a.updatedAt), priority: 0.6 })));
  // Profils : les factions du classement (pages à forte valeur), pas les milliers de profils joueurs.
  const factions = await orNull(api.leaderboard("factions"));
  entries.push(...(factions?.entries ?? []).map((f) => ({ url: `${SITE_URL}/faction/${encodeURIComponent(f.name)}`, changeFrequency: "daily" as const, priority: 0.4 })));
  return entries;
}
