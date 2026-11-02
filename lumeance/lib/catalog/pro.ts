/**
 * Remise professionnelle (restaurants, bars, hôtels) : −20 % sur le prix de vente des pièces,
 * hors pièces déjà en promotion (offre par lot ou prix barré), dès 500 € de pièces commandées
 * (toutes pièces comptées, avant remise). Hors frais de livraison.
 * Accordée sur devis : appliquée par l'administration dans la commande manuelle.
 */
export const PRO_DISCOUNT_PERCENT = 20;
/** Montant minimal de pièces commandées, en centimes. */
export const PRO_DISCOUNT_MIN = 50000;
/** « 500 € », pour les textes. */
export const PRO_DISCOUNT_MIN_LABEL = `${PRO_DISCOUNT_MIN / 100}\u00a0€`;

/** Pièce déjà en promotion : offre par lot ou prix barré. */
export function isOnPromotion(p: {
  promotion?: unknown;
  price: number;
  compareAtPrice?: number | null;
}): boolean {
  return Boolean(p.promotion) || (p.compareAtPrice != null && p.compareAtPrice > p.price);
}

/**
 * Montant de la remise sur des lignes (total en centimes), arrondi au centime ; 0 sous le
 * minimum de commande.
 */
export function proDiscount(lines: { total: number; onPromotion: boolean }[]): number {
  const all = lines.reduce((s, l) => s + l.total, 0);
  if (all < PRO_DISCOUNT_MIN) return 0;
  const base = lines.filter((l) => !l.onPromotion).reduce((s, l) => s + l.total, 0);
  return Math.round((base * PRO_DISCOUNT_PERCENT) / 100);
}
