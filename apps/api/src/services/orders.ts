import type { Sql, Tx } from "../db";
import { enqueueCommand } from "./commands";



/** Identifiant public lisible et séquentiel par année : VAL-2026-000001. */
export async function nextOrderPublicId(tx: Tx | Sql, now = new Date()): Promise<string> {
  const year = now.getUTCFullYear();
  const [row] = await tx<{ last: number }[]>`
    INSERT INTO order_counters (year, last) VALUES (${year}, 1)
    ON CONFLICT (year) DO UPDATE SET last = order_counters.last + 1
    RETURNING last`;
  return `VAL-${year}-${String(row!.last).padStart(6, "0")}`;
}

export async function createOrder(
  sql: Sql,
  input: { playerUuid: string; userId?: string | null; items: { productId: string; quantity: number }[]; idempotencyKey: string },
): Promise<{ id: string; publicId: string; totalCents: number; created: boolean }> {
  return sql.begin(async (tx) => {
    const [existing] = await tx<{ id: string; publicId: string; totalCents: number }[]>`
      SELECT id, public_id AS "publicId", total_cents AS "totalCents" FROM orders WHERE idempotency_key = ${input.idempotencyKey}`;
    if (existing) return { ...existing, created: false };

    const ids = input.items.map((i) => i.productId);
    const products = await tx<{ id: string; price: number; currency: string }[]>`
      SELECT id, (price_cents * (100 - coalesce(promo_percent, 0)) / 100)::int AS price, currency
      FROM products WHERE id = ANY(${ids}::uuid[]) AND active`;
    const byId = new Map(products.map((p) => [p.id, p]));
    if (byId.size !== new Set(ids).size) throw new Error("Produit inactif ou inexistant");

    // Le prix est toujours recalculé côté serveur : jamais celui envoyé par le navigateur.
    const total = input.items.reduce((s, i) => s + byId.get(i.productId)!.price * i.quantity, 0);
    const publicId = await nextOrderPublicId(tx);
    const [order] = await tx<{ id: string }[]>`
      INSERT INTO orders (public_id, user_id, player_uuid, total_cents, idempotency_key)
      VALUES (${publicId}, ${input.userId ?? null}, ${input.playerUuid}, ${total}, ${input.idempotencyKey})
      RETURNING id`;
    for (const item of input.items) {
      await tx`INSERT INTO order_items (order_id, product_id, quantity, unit_price_cents)
               VALUES (${order!.id}, ${item.productId}, ${item.quantity}, ${byId.get(item.productId)!.price})`;
    }
    await tx`INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, metadata)
             VALUES ('system', NULL, 'order.created', 'order', ${publicId}, ${tx.json({ total })})`;
    return { id: order!.id, publicId, totalCents: total, created: true };
  });
}

/**
 * Point d'entrée des webhooks de paiement (après vérification de signature par l'adaptateur
 * du prestataire). Idempotent à deux niveaux :
 *   1. l'événement webhook (provider, eventId) n'est traité qu'une fois ;
 *   2. la livraison (entitlements + commandes) a ses propres clés uniques.
 */
export async function handlePaymentSucceeded(
  sql: Sql,
  input: { provider: string; providerEventId: string; providerPaymentId: string; orderId: string; amountCents: number; currency: string },
): Promise<"processed" | "duplicate" | "amount_mismatch"> {
  const outcome = await sql.begin(async (tx) => {
    const fresh = await tx`
      INSERT INTO payment_webhook_events (provider, provider_event_id, type)
      VALUES (${input.provider}, ${input.providerEventId}, 'payment.succeeded')
      ON CONFLICT DO NOTHING RETURNING provider`;
    if (fresh.length === 0) return "duplicate" as const;

    const [order] = await tx<{ id: string; status: string; total: number; currency: string; publicId: string }[]>`
      SELECT id, status, total_cents AS total, currency, public_id AS "publicId" FROM orders WHERE id = ${input.orderId} FOR UPDATE`;
    if (!order) throw new Error("Commande inconnue");
    if (order.total !== input.amountCents || order.currency !== input.currency) {
      await tx`INSERT INTO audit_logs (actor_type, action, target_type, target_id, metadata)
               VALUES ('webhook', 'payment.amount_mismatch', 'order', ${order.publicId}, ${tx.json({ expected: order.total, received: input.amountCents })})`;
      return "amount_mismatch" as const;
    }

    const [payment] = await tx<{ id: string }[]>`
      INSERT INTO payments (order_id, provider, provider_payment_id, status, amount_cents, currency)
      VALUES (${order.id}, ${input.provider}, ${input.providerPaymentId}, 'succeeded', ${input.amountCents}, ${input.currency})
      ON CONFLICT (provider, provider_payment_id) DO UPDATE SET status = 'succeeded', updated_at = now()
      RETURNING id`;
    if (order.status === "pending") {
      await tx`INSERT INTO transactions (order_id, payment_id, type, amount_cents, currency)
               VALUES (${order.id}, ${payment!.id}, 'charge', ${input.amountCents}, ${input.currency})`;
      await tx`UPDATE orders SET status = 'paid', paid_at = now() WHERE id = ${order.id}`;
    }
    await tx`INSERT INTO audit_logs (actor_type, action, target_type, target_id)
             VALUES ('webhook', 'payment.succeeded', 'order', ${order.publicId})`;
    return "processed" as const;
  });
  if (outcome === "processed") await fulfillOrder(sql, input.orderId);
  return outcome;
}

/** Crée les droits puis les commandes Minecraft d'une commande payée. Rejouable sans doublon. */
export async function fulfillOrder(sql: Sql, orderId: string): Promise<{ entitlements: number; commands: number }> {
  return sql.begin(async (tx) => {
    const [order] = await tx<{ status: string; playerUuid: string; username: string }[]>`
      SELECT o.status, o.player_uuid AS "playerUuid", p.username
      FROM orders o JOIN players p ON p.uuid = o.player_uuid WHERE o.id = ${orderId} FOR UPDATE OF o`;
    if (!order) throw new Error("Commande inconnue");
    if (order.status !== "paid" && order.status !== "fulfilled") throw new Error(`Commande non payée (${order.status})`);

    const items = await tx<{ id: string; productId: string; quantity: number; commands: string[] }[]>`
      SELECT i.id, i.product_id AS "productId", i.quantity, p.delivery_commands AS commands
      FROM order_items i JOIN products p ON p.id = i.product_id WHERE i.order_id = ${orderId}`;

    let entitlements = 0;
    let commands = 0;
    for (const item of items) {
      for (let unit = 0; unit < item.quantity; unit++) {
        const [ent] = await tx<{ id: string }[]>`
          INSERT INTO entitlements (order_id, order_item_id, unit_index, product_id, player_uuid)
          VALUES (${orderId}, ${item.id}, ${unit}, ${item.productId}, ${order.playerUuid})
          ON CONFLICT (order_item_id, unit_index) DO UPDATE SET order_item_id = EXCLUDED.order_item_id
          RETURNING id, (xmax = 0) AS inserted`;
        if ((ent as unknown as { inserted: boolean }).inserted) entitlements++;
        for (const [n, template] of item.commands.entries()) {
          const command = template.replaceAll("{uuid}", order.playerUuid).replaceAll("{username}", order.username);
          const res = await enqueueCommand(tx as unknown as Sql, {
            playerUuid: order.playerUuid,
            command,
            source: "shop",
            entitlementId: ent!.id,
            idempotencyKey: `entitlement:${ent!.id}:${n}`,
          });
          if (res.created) commands++;
        }
      }
    }
    await tx`UPDATE orders SET status = 'fulfilled', fulfilled_at = coalesce(fulfilled_at, now()) WHERE id = ${orderId}`;
    return { entitlements, commands };
  });
}
