import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../src/db";
import { createOrder, fulfillOrder, handlePaymentSucceeded, nextOrderPublicId } from "../src/services/orders";
import { freshDb } from "./helpers";

let sql: Sql;
const recipient = { uuid: "33333333-3333-4333-8333-333333333333", username: "Acheteur" };
let productId: string;

beforeAll(async () => {
  sql = await freshDb();
  const [p] = await sql`
    INSERT INTO products (slug, name, category_id, price_cents, active, delivery_type)
    SELECT 'tag-test', 'Tag Test', id, 999, true, 'COSMETIC' FROM product_categories WHERE slug = 'cosmetiques' RETURNING id`;
  productId = p!.id as string;
  await sql`INSERT INTO product_deliveries (product_id, position, action, command) VALUES
    (${productId}, 0, 'COMMAND', 'lp user {uuid} permission set tag.test'), (${productId}, 1, 'COMMAND', 'broadcast {username} x{quantity}')`;
});
afterAll(() => sql.end());

describe("commandes boutique", () => {
  it("génère des identifiants publics séquentiels VAL-AAAA-NNNNNN", async () => {
    expect(await nextOrderPublicId(sql, new Date("2030-05-01"))).toBe("VAL-2030-000001");
    expect(await nextOrderPublicId(sql, new Date("2030-06-01"))).toBe("VAL-2030-000002");
  });

  it("une même clé d'idempotence ne crée qu'une commande", async () => {
    const key = randomUUID();
    const a = await createOrder(sql, { recipient, items: [{ productId, quantity: 1 }], idempotencyKey: key });
    const b = await createOrder(sql, { recipient, items: [{ productId, quantity: 1 }], idempotencyKey: key });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.publicId).toBe(a.publicId);
    expect(a.totalCents).toBe(999);
    expect(a.pointsTotal).toBe(9); // 9,99 € → 9 points (arrondi inférieur)
  });

  it("un webhook reçu deux fois ne livre et ne crédite qu'une fois", async () => {
    const order = await createOrder(sql, { recipient, items: [{ productId, quantity: 2 }], idempotencyKey: randomUUID() });
    const payload = { provider: "test", providerEventId: "evt_1", providerPaymentId: "pay_1", orderId: order.id, amountCents: 1998, currency: "EUR" };
    expect(await handlePaymentSucceeded(sql, payload)).toBe("processed");
    expect(await handlePaymentSucceeded(sql, payload)).toBe("duplicate");
    expect(await handlePaymentSucceeded(sql, { ...payload, providerEventId: "evt_2" })).toBe("processed");
    await fulfillOrder(sql, order.id);

    const [{ deliveries }] = (await sql`SELECT count(*)::int AS deliveries FROM deliveries WHERE order_id = ${order.id} AND rank_key IS NULL`) as unknown as [{ deliveries: number }];
    const cmds = await sql`SELECT c.command FROM minecraft_commands c JOIN deliveries d ON d.id = c.delivery_id WHERE d.order_id = ${order.id} AND d.rank_key IS NULL ORDER BY c.created_at`;
    const [{ charges }] = (await sql`SELECT count(*)::int AS charges FROM transactions WHERE order_id = ${order.id}`) as unknown as [{ charges: number }];
    const [{ points }] = (await sql`SELECT coalesce(sum(delta), 0)::int AS points FROM point_transactions WHERE order_id = ${order.id}`) as unknown as [{ points: number }];
    expect(deliveries).toBe(2); // une livraison par unité achetée
    expect(cmds).toHaveLength(4);
    expect(charges).toBe(1);
    expect(points).toBe(18);
    expect(cmds[0]!.command).toBe(`lp user ${recipient.uuid} permission set tag.test`);
    expect(cmds[1]!.command).toBe("broadcast Acheteur x1");
    // 18 points crédités → seuil Guerrier (15) franchi pendant ce paiement
    const ranks = await sql`SELECT rank_key FROM player_ranks WHERE player_uuid = ${recipient.uuid}`;
    expect(ranks.map((r) => r.rank_key)).toEqual(["guerrier"]);
    // Grade sans produit associé : livraison visible en échec (mauvaise configuration), jamais perdue en silence
    const [rankDelivery] = await sql`SELECT status FROM deliveries WHERE rank_key = 'guerrier'`;
    expect(rankDelivery!.status).toBe("FAILED");
    const [o] = await sql`SELECT status FROM orders WHERE id = ${order.id}`;
    expect(o!.status).toBe("fulfilled");
  });

  it("refuse un montant qui ne correspond pas à la commande", async () => {
    const order = await createOrder(sql, { recipient, items: [{ productId, quantity: 1 }], idempotencyKey: randomUUID() });
    const r = await handlePaymentSucceeded(sql, { provider: "test", providerEventId: "evt_bad", providerPaymentId: "pay_bad", orderId: order.id, amountCents: 1, currency: "EUR" });
    expect(r).toBe("amount_mismatch");
    const [o] = await sql`SELECT status FROM orders WHERE id = ${order.id}`;
    expect(o!.status).toBe("pending");
  });

  it("refuse de livrer une commande non payée", async () => {
    const order = await createOrder(sql, { recipient, items: [{ productId, quantity: 1 }], idempotencyKey: randomUUID() });
    await expect(fulfillOrder(sql, order.id)).rejects.toThrow(/non payée/);
  });
});
