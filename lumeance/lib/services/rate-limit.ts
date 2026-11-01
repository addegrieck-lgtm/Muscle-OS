/**
 * Limiteur de débit en mémoire (fenêtre glissante simple), par clé (IP + action).
 * Propre à chaque instance : en production, il est doublé par le limiteur partagé de Cloudflare
 * (voir lib/services/request-guard.ts et `ratelimits` dans wrangler.jsonc).
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
  }
  return true;
}

/**
 * Adresse IP du visiteur. Sur Cloudflare, `cf-connecting-ip` est posé par Cloudflare et ne peut
 * pas être falsifié ; le premier élément de `x-forwarded-for`, lui, est fourni par le client
 * (Cloudflare y AJOUTE l'adresse réelle) : ne s'en servir qu'en dernier recours (développement).
 */
export function clientIp(h: Pick<Headers, "get">): string {
  return (
    h.get("cf-connecting-ip")?.trim() ||
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "local"
  );
}
