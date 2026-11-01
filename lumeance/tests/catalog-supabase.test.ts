import { describe, expect, it } from "vitest";
import { CATALOG_PRODUCTS } from "@/lib/catalog/products";
import { mapProduct, type ProductRow } from "@/lib/services/mappers";
import type { Product } from "@/types/catalog";

// Reproduit la ligne que renverrait Supabase après import (scripts/export-catalog-sql.ts).
function asRow(p: Product): ProductRow {
  return {
    id: `uuid-${p.reference}`,
    slug: p.slug,
    name: p.name,
    reference: p.reference,
    short_description: p.shortDescription,
    description: p.description,
    price: p.price,
    compare_at_price: p.compareAtPrice,
    category_id: "uuid-cat",
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
    categories: { slug: p.categorySlug! },
    product_images: p.images.map((i) => ({
      id: i.id,
      storage_path: i.url,
      alt_text: i.alt,
      caption: i.caption ?? null,
      position: i.position,
      is_primary: i.isPrimary,
    })),
    // Ordre volontairement inversé : l'affichage doit suivre « position ».
    product_variants: p.variants
      .map((v, i) => ({
        id: v.id,
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
      }))
      .reverse(),
  };
}

describe("catalogue importé dans Supabase", () => {
  for (const p of CATALOG_PRODUCTS) {
    it(`${p.name} s'affiche comme la fiche du code`, () => {
      const mapped = mapProduct(asRow(p), (path) => path);
      // Seuls les identifiants changent (uuid en base).
      expect({ ...mapped, id: p.id, categoryId: p.categoryId }).toEqual(p);
    });
  }

  it("garde les chemins du site et résout ceux du bucket", () => {
    const row = asRow(CATALOG_PRODUCTS[0]!);
    row.product_images![0]!.storage_path = "produits/photo.webp";
    const mapped = mapProduct(row, (path) => (path.startsWith("/") ? path : `https://cdn/${path}`));
    expect(mapped.images.find((i) => i.isPrimary)!.url).toBe("https://cdn/produits/photo.webp");
    expect(mapped.variants[0]!.imageUrl).toMatch(/^\/products\//);
  });
});
