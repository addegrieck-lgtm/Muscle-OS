import type { MetadataRoute } from "next";
import { LEADERBOARD_CATEGORIES } from "@vaeloria/config";
import { RANKING_CATEGORIES } from "@vaeloria/types";
import { GUIDES } from "@/content/guides";
import { api, orNull } from "@/lib/api";
import { PREVIEW } from "@/lib/preview";
import { canonicalUrl } from "@/lib/seo";

export const revalidate = 3600;

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

/** Pages éditoriales : toujours indexables, y compris dans l'export statique. */
const CONTENT: [string, number, Freq][] = [
  ["/", 1, "weekly"], ["/factions", 0.9, "monthly"], ["/pvp", 0.9, "monthly"], ["/fonctionnalites", 0.8, "monthly"],
  ["/economie", 0.8, "monthly"], ["/evenements", 0.7, "weekly"], ["/guides", 0.8, "weekly"], ["/faq", 0.7, "monthly"],
  ["/jouer", 0.7, "monthly"], ["/beta", 0.7, "weekly"], ["/voter", 0.5, "monthly"], ["/commandes", 0.6, "monthly"],
  ["/discord", 0.5, "monthly"], ["/rules", 0.4, "monthly"], ["/creators", 0.3, "monthly"], ["/staff", 0.2, "monthly"], ["/support", 0.3, "monthly"],
  ["/mentions-legales", 0.1, "yearly"], ["/confidentialite", 0.1, "yearly"], ["/cookies", 0.1, "yearly"], ["/cgv", 0.1, "yearly"], ["/contact", 0.2, "yearly"],
];

/** Pages alimentées par l'API : vides (et en noindex) dans l'export statique, donc absentes du sitemap. */
const LIVE: [string, number, Freq][] = [
  ["/rejoindre", 0.8, "daily"], ["/monde", 0.8, "daily"], ["/empires", 0.8, "hourly"], ["/guerres", 0.8, "hourly"],
  ["/classements", 0.7, "hourly"], ["/conseil", 0.6, "daily"], ["/fondateurs", 0.7, "daily"], ["/journal", 0.6, "weekly"],
  ["/roadmap", 0.6, "weekly"], ["/seasons", 0.7, "weekly"], ["/news", 0.7, "daily"], ["/boutique", 0.6, "daily"], ["/status", 0.3, "hourly"],
];

const entry = (path: string, priority: number, changeFrequency: Freq, lastModified?: Date) => ({ url: canonicalUrl(path), priority, changeFrequency, ...(lastModified ? { lastModified } : {}) });

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = CONTENT.map(([p, pr, f]) => entry(p, pr, f));
  entries.push(...GUIDES.map((g) => entry(`/guides/${g.slug}`, 0.7, "monthly", new Date(g.updatedAt))));
  if (PREVIEW) return entries;

  entries.push(...LIVE.map(([p, pr, f]) => entry(p, pr, f)));
  entries.push(...LEADERBOARD_CATEGORIES.map((c) => entry(`/leaderboards/${c.id}`, 0.5, "hourly")));
  entries.push(...RANKING_CATEGORIES.map((c) => entry(`/classements/${c.id}`, 0.5, "hourly")));

  const catalog = await orNull(api.shopCatalog());
  entries.push(...(catalog?.categories ?? []).map((c) => entry(`/boutique/${c.slug}`, 0.5, "weekly")));
  entries.push(...(catalog?.products ?? []).map((p) => entry(`/boutique/produit/${p.slug}`, 0.4, "weekly")));

  const news = await orNull(api.news(1));
  entries.push(...(news?.items ?? []).map((a) => entry(`/news/${a.slug}`, 0.6, "monthly", new Date(a.updatedAt))));
  // Profils : les factions du classement (pages à forte valeur), pas les milliers de profils joueurs.
  const factions = await orNull(api.leaderboard("factions"));
  entries.push(...(factions?.entries ?? []).map((f) => entry(`/faction/${encodeURIComponent(f.name)}`, 0.4, "daily")));

  const [empires, wars, events] = await Promise.all([orNull(api.empires()), orNull(api.wars()), orNull(api.events())]);
  entries.push(...(empires?.items ?? []).map((e) => entry(`/empire/${e.slug}`, 0.5, "daily")));
  entries.push(...(wars?.items ?? []).map((w) => entry(`/guerre/${w.slug}`, 0.5, "hourly")));
  entries.push(...(events?.items ?? []).map((e) => entry(`/evenement/${e.slug}`, 0.4, "daily")));
  return entries;
}
