import { formatPrice } from "@/lib/money";
import { ht } from "@/lib/catalog/tax";

/**
 * Remise professionnelle (restaurants, bars, hôtels, entreprises), par paliers selon le montant
 * HORS TAXES des pièces commandées (toutes pièces comptées, avant remise, hors livraison) :
 *   −5 % dès 500 € HT, −10 % dès 1 500 € HT, −20 % dès 3 000 € HT.
 * Elle porte sur les pièces qui ne sont pas déjà en promotion (offre par lot ou prix barré).
 * Appliquée automatiquement dans le panier des comptes entreprise validés, ou par
 * l'administration dans la commande manuelle (devis).
 */
export const PRO_TIERS = [
  { min: 50000, percent: 5 },
  { min: 150000, percent: 10 },
  { min: 300000, percent: 20 },
] as const;

/** Montant minimal HT de pièces commandées, en centimes. */
export const PRO_DISCOUNT_MIN = PRO_TIERS[0].min;
/** « 500 € HT », pour les textes. */
export const PRO_DISCOUNT_MIN_LABEL = `${formatPrice(PRO_DISCOUNT_MIN)} HT`;
/** Remise la plus forte, en %. */
export const PRO_DISCOUNT_MAX_PERCENT = Math.max(...PRO_TIERS.map((t) => t.percent));
/** « −5 % dès 500 € HT, −10 % dès 1 500 € HT, −20 % dès 3 000 € HT ». */
export const PRO_TIERS_LABEL = PRO_TIERS.map(
  (t) => `−${t.percent} % dès ${formatPrice(t.min)} HT`,
).join(", ");

/** Taux applicable à un montant HT de pièces (centimes) ; 0 sous le premier palier. */
export function proPercent(piecesTotalHT: number): number {
  let percent = 0;
  for (const t of PRO_TIERS) if (piecesTotalHT >= t.min) percent = t.percent;
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
 * Remise sur des lignes (total TTC en centimes) : taux du palier atteint par le montant HT de
 * l'ensemble des pièces, appliqué aux pièces hors promotion ; montant TTC arrondi au centime.
 */
export function proDiscount(lines: { total: number; onPromotion: boolean }[]): {
  percent: number;
  amount: number;
} {
  const percent = proPercent(ht(lines.reduce((s, l) => s + l.total, 0)));
  const base = lines.filter((l) => !l.onPromotion).reduce((s, l) => s + l.total, 0);
  return { percent, amount: Math.round((base * percent) / 100) };
}
