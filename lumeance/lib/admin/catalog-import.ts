import type { Product } from "@/types/catalog";

/**
 * Conversion d'une pièce du catalogue écrit dans le code (lib/catalog/products.ts) en lignes
 * Supabase. Utilisé par le bouton « Importer les nouvelles pièces » de l'administration.
 * Mêmes colonnes que supabase/import-produits.sql (scripts/export-catalog-sql.ts).
 */
export function productRow(p: Product, categoryId: string | null) {
  return {
    slug: p.slug,
    name: p.name,
    reference: p.reference,
    short_description: p.shortDescription,
    description: p.description,
    price: p.price,
    compare_at_price: p.compareAtPrice,
    category_id: categoryId,
    status: p.status,
    featured: p.featured,
    dimensions: p.dimensions,
    weight: p.weight,
    materials: p.materials,
    finishes: p.finishes,
    technical_specifications: p.specifications,
    delivery_information: p.deliveryInformation,
    assembly_information: p.assemblyInformation,
    stock_quantity: p.stockQuantity,
    seo_title: p.seoTitle,
    seo_description: p.seoDescription,
    options: p.options ?? [],
    option_labels: p.optionLabels ?? null,
    art: p.art,
  };
}

export function variantRows(p: Product, productId: string) {
  return p.variants.map((v, i) => ({
    product_id: productId,
    name: v.name,
    sku: v.sku,
    finish: v.finish,
    price_adjustment: v.priceAdjustment,
    stock_quantity: v.stockQuantity,
    active: v.active,
    details: v.details ?? null,
    image_url: v.imageUrl ?? null,
    image_urls: v.imageUrls ?? {},
    position: i,
  }));
}

export function imageRows(p: Product, productId: string) {
  return p.images.map((img) => ({
    product_id: productId,
    storage_path: img.url,
    alt_text: img.alt,
    caption: img.caption ?? null,
    position: img.position,
    is_primary: img.isPrimary,
  }));
}

/** Pièces du code absentes de la base (comparaison par référence). */
export function missingProducts(catalog: Product[], existingReferences: string[]): Product[] {
  const known = new Set(existingReferences.map((r) => r.toUpperCase()));
  return catalog.filter((p) => !known.has(p.reference.toUpperCase()));
}
