/**
 * Veille concurrentielle : analyse de pages PUBLIQUES (robots.txt respecté) et comparaison de
 * relevés de prix saisis à la main. Aucun trafic, classement ou volume concurrent n'est estimé.
 * Fonctions pures, testées.
 */

export const WATCH_AGENT = "LumeanceVeille";

/** Domaine saisi (« https://www.exemple.fr/page ») → « www.exemple.fr » ; null si refusé. */
export function normalizeDomain(input: string): string | null {
  let host = input.trim().toLowerCase();
  try {
    host = new URL(/^[a-z]+:\/\//.test(host) ? host : `https://${host}`).hostname;
  } catch {
    return null;
  }
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(host)) return null;
  // Pas d'adresse IP ni de nom interne : seuls des sites publics sont analysés.
  if (/^\d+(\.\d+){3}$/.test(host)) return null;
  if (/(^|\.)(localhost|local|internal|lan|home|corp|test|example|invalid)$/.test(host))
    return null;
  return host;
}

interface Rule {
  allow: boolean;
  path: string;
}

/** Règles robots.txt applicables à notre robot (groupe nommé, sinon « * »). */
function robotsRules(robots: string, agent = WATCH_AGENT): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let cur: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1]!.toLowerCase();
    const val = m[2]!.trim();
    if (key === "user-agent") {
      if (!cur || !lastWasAgent) {
        cur = { agents: [], rules: [] };
        groups.push(cur);
      }
      cur.agents.push(val.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!cur) continue;
    if (key === "disallow" && val) cur.rules.push({ allow: false, path: val });
    if (key === "allow" && val) cur.rules.push({ allow: true, path: val });
  }
  const named = groups.filter((g) =>
    g.agents.some((a) => a !== "*" && agent.toLowerCase().startsWith(a)),
  );
  const chosen = named.length ? named : groups.filter((g) => g.agents.includes("*"));
  return chosen.flatMap((g) => g.rules);
}

function toRegex(p: string): RegExp {
  const end = p.endsWith("$");
  const body = (end ? p.slice(0, -1) : p)
    .split("*")
    .map((x) => x.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${end ? "$" : ""}`);
}

/** Le chemin est-il autorisé à notre robot ? (règle la plus longue ; égalité : autorisé). */
export function robotsAllows(robots: string, path: string, agent = WATCH_AGENT): boolean {
  let best: Rule | null = null;
  for (const r of robotsRules(robots, agent)) {
    if (!toRegex(r.path).test(path)) continue;
    if (
      !best ||
      r.path.length > best.path.length ||
      (r.path.length === best.path.length && r.allow)
    )
      best = r;
  }
  return best ? best.allow : true;
}

export function robotsSitemaps(robots: string): string[] {
  return [...robots.matchAll(/^\s*sitemap\s*:\s*(\S+)/gim)].map((m) => m[1]!);
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Titre, description et types de données structurées d'une page HTML. */
export function parsePageMeta(html: string) {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const desc =
    html.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i)?.[1] ??
    html.match(/<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i)?.[1];
  const types = new Set<string>();
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi))
    for (const t of m[1]!.matchAll(/"@type"\s*:\s*"([A-Za-z]+)"/g)) types.add(t[1]!);
  return {
    title: title ? decode(title).slice(0, 300) : null,
    description: desc ? decode(desc).slice(0, 600) : null,
    structuredTypes: [...types].slice(0, 20),
  };
}

/** Adresses d'un plan du site, ou sous-plans d'un index. */
export function parseSitemap(xml: string): { urls: string[]; sitemaps: string[] } {
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => decode(m[1]!));
  return /<sitemapindex/i.test(xml) ? { urls: [], sitemaps: locs } : { urls: locs, sitemaps: [] };
}

/** Adresses apparues depuis le relevé précédent. */
export function newUrls(previous: string[], current: string[]): string[] {
  const before = new Set(previous);
  return current.filter((u) => !before.has(u));
}

/** Écart de prix (%) entre notre pièce et le relevé concurrent ; positif = nous sommes plus chers. */
export function priceGap(ours: number, theirs: number): number {
  return Math.round(((ours - theirs) / theirs) * 1000) / 10;
}
