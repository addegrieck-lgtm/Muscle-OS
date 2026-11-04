/**
 * Format d'édition des articles dans le studio : texte simple, sans éditeur riche.
 * - Corps : « ## Intertitre » puis paragraphes séparés par une ligne vide.
 * - FAQ : blocs « Q : … » / « R : … » séparés par une ligne vide.
 * - Liens et sources : une ligne par élément, « Libellé | adresse ».
 * Fonctions pures, testées (aller-retour sans perte).
 */
import type { Article } from "./journal";

type Section = Article["sections"][number];
type Faq = NonNullable<Article["faq"]>[number];
export interface LinkItem {
  label: string;
  href: string;
}

export function sectionsToText(sections: Section[]): string {
  return sections.map((s) => [`## ${s.heading}`, ...s.paragraphs].join("\n\n")).join("\n\n");
}

export function textToSections(text: string): Section[] {
  const out: Section[] = [];
  const isHeading = (l: string) => /^#{2,3}\s+/.test(l);
  for (const block of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const lines = block
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    while (lines.length) {
      if (isHeading(lines[0]!)) {
        out.push({
          heading: lines
            .shift()!
            .replace(/^#{2,3}\s+/, "")
            .trim(),
          paragraphs: [],
        });
        continue;
      }
      // Paragraphe : lignes jusqu'au prochain intertitre ou à la ligne vide.
      const next = lines.findIndex(isHeading);
      const para = (next < 0 ? lines.splice(0) : lines.splice(0, next)).join(" ");
      if (!out.length) out.push({ heading: "", paragraphs: [] });
      out[out.length - 1]!.paragraphs.push(para);
    }
  }
  return out.filter((s) => s.heading || s.paragraphs.length);
}

export function faqToText(faq: Faq[]): string {
  return faq.map((f) => `Q : ${f.q}\nR : ${f.a}`).join("\n\n");
}

export function textToFaq(text: string): Faq[] {
  const out: Faq[] = [];
  for (const b of text.replace(/\r\n?/g, "\n").split(/\n\s*\n/)) {
    const q = b.match(/^\s*Q\s*:\s*([\s\S]+?)\n\s*R\s*:\s*([\s\S]+)$/i);
    if (q) out.push({ q: q[1]!.replace(/\s+/g, " ").trim(), a: q[2]!.replace(/\s+/g, " ").trim() });
  }
  return out;
}

export function linksToText(links: LinkItem[]): string {
  return links.map((l) => `${l.label} | ${l.href}`).join("\n");
}

export function textToLinks(text: string): LinkItem[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.split("|").map((x) => x.trim()))
    .filter((p): p is [string, string] => p.length === 2 && !!p[0] && !!p[1])
    .map(([label, href]) => ({ label, href }));
}

/** Nombre de mots du corps, de la FAQ et de l'introduction. */
export function articleWords(a: Pick<Article, "excerpt" | "sections" | "faq">): number {
  const text = [
    a.excerpt,
    ...a.sections.flatMap((s) => [s.heading, ...s.paragraphs]),
    ...(a.faq ?? []).flatMap((f) => [f.q, f.a]),
  ].join(" ");
  return (text.match(/[\p{L}\p{N}’']+/gu) ?? []).length;
}

/** Temps de lecture (environ 200 mots par minute, au moins 1). */
export const readingMinutes = (words: number) => Math.max(1, Math.round(words / 200));

/** Adresse lisible tirée d'un titre (« Éclairer un escalier » → « eclairer-un-escalier »). */
export function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[’']/g, "-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

/** Décalage (minutes) de Paris par rapport à UTC à l'instant donné. */
function parisOffset(ms: number): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Paris",
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
      .formatToParts(new Date(ms))
      .map((x) => [x.type, x.value]),
  );
  const asUtc = Date.UTC(+p.year!, +p.month! - 1, +p.day!, +p.hour!, +p.minute!);
  return Math.round((asUtc - Math.floor(ms / 60000) * 60000) / 60000);
}

/** « 2026-11-10T08:00 » saisi en heure de Paris → ISO UTC. Null si invalide. */
export function parisLocalToIso(local: string): string | null {
  const m = local.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!m) return null;
  const naive = Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!);
  let ms = naive - parisOffset(naive) * 60000;
  ms = naive - parisOffset(ms) * 60000;
  return new Date(ms).toISOString();
}

/** ISO → « 2026-11-10T08:00 » en heure de Paris (champ datetime-local). */
export function isoToParisLocal(iso: string): string {
  const ms = new Date(iso).getTime();
  const d = new Date(ms + parisOffset(ms) * 60000);
  return d.toISOString().slice(0, 16);
}
