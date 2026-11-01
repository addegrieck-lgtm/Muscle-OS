import "server-only";
import { cache } from "react";
import { isSupabaseConfigured } from "@/lib/env";
import { PUBLISHED_CATALOG } from "@/lib/catalog/products";
import { DEMO_CATEGORIES, DEMO_PRODUCTS } from "@/lib/demo/catalog";
import { createSupabasePublicClient, storagePublicUrl } from "@/lib/supabase/public";
import { mapCategory, mapProduct, type CategoryRow, type ProductRow } from "./mappers";
import type { Category, Product } from "@/types/catalog";

export const PRODUCT_SELECT =
  "*, categories(slug), product_images(id, storage_path, alt_text, position, is_primary), product_variants(id, name, sku, finish, price_adjustment, stock_quantity, active)";

/** Catalogue réel dans le code (provisoire) : actif dès qu'une fiche y est publiée. */
function usesCodeCatalog(): boolean {
  return !isSupabaseConfigured() && PUBLISHED_CATALOG.length > 0;
}

/** true quand le site tourne sur le catalogue fictif (ni Supabase, ni fiche réelle publiée). */
export function isDemoCatalog(): boolean {
  return !isSupabaseConfigured() && PUBLISHED_CATALOG.length === 0;
}

export const getCategories = cache(async (): Promise<Category[]> => {
  // Les textes des catégories sont des descriptions générales, communes aux deux catalogues.
  if (!isSupabaseConfigured()) return DEMO_CATEGORIES;
  const { data, error } = await createSupabasePublicClient()
    .from("categories")
    .select("id, name, slug, description, image_path, position")
    .eq("active", true)
    .order("position");
  if (error) throw new Error(`Catégories indisponibles : ${error.message}`);
  return (data as CategoryRow[]).map(mapCategory);
});

export const getCategory = cache(async (slug: string) => {
  return (await getCategories()).find((c) => c.slug === slug) ?? null;
});

export interface ProductQuery {
  category?: string;
  material?: string;
  maxPrice?: number;
  sort?: "featured" | "price-asc" | "price-desc" | "name";
}

export const getProducts = cache(async (): Promise<Product[]> => {
  if (usesCodeCatalog()) return PUBLISHED_CATALOG;
  if (isDemoCatalog()) return DEMO_PRODUCTS;
  const { data, error } = await createSupabasePublicClient()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("status", "published")
    .order("featured", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw new Error(`Catalogue indisponible : ${error.message}`);
  return (data as ProductRow[]).map((r) => mapProduct(r, storagePublicUrl));
});

/** Filtrage et tri purs (testés), appliqués au catalogue publié. */
export function filterProducts(products: Product[], q: ProductQuery): Product[] {
  let list = products;
  if (q.category) list = list.filter((p) => p.categorySlug === q.category);
  if (q.material) {
    const m = q.material.toLowerCase();
    list = list.filter((p) => p.materials.some((x) => x.toLowerCase().includes(m)));
  }
  if (q.maxPrice !== undefined) list = list.filter((p) => p.price <= q.maxPrice!);
  const sorted = list.slice();
  switch (q.sort) {
    case "price-asc":
      sorted.sort((a, b) => a.price - b.price);
      break;
    case "price-desc":
      sorted.sort((a, b) => b.price - a.price);
      break;
    case "name":
      sorted.sort((a, b) => a.name.localeCompare(b.name, "fr"));
      break;
    default:
      sorted.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
  return sorted;
}

export function materialFacets(products: Product[]): string[] {
  const keys = new Map<string, string>();
  for (const p of products)
    for (const m of p.materials) {
      const base = m.split(" ")[0]!;
      keys.set(base.toLowerCase(), base);
    }
  return [...keys.values()].sort((a, b) => a.localeCompare(b, "fr"));
}

export const getProductBySlug = cache(async (slug: string): Promise<Product | null> => {
  return (await getProducts()).find((p) => p.slug === slug) ?? null;
});

export const getFeaturedProducts = cache(async (limit = 6) => {
  return (await getProducts()).filter((p) => p.featured).slice(0, limit);
});

export function relatedProducts(all: Product[], product: Product, limit = 3): Product[] {
  return all
    .filter((p) => p.id !== product.id && p.categorySlug === product.categorySlug)
    .concat(all.filter((p) => p.id !== product.id && p.categorySlug !== product.categorySlug))
    .slice(0, limit);
}
