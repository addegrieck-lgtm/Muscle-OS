import type { ArtForm, Category, Product, ProductOption, SpecLine } from "@/types/catalog";

export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  reference: string;
  short_description: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category_id: string | null;
  status: Product["status"];
  featured: boolean;
  dimensions: Product["dimensions"] | null;
  weight: number | null;
  materials: string[] | null;
  finishes: string[] | null;
  technical_specifications: SpecLine[] | null;
  delivery_information: string | null;
  assembly_information: string | null;
  stock_quantity: number;
  seo_title: string | null;
  seo_description: string | null;
  options?: ProductOption[] | null;
  option_labels?: Product["optionLabels"] | null;
  art?: string | null;
  categories?: { slug: string } | null;
  product_images?: {
    id: string;
    storage_path: string;
    alt_text: string;
    position: number;
    is_primary: boolean;
    caption?: string | null;
  }[];
  product_variants?: {
    id: string;
    name: string;
    sku: string;
    finish: string | null;
    price_adjustment: number;
    stock_quantity: number;
    active: boolean;
    details?: string | null;
    image_url?: string | null;
    image_urls?: Record<string, string> | null;
    position?: number | null;
  }[];
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_path: string | null;
  position: number;
}

const ART_FORMS = new Set<string>([
  "cascade",
  "globes",
  "halo",
  "organic",
  "tiers",
  "dome",
  "sconce",
  "floor",
]);

const ART_BY_CATEGORY: Record<string, ArtForm> = {
  lustres: "cascade",
  suspensions: "globes",
  appliques: "sconce",
  lampadaires: "floor",
};

export function artForCategory(slug: string | null | undefined): ArtForm {
  return (slug && ART_BY_CATEGORY[slug]) || "globes";
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    imagePath: row.image_path,
    position: row.position,
  };
}

export function mapProduct(row: ProductRow, imageUrl: (path: string) => string): Product {
  const categorySlug = row.categories?.slug ?? null;
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    reference: row.reference,
    shortDescription: row.short_description,
    description: row.description,
    price: Number(row.price),
    compareAtPrice: row.compare_at_price === null ? null : Number(row.compare_at_price),
    categoryId: row.category_id,
    categorySlug,
    status: row.status,
    featured: row.featured,
    dimensions: row.dimensions ?? {},
    weight: row.weight,
    materials: row.materials ?? [],
    finishes: row.finishes ?? [],
    specifications: Array.isArray(row.technical_specifications) ? row.technical_specifications : [],
    deliveryInformation: row.delivery_information,
    assemblyInformation: row.assembly_information,
    stockQuantity: row.stock_quantity,
    images: (row.product_images ?? [])
      .slice()
      .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position)
      .map((img) => ({
        id: img.id,
        url: imageUrl(img.storage_path),
        alt: img.alt_text || row.name,
        ...(img.caption ? { caption: img.caption } : {}),
        isPrimary: img.is_primary,
        position: img.position,
      })),
    variants: (row.product_variants ?? [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      .map((v) => ({
        id: v.id,
        name: v.name,
        sku: v.sku,
        finish: v.finish,
        priceAdjustment: Number(v.price_adjustment),
        stockQuantity: v.stock_quantity,
        active: v.active,
        ...(v.details ? { details: v.details } : {}),
        ...(v.image_url ? { imageUrl: imageUrl(v.image_url) } : {}),
        ...(v.image_urls && Object.keys(v.image_urls).length
          ? {
              imageUrls: Object.fromEntries(
                Object.entries(v.image_urls).map(([k, path]) => [k, imageUrl(path)]),
              ),
            }
          : {}),
      })),
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    art: row.art && ART_FORMS.has(row.art) ? (row.art as ArtForm) : artForCategory(categorySlug),
    ...(Array.isArray(row.options) && row.options.length ? { options: row.options } : {}),
    ...(row.option_labels ? { optionLabels: row.option_labels } : {}),
    isDemo: false,
  };
}
