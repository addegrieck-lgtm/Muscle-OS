import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { rateLimit } from "./rate-limit";

/** Limiteurs déclarés dans wrangler.jsonc (`ratelimits`). */
export type LimiterBinding = "FORMS_LIMITER" | "LOGIN_LIMITER";

interface CloudflareRateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/**
 * Autorise ou refuse une requête :
 * 1. limiteur en mémoire (fenêtre longue, propre à l'instance) ;
 * 2. limiteur partagé de Cloudflare (fenêtre d'une minute, commun à toutes les instances d'un
 *    même centre de données), lorsqu'il est disponible (absent en développement et en test).
 * En cas d'erreur du limiteur Cloudflare, la requête passe : le premier niveau reste actif.
 */
export async function allowRequest(
  key: string,
  limit: number,
  windowMs: number,
  binding: LimiterBinding,
): Promise<boolean> {
  if (!rateLimit(key, limit, windowMs)) return false;
  let limiter: CloudflareRateLimiter | undefined;
  try {
    const { env } = await getCloudflareContext({ async: true });
    limiter = (env as unknown as Record<string, CloudflareRateLimiter | undefined>)[binding];
  } catch {
    return true; // hors Cloudflare (next dev, tests)
  }
  if (!limiter) return true;
  try {
    return (await limiter.limit({ key })).success;
  } catch (e) {
    console.error("rate-limit:", e instanceof Error ? e.message : e);
    return true;
  }
}
