/**
 * Calculs sur les données de Google Search Console (fonctions pures, testées). Aucune donnée
 * n'est estimée ni complétée : tout vient de l'API, sinon « Non renseigné ».
 */
export interface GscRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}
export interface Totals {
  clicks: number;
  impressions: number;
  /** Taux de clic (0 à 1) ; null sans impression. */
  ctr: number | null;
  /** Position moyenne pondérée par les impressions ; null sans impression. */
  position: number | null;
}

/** Les données de Search Console arrivent avec 2 à 3 jours de retard. */
export const GSC_LAG_DAYS = 3;

const iso = (d: Date) => d.toISOString().slice(0, 10);

/** Période courante et période précédente de même durée, en dates ISO (UTC). */
export function periods(days: number, today = new Date()) {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  end.setUTCDate(end.getUTCDate() - GSC_LAG_DAYS);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - (days - 1));
  const prevEnd = new Date(start);
  prevEnd.setUTCDate(prevEnd.getUTCDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setUTCDate(prevStart.getUTCDate() - (days - 1));
  return {
    current: { start: iso(start), end: iso(end) },
    previous: { start: iso(prevStart), end: iso(prevEnd) },
  };
}

export function totals(rows: GscRow[]): Totals {
  const clicks = rows.reduce((s, r) => s + r.clicks, 0);
  const impressions = rows.reduce((s, r) => s + r.impressions, 0);
  return {
    clicks,
    impressions,
    ctr: impressions ? clicks / impressions : null,
    position: impressions
      ? rows.reduce((s, r) => s + r.position * r.impressions, 0) / impressions
      : null,
  };
}

/** Lignes quotidiennes (dimension date) réparties entre les deux périodes. */
export function splitByPeriod(rows: GscRow[], p: ReturnType<typeof periods>) {
  const inRange = (d: string, r: { start: string; end: string }) => d >= r.start && d <= r.end;
  return {
    current: rows.filter((r) => inRange(r.keys[0]!, p.current)),
    previous: rows.filter((r) => inRange(r.keys[0]!, p.previous)),
  };
}

/** Série complète jour par jour (les jours sans donnée valent 0). */
export function dailySeries(rows: GscRow[], range: { start: string; end: string }) {
  const by = new Map(rows.map((r) => [r.keys[0]!, r]));
  const out: { date: string; clicks: number; impressions: number }[] = [];
  for (
    let d = new Date(`${range.start}T00:00:00Z`);
    iso(d) <= range.end;
    d.setUTCDate(d.getUTCDate() + 1)
  ) {
    const r = by.get(iso(d));
    out.push({ date: iso(d), clicks: r?.clicks ?? 0, impressions: r?.impressions ?? 0 });
  }
  return out;
}

export interface Opportunity {
  kind: "page2" | "ctr";
  query: string;
  page: string;
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
  advice: string;
}

/**
 * Pistes de travail tirées des données réelles :
 * - « page 2 » : requête vue en position 8 à 20 → enrichir la page, ajouter des liens internes ;
 * - « taux de clic faible » : bien placée (top 5) mais peu cliquée → retravailler titre et
 *   description.
 */
export function opportunities(rows: GscRow[], minImpressions = 10): Opportunity[] {
  const out: Opportunity[] = [];
  for (const r of rows) {
    const [query = "", page = ""] = r.keys;
    if (r.impressions < minImpressions) continue;
    if (r.position >= 8 && r.position <= 20)
      out.push({
        kind: "page2",
        query,
        page,
        ...pick(r),
        advice:
          "Proche de la 1re page : enrichir le texte sur ce sujet et ajouter des liens internes vers cette page.",
      });
    else if (r.position <= 5 && r.ctr < 0.02 && r.impressions >= minImpressions * 3)
      out.push({
        kind: "ctr",
        query,
        page,
        ...pick(r),
        advice:
          "Bien placée mais peu cliquée : rendre le titre et la description plus attractifs pour cette recherche.",
      });
  }
  return out.sort((a, b) => b.impressions - a.impressions).slice(0, 15);
}

const pick = (r: GscRow) => ({
  impressions: r.impressions,
  clicks: r.clicks,
  ctr: r.ctr,
  position: r.position,
});

/** Propriété Search Console à utiliser pour le domaine : domaine entier de préférence. */
export function pickProperty(sites: { siteUrl: string; permissionLevel: string }[], host: string) {
  const bare = host.replace(/^www\./, "");
  const usable = sites.filter((s) => s.permissionLevel !== "siteUnverifiedUser");
  const prefs = [`sc-domain:${bare}`, `https://${bare}/`, `https://www.${bare}/`];
  for (const p of prefs) {
    const hit = usable.find((s) => s.siteUrl === p);
    if (hit) return hit.siteUrl;
  }
  return null;
}

/** Chemin lisible d'une adresse du site (`https://x.fr/produit/a` → `/produit/a`). */
export function pathOf(url: string): string {
  try {
    return new URL(url).pathname || "/";
  } catch {
    return url;
  }
}
