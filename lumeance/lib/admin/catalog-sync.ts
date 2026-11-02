import type { Product } from "@/types/catalog";
import { imageRows, productRow, variantRows } from "@/lib/admin/catalog-import";

/**
 * Mise à jour d'une pièce DÉJÀ en base à partir du catalogue écrit dans le code
 * (lib/catalog/products.ts) : remplace les correctifs SQL à coller dans Supabase.
 *
 * Règles :
 * - Le stock n'est jamais modifié (il se gère dans l'administration).
 * - Versions : comparées par SKU. Une version du code absente de la base est ajoutée ; une version
 *   en base absente du code est supprimée seulement si son SKU suit le modèle du catalogue
 *   (« <référence>-… ») : les versions créées à la main dans l'administration sont conservées.
 * - Images : seules les images du site (adresse commençant par « /products/ ») sont gérées ; les
 *   photos importées dans l'administration ne sont jamais touchées.
 * Fonctions pures : testées dans tests/catalog-sync.test.ts.
 */

export interface DbVariant {
  id: string;
  sku: string;
  [key: string]: unknown;
}
export interface DbImage {
  id: string;
  storage_path: string;
  is_primary: boolean;
  [key: string]: unknown;
}
export interface DbProduct {
  id: string;
  reference: string;
  product_variants?: DbVariant[] | null;
  product_images?: DbImage[] | null;
  [key: string]: unknown;
}

export interface SyncPlan {
  product: Record<string, unknown>;
  variantsInsert: Record<string, unknown>[];
  variantsUpdate: { id: string; patch: Record<string, unknown> }[];
  variantsDelete: string[];
  imagesInsert: Record<string, unknown>[];
  imagesUpdate: { id: string; patch: Record<string, unknown> }[];
  imagesDelete: string[];
  /** Résumé lisible des changements, pour l'administration. */
  changes: string[];
}

const FIELD_LABELS: Record<string, string> = {
  slug: "adresse",
  name: "nom",
  short_description: "accroche",
  description: "description",
  price: "prix",
  compare_at_price: "prix barré",
  category_id: "catégorie",
  status: "statut",
  featured: "mise en avant",
  dimensions: "dimensions",
  weight: "poids",
  materials: "matières",
  finishes: "finitions",
  technical_specifications: "fiche technique",
  delivery_information: "livraison",
  assembly_information: "installation",
  seo_title: "titre SEO",
  seo_description: "description SEO",
  options: "options",
  option_labels: "libellés du sélecteur",
  art: "illustration",
  promotion: "offre",
};

const NUMERIC = new Set(["price", "compare_at_price", "weight", "price_adjustment", "position"]);

/** Valeur comparable : nombres normalisés (la base renvoie parfois des chaînes), JSON à clés triées. */
function norm(key: string, v: unknown): string {
  if (v === undefined || v === null) return "null";
  if (NUMERIC.has(key)) return String(Number(v));
  return stable(v);
}
function stable(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.keys(v as object)
      .sort()
      .filter((k) => (v as Record<string, unknown>)[k] !== undefined)
      .map((k) => `${JSON.stringify(k)}:${stable((v as Record<string, unknown>)[k])}`)
      .join(",")}}`;
  return JSON.stringify(v);
}

function diff(
  target: Record<string, unknown>,
  current: Record<string, unknown>,
  skip: Set<string>,
) {
  const patch: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(target)) {
    if (skip.has(k)) continue;
    if (norm(k, v) !== norm(k, current[k])) patch[k] = v;
  }
  return patch;
}

const SKIP_PRODUCT = new Set(["stock_quantity"]);
const SKIP_VARIANT = new Set(["stock_quantity", "product_id"]);
const SKIP_IMAGE = new Set(["product_id"]);

export const isCatalogImage = (path: string) => path.startsWith("/products/");

export function syncPlan(code: Product, db: DbProduct, categoryId: string | null): SyncPlan {
  const changes: string[] = [];

  const product = diff(productRow(code, categoryId), db, SKIP_PRODUCT);
  const labels = Object.keys(product).map((k) => FIELD_LABELS[k] ?? k);
  if (labels.length) changes.push(`Fiche : ${labels.join(", ")}`);

  // Versions.
  const dbVariants = db.product_variants ?? [];
  const bySku = new Map(dbVariants.map((v) => [v.sku, v]));
  const codeVariants = variantRows(code, db.id);
  const variantsInsert: Record<string, unknown>[] = [];
  const variantsUpdate: SyncPlan["variantsUpdate"] = [];
  for (const row of codeVariants) {
    const cur = bySku.get(row.sku);
    if (!cur) variantsInsert.push(row);
    else {
      const patch = diff(row, cur, SKIP_VARIANT);
      if (Object.keys(patch).length) variantsUpdate.push({ id: cur.id, patch });
    }
  }
  const codeSkus = new Set(codeVariants.map((v) => v.sku));
  const prefix = `${code.reference.toUpperCase()}-`;
  const variantsDelete = dbVariants
    .filter((v) => !codeSkus.has(v.sku) && v.sku.toUpperCase().startsWith(prefix))
    .map((v) => v.id);
  if (variantsInsert.length) changes.push(`${variantsInsert.length} version(s) ajoutée(s)`);
  if (variantsUpdate.length) changes.push(`${variantsUpdate.length} version(s) modifiée(s)`);
  if (variantsDelete.length) changes.push(`${variantsDelete.length} version(s) retirée(s)`);

  // Images du site.
  const dbImages = (db.product_images ?? []).filter((i) => isCatalogImage(i.storage_path));
  const byPath = new Map(dbImages.map((i) => [i.storage_path, i]));
  const codeImages = imageRows(code, db.id);
  // Une photo importée dans l'administration et marquée principale le reste.
  const manualPrimary = (db.product_images ?? []).some(
    (i) => i.is_primary && !isCatalogImage(i.storage_path),
  );
  const imagesInsert: Record<string, unknown>[] = [];
  const imagesUpdate: SyncPlan["imagesUpdate"] = [];
  for (const row of codeImages) {
    const target = manualPrimary ? { ...row, is_primary: false } : row;
    const cur = byPath.get(row.storage_path);
    if (!cur) imagesInsert.push(target);
    else {
      const patch = diff(target, cur, SKIP_IMAGE);
      if (Object.keys(patch).length) imagesUpdate.push({ id: cur.id, patch });
    }
  }
  const codePaths = new Set(codeImages.map((i) => i.storage_path));
  const imagesDelete = dbImages.filter((i) => !codePaths.has(i.storage_path)).map((i) => i.id);
  const imgCount = imagesInsert.length + imagesUpdate.length + imagesDelete.length;
  if (imgCount) changes.push(`${imgCount} photo(s) mise(s) à jour`);

  return {
    product,
    variantsInsert,
    variantsUpdate,
    variantsDelete,
    imagesInsert,
    imagesUpdate,
    imagesDelete,
    changes,
  };
}

export const planIsEmpty = (p: SyncPlan) => p.changes.length === 0;

/** Empreinte de la pièce telle qu'écrite dans le code (hors stock) : FNV-1a 32 bits. */
export function catalogHash(p: Product): string {
  const strip = (r: Record<string, unknown>) =>
    Object.fromEntries(
      Object.entries(r).filter(([k]) => k !== "product_id" && k !== "stock_quantity"),
    );
  const text = stable({
    product: strip(productRow(p, null)),
    category: p.categorySlug,
    variants: variantRows(p, "").map(strip),
    images: imageRows(p, "").map(strip),
  });
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
