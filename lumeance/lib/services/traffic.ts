/** Classement d'une visite : source, appareil, robots. Fonctions pures (testées). */

const SEARCH = /(^|\.)(google|bing|duckduckgo|qwant|ecosia|yahoo|yandex|baidu|startpage|brave)\./;
const SOCIAL =
  /(^|\.)(facebook|instagram|pinterest|linkedin|tiktok|twitter|x|t|youtube|snapchat|reddit|threads)\.(com|co|net|fr)$|(^|\.)lnkd\.in$|(^|\.)fb\.me$/;
const BOT =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|headless|lighthouse|pingdom|monitor|curl|wget|python|axios|node-fetch|go-http/i;

export const isBot = (ua: string) => !ua || BOT.test(ua);

export function deviceOf(ua: string): "desktop" | "mobile" | "tablet" {
  if (/ipad|tablet|(android(?!.*mobile))/i.test(ua)) return "tablet";
  if (/mobi|iphone|android/i.test(ua)) return "mobile";
  return "desktop";
}

/** Hôte du référent externe (null si absent, invalide ou interne au site). */
export function referrerHost(referrer: string | undefined, siteHost: string): string | null {
  if (!referrer) return null;
  try {
    const h = new URL(referrer).hostname.replace(/^www\./, "").toLowerCase();
    return h && h !== siteHost.replace(/^www\./, "") ? h.slice(0, 120) : null;
  } catch {
    return null;
  }
}

export function sourceOf(host: string | null): "direct" | "search" | "social" | "site" {
  if (!host) return "direct";
  if (SEARCH.test(host)) return "search";
  if (SOCIAL.test(host)) return "social";
  return "site";
}

/** Chemin publié : sans paramètres ni fragment, pages d'administration et API exclues. */
export function cleanPath(path: unknown): string | null {
  if (typeof path !== "string" || !path.startsWith("/") || path.length > 300) return null;
  const p = path.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
  if (/^\/(admin|api|_next)(\/|$)/.test(p)) return null;
  return p;
}
