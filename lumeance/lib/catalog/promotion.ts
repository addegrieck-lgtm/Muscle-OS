import type { ProductPromotion } from "@/types/catalog";

/** Libellé d'une offre par lot : « 3 achetées, la 4ᵉ offerte ». */
export function promotionLabel(p: ProductPromotion): string {
  const n = p.buy + p.free;
  return p.free === 1
    ? `${p.buy} achetées, la ${n}ᵉ offerte`
    : `${p.buy} achetées, ${p.free} offertes`;
}

/** Offre valide : entiers strictement positifs, raisonnables. */
export function isValidPromotion(p: unknown): p is ProductPromotion {
  if (!p || typeof p !== "object") return false;
  const { buy, free } = p as Record<string, unknown>;
  return (
    Number.isInteger(buy) &&
    Number.isInteger(free) &&
    (buy as number) >= 1 &&
    (free as number) >= 1 &&
    (buy as number) <= 20 &&
    (free as number) <= 20
  );
}

/**
 * Remise d'une offre par lot sur des prix unitaires (une entrée par exemplaire, toutes versions
 * confondues) : par groupe de buy + free exemplaires, les `free` moins chers sont offerts.
 */
export function promotionDiscount(unitPrices: number[], p: ProductPromotion): number {
  const freeCount = Math.floor(unitPrices.length / (p.buy + p.free)) * p.free;
  return [...unitPrices]
    .sort((a, b) => a - b)
    .slice(0, freeCount)
    .reduce((s, x) => s + x, 0);
}
