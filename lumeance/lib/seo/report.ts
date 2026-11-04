/**
 * Rapport SEO hebdomadaire : évolutions et alertes calculées à partir de données réelles.
 * Fonctions pures, testées.
 */
import type { GscRow } from "./gsc";

export interface Mover {
  key: string;
  before: number | null;
  now: number | null;
  impressions: number;
  clicksNow: number;
  clicksBefore: number;
}

/** Comparaison semaine par semaine d'une dimension (requête ou page). */
export function movers(now: GscRow[], before: GscRow[]): Mover[] {
  const b = new Map(before.map((r) => [r.keys[0]!, r]));
  const n = new Map(now.map((r) => [r.keys[0]!, r]));
  const keys = new Set([...b.keys(), ...n.keys()]);
  return [...keys].map((key) => ({
    key,
    before: b.get(key)?.position ?? null,
    now: n.get(key)?.position ?? null,
    impressions: (n.get(key)?.impressions ?? 0) + (b.get(key)?.impressions ?? 0),
    clicksNow: n.get(key)?.clicks ?? 0,
    clicksBefore: b.get(key)?.clicks ?? 0,
  }));
}

/** Recherches qui ont perdu (ou gagné) au moins `min` places, avec assez d'impressions. */
export function positionChanges(list: Mover[], min = 3, minImpressions = 10) {
  const changed = list.filter(
    (m) => m.now !== null && m.before !== null && m.impressions >= minImpressions,
  );
  return {
    drops: changed
      .filter((m) => m.now! - m.before! >= min)
      .sort((a, b) => b.now! - b.before! - (a.now! - a.before!))
      .slice(0, 10),
    gains: changed
      .filter((m) => m.before! - m.now! >= min)
      .sort((a, b) => b.before! - b.now! - (a.before! - a.now!))
      .slice(0, 10),
  };
}

/** Pages dont les clics baissent d'au moins 30 % (et d'au moins 5 clics). */
export function clickLosses(list: Mover[]) {
  return list
    .filter((m) => m.clicksBefore - m.clicksNow >= 5 && m.clicksNow <= m.clicksBefore * 0.7)
    .sort((a, b) => b.clicksBefore - b.clicksNow - (a.clicksBefore - a.clicksNow))
    .slice(0, 10);
}

export type AlertLevel = "critique" | "attention" | "info";
export interface Alert {
  level: AlertLevel;
  text: string;
  href?: string;
}

export interface ReportFacts {
  gsc: { ok: boolean; clicks?: number; clicksBefore?: number };
  drops: Mover[];
  losses: Mover[];
  auditErrors: number;
  brokenLinks: number;
  orphans: number;
  lostBacklinks: number;
  articlesToReview: number;
  scheduledSoon: number;
  supplierGaps: number;
  indexable: boolean;
}

export function buildAlerts(f: ReportFacts): Alert[] {
  const a: Alert[] = [];
  if (!f.indexable)
    a.push({ level: "critique", text: "Le site est fermé aux moteurs de recherche." });
  if (!f.gsc.ok)
    a.push({
      level: "attention",
      text: "Search Console non connecté : évolutions Google indisponibles.",
      href: "/admin/google",
    });
  if (f.brokenLinks)
    a.push({
      level: "critique",
      text: `${f.brokenLinks} lien(s) interne(s) cassé(s).`,
      href: "/admin/maillage",
    });
  if (f.auditErrors)
    a.push({
      level: "critique",
      text: `${f.auditErrors} erreur(s) à l’audit SEO.`,
      href: "/admin/seo",
    });
  if (
    f.gsc.ok &&
    f.gsc.clicksBefore &&
    f.gsc.clicks !== undefined &&
    f.gsc.clicks <= f.gsc.clicksBefore * 0.7 &&
    f.gsc.clicksBefore - f.gsc.clicks >= 5
  )
    a.push({
      level: "critique",
      text: `Clics Google en baisse : ${f.gsc.clicks} contre ${f.gsc.clicksBefore} la semaine précédente.`,
      href: "/admin/google",
    });
  for (const d of f.drops.slice(0, 5))
    a.push({
      level: "attention",
      text: `« ${d.key} » recule de la position ${d.before!.toFixed(1)} à ${d.now!.toFixed(1)}.`,
      href: "/admin/mots-cles",
    });
  for (const l of f.losses.slice(0, 5))
    a.push({
      level: "attention",
      text: `${l.key} : ${l.clicksNow} clic(s) contre ${l.clicksBefore}.`,
      href: "/admin/google",
    });
  if (f.lostBacklinks)
    a.push({
      level: "attention",
      text: `${f.lostBacklinks} lien(s) externe(s) perdu(s).`,
      href: "/admin/liens-externes?statut=perdu",
    });
  if (f.orphans)
    a.push({
      level: "attention",
      text: `${f.orphans} page(s) sans aucun lien interne.`,
      href: "/admin/maillage",
    });
  if (f.articlesToReview)
    a.push({
      level: "info",
      text: `${f.articlesToReview} article(s) à relire dans le studio.`,
      href: "/admin/journal?statut=review",
    });
  if (f.scheduledSoon)
    a.push({
      level: "info",
      text: `${f.scheduledSoon} article(s) programmé(s) dans les 7 jours.`,
      href: "/admin/journal?statut=scheduled",
    });
  if (f.supplierGaps)
    a.push({
      level: "info",
      text: `${f.supplierGaps} information(s) produit à demander au fournisseur.`,
      href: "/admin/fiches-produits",
    });
  return a;
}

/** Contrôle du jeton de la tâche planifiée (comparaison à temps constant). */
export function validCronToken(header: string | null, secret: string | undefined): boolean {
  if (!secret || secret.length < 24 || !header?.startsWith("Bearer ")) return false;
  const given = header.slice(7);
  if (given.length !== secret.length) return false;
  let diff = 0;
  for (let i = 0; i < secret.length; i++) diff |= given.charCodeAt(i) ^ secret.charCodeAt(i);
  return diff === 0;
}
