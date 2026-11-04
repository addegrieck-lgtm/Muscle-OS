import type { Product } from "@/types/catalog";

/** Pièces « dans le même esprit » : même catégorie d'abord, puis les autres. */
export function relatedProducts(all: Product[], product: Product, limit = 3): Product[] {
  return all
    .filter((p) => p.id !== product.id && p.categorySlug === product.categorySlug)
    .concat(all.filter((p) => p.id !== product.id && p.categorySlug !== product.categorySlug))
    .slice(0, limit);
}
