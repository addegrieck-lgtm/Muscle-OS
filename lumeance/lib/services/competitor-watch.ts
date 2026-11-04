import "server-only";
import { fetchPublic as get } from "./public-fetch";
import {
  parsePageMeta,
  parseSitemap,
  robotsAllows,
  robotsSitemaps,
} from "@/lib/seo/competitors";

const MAX_URLS = 5000;

export interface Snapshot {
  status: "ok" | "blocked" | "error";
  message: string | null;
  title: string | null;
  description: string | null;
  structured_types: string[];
  url_count: number | null;
  urls: string[];
}

/**
 * Relevé public d'un site concurrent : page d'accueil (titre, description, données structurées) et
 * plan du site (nombre d'adresses), uniquement si le robots.txt l'autorise. Au plus 1 + 4 pages lues.
 */
export async function takeSnapshot(domain: string): Promise<Snapshot> {
  const base = `https://${domain}`;
  const robotsRes = await get(`${base}/robots.txt`);
  const robots = robotsRes && robotsRes.status < 400 ? robotsRes.text : "";
  const empty = { title: null, description: null, structured_types: [], url_count: null, urls: [] };
  if (!robotsAllows(robots, "/"))
    return { status: "blocked", message: "Le robots.txt du site interdit l’analyse.", ...empty };

  const home = await get(`${base}/`);
  if (!home || home.status >= 400)
    return {
      status: "error",
      message: home ? `Page d’accueil : HTTP ${home.status}` : "Site injoignable.",
      ...empty,
    };
  const meta = parsePageMeta(home.text);

  const declared = robotsSitemaps(robots);
  const queue = (declared.length ? declared : [`${base}/sitemap.xml`]).slice(0, 2);
  const urls = new Set<string>();
  let reads = 0;
  while (queue.length && reads < 4 && urls.size < MAX_URLS) {
    const sm = queue.shift()!;
    let path = "/";
    try {
      const u = new URL(sm);
      const bare = domain.replace(/^www\./, "");
      const sameSite = u.hostname === bare || u.hostname.endsWith(`.${bare}`);
      if (u.protocol !== "https:" || !sameSite) continue;
      path = u.pathname;
    } catch {
      continue;
    }
    if (!robotsAllows(robots, path)) continue;
    reads++;
    const r = await get(sm);
    if (!r || r.status >= 400) continue;
    const parsed = parseSitemap(r.text);
    for (const u of parsed.urls) if (urls.size < MAX_URLS) urls.add(u);
    queue.push(...parsed.sitemaps);
  }
  return {
    status: "ok",
    message: urls.size ? null : "Aucun plan du site lisible.",
    title: meta.title,
    description: meta.description,
    structured_types: meta.structuredTypes,
    url_count: urls.size || null,
    urls: [...urls],
  };
}
