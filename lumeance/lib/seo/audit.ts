/**
 * Audit SEO du site, calculé à partir des données publiées (pas d'exploration HTML) : titres,
 * descriptions, contenu, images, données structurées, doublons. Fonctions pures (testées).
 */
import { SITE_NAME } from "@/lib/seo/metadata";

export type Severity = "ok" | "warn" | "error";
export interface Check {
  id: string;
  label: string;
  severity: Severity;
  detail: string;
  /** Poids dans le score de la page. */
  weight: number;
}
export interface PageInput {
  path: string;
  kind: "accueil" | "page" | "catégorie" | "produit" | "article";
  name: string;
  /** Titre tel qu'affiché par Google (suffixe compris). */
  title: string;
  description: string;
  /** Texte principal de la page (pour le nombre de mots). */
  text: string;
  /** Mots-clés attendus dans le titre et la description (ex. nom de la pièce). */
  keywords?: string[];
  images?: { alt: string }[];
  /** Données structurées complètes (prix, image…) quand la page en a. */
  structured?: boolean;
  /** Nombre de liens internes vers les pièces ou d'autres pages. */
  internalLinks?: number;
  /** Seuil de mots attendu (contenu). */
  minWords?: number;
  editHref?: string;
}
export interface PageAudit extends PageInput {
  score: number;
  checks: Check[];
  words: number;
}

export const TITLE_SUFFIX = ` · ${SITE_NAME}`;
export const withSuffix = (t: string) => (t.includes(SITE_NAME) ? t : `${t}${TITLE_SUFFIX}`);

export const wordCount = (s: string) => (s.match(/[\p{L}\p{N}’']+/gu) ?? []).length;
const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

function range(
  id: string,
  label: string,
  len: number,
  [min, max]: [number, number],
  weight: number,
  unit = "caractères",
): Check {
  if (len === 0) return { id, label, severity: "error", detail: "Absent.", weight };
  if (len < min)
    return {
      id,
      label,
      severity: "warn",
      detail: `${len} ${unit} : trop court (idéal ${min} à ${max}).`,
      weight,
    };
  if (len > max)
    return {
      id,
      label,
      severity: "warn",
      detail: `${len} ${unit} : sera coupé par Google (idéal ${min} à ${max}).`,
      weight,
    };
  return { id, label, severity: "ok", detail: `${len} ${unit}.`, weight };
}

export function auditPage(
  p: PageInput,
  duplicates: { title: Set<string>; description: Set<string> },
): PageAudit {
  const checks: Check[] = [];
  checks.push(range("title", "Titre", p.title.length, [30, 65], 3));
  checks.push(range("description", "Description", p.description.length, [70, 160], 3));
  if (duplicates.title.has(p.title))
    checks.push({
      id: "title-dup",
      label: "Titre unique",
      severity: "error",
      detail: "Même titre qu’une autre page.",
      weight: 2,
    });
  else
    checks.push({
      id: "title-dup",
      label: "Titre unique",
      severity: "ok",
      detail: "Aucun doublon.",
      weight: 2,
    });
  if (p.description && duplicates.description.has(p.description))
    checks.push({
      id: "desc-dup",
      label: "Description unique",
      severity: "warn",
      detail: "Même description qu’une autre page.",
      weight: 1,
    });
  else if (p.description)
    checks.push({
      id: "desc-dup",
      label: "Description unique",
      severity: "ok",
      detail: "Aucun doublon.",
      weight: 1,
    });

  const words = wordCount(p.text);
  if (p.minWords) {
    const ok = words >= p.minWords;
    checks.push({
      id: "content",
      label: "Contenu",
      severity: ok ? "ok" : words >= p.minWords / 2 ? "warn" : "error",
      detail: ok ? `${words} mots.` : `${words} mots : visez au moins ${p.minWords} mots.`,
      weight: 3,
    });
  }
  if (p.keywords?.length) {
    const k = p.keywords.map(norm);
    const inTitle = k.some((x) => norm(p.title).includes(x));
    const inDesc = k.some((x) => norm(p.description).includes(x));
    checks.push({
      id: "keyword",
      label: "Mot-clé principal",
      severity: inTitle && inDesc ? "ok" : inTitle || inDesc ? "warn" : "error",
      detail:
        inTitle && inDesc
          ? `« ${p.keywords[0]} » présent dans le titre et la description.`
          : `« ${p.keywords[0]} » absent ${inTitle ? "de la description" : inDesc ? "du titre" : "du titre et de la description"}.`,
      weight: 2,
    });
  }
  if (p.images) {
    const missing = p.images.filter((i) => i.alt.trim().length < 15).length;
    checks.push(
      p.images.length === 0
        ? {
            id: "images",
            label: "Images",
            severity: "error",
            detail: "Aucune photographie.",
            weight: 2,
          }
        : missing
          ? {
              id: "images",
              label: "Textes alternatifs",
              severity: "warn",
              detail: `${missing} image(s) sans description suffisante.`,
              weight: 2,
            }
          : {
              id: "images",
              label: "Images",
              severity: "ok",
              detail: `${p.images.length} photo(s), toutes décrites.`,
              weight: 2,
            },
    );
  }
  if (p.structured !== undefined)
    checks.push({
      id: "structured",
      label: "Données structurées",
      severity: p.structured ? "ok" : "warn",
      detail: p.structured
        ? "Fiche produit enrichie (prix, image, disponibilité)."
        : "Incomplètes : prix ou photo manquants.",
      weight: 2,
    });
  if (p.internalLinks !== undefined)
    checks.push({
      id: "links",
      label: "Liens internes",
      severity: p.internalLinks >= 2 ? "ok" : p.internalLinks === 1 ? "warn" : "error",
      detail: `${p.internalLinks} lien(s) vers d’autres pages du site.`,
      weight: 1,
    });

  const total = checks.reduce((s, c) => s + c.weight, 0);
  const got = checks.reduce(
    (s, c) => s + c.weight * (c.severity === "ok" ? 1 : c.severity === "warn" ? 0.5 : 0),
    0,
  );
  return { ...p, checks, words, score: total ? Math.round((got / total) * 100) : 100 };
}

export function auditSite(pages: PageInput[]) {
  const count = (k: "title" | "description") => {
    const m = new Map<string, number>();
    for (const p of pages) if (p[k]) m.set(p[k], (m.get(p[k]) ?? 0) + 1);
    return new Set([...m].filter(([, n]) => n > 1).map(([v]) => v));
  };
  const dup = { title: count("title"), description: count("description") };
  const audits = pages.map((p) => auditPage(p, dup)).sort((a, b) => a.score - b.score);
  const score = audits.length
    ? Math.round(audits.reduce((s, a) => s + a.score, 0) / audits.length)
    : 0;
  const issues = audits.flatMap((a) =>
    a.checks.filter((c) => c.severity !== "ok").map((c) => ({ page: a, check: c })),
  );
  return {
    audits,
    score,
    issues,
    errors: issues.filter((i) => i.check.severity === "error").length,
  };
}
