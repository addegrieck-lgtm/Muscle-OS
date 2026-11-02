import type { ProductPromotion } from "@/types/catalog";

/** Remise appliquée aux exemplaires concernés, en % (100 = offerts). */
const percentOf = (p: ProductPromotion) => p.percent ?? 100;

/**
 * Libellé d'une offre par lot : « 3 achetées, la 4ᵉ offerte », « 1 achetée, la 2ᵉ à −50 % ».
 */
export function promotionLabel(p: ProductPromotion): string {
  const n = p.buy + p.free;
  const bought = `${p.buy} achetée${p.buy > 1 ? "s" : ""}`;
  const pct = percentOf(p);
  if (pct < 100)
    return p.free === 1
      ? `${bought}, la ${n}ᵉ à −${pct} %`
      : `${bought}, ${p.free} à −${pct} %`;
  return p.free === 1 ? `${bought}, la ${n}ᵉ offerte` : `${bought}, ${p.free} offertes`;
}

/** Précision affichée sous l'offre, sur la fiche. */
export function promotionHint(p: ProductPromotion): string {
  return percentOf(p) < 100
    ? "Toutes versions et finitions confondues ; la remise s'applique à la moins chère."
    : "Toutes versions et finitions confondues ; la moins chère est offerte.";
}

/** Offre valide : entiers strictement positifs, raisonnables ; pourcentage de 1 à 100. */
export function isValidPromotion(p: unknown): p is ProductPromotion {
  if (!p || typeof p !== "object") return false;
  const { buy, free, percent } = p as Record<string, unknown>;
  return (
    Number.isInteger(buy) &&
    Number.isInteger(free) &&
    (buy as number) >= 1 &&
    (free as number) >= 1 &&
    (buy as number) <= 20 &&
    (free as number) <= 20 &&
    (percent === undefined ||
      percent === null ||
      (Number.isInteger(percent) && (percent as number) >= 1 && (percent as number) <= 100))
  );
}

/**
 * Remise d'une offre par lot sur des prix unitaires (une entrée par exemplaire, toutes versions
 * confondues) : par groupe de buy + free exemplaires, les `free` moins chers sont remisés de
 * `percent` % (offerts par défaut). Montant arrondi au centime.
 */
export function promotionDiscount(unitPrices: number[], p: ProductPromotion): number {
  const count = Math.floor(unitPrices.length / (p.buy + p.free)) * p.free;
  const base = [...unitPrices]
    .sort((a, b) => a - b)
    .slice(0, count)
    .reduce((s, x) => s + x, 0);
  return Math.round((base * percentOf(p)) / 100);
}
