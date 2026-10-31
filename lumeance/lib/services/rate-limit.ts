/**
 * Limiteur de débit en mémoire (fenêtre glissante simple), par clé (IP + action).
 * Suffisant pour freiner les abus sur une instance ; en production multi-instances, le remplacer
 * par un stockage partagé (ex. table Postgres ou Redis) — voir docs/SECURITE.md.
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
