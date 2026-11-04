"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { back, dbError } from "@/lib/admin/redirect";
import { domainOf, parseGscLinksExport } from "@/lib/seo/backlinks";
import { verifyBacklinkUrl } from "@/lib/services/backlink-check";
import { isPublicHttpsUrl } from "@/lib/services/public-fetch";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE = "/admin/liens-externes";
const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};
const KINDS = [
  "annuaire",
  "presse",
  "blog",
  "partenaire",
  "fournisseur",
  "reseau",
  "autre",
] as const;
const STATUSES = ["prospect", "contacte", "obtenu", "refuse", "perdu"] as const;

export async function addBacklink(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const raw = s(form, "source_url");
  const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const domain = domainOf(url);
  if (!domain || !isPublicHttpsUrl(url.replace(/^http:/i, "https:")))
    back(PAGE, { erreur: "Adresse de la page source invalide (site public uniquement)." });
  const kind = z.enum(KINDS).catch("autre").parse(s(form, "kind"));
  const status = z.enum(STATUSES).catch("prospect").parse(s(form, "status"));
  const target = s(form, "target_path");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("backlinks").insert({
    source_url: url.slice(0, 600),
    source_domain: domain,
    kind,
    // « Obtenu » se confirme par une vérification : une saisie manuelle part de « contacté ».
    status: status === "obtenu" ? "contacte" : status,
    target_path: /^\/\S*$/.test(target) ? target : null,
    notes: s(form, "notes").slice(0, 1000) || null,
  });
  if (error)
    back(PAGE, {
      erreur:
        error.code === "23505" ? "Cette page est déjà suivie." : dbError("addBacklink", error),
    });
  revalidatePath(PAGE);
  back(PAGE, {
    ok:
      status === "obtenu"
        ? "Ajouté : cliquez sur « Vérifier » pour confirmer la présence du lien."
        : "Ajouté au suivi.",
  });
}

export async function updateBacklink(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const id = z.string().uuid().parse(form.get("id"));
  const status = z.enum(STATUSES).parse(s(form, "status"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("backlinks")
    .update({ status, notes: s(form, "notes").slice(0, 1000) || null })
    .eq("id", id);
  if (error) back(PAGE, { erreur: dbError("updateBacklink", error) });
  revalidatePath(PAGE);
  back(PAGE, { ok: "Suivi mis à jour." });
}

export async function deleteBacklink(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const id = z.string().uuid().parse(form.get("id"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("backlinks").delete().eq("id", id);
  if (error) back(PAGE, { erreur: dbError("deleteBacklink", error) });
  revalidatePath(PAGE);
  back(PAGE, { ok: "Retiré du suivi." });
}

/** Lit la page source (robots.txt respecté) et y cherche un lien vers le site. */
export async function checkBacklink(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const id = z.string().uuid().parse(form.get("id"));
  const supabase = await createSupabaseServerClient();
  const { data: b } = await supabase
    .from("backlinks")
    .select("source_url, status, checked_at")
    .eq("id", id)
    .maybeSingle();
  if (!b) back(PAGE, { erreur: "Lien introuvable." });
  if (b.checked_at && Date.now() - new Date(b.checked_at).getTime() < 10 * 60_000)
    back(PAGE, { erreur: "Vérifié il y a moins de 10 minutes." });
  const r = await verifyBacklinkUrl(b.source_url);
  const { message: msg, ...found } = r;
  const patch: Record<string, unknown> =
    r.check_status === "present"
      ? { ...found, status: "obtenu" }
      : {
          check_status: r.check_status,
          ...(r.check_status === "absent" && b.status === "obtenu" ? { status: "perdu" } : {}),
        };
  const { error } = await supabase
    .from("backlinks")
    .update({ ...patch, checked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) back(PAGE, { erreur: dbError("checkBacklink", error) });
  revalidatePath(PAGE);
  back(PAGE, patch.check_status === "present" ? { ok: msg } : { erreur: msg });
}

/** Import du rapport « Liens » exporté de Search Console (liens constatés par Google). */
export async function importGscLinks(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const urls = parseGscLinksExport(s(form, "csv")).filter(isPublicHttpsUrl).slice(0, 500);
  if (!urls.length) back(PAGE, { erreur: "Aucune adresse reconnue dans le texte collé." });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("backlinks")
    .upsert(
      urls.map((u) => ({
        source_url: u,
        source_domain: domainOf(u)!,
        status: "obtenu",
        origin: "search_console",
        kind: "autre",
      })),
      { onConflict: "source_url", ignoreDuplicates: true },
    )
    .select("id");
  if (error) back(PAGE, { erreur: dbError("importGscLinks", error) });
  revalidatePath(PAGE);
  back(PAGE, { ok: `${data?.length ?? 0} lien(s) ajouté(s) depuis Search Console.` });
}
