import "server-only";
import { cache } from "react";
import { ALL_ARTICLES, type Article } from "@/lib/content/journal";
import { mergeArticles, rowToArticle, type ArticleRow } from "@/lib/content/journal-db";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import { memo } from "./ttl-memo";

export const ARTICLE_COLUMNS =
  "id, slug, status, published_at, category, title, description, excerpt, art, sections, faq, product_slugs, related, sources, notes, origin, approved_at, updated_at";

/**
 * Lignes du studio utiles au site : celles en ligne, plus l'adresse et le statut de toutes les
 * autres (pour masquer un article du code repris puis dépublié). Base indisponible : le site
 * continue avec les articles du code.
 */
const studioRows = cache(async (): Promise<ArticleRow[]> => {
  if (!isSupabaseConfigured()) return [];
  const db = createSupabaseServiceClient();
  if (!db) {
    // Sans clé de service : lecture publique (articles en ligne uniquement).
    const anon = await createSupabaseServerClient();
    const { data } = await anon.from("journal_articles").select(ARTICLE_COLUMNS);
    return (data as ArticleRow[] | null) ?? [];
  }
  return memo("public:journal", async () => {
    const { data, error } = await db.from("journal_articles").select(ARTICLE_COLUMNS);
    if (error) throw new Error(`${error.code} ${error.message}`);
    return (data as ArticleRow[] | null) ?? [];
  }).catch((e: Error) => {
    console.error("journal:", e.message);
    return [];
  });
});

/** Articles en ligne (code + studio), du plus récent au plus ancien. */
export async function listPublishedArticles(): Promise<
  (Article & { sources?: { label: string; href: string }[] })[]
> {
  return mergeArticles(ALL_ARTICLES, await studioRows());
}

export async function findPublishedArticle(slug: string) {
  return (await listPublishedArticles()).find((a) => a.slug === slug) ?? null;
}

/** Aperçu d'un brouillon par un administrateur (lecture soumise à la RLS de sa session). */
export async function previewArticle(slug: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("journal_articles")
    .select(ARTICLE_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  return data ? rowToArticle(data as ArticleRow) : null;
}
