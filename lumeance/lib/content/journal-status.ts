import type { ArticleStatus } from "./journal-db";

/** Statut affiché dans le studio (un article validé à date future est « programmé »). */
export function displayStatus(status: ArticleStatus, publishedAt: string | null, now = new Date()) {
  if (status === "published" && publishedAt && new Date(publishedAt) > now)
    return { key: "scheduled", label: "Programmé" };
  return {
    draft: { key: "draft", label: "Brouillon" },
    review: { key: "review", label: "À relire" },
    published: { key: "published", label: "En ligne" },
    archived: { key: "archived", label: "Archivé" },
  }[status];
}
