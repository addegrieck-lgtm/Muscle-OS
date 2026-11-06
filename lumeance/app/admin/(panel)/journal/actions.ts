"use server";

import { revalidatePublic } from "@/lib/admin/revalidate";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { back, dbError } from "@/lib/admin/redirect";
import { parisLocalToIso } from "@/lib/content/article-format";
import { ALL_ARTICLES } from "@/lib/content/journal";
import { articleToRow } from "@/lib/content/journal-db";
import { PROPOSALS } from "@/lib/content/journal-propositions";
import { readArticleForm } from "@/lib/validation/journal";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const LIST = "/admin/journal";

function refresh(slug?: string) {
  revalidatePublic("/journal");
  if (slug) revalidatePublic(`/journal/${slug}`);
  revalidatePublic("/");
  revalidatePublic(LIST);
}

/** Enregistre un article (création en brouillon, ou mise à jour sans changer son statut). */
export async function saveArticle(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const id = form.get("id");
  const page = typeof id === "string" && id ? `${LIST}/${id}` : `${LIST}/nouveau`;
  const parsed = readArticleForm(form);
  if (!parsed.success) back(page, { erreur: parsed.error.issues[0]!.message });
  const supabase = await createSupabaseServerClient();
  if (typeof id === "string" && id) {
    const { error } = await supabase
      .from("journal_articles")
      .update(parsed.data)
      .eq("id", uuid.parse(id));
    if (error) back(page, { erreur: dbError("saveArticle", error) });
    refresh(parsed.data.slug);
    back(page, { ok: "Article enregistré." });
  }
  const { data, error } = await supabase
    .from("journal_articles")
    .insert({ ...parsed.data, status: "draft", origin: "studio" })
    .select("id")
    .single();
  if (error || !data) back(page, { erreur: dbError("createArticle", error) });
  redirect(`${LIST}/${data.id}?ok=${encodeURIComponent("Brouillon créé.")}`);
}

/**
 * Validation explicite par un administrateur : seule voie de publication. L'article paraît à la
 * date choisie (immédiatement si elle est passée).
 */
export async function publishArticle(form: FormData) {
  const admin = await requireAdmin(CATALOG_ROLES);
  const id = uuid.parse(form.get("id"));
  const page = `${LIST}/${id}`;
  if (form.get("verifie") !== "on")
    back(page, {
      erreur: "Cochez la case de relecture : les informations de l’article ont été vérifiées.",
    });
  const when = String(form.get("published_at") ?? "");
  const at = when ? parisLocalToIso(when) : new Date().toISOString();
  if (!at) back(page, { erreur: "Date de mise en ligne invalide." });
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("journal_articles")
    .update({
      status: "published",
      published_at: at,
      approved_at: new Date().toISOString(),
      approved_by: admin.adminId,
    })
    .eq("id", id)
    .select("slug")
    .single();
  if (error || !data) back(page, { erreur: dbError("publishArticle", error) });
  refresh(data.slug);
  back(page, {
    ok:
      new Date(at) > new Date()
        ? "Article validé : il paraîtra à la date choisie."
        : "Article publié.",
  });
}

async function setStatus(form: FormData, status: "draft" | "review" | "archived", ok: string) {
  await requireAdmin(CATALOG_ROLES);
  const id = uuid.parse(form.get("id"));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("journal_articles")
    .update({ status, approved_at: null, approved_by: null })
    .eq("id", id)
    .select("slug")
    .single();
  if (error || !data) back(`${LIST}/${id}`, { erreur: dbError("articleStatus", error) });
  refresh(data.slug);
  back(`${LIST}/${id}`, { ok });
}

export async function unpublishArticle(form: FormData) {
  await setStatus(form, "draft", "Article retiré du site (repassé en brouillon).");
}
export async function markForReview(form: FormData) {
  await setStatus(form, "review", "Article marqué « à relire ».");
}
export async function archiveArticle(form: FormData) {
  await setStatus(form, "archived", "Article archivé (retiré du site).");
}

export async function deleteArticle(form: FormData) {
  await requireAdmin(CATALOG_ROLES);
  const id = uuid.parse(form.get("id"));
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("journal_articles")
    .delete()
    .eq("id", id)
    .neq("status", "published");
  if (error) back(`${LIST}/${id}`, { erreur: dbError("deleteArticle", error) });
  refresh();
  back(LIST, { ok: "Article supprimé." });
}

/** Ajoute au studio les adresses absentes (rien n'est écrasé). */
async function importMissing(
  rows: ReturnType<typeof articleToRow>[],
  status: "published" | "review",
  adminId: string,
) {
  const supabase = await createSupabaseServerClient();
  const { data: existing, error: rErr } = await supabase.from("journal_articles").select("slug");
  if (rErr) return { error: rErr, count: 0 };
  const taken = new Set((existing ?? []).map((r) => r.slug as string));
  const fresh = rows.filter((r) => !taken.has(r.slug));
  if (!fresh.length) return { error: null, count: 0 };
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("journal_articles")
    .insert(
      fresh.map((r) =>
        status === "published"
          ? { ...r, status, approved_at: now, approved_by: adminId }
          : { ...r, status, published_at: null },
      ),
    );
  return { error, count: error ? 0 : fresh.length };
}

/** Reprend dans le studio les articles écrits dans le code, avec leur date (déjà validés). */
export async function importCodeArticles() {
  const admin = await requireAdmin(CATALOG_ROLES);
  const { error, count } = await importMissing(
    ALL_ARTICLES.map((a) => articleToRow(a, "code")),
    "published",
    admin.adminId,
  );
  if (error) back(LIST, { erreur: dbError("importCodeArticles", error) });
  refresh();
  back(LIST, {
    ok: count
      ? `${count} article(s) repris dans le studio, avec leurs dates.`
      : "Tous les articles sont déjà dans le studio.",
  });
}

/** Ajoute les propositions de la rédaction, en « à relire » : rien n'est publié. */
export async function importProposals() {
  const admin = await requireAdmin(CATALOG_ROLES);
  const { error, count } = await importMissing(
    PROPOSALS.map((a) => articleToRow(a, "proposition")),
    "review",
    admin.adminId,
  );
  if (error) back(LIST, { erreur: dbError("importProposals", error) });
  refresh();
  back(LIST, {
    ok: count
      ? `${count} proposition(s) ajoutée(s), à relire avant publication.`
      : "Aucune nouvelle proposition.",
  });
}
