import "server-only";
import { siteUrl } from "@/lib/env";
import { linksTo } from "@/lib/seo/backlinks";
import { robotsAllows } from "@/lib/seo/competitors";
import { fetchPublic, isPublicHttpsUrl } from "./public-fetch";

export interface LinkCheck {
  check_status: "present" | "absent" | "blocked" | "error";
  anchor?: string | null;
  rel?: string | null;
  target_path?: string | null;
  message: string;
}

/** Lit la page source (robots.txt respecté) et y cherche un lien vers le site. */
export async function verifyBacklinkUrl(sourceUrl: string): Promise<LinkCheck> {
  // Les anciennes pages en http sont lues en https (seul protocole autorisé).
  const url = sourceUrl.replace(/^http:/i, "https:");
  if (!isPublicHttpsUrl(url))
    return { check_status: "error", message: "Adresse non publique refusée." };
  const u = new URL(url);
  const robots = await fetchPublic(`${u.origin}/robots.txt`);
  if (!robotsAllows(robots && robots.status < 400 ? robots.text : "", u.pathname))
    return {
      check_status: "blocked",
      message: "Le robots.txt de ce site interdit la vérification : contrôlez à la main.",
    };
  const page = await fetchPublic(url);
  if (!page || page.status >= 400)
    return {
      check_status: "error",
      message: page ? `Page source : HTTP ${page.status}.` : "Page source injoignable.",
    };
  const found = linksTo(page.text, new URL(siteUrl).hostname);
  if (!found.length)
    return { check_status: "absent", message: "Aucun lien vers le site sur cette page." };
  const best = found[0]!;
  let target: string | null = null;
  try {
    target = new URL(best.href).pathname || "/";
  } catch {
    /* adresse illisible */
  }
  return {
    check_status: "present",
    anchor: best.anchor.slice(0, 300) || null,
    rel: best.rel.slice(0, 60) || null,
    target_path: target,
    message: `Lien trouvé${best.anchor ? ` (« ${best.anchor.slice(0, 60)} »)` : ""}.`,
  };
}
