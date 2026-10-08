/**
 * Commandes, paiements, livraison et remboursements de la boutique.
 * Règle d'or : rien n'est crédité ni livré tant qu'un webhook signé du prestataire
 * n'a pas confirmé le paiement. Chaque étape est idempotente.
 */
import type { Sql, Tx } from "../db";
import { quote } from "./shop/catalog";
import { cancelPendingDeliveries, createDelivery, flagRanksForReview, movePoints, productTemplates, syncRanks, unlockRank } from "./shop/ledger";

type Db = Sql | Tx;

/** Identifiant public lisible et séquentiel par année : VAL-2026-000001. */
export async function nextOrderPublicId(tx: Db, now = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  const [row] = await tx<{ last: number }[]>`
    INSERT INTO order_counters (year, last) VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE SET last = order_counters.last + 1
    RETURNING last`;
  return `VAL-${year}-${String(row!.last).padStart(6, "0")}`;
}

export class OrderError extends Error {
  constructor(public readonly code: string, message: string, public readonly details?: unknown) {
    super(message);
  }
}

/** Une commande non payée expire au bout de ce délai (la page de paiement du prestataire aussi). */
export const ORDER_TTL_MINUTES = 60;

export async function createOrder(
  sql: Sql,
  input: {
    recipient: { uuid: string; username: string };
    userId?: string | null;
    items: { productId: string; quantity: number }[];
    idempotencyKey: string;
  },
): Promise<{ id: string; publicId: string; totalCents: number; pointsTotal: number; created: boolean }> {
  return sql.begin(async (tx) => {
    const [existing] = await tx<{ id: string; publicId: string; totalCents: number; pointsTotal: number; userId: string | null }[]>`
      SELECT id, public_id AS "publicId", total_cents AS "totalCents", points_total AS "pointsTotal", user_id AS "userId"
      FROM orders WHERE idempotency_key = ${input.idempotencyKey}`;
    if (existing) {
      if (existing.userId !== (input.userId ?? null)) throw new OrderError("idempotency_conflict", "Clé de commande déjà utilisée");
      const { userId: _u, ...rest } = existing;
      return { ...rest, created: false };
    }

    // Prix, réductions et points recalculés côté serveur : le navigateur n'envoie que des quantités.
    const q = await quote(tx, input.items);
    if (q.rejected.length > 0) throw new OrderError("unavailable", "Certains produits ne sont plus disponibles", q.rejected);
    if (q.lines.length === 0) throw new OrderError("empty", "Panier vide");
    if (q.totalCents <= 0) throw new OrderError("free_order", "Une commande gratuite ne passe pas par la boutique");

    await tx`INSERT INTO players (uuid, username) VALUES (${input.recipient.uuid}, ${input.recipient.username})
             ON CONFLICT (uuid) DO UPDATE SET username = EXCLUDED.username`;
    const publicId = await nextOrderPublicId(tx);
    const [order] = await tx<{ id: string }[]>`
      INSERT INTO orders (public_id, user_id, player_uuid, recipient_username, total_cents, subtotal_cents, discount_cents,
                          points_total, idempotency_key, expires_at)
      VALUES (${publicId}, ${input.userId ?? null}, ${input.recipient.uuid}, ${input.recipient.username}, ${q.totalCents},
              ${q.subtotalCents}, ${q.discountCents}, ${q.totalPoints}, ${input.idempotencyKey},
              now() + make_interval(mins => ${ORDER_TTL_MINUTES}))
      RETURNING id`;
    for (const l of q.lines) {
      await tx`
        INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price_cents, original_price_cents, points_per_unit, promotion_id)
        VALUES (${order!.id}, ${l.productId}, ${l.name}, ${l.quantity}, ${l.unitPriceCents}, ${l.unitOriginalCents}, ${l.unitPoints},
                ${q.promotionIds.get(l.productId) ?? null})`;
    }
    await tx`INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, metadata)
             VALUES ('user', ${input.userId ?? null}, 'order.created', 'order', ${publicId},
                     ${tx.json({ total: q.totalCents, points: q.totalPoints, recipient: input.recipient.uuid })})`;
    return { id: order!.id, publicId, totalCents: q.totalCents, pointsTotal: q.totalPoints, created: true };
  });
}

/** Enregistre un événement du prestataire une seule fois. Retourne false s'il a déjà été vu. */
async function recordEvent(tx: Tx, e: { provider: string; providerEventId: string; type: string; orderId?: string | null; payload?: unknown }): Promise<boolean> {
  const rows = await tx`
    INSERT INTO payment_events (provider, provider_event_id, type, order_id, payload)
    VALUES (${e.provider}, ${e.providerEventId}, ${e.type}, ${e.orderId ?? null}, ${e.payload === undefined ? null : tx.json(e.payload as never)})
    ON CONFLICT DO NOTHING RETURNING provider`;
  return rows.length > 0;
}

async function markEvent(tx: Tx, provider: string, providerEventId: string, outcome: string) {
  await tx`UPDATE payment_events SET processed_at = now(), outcome = ${outcome} WHERE provider = ${provider} AND provider_event_id = ${providerEventId}`;
}

/**
 * Paiement confirmé par webhook signé. Idempotent à deux niveaux :
 *   1. l'événement (provider, eventId) n'est traité qu'une fois ;
 *   2. points, droits et livraisons ont leurs propres clés uniques.
 */
export async function handlePaymentSucceeded(
  sql: Sql,
  input: { provider: string; providerEventId: string; providerPaymentId: string; orderId: string; amountCents: number; currency: string; payload?: unknown },
): Promise<"processed" | "duplicate" | "amount_mismatch" | "unknown_order"> {
  const outcome = await sql.begin(async (tx) => {
    const [order] = await tx<{ id: string; status: string; total: number; currency: string; publicId: string }[]>`
      SELECT id, status, total_cents AS total, currency, public_id AS "publicId" FROM orders WHERE id = ${input.orderId} FOR UPDATE`;
    if (!(await recordEvent(tx, { ...input, type: "payment.succeeded", orderId: order?.id ?? null }))) return "duplicate" as const;
    if (!order) {
      await markEvent(tx, input.provider, input.providerEventId, "unknown_order");
      return "unknown_order" as const;
    }
    if (order.total !== input.amountCents || order.currency.trim() !== input.currency.toUpperCase()) {
      await tx`INSERT INTO audit_logs (actor_type, action, target_type, target_id, metadata)
               VALUES ('webhook', 'payment.amount_mismatch', 'order', ${order.publicId}, ${tx.json({ expected: order.total, received: input.amountCents, currency: input.currency })})`;
      await markEvent(tx, input.provider, input.providerEventId, "amount_mismatch");
      return "amount_mismatch" as const;
    }
    const [payment] = await tx<{ id: string }[]>`
      INSERT INTO payments (order_id, provider, provider_payment_id, status, amount_cents, currency)
      VALUES (${order.id}, ${input.provider}, ${input.providerPaymentId}, 'succeeded', ${input.amountCents}, ${order.currency})
      ON CONFLICT (provider, provider_payment_id) DO UPDATE SET status = 'succeeded', updated_at = now()
      RETURNING id`;
    // Une commande expirée ou annulée mais réellement payée est honorée : l'argent a été encaissé.
    if (["pending", "expired", "cancelled", "failed"].includes(order.status)) {
      await tx`INSERT INTO transactions (order_id, payment_id, type, amount_cents, currency)
               VALUES (${order.id}, ${payment!.id}, 'charge', ${input.amountCents}, ${order.currency})`;
      await tx`UPDATE orders SET status = 'paid', paid_at = now() WHERE id = ${order.id}`;
    }
    await tx`INSERT INTO audit_logs (actor_type, action, target_type, target_id) VALUES ('webhook', 'payment.succeeded', 'order', ${order.publicId})`;
    await tx`INSERT INTO analytics_events (name, props) VALUES ('payment_success', ${tx.json({ order: order.publicId, amount: input.amountCents })})`;
    await markEvent(tx, input.provider, input.providerEventId, "processed");
    return "processed" as const;
  });
  if (outcome === "processed") await fulfillOrder(sql, input.orderId);
  return outcome;
}

export async function handlePaymentFailed(sql: Sql, input: { provider: string; providerEventId: string; orderId: string; reason: string; payload?: unknown }) {
  return sql.begin(async (tx) => {
    if (!(await recordEvent(tx, { ...input, type: "payment.failed" }))) return "duplicate" as const;
    const rows = await tx`UPDATE orders SET status = 'failed' WHERE id = ${input.orderId} AND status = 'pending' RETURNING public_id`;
    await tx`INSERT INTO analytics_events (name, props) VALUES ('payment_failed', ${tx.json({ orderId: input.orderId, reason: input.reason })})`;
    await markEvent(tx, input.provider, input.providerEventId, rows.length ? "failed" : "ignored");
    return "processed" as const;
  });
}

/**
 * Livraison d'une commande payée : points → droits → grades → livraisons Minecraft.
 * Rejouable sans doublon (reprise après panne, webhook en double).
 */
export async function fulfillOrder(sql: Sql, orderId: string): Promise<{ points: number; deliveries: number; ranks: string[] }> {
  return sql.begin(async (tx) => {
    const [order] = await tx<{ status: string; playerUuid: string; username: string; publicId: string }[]>`
      SELECT o.status, o.player_uuid AS "playerUuid", coalesce(o.recipient_username, p.username) AS username, o.public_id AS "publicId"
      FROM orders o JOIN players p ON p.uuid = o.player_uuid WHERE o.id = ${orderId} FOR UPDATE OF o`;
    if (!order) throw new Error("Commande inconnue");
    if (order.status !== "paid" && order.status !== "fulfilled") throw new Error(`Commande non payée (${order.status})`);

    const items = await tx<{ id: string; productId: string; name: string; quantity: number; pointsPerUnit: number; rankKey: string | null }[]>`
      SELECT i.id, i.product_id AS "productId", coalesce(i.product_name, p.name) AS name, i.quantity, i.points_per_unit AS "pointsPerUnit",
             (SELECT r.key FROM rank_thresholds r WHERE r.product_id = i.product_id LIMIT 1) AS "rankKey"
      FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = ${orderId} ORDER BY i.id`;

    let points = 0;
    let deliveries = 0;
    const ranks: string[] = [];
    for (const item of items) {
      // 1. Points de l'article (un mouvement par ligne de commande)
      const moved = await movePoints(tx, {
        playerUuid: order.playerUuid,
        delta: item.pointsPerUnit * item.quantity,
        reason: "purchase",
        label: item.quantity > 1 ? `${item.name} ×${item.quantity}` : item.name,
        orderId,
        orderItemId: item.id,
        idempotencyKey: `order_item:${item.id}:points`,
      });
      if (moved) points += moved.after - moved.before;

      // 2. Stock (décrémenté au paiement ; un dépassement est journalisé mais la commande payée est honorée)
      const stock = await tx`UPDATE products SET stock = stock - ${item.quantity} WHERE id = ${item.productId} AND stock IS NOT NULL AND stock >= ${item.quantity} RETURNING id`;
      if (stock.length === 0) {
        await tx`INSERT INTO audit_logs (actor_type, action, target_type, target_id)
                 SELECT 'system', 'stock.oversold', 'product', ${item.productId} FROM products WHERE id = ${item.productId} AND stock IS NOT NULL`;
      }

      // 3. Droits + livraison. Un produit de grade passe par unlockRank (même chemin que les points : jamais de double grade).
      if (item.rankKey) {
        if (await unlockRank(tx, { playerUuid: order.playerUuid, username: order.username, rankKey: item.rankKey, source: "purchase", orderId })) {
          ranks.push(item.rankKey);
          deliveries++;
        }
        continue;
      }
      const templates = await productTemplates(tx, item.productId);
      for (let unit = 0; unit < item.quantity; unit++) {
        const [ent] = await tx<{ id: string }[]>`
          INSERT INTO entitlements (order_id, order_item_id, unit_index, product_id, player_uuid)
          VALUES (${orderId}, ${item.id}, ${unit}, ${item.productId}, ${order.playerUuid})
          ON CONFLICT (order_item_id, unit_index) DO UPDATE SET order_item_id = EXCLUDED.order_item_id
          RETURNING id`;
        const created = await createDelivery(tx, {
          playerUuid: order.playerUuid,
          username: order.username,
          label: item.quantity > 1 ? `${item.name} (${unit + 1}/${item.quantity})` : item.name,
          idempotencyKey: `entitlement:${ent!.id}`,
          templates,
          orderId,
          orderItemId: item.id,
          entitlementId: ent!.id,
        });
        if (created) deliveries++;
      }
    }

    // 4. Grades atteints grâce aux points
    ranks.push(...(await syncRanks(tx, order.playerUuid, order.username, orderId)));
    await tx`UPDATE orders SET status = 'fulfilled', fulfilled_at = coalesce(fulfilled_at, now()) WHERE id = ${orderId} AND status = 'paid'`;
    return { points, deliveries, ranks };
  });
}

/**
 * Remboursement confirmé (webhook du prestataire ou saisie admin).
 * - enregistre le remboursement et la sortie d'argent ;
 * - retire les points au prorata du montant remboursé (historique conservé) ;
 * - remboursement total : annule les livraisons pas encore effectuées ;
 * - ne retire jamais un grade d'office : il passe « à examiner ».
 */
export async function handleRefund(
  sql: Sql,
  input: {
    provider: string;
    providerEventId: string;
    providerPaymentId: string;
    providerRefundId: string;
    amountCents: number;
    reason?: string | null;
    source?: "provider" | "admin";
    actor?: string | null;
    payload?: unknown;
  },
): Promise<"processed" | "duplicate" | "unknown_payment"> {
  return sql.begin(async (tx) => {
    const [payment] = await tx<{ id: string; orderId: string }[]>`
      SELECT id, order_id AS "orderId" FROM payments WHERE provider = ${input.provider} AND provider_payment_id = ${input.providerPaymentId}`;
    if (!(await recordEvent(tx, { ...input, type: "refund.succeeded", orderId: payment?.orderId ?? null }))) return "duplicate" as const;
    if (!payment) {
      await markEvent(tx, input.provider, input.providerEventId, "unknown_payment");
      return "unknown_payment" as const;
    }
    const [refund] = await tx<{ id: string }[]>`
      INSERT INTO refunds (payment_id, provider_refund_id, amount_cents, reason, source)
      VALUES (${payment.id}, ${input.providerRefundId}, ${input.amountCents}, ${input.reason ?? null}, ${input.source ?? "provider"})
      ON CONFLICT (provider_refund_id) DO NOTHING RETURNING id`;
    if (!refund) {
      await markEvent(tx, input.provider, input.providerEventId, "duplicate_refund");
      return "duplicate" as const;
    }
    const [order] = await tx<{ id: string; total: number; points: number; playerUuid: string; publicId: string; currency: string }[]>`
      SELECT id, total_cents AS total, points_total AS points, player_uuid AS "playerUuid", public_id AS "publicId", currency
      FROM orders WHERE id = ${payment.orderId} FOR UPDATE`;
    await tx`INSERT INTO transactions (order_id, payment_id, type, amount_cents, currency)
             VALUES (${order!.id}, ${payment.id}, 'refund', ${-input.amountCents}, ${order!.currency})`;
    const [{ refunded }] = (await tx`SELECT coalesce(sum(amount_cents), 0)::int AS refunded FROM refunds WHERE payment_id = ${payment.id}`) as unknown as [{ refunded: number }];
    const full = refunded >= order!.total;

    // Points retirés au prorata du cumul remboursé, moins ce qui a déjà été retiré.
    const [{ removed }] = (await tx`SELECT coalesce(-sum(delta), 0)::int AS removed FROM point_transactions WHERE order_id = ${order!.id} AND reason = 'refund'`) as unknown as [{ removed: number }];
    const [{ credited }] = (await tx`SELECT coalesce(sum(delta), 0)::int AS credited FROM point_transactions WHERE order_id = ${order!.id} AND reason = 'purchase'`) as unknown as [{ credited: number }];
    const target = full ? credited : Math.floor((credited * Math.min(refunded, order!.total)) / order!.total);
    const toRemove = Math.max(0, target - removed);
    if (toRemove > 0) {
      await movePoints(tx, {
        playerUuid: order!.playerUuid,
        delta: -toRemove,
        reason: "refund",
        label: `Remboursement ${order!.publicId}`,
        orderId: order!.id,
        refundId: refund.id,
        actor: input.actor ?? null,
        idempotencyKey: `refund:${refund.id}:points`,
      });
      await flagRanksForReview(tx, order!.playerUuid);
    }
    if (full) {
      await cancelPendingDeliveries(tx, order!.id, "Commande remboursée avant livraison");
      await tx`UPDATE entitlements SET status = 'revoked' WHERE order_id = ${order!.id}`;
    }
    await tx`UPDATE payments SET status = ${full ? "refunded" : "partially_refunded"}, updated_at = now() WHERE id = ${payment.id}`;
    await tx`UPDATE orders SET status = ${full ? "refunded" : "partially_refunded"} WHERE id = ${order!.id}`;
    await tx`INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, metadata)
             VALUES (${input.source === "admin" ? "admin" : "webhook"}, ${input.actor ?? null}, 'refund.recorded', 'order', ${order!.publicId},
                     ${tx.json({ amount: input.amountCents, pointsRemoved: toRemove, full })})`;
    await markEvent(tx, input.provider, input.providerEventId, "processed");
    return "processed" as const;
  });
}
