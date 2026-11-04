"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { back, dbError } from "@/lib/admin/redirect";
import { INTENTS, normalizeKeyword } from "@/lib/seo/keywords";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const PAGE = "/admin/mots-cles";

const keywordSchema = z.object({
  keyword: z
    .string()
    .transform(normalizeKeyword)
    .pipe(z.string().min(2, "Expression trop courte").max(100)),
  target_path: z
    .string()
    .trim()
    .transform((v) => v || null)
    .pipe(
      z
        .string()
        .regex(/^\/\S*$/, "Page cible : adresse commençant par /")
        .nullable(),
    ),
  intent: z.enum(INTENTS as [string, ...string[]]),
  priority: z.coerce.number().int().min(1).max(3),
});

const field = (f: FormData, k: string) => {
  const v = f.get(k);
  return typeof v === "string" ? v : "";
};

export async function addKeyword(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const parsed = keywordSchema.safeParse({
    keyword: field(form, "keyword"),
    target_path: field(form, "target_path"),
    intent: field(form, "intent") || "commerciale",
    priority: field(form, "priority") || "2",
  });
  if (!parsed.success) back(PAGE, { erreur: parsed.error.issues[0]!.message });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("seo_keywords").insert(parsed.data);
  if (error)
    back(PAGE, {
      erreur: error.code === "23505" ? "Ce mot-clé est déjà suivi." : dbError("addKeyword", error),
    });
  revalidatePath(PAGE);
  back(PAGE, { ok: `« ${parsed.data.keyword} » ajouté au suivi.` });
}

export async function updateKeyword(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const id = z.string().uuid().parse(form.get("id"));
  const parsed = keywordSchema.omit({ keyword: true }).safeParse({
    target_path: field(form, "target_path"),
    intent: field(form, "intent"),
    priority: field(form, "priority"),
  });
  if (!parsed.success) back(PAGE, { erreur: parsed.error.issues[0]!.message });
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("seo_keywords").update(parsed.data).eq("id", id);
  if (error) back(PAGE, { erreur: dbError("updateKeyword", error) });
  revalidatePath(PAGE);
  back(PAGE, { ok: "Mot-clé mis à jour." });
}

export async function deleteKeyword(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const id = z.string().uuid().parse(form.get("id"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("seo_keywords").delete().eq("id", id);
  if (error) back(PAGE, { erreur: dbError("deleteKeyword", error) });
  revalidatePath(PAGE);
  back(PAGE, { ok: "Mot-clé retiré du suivi." });
}
