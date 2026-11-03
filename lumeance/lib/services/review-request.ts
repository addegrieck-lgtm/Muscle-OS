import "server-only";
import { createSupabaseServiceClient } from "@/lib/supabase/service";
import {
  hashReviewToken,
  isWellFormedToken,
  REVIEWABLE_ORDER_STATUSES,
} from "@/lib/services/reviews";

export interface ReviewableItem {
  productId: string;
  name: string;
  slug: string | null;
  image: string | null;
  reviewed: boolean;
}
export interface ReviewRequestContext {
  requestId: string;
  orderId: string;
  purchasedAt: string;
  defaultName: string;
  items: ReviewableItem[];
}

/**
 * Demande d'avis valide pour ce jeton : non expirée, commande expédiée ou livrée. Retourne les
 * pièces de la commande (toujours au catalogue) et celles déjà notées. null sinon.
 */
export async function loadReviewRequest(token: unknown): Promise<ReviewRequestContext | null> {
  if (!isWellFormedToken(token)) return null;
  const db = createSupabaseServiceClient();
  if (!db) return null;
  const { data: req } = await db
    .from("review_requests")
    .select(
      "id, order_id, expires_at, orders(status, created_at, customers(first_name, last_name))",
    )
    .eq("token_hash", await hashReviewToken(token))
    .maybeSingle();
  if (!req || new Date(req.expires_at).getTime() < Date.now()) return null;
  const order = req.orders as unknown as {
    status: string;
    created_at: string;
    customers: { first_name: string | null; last_name: string | null } | null;
  } | null;
  if (!order || !(REVIEWABLE_ORDER_STATUSES as readonly string[]).includes(order.status))
    return null;
  const [{ data: items }, { data: done }] = await Promise.all([
    db
      .from("order_items")
      .select(
        "product_id, product_name_snapshot, products(slug, product_images(storage_path, is_primary, position))",
      )
      .eq("order_id", req.order_id),
    db.from("product_reviews").select("product_id").eq("request_id", req.id),
  ]);
  const reviewed = new Set((done ?? []).map((d) => d.product_id));
  const seen = new Set<string>();
  const list: ReviewableItem[] = [];
  for (const it of items ?? []) {
    if (!it.product_id || seen.has(it.product_id)) continue;
    seen.add(it.product_id);
    const p = it.products as unknown as {
      slug: string;
      product_images: { storage_path: string; is_primary: boolean; position: number }[];
    } | null;
    const img = (p?.product_images ?? []).sort(
      (a, b) => Number(b.is_primary) - Number(a.is_primary) || a.position - b.position,
    )[0];
    list.push({
      productId: it.product_id,
      name: it.product_name_snapshot,
      slug: p?.slug ?? null,
      image: img?.storage_path ?? null,
      reviewed: reviewed.has(it.product_id),
    });
  }
  const c = order.customers;
  const first = (c?.first_name ?? "").trim();
  const last = (c?.last_name ?? "").trim();
  return {
    requestId: req.id,
    orderId: req.order_id,
    purchasedAt: order.created_at,
    defaultName: first ? (last ? `${first} ${last[0]!.toUpperCase()}.` : first) : "",
    items: list,
  };
}
