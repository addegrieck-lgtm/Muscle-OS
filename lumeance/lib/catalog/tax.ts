/** TVA française au taux normal, applicable aux luminaires. Les prix du catalogue sont TTC. */
export const VAT_RATE = 0.2;

/** Montant hors taxes (centimes) d'un montant TTC, arrondi au centime. */
export const ht = (ttcCents: number): number => Math.round(ttcCents / (1 + VAT_RATE));
