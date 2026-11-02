import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/env";
import { allowRequest } from "@/lib/services/request-guard";
import { cleanPath, deviceOf, isBot, referrerHost, sourceOf } from "@/lib/services/traffic";
import { createSupabaseServiceClient } from "@/lib/supabase/service";

/**
 * Mesure d'audience interne, sans cookie : une ligne par page vue. Le visiteur est une empreinte
 * SHA-256 (adresse IP + navigateur + jour + secret serveur), impossible à relier d'un jour à
 * l'autre ni à une personne ; l'adresse IP n'est jamais enregistrée.
 */
export async function POST(req: Request) {
  const ok = new NextResponse(null, { status: 204 });
  const ua = req.headers.get("user-agent") ?? "";
  if (isBot(ua) || req.headers.get("dnt") === "1" || req.headers.get("sec-gpc") === "1") return ok;
  let body: { path?: unknown; referrer?: unknown };
  try {
    body = await req.json();
  } catch {
    return ok;
  }
  const path = cleanPath(body.path);
  if (!path) return ok;
  const ip = req.headers.get("cf-connecting-ip") ?? "0.0.0.0";
  if (!(await allowRequest(`stats:${ip}`, 120, 60_000, "FORMS_LIMITER"))) return ok;
  const db = createSupabaseServiceClient();
  if (!db) return ok;

  const day = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${ip}|${ua}|${day}|${secret.slice(-24)}`),
  );
  const visitor = [...new Uint8Array(digest)]
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const host = referrerHost(
    typeof body.referrer === "string" ? body.referrer : undefined,
    new URL(siteUrl).hostname,
  );
  const country = (req.headers.get("cf-ipcountry") ?? "").slice(0, 2).toUpperCase() || null;
  const { error } = await db.from("page_views").insert({
    path,
    referrer_host: host,
    source: sourceOf(host),
    device: deviceOf(ua),
    country: country === "XX" || country === "T1" ? null : country,
    visitor,
  });
  if (error) console.error("stats:", error.message);
  else if (Math.random() < 0.01) await db.rpc("purge_page_views");
  return ok;
}
