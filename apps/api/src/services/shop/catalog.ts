import type { Quote, RankThreshold, ShopCatalog, ShopCategory, ShopProduct } from "@vaeloria/types";
import type { Sql, Tx } from "../../db";
import { priceProduct, type PromotionRule } from "./pricing";

type Db = Sql | Tx;

export async function loadPromotions(db: Db): Promise<PromotionRule[]> {
  return db<PromotionRule[]>`
    SELECT id, name, label, kind, value, target_type AS "targetType", target_id AS "targetId",
           starts_at AS "startsAt", ends_at AS "endsAt", active
    FROM promotions WHERE active AND starts_at <= now() AND (ends_at IS NULL OR ends_at > now())`;
}

export async function loadPointsPerEuro(db: Db): Promise<number> {
  const [row] = await db<{ value: unknown }[]>`SELECT value FROM site_settings WHERE key = 'shop.points_per_euro'`;
  const n = Number(row?.value ?? 1);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

export async function loadRanks(db: Db): Promise<(RankThreshold & { productId: string | null })[]> {
  return db<(RankThreshold & { productId: string | null })[]>`
    SELECT key, name, min_points AS "minPoints", color, perks, product_id AS "productId"
    FROM rank_thresholds WHERE active ORDER BY min_points, position`;
}

type ProductRow = {
  id: string; slug: string; name: string; shortDescription: string; description: string; categoryId: string; categorySlug: string;
  deliveryType: ShopProduct["deliveryType"]; imageUrl: string | null; stock: number | null; priceCents: number; points: number | null; rankKey: string | null;
};

const productColumns = (db: Db) => db`
  p.id, p.slug, p.name, p.short_description AS "shortDescription", p.description, p.category_id AS "categoryId", c.slug AS "categorySlug",
  p.delivery_type AS "deliveryType", p.image_url AS "imageUrl", p.stock, p.price_cents AS "priceCents", p.points,
  (SELECT r.key FROM rank_thresholds r WHERE r.product_id = p.id AND r.active LIMIT 1) AS "rankKey"`;

function toProduct(row: ProductRow, promos: PromotionRule[], ppe: number, now: Date): ShopProduct {
  const { promotionId: _p, ...price } = priceProduct(row, promos, ppe, now);
  return {
    id: row.id, slug: row.slug, name: row.name, shortDescription: row.shortDescription, description: row.description,
    categorySlug: row.categorySlug, deliveryType: row.deliveryType, imageUrl: row.imageUrl, currency: "EUR", stock: row.stock, price, rankKey: row.rankKey,
  };
}

export async function getCatalog(db: Db, now = new Date()): Promise<ShopCatalog> {
  const [categories, rows, promos, ppe, ranks] = await Promise.all([
    db<ShopCategory[]>`SELECT id, slug, name, description, seo_title AS "seoTitle", seo_description AS "seoDescription"
                       FROM product_categories WHERE active ORDER BY position, name`,
    db<ProductRow[]>`SELECT ${productColumns(db)} FROM products p JOIN product_categories c ON c.id = p.category_id
                     WHERE p.active AND c.active ORDER BY c.position, p.sort_order, p.price_cents`,
    loadPromotions(db),
    loadPointsPerEuro(db),
    loadRanks(db),
  ]);
  return {
    categories,
    products: rows.map((r) => toProduct(r, promos, ppe, now)),
    ranks: ranks.map(({ productId: _p, ...r }) => r),
    promotions: promos.map((p) => ({ id: p.id, name: p.name, label: p.label, endsAt: p.endsAt?.toISOString() ?? null })),
  };
}

export async function getProduct(db: Db, slug: string, now = new Date()): Promise<ShopProduct | null> {
  const [row] = await db<ProductRow[]>`SELECT ${productColumns(db)} FROM products p JOIN product_categories c ON c.id = p.category_id
                                       WHERE p.slug = ${slug} AND p.active AND c.active`;
  if (!row) return null;
  const [promos, ppe] = await Promise.all([loadPromotions(db), loadPointsPerEuro(db)]);
  return toProduct(row, promos, ppe, now);
}

export const MAX_QUANTITY = 20;
export const MAX_LINES = 25;

/**
 * Devis : le navigateur n'envoie que des identifiants et des quantités.
 * Prix, réductions et points sont toujours recalculés ici.
 */
export async function quote(db: Db, items: { productId: string; quantity: number }[], now = new Date()): Promise<Quote & { promotionIds: Map<string, string | null> }> {
  const merged = new Map<string, number>();
  for (const i of items.slice(0, MAX_LINES)) merged.set(i.productId, Math.min(MAX_QUANTITY, (merged.get(i.productId) ?? 0) + i.quantity));
  const ids = [...merged.keys()];
  const [rows, promos, ppe] = await Promise.all([
    ids.length
      ? db<(ProductRow & { active: boolean })[]>`SELECT ${productColumns(db)}, (p.active AND c.active) AS active
          FROM products p JOIN product_categories c ON c.id = p.category_id WHERE p.id = ANY(${ids}::uuid[])`
      : Promise.resolve([] as (ProductRow & { active: boolean })[]),
    loadPromotions(db),
    loadPointsPerEuro(db),
  ]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  const result: Quote & { promotionIds: Map<string, string | null> } = {
    lines: [], subtotalCents: 0, discountCents: 0, totalCents: 0, totalPoints: 0, currency: "EUR", rejected: [], promotionIds: new Map(),
  };
  for (const [productId, quantity] of merged) {
    const row = byId.get(productId);
    if (!row || !row.active) {
      result.rejected.push({ productId, reason: "Produit indisponible" });
      continue;
    }
    if (row.stock !== null && row.stock < quantity) {
      result.rejected.push({ productId, reason: row.stock === 0 ? "Rupture de stock" : `Stock restant : ${row.stock}` });
      continue;
    }
    const p = priceProduct(row, promos, ppe, now);
    result.promotionIds.set(productId, p.promotionId);
    result.lines.push({
      productId, slug: row.slug, name: row.name, quantity,
      unitPriceCents: p.priceCents, unitOriginalCents: p.originalCents, unitPoints: p.points,
      totalCents: p.priceCents * quantity, totalPoints: p.points * quantity,
    });
    result.subtotalCents += p.originalCents * quantity;
    result.totalCents += p.priceCents * quantity;
    result.totalPoints += p.points * quantity;
  }
  result.discountCents = result.subtotalCents - result.totalCents;
  return result;
}
