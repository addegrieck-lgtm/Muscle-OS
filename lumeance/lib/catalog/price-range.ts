import type { Product } from "@/types/catalog";

export interface PriceRange {
  /** Prix le plus bas réellement proposé (centimes TTC). */
  min: number;
  /** Prix le plus haut réellement proposé (centimes TTC). */
  max: number;
  /** true si plusieurs prix existent : afficher « dès ». */
  varies: boolean;
}

/**
 * Fourchette de prix d'une pièce. Avec des versions actives, seuls leurs prix comptent (une pièce
 * à versions ne se commande pas au prix de base seul) ; sans version, le prix de base.
 * Fonction pure, utilisée par les cartes, le filtre budget et le tri.
 */
export function priceRange(product: Pick<Product, "price" | "variants">): PriceRange {
  const active = product.variants.filter((v) => v.active);
  const prices = active.length
    ? active.map((v) => product.price + v.priceAdjustment)
    : [product.price];
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, varies: min !== max };
}
