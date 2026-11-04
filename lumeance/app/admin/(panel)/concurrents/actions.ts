"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { back, dbError } from "@/lib/admin/redirect";
import { parseEuroInput } from "@/lib/money";
import { normalizeDomain } from "@/lib/seo/competitors";
import { takeSnapshot } from "@/lib/services/competitor-watch";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE = "/admin/concurrents";
const s = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v.trim() : "";
};

export async function addCompetitor(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const domain = normalizeDomain(s(form, "domain"));
  const name = s(form, "name");
  if (!domain) back(PAGE, { erreur: "Adresse du site invalide (ex. exemple-luminaires.fr)." });
  if (name.length < 2) back(PAGE, { erreur: "Indiquez le nom du concurrent." });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("competitors")
    .insert({ name: name.slice(0, 80), domain, notes: s(form, "notes").slice(0, 1000) || null });
  if (error)
    back(PAGE, {
      erreur: error.code === "23505" ? "Ce site est déjà suivi." : dbError("addCompetitor", error),
    });
  revalidatePath(PAGE);
  back(PAGE, { ok: `${name} ajouté à la veille.` });
}

export async function deleteCompetitor(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const id = z.string().uuid().parse(form.get("id"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("competitors").delete().eq("id", id);
  if (error) back(PAGE, { erreur: dbError("deleteCompetitor", error) });
  revalidatePath(PAGE);
  back(PAGE, { ok: "Concurrent retiré (relevés supprimés)." });
}

/** Relevé public à la demande (robots.txt respecté), au plus une fois par heure et par site. */
export async function snapshotCompetitor(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const id = z.string().uuid().parse(form.get("id"));
  const supabase = await createSupabaseServerClient();
  const { data: c } = await supabase
    .from("competitors")
    .select("domain, name")
    .eq("id", id)
    .maybeSingle();
  if (!c) back(PAGE, { erreur: "Concurrent introuvable." });
  const { data: last } = await supabase
    .from("competitor_snapshots")
    .select("taken_at")
    .eq("competitor_id", id)
    .order("taken_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (last && Date.now() - new Date(last.taken_at).getTime() < 3600_000)
    back(PAGE, { erreur: "Relevé déjà fait il y a moins d’une heure : réessayez plus tard." });
  const snap = await takeSnapshot(c.domain);
  const { error } = await supabase
    .from("competitor_snapshots")
    .insert({ competitor_id: id, ...snap, urls: snap.urls.slice(0, 5000) });
  if (error) back(PAGE, { erreur: dbError("snapshotCompetitor", error) });
  revalidatePath(PAGE);
  back(PAGE, {
    ...(snap.status === "ok"
      ? { ok: `Relevé de ${c.name} enregistré.` }
      : { erreur: `${c.name} : ${snap.message}` }),
  });
}

export async function addPrice(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const competitorId = z.string().uuid().safeParse(form.get("competitor_id"));
  const price = parseEuroInput(s(form, "price"));
  const url = s(form, "source_url");
  const label = s(form, "product_label");
  if (!competitorId.success) back(PAGE, { erreur: "Choisissez le concurrent." });
  if (label.length < 2) back(PAGE, { erreur: "Indiquez la pièce relevée." });
  if (!price || !Number.isFinite(price) || price <= 0) back(PAGE, { erreur: "Prix invalide." });
  if (!/^https:\/\/\S+$/.test(url))
    back(PAGE, { erreur: "Source obligatoire : adresse https de la page du prix." });
  const date = s(form, "observed_on");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("competitor_prices").insert({
    competitor_id: competitorId.data,
    product_label: label.slice(0, 160),
    our_slug: s(form, "our_slug") || null,
    price,
    source_url: url,
    ...(/^\d{4}-\d{2}-\d{2}$/.test(date) ? { observed_on: date } : {}),
    notes: s(form, "notes").slice(0, 500) || null,
  });
  if (error) back(PAGE, { erreur: dbError("addPrice", error) });
  revalidatePath(PAGE);
  back(PAGE, { ok: "Relevé de prix enregistré." });
}

export async function deletePrice(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const id = z.string().uuid().parse(form.get("id"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("competitor_prices").delete().eq("id", id);
  if (error) back(PAGE, { erreur: dbError("deletePrice", error) });
  revalidatePath(PAGE);
  back(PAGE, { ok: "Relevé supprimé." });
}
