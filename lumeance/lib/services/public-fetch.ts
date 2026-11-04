import "server-only";
import { siteUrl } from "@/lib/env";
import { WATCH_AGENT } from "@/lib/seo/competitors";

const UA = `${WATCH_AGENT}/1.0 (+${siteUrl}/maison)`;
const MAX_BYTES = 2_000_000;

/** Lecture limitée en temps (8 s) et en taille ; null en cas d'échec. */
export async function fetchPublic(url: string): Promise<{ status: number; text: string } | null> {
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xml,text/plain;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    // Après redirection, rester sur un site public en https.
    if (!res.url.startsWith("https://")) return null;
    const buf = await res.arrayBuffer();
    return { status: res.status, text: new TextDecoder().decode(buf.slice(0, MAX_BYTES)) };
  } catch {
    return null;
  }
}

