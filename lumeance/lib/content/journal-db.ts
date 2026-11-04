/**
 * Articles du studio (table journal_articles) : conversion en `Article` et fusion avec les
 * articles écrits dans le code. Fonctions pures, testées.
 */
import type { ArtForm } from "@/types/catalog";
import { articleWords, readingMinutes, type LinkItem } from "./article-format";
import type { Article } from "./journal";

export type ArticleStatus = "draft" | "review" | "published" | "archived";
export const ART_FORMS: ArtForm[] = [
  "cascade",
  "globes",
  "halo",
  "organic",
  "tiers",
  "dome",
  "sconce",
  "floor",
];

export interface ArticleRow {
  id: string;
  slug: string;
  status: ArticleStatus;
  published_at: string | null;
  category: string;
  title: string;
  description: string;
  excerpt: string;
  art: string;
  sections: Article["sections"];
  faq: NonNullable<Article["faq"]>;
  product_slugs: string[];
  related: LinkItem[];
  sources: LinkItem[];
  notes: string | null;
  origin: "studio" | "code" | "proposition";
  approved_at: string | null;
  updated_at: string;
}

export interface StudioArticle extends Article {
  sources: LinkItem[];
}

export function rowToArticle(r: ArticleRow): StudioArticle {
  const base = {
    excerpt: r.excerpt,
    sections: Array.isArray(r.sections) ? r.sections : [],
    faq: Array.isArray(r.faq) && r.faq.length ? r.faq : undefined,
  };
  return {
    slug: r.slug,
    publishedAt: r.published_at ?? r.updated_at,
    category: r.category,
    title: r.title,
    description: r.description,
    art: (ART_FORMS as string[]).includes(r.art) ? (r.art as ArtForm) : "tiers",
    readingMinutes: readingMinutes(articleWords(base)),
    productSlugs: r.product_slugs?.length ? r.product_slugs : undefined,
    related: Array.isArray(r.related) ? r.related : [],
    sources: Array.isArray(r.sources) ? r.sources : [],
    ...base,
  };
}

/** Une ligne est visible du public : validée et date atteinte. */
export const isLive = (r: Pick<ArticleRow, "status" | "published_at">, now = new Date()) =>
  r.status === "published" && !!r.published_at && new Date(r.published_at) <= now;

/**
 * Articles en ligne : ceux du code, sauf ceux repris dans le studio (même adresse, quel que soit
 * leur statut : un article dépublié dans le studio disparaît aussi du site), plus ceux du studio
 * en ligne. Du plus récent au plus ancien.
 */
export function mergeArticles(
  code: Article[],
  rows: ArticleRow[],
  now = new Date(),
): (Article & { sources?: LinkItem[] })[] {
  const taken = new Set(rows.map((r) => r.slug));
  return [
    ...code.filter((a) => !taken.has(a.slug) && new Date(a.publishedAt) <= now),
    ...rows.filter((r) => isLive(r, now)).map(rowToArticle),
  ].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
}

/** Ligne prête à insérer à partir d'un article (import du code ou des propositions). */
export function articleToRow(
  a: Article & { sources?: LinkItem[] },
  origin: ArticleRow["origin"],
): Omit<ArticleRow, "id" | "updated_at" | "status" | "approved_at" | "notes"> {
  return {
    slug: a.slug,
    published_at: a.publishedAt,
    category: a.category,
    title: a.title,
    description: a.description,
    excerpt: a.excerpt,
    art: a.art,
    sections: a.sections,
    faq: a.faq ?? [],
    product_slugs: a.productSlugs ?? [],
    related: a.related,
    sources: a.sources ?? [],
    origin,
  };
}
