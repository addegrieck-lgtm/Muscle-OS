/**
 * Suivi des mots-clés à partir des données réelles de Google Search Console. Aucun volume de
 * recherche ni difficulté : ces chiffres n'existent pas en source gratuite fiable, ils sont
 * affichés « Non renseigné ». Fonctions pures, testées.
 */
import { pathOf, type GscRow } from "./gsc";

export type Intent = "informationnelle" | "commerciale" | "transactionnelle" | "navigationnelle";
export const INTENTS: Intent[] = [
  "commerciale",
  "transactionnelle",
  "informationnelle",
  "navigationnelle",
];

export interface TrackedKeyword {
  id: string;
  keyword: string;
  target_path: string | null;
  intent: Intent;
  priority: number;
  notes: string | null;
}

/** Forme enregistrée : minuscules, espaces simples. */
export const normalizeKeyword = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

/** Expression régulière (RE2) correspondant exactement aux mots-clés suivis. */
export function keywordRegex(keywords: string[]): string | null {
  const parts = [...new Set(keywords.map(normalizeKeyword).filter(Boolean))].map((k) =>
    k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return parts.length ? `^(${parts.join("|")})$` : null;
}

export interface KeywordStats {
  impressions: number;
  clicks: number;
  ctr: number | null;
  position: number | null;
}

const empty = (): KeywordStats => ({ impressions: 0, clicks: 0, ctr: null, position: null });

/** Agrège des lignes (première dimension = requête) par mot-clé. */
export function statsByKeyword(rows: GscRow[]): Map<string, KeywordStats> {
  const acc = new Map<string, { i: number; c: number; p: number }>();
  for (const r of rows) {
    const k = normalizeKeyword(r.keys[0] ?? "");
    const a = acc.get(k) ?? { i: 0, c: 0, p: 0 };
    a.i += r.impressions;
    a.c += r.clicks;
    a.p += r.position * r.impressions;
    acc.set(k, a);
  }
  return new Map(
    [...acc].map(([k, a]) => [
      k,
      {
        impressions: a.i,
        clicks: a.c,
        ctr: a.i ? a.c / a.i : null,
        position: a.i ? a.p / a.i : null,
      },
    ]),
  );
}

export const statsOf = (m: Map<string, KeywordStats>, k: string) =>
  m.get(normalizeKeyword(k)) ?? empty();

/** Tranche de position, pour les regroupements et les couleurs. */
export function positionBand(p: number | null): "top3" | "top10" | "page2" | "loin" | "absent" {
  if (p === null) return "absent";
  if (p <= 3) return "top3";
  if (p <= 10) return "top10";
  if (p <= 20) return "page2";
  return "loin";
}

/** Évolution de position (positive = progrès, car une position plus petite est meilleure). */
export function positionGain(now: number | null, before: number | null): number | null {
  return now === null || before === null ? null : Math.round((before - now) * 10) / 10;
}

export interface PageShare {
  path: string;
  impressions: number;
  clicks: number;
  position: number;
}

/** Pages qui ressortent pour chaque mot-clé (lignes requête + page), de la plus vue à la moins vue. */
export function pagesByKeyword(rows: GscRow[]): Map<string, PageShare[]> {
  const out = new Map<string, PageShare[]>();
  for (const r of rows) {
    const k = normalizeKeyword(r.keys[0] ?? "");
    const list = out.get(k) ?? [];
    list.push({
      path: pathOf(r.keys[1] ?? ""),
      impressions: r.impressions,
      clicks: r.clicks,
      position: r.position,
    });
    out.set(k, list);
  }
  for (const list of out.values()) list.sort((a, b) => b.impressions - a.impressions);
  return out;
}

/**
 * Cannibalisation : au moins deux pages du site se partagent un mot-clé, chacune avec une part
 * notable des impressions (20 % par défaut). Google hésite alors entre elles.
 */
export function cannibalized(pages: PageShare[], minShare = 0.2): PageShare[] {
  const total = pages.reduce((s, p) => s + p.impressions, 0);
  if (total < 10) return [];
  const strong = pages.filter((p) => p.impressions / total >= minShare);
  return strong.length >= 2 ? strong : [];
}

/** Recherches réelles qui affichent le site mais ne sont pas encore suivies. */
export function discovered(rows: GscRow[], tracked: string[], minImpressions = 3, limit = 30) {
  const known = new Set(tracked.map(normalizeKeyword));
  const stats = statsByKeyword(rows);
  return [...stats]
    .filter(([k, s]) => !known.has(k) && s.impressions >= minImpressions)
    .sort((a, b) => b[1].impressions - a[1].impressions)
    .slice(0, limit)
    .map(([keyword, s]) => ({ keyword, ...s }));
}

/**
 * Pistes d'expressions à suivre, déduites de la structure du site (pages par pièce, collections,
 * guides) : ce sont des propositions, sans aucun chiffre ; seules celles dont la page existe sont
 * retenues.
 */
export const KEYWORD_IDEAS: { keyword: string; target: string; intent: Intent }[] = [
  { keyword: "lustre escalier", target: "/luminaires/escalier", intent: "commerciale" },
  { keyword: "lustre double hauteur", target: "/luminaires/escalier", intent: "commerciale" },
  { keyword: "lustre cage d'escalier", target: "/luminaires/escalier", intent: "commerciale" },
  {
    keyword: "luminaire salle à manger",
    target: "/luminaires/salle-a-manger",
    intent: "commerciale",
  },
  {
    keyword: "suspension îlot cuisine",
    target: "/luminaires/salle-a-manger",
    intent: "commerciale",
  },
  { keyword: "luminaire salon design", target: "/luminaires/salon", intent: "commerciale" },
  { keyword: "applique chambre", target: "/luminaires/chambre", intent: "commerciale" },
  { keyword: "applique couloir", target: "/luminaires/entree", intent: "commerciale" },
  { keyword: "lustre design", target: "/collections/lustres", intent: "commerciale" },
  { keyword: "lustre cristal", target: "/collections/lustres", intent: "commerciale" },
  { keyword: "suspension design", target: "/collections/suspensions", intent: "commerciale" },
  { keyword: "applique murale design", target: "/collections/appliques", intent: "commerciale" },
  { keyword: "luminaire design", target: "/collections", intent: "commerciale" },
  { keyword: "luméance", target: "/", intent: "navigationnelle" },
  { keyword: "maison luméance", target: "/", intent: "navigationnelle" },
];

export function keywordIdeas(tracked: string[], existingPaths: Set<string>) {
  const known = new Set(tracked.map(normalizeKeyword));
  return KEYWORD_IDEAS.filter(
    (i) => !known.has(normalizeKeyword(i.keyword)) && existingPaths.has(i.target),
  );
}
