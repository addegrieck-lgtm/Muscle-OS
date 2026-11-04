/**
 * Liens externes : vérification qu'une page source pointe vers le site, lecture du rapport
 * « Liens » exporté de Search Console. Aucun lien n'est supposé : seule une page lue ou un export
 * Google font foi. Fonctions pures, testées.
 */

export type BacklinkStatus = "prospect" | "contacte" | "obtenu" | "refuse" | "perdu";
export type BacklinkKind =
  "annuaire" | "presse" | "blog" | "partenaire" | "fournisseur" | "reseau" | "autre";

export const STATUS_LABEL: Record<BacklinkStatus, string> = {
  prospect: "À contacter",
  contacte: "Contacté",
  obtenu: "Obtenu",
  refuse: "Refusé",
  perdu: "Perdu",
};
export const KIND_LABEL: Record<BacklinkKind, string> = {
  annuaire: "Annuaire",
  presse: "Presse",
  blog: "Blog déco",
  partenaire: "Partenaire",
  fournisseur: "Fournisseur",
  reseau: "Réseau social",
  autre: "Autre",
};

const decode = (s: string) =>
  s
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/&#0?39;|&apos;|&rsquo;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();

export interface FoundLink {
  href: string;
  anchor: string;
  rel: string;
}

/** Liens d'une page HTML vers le domaine donné (avec ou sans www). */
export function linksTo(html: string, domain: string): FoundLink[] {
  const bare = domain.replace(/^www\./, "").toLowerCase();
  const out: FoundLink[] = [];
  for (const m of html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attrs = m[1]!;
    const href = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1];
    if (!href) continue;
    let host = "";
    try {
      host = new URL(href.replace(/&amp;/g, "&")).hostname.toLowerCase();
    } catch {
      continue;
    }
    if (host !== bare && host !== `www.${bare}`) continue;
    const rel = (attrs.match(/\brel\s*=\s*["']([^"']*)["']/i)?.[1] ?? "").toLowerCase().trim();
    const img = m[2]!.match(/<img[^>]*\balt\s*=\s*["']([^"']*)["']/i)?.[1];
    out.push({ href, anchor: decode(m[2]!) || (img ? `[image] ${img}` : ""), rel });
  }
  return out;
}

/** Le lien transmet-il de la popularité (ni nofollow, ni sponsored, ni ugc) ? */
export const isFollow = (rel: string) => !/\b(nofollow|sponsored|ugc)\b/.test(rel);

export function domainOf(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/**
 * Export CSV du rapport « Liens » de Search Console (« Sites les plus liés » ou « Pages les plus
 * liées ») : première colonne = domaine ou adresse. Renvoie des adresses https normalisées.
 */
export function parseGscLinksExport(csv: string): string[] {
  const out = new Set<string>();
  for (const line of csv.split(/\r?\n/)) {
    const first =
      line
        .split(/[,;\t]/)[0]
        ?.replace(/^"|"$/g, "")
        .trim() ?? "";
    if (!first || /^(site|page|domaine|cible|target|linking|top)/i.test(first)) continue;
    const url = /^https?:\/\//i.test(first) ? first : `https://${first}`;
    try {
      const u = new URL(url);
      if (!/\./.test(u.hostname)) continue;
      out.add(
        u.pathname === "/" && !/^https?:\/\//i.test(first)
          ? `https://${u.hostname}/`
          : u.toString(),
      );
    } catch {
      /* ligne ignorée */
    }
  }
  return [...out];
}

/** Domaines référents distincts parmi les liens obtenus. */
export function referringDomains(rows: { source_domain: string; status: string }[]): number {
  return new Set(rows.filter((r) => r.status === "obtenu").map((r) => r.source_domain)).size;
}
