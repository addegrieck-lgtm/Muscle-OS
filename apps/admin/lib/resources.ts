/**
 * Description déclarative des contenus éditables (news, événements, produits, FAQ).
 * Un seul formulaire générique + une seule paire de server actions pour tous.
 */
export type Field =
  | { name: string; label: string; kind: "text" | "textarea" | "datetime" | "url"; required?: boolean; column?: string; nullIfEmpty?: boolean }
  | { name: string; label: string; kind: "number"; required?: boolean; column?: string; cents?: boolean; omitIfEmpty?: boolean }
  | { name: string; label: string; kind: "select"; options: [string, string][]; column?: string }
  | { name: string; label: string; kind: "checkbox"; column?: string }
  | { name: string; label: string; kind: "lines"; column?: string };

export interface Resource {
  key: "news" | "events" | "products" | "faq";
  route: string;
  title: string;
  listColumns: [string, string][];
  fields: Field[];
}

const slug: Field = { name: "slug", label: "Slug (URL)", kind: "text", required: true };

export const RESOURCES: Record<string, Resource> = {
  news: {
    key: "news",
    route: "news",
    title: "News",
    listColumns: [["title", "Titre"], ["status", "Statut"], ["category", "Catégorie"], ["published_at", "Publication"]],
    fields: [
      { name: "title", label: "Titre", kind: "text", required: true },
      slug,
      { name: "category", label: "Catégorie", kind: "select", options: [["actualites", "Actualités"], ["serveur", "Serveur"], ["pvp", "PvP"], ["factions", "Factions"], ["minecraft", "Minecraft"], ["guides", "Guides"]] },
      { name: "status", label: "Statut", kind: "select", options: [["draft", "Brouillon"], ["published", "Publié"], ["archived", "Archivé"]] },
      { name: "excerpt", label: "Résumé (meta description)", kind: "textarea" },
      { name: "body", label: "Contenu (Markdown : ## titres, - listes, **gras**, [lien](url))", kind: "textarea" },
      { name: "coverUrl", label: "Image de couverture", kind: "url", column: "cover_url" },
      { name: "publishedAt", label: "Date de publication (vide = maintenant)", kind: "datetime", column: "published_at" },
    ],
  },
  events: {
    key: "events",
    route: "events",
    title: "Événements",
    listColumns: [["title", "Titre"], ["type", "Type"], ["starts_at", "Début"], ["published", "Publié"]],
    fields: [
      { name: "title", label: "Titre", kind: "text", required: true },
      slug,
      { name: "type", label: "Type", kind: "select", options: [["koth", "KOTH"], ["boss", "Boss"], ["tournament", "Tournoi"], ["supply_drop", "Supply drop"], ["war", "Guerre"], ["seasonal", "Saisonnier"], ["other", "Autre"]] },
      { name: "startsAt", label: "Début", kind: "datetime", required: true, column: "starts_at" },
      { name: "endsAt", label: "Fin", kind: "datetime", column: "ends_at" },
      { name: "location", label: "Lieu", kind: "text" },
      { name: "rewards", label: "Récompenses", kind: "text" },
      { name: "description", label: "Description", kind: "textarea" },
      { name: "published", label: "Publié", kind: "checkbox" },
    ],
  },
  faq: {
    key: "faq",
    route: "faq",
    title: "FAQ",
    listColumns: [["question", "Question"], ["position", "Ordre"], ["published", "Publié"]],
    fields: [
      { name: "question", label: "Question", kind: "text", required: true },
      { name: "answer", label: "Réponse", kind: "textarea", required: true },
      { name: "position", label: "Ordre", kind: "number" },
      { name: "published", label: "Publié", kind: "checkbox" },
    ],
  },
};

/** FormData → corps JSON attendu par l'API admin. */
export function formToBody(r: Resource, form: FormData): Record<string, unknown> {
  return fieldsToBody(r.fields, form);
}

export function fieldsToBody(fields: Field[], form: FormData): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  for (const f of fields) {
    const raw = form.get(f.name);
    const str = typeof raw === "string" ? raw.trim() : "";
    switch (f.kind) {
      case "checkbox":
        body[f.name] = raw === "on";
        break;
      case "number":
        if (str === "" && "omitIfEmpty" in f && f.omitIfEmpty) break; // l'API applique sa valeur par défaut
        if (str === "") body[f.name] = null;
        else body[f.name] = "cents" in f && f.cents ? Math.round(Number(str.replace(",", ".")) * 100) : Number(str);
        break;
      case "datetime":
        body[f.name] = str ? new Date(str).toISOString() : null;
        break;
      case "lines":
        body[f.name] = str.split("\n").map((l) => l.trim()).filter(Boolean);
        break;
      case "url":
        body[f.name] = str || null;
        break;
      default:
        body[f.name] = str === "" && "nullIfEmpty" in f && f.nullIfEmpty ? null : str;
    }
  }
  return body;
}
