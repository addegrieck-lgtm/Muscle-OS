/**
 * Avis clients vérifiés : règles communes (jetons de demande, validation, synthèse des notes).
 * Fonctions pures, testées (tests/reviews.test.ts). Les accès à la base sont dans
 * lib/services/reviews-db.ts et les actions serveur.
 */
import { z } from "zod";

export const REVIEW_MAX_PHOTOS = 4;
/** Statuts de commande qui ouvrent droit à un avis (marchandise expédiée ou reçue). */
export const REVIEWABLE_ORDER_STATUSES = ["shipped", "delivered"] as const;

/** Jeton aléatoire de 32 octets, en base64url (lien envoyé au client). */
export function newReviewToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Empreinte SHA-256 (hexadécimal) : seule valeur conservée en base. */
export async function hashReviewToken(token: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const isWellFormedToken = (t: unknown): t is string =>
  typeof t === "string" && /^[A-Za-z0-9_-]{40,64}$/.test(t);

export const reviewSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{40,64}$/),
  productId: z.string().uuid(),
  rating: z.coerce.number().int().min(1, "Choisissez une note").max(5),
  authorName: z.string().trim().min(2, "Indiquez un prénom ou des initiales").max(60),
  title: z.string().trim().max(120).optional().default(""),
  body: z
    .string()
    .trim()
    .min(10, "Votre avis est trop court (10 caractères minimum)")
    .max(3000, "Votre avis est trop long (3 000 caractères maximum)"),
  consent: z.literal("on", { message: "Votre accord est nécessaire pour publier l’avis" }),
  website: z.string().max(0).optional().default(""),
});

/** Nom affiché : « Marie D. » à partir du prénom et du nom (jamais le nom complet). */
export function displayName(first?: string | null, last?: string | null): string {
  const f = (first ?? "").trim();
  const l = (last ?? "").trim();
  if (!f) return "";
  return l ? `${f} ${l[0]!.toUpperCase()}.` : f;
}

export interface PublicReview {
  id: string;
  authorName: string;
  rating: number;
  title: string | null;
  body: string;
  photos: string[];
  purchasedAt: string;
  publishedAt: string | null;
  adminReply: string | null;
}

export interface RatingSummary {
  count: number;
  average: number; // arrondi au dixième
  distribution: Record<1 | 2 | 3 | 4 | 5, number>;
}

export function summarize(reviews: Pick<PublicReview, "rating">[]): RatingSummary {
  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } as RatingSummary["distribution"];
  for (const r of reviews) distribution[Math.min(5, Math.max(1, r.rating)) as 1 | 2 | 3 | 4 | 5]++;
  const count = reviews.length;
  const average = count
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
    : 0;
  return { count, average, distribution };
}

/** Date « mois année » (ex. « novembre 2026 »), en heure de Paris. */
export const monthYear = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
