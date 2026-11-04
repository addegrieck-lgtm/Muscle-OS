import "server-only";
import { siteUrl } from "@/lib/env";
import { normalizeDomain, WATCH_AGENT } from "@/lib/seo/competitors";

const UA = `${WATCH_AGENT}/1.0 (+${siteUrl}/maison)`;
const MAX_BYTES = 2_000_000;
const MAX_REDIRECTS = 4;

/** Adresse lisible par la veille : https, nom de domaine public (ni IP, ni nom interne). */
export function isPublicHttpsUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && !u.port && normalizeDomain(u.hostname) === u.hostname;
  } catch {
    return false;
  }
}

/**
 * Lecture d'une page publique : https uniquement, chaque redirection revérifiée (au plus 4),
 * 8 s et 2 Mo au maximum ; null en cas d'échec ou d'adresse refusée.
 */
export async function fetchPublic(url: string): Promise<{ status: number; text: string } | null> {
  let current = url;
  try {
    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      if (!isPublicHttpsUrl(current)) return null;
      const res = await fetch(current, {
        headers: { "user-agent": UA, accept: "text/html,application/xml,text/plain;q=0.9" },
        redirect: "manual",
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      });
      if (res.status >= 300 && res.status < 400) {
        const next = res.headers.get("location");
        if (!next) return null;
        current = new URL(next, current).toString();
        continue;
      }
      const buf = await res.arrayBuffer();
      return { status: res.status, text: new TextDecoder().decode(buf.slice(0, MAX_BYTES)) };
    }
    return null;
  } catch {
    return null;
  }
}
