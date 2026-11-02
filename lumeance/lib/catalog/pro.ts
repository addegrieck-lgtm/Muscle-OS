import { formatPrice } from "@/lib/money";

/**
 * Remise professionnelle (restaurants, bars, hôtels), par paliers selon le montant des pièces
 * commandées (toutes pièces comptées, avant remise, hors livraison) :
 *   −10 % dès 500 €, −15 % dès 1 500 €, −20 % dès 3 000 €.
 * Elle porte sur les pièces qui ne sont pas déjà en promotion (offre par lot ou prix barré).
 * Accordée sur devis : appliquée par l'administration dans la commande manuelle.
 */
export const PRO_TIERS = [
  { min: 50000, percent: 10 },
  { min: 150000, percent: 15 },
  { min: 300000, percent: 20 },
] as const;

/** Montant minimal de pièces commandées, en centimes. */
export const PRO_DISCOUNT_MIN = PRO_TIERS[0].min;
/** « 500 € », pour les textes. */
export const PRO_DISCOUNT_MIN_LABEL = formatPrice(PRO_DISCOUNT_MIN);
/** Remise la plus forte, en %. */
export const PRO_DISCOUNT_MAX_PERCENT = Math.max(...PRO_TIERS.map((t) => t.percent));
/** « −10 % dès 500 €, −15 % dès 1 500 €, −20 % dès 3 000 € ». */
export const PRO_TIERS_LABEL = PRO_TIERS.map(
  (t) => `−${t.percent} % dès ${formatPrice(t.min)}`,
).join(", ");

/** Taux applicable à un montant de pièces (centimes) ; 0 sous le premier palier. */
export function proPercent(piecesTotal: number): number {
  let percent = 0;
  for (const t of PRO_TIERS) if (piecesTotal >= t.min) percent = t.percent;
  return percent;
}

/** Pièce déjà en promotion : offre par lot ou prix barré. */
export function isOnPromotion(p: {
  promotion?: unknown;
  price: number;
  compareAtPrice?: number | null;
}): boolean {
  return Boolean(p.promotion) || (p.compareAtPrice != null && p.compareAtPrice > p.price);
}

/**
 * Remise sur des lignes (total en centimes) : taux du palier atteint par l'ensemble des pièces,
 * appliqué aux pièces hors promotion, arrondi au centime.
 */
export function proDiscount(lines: { total: number; onPromotion: boolean }[]): {
  percent: number;
  amount: number;
} {
  const percent = proPercent(lines.reduce((s, l) => s + l.total, 0));
  const base = lines.filter((l) => !l.onPromotion).reduce((s, l) => s + l.total, 0);
  return { percent, amount: Math.round((base * percent) / 100) };
}
