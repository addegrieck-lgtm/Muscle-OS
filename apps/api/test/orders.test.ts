import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../src/db";
import { createOrder, fulfillOrder, handlePaymentSucceeded, nextOrderPublicId } from "../src/services/orders";
import { freshDb } from "./helpers";

let sql: Sql;
const player = "33333333-3333-4333-8333-333333333333";
let productId: string;

beforeAll(async () => {
  sql = await freshDb();
  await sql`INSERT INTO players (uuid, username) VALUES (${player}, 'Acheteur')`;
  const [p] = await sql`
    INSERT INTO products (slug, name, category, price_cents, active, delivery_commands)
    VALUES ('rang-chevalier', 'Rang Chevalier', 'ranks', 999, true, ${sql.json(["lp user {uuid} parent add chevalier", "broadcast {username} est Chevalier"])})
    RETURNING id`;
  productId = p!.id as string;
});
afterAll(() => sql.end());

describe("commandes boutique", () => {
  it("génère des identifiants publics séquentiels VAL-AAAA-NNNNNN", async () => {
    const a = await nextOrderPublicId(sql, new Date("2030-05-01"));
    const b = await nextOrderPublicId(sql, new Date("2030-06-01"));
    expect(a).toBe("VAL-2030-000001");
    expect(b).toBe("VAL-2030-000002");
  });

  it("une même clé d'idempotence ne crée qu'une commande", async () => {
    const key = randomUUID();
    const a = await createOrder(sql, { playerUuid: player, items: [{ productId, quantity: 1 }], idempotencyKey: key });
    const b = await createOrder(sql, { playerUuid: player, items: [{ productId, quantity: 1 }], idempotencyKey: key });
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(b.publicId).toBe(a.publicId);
    expect(a.totalCents).toBe(999);
  });

  it("un webhook reçu deux fois ne livre qu'une fois", async () => {
    const order = await createOrder(sql, { playerUuid: player, items: [{ productId, quantity: 2 }], idempotencyKey: randomUUID() });
    const payload = { provider: "test", providerEventId: "evt_1", providerPaymentId: "pay_1", orderId: order.id, amountCents: 1998, currency: "EUR" };
    expect(await handlePaymentSucceeded(sql, payload)).toBe("processed");
    expect(await handlePaymentSucceeded(sql, payload)).toBe("duplicate");
    // Même paiement notifié via un autre événement : la livraison reste unique.
    expect(await handlePaymentSucceeded(sql, { ...payload, providerEventId: "evt_2" })).toBe("processed");
    await fulfillOrder(sql, order.id);

    const [{ ents }] = (await sql`SELECT count(*)::int AS ents FROM entitlements WHERE order_id = ${order.id}`) as unknown as [{ ents: number }];
    const cmds = await sql`SELECT command FROM minecraft_commands c JOIN entitlements e ON e.id = c.entitlement_id WHERE e.order_id = ${order.id}`;
    const [{ charges }] = (await sql`SELECT count(*)::int AS charges FROM transactions WHERE order_id = ${order.id}`) as unknown as [{ charges: number }];
    expect(ents).toBe(2);
    expect(cmds).toHaveLength(4);
    expect(charges).toBe(1);
    expect(cmds[0]!.command).toBe(`lp user ${player} parent add chevalier`);
    const [o] = await sql`SELECT status FROM orders WHERE id = ${order.id}`;
    expect(o!.status).toBe("fulfilled");
  });

  it("refuse un montant qui ne correspond pas à la commande", async () => {
    const order = await createOrder(sql, { playerUuid: player, items: [{ productId, quantity: 1 }], idempotencyKey: randomUUID() });
    const r = await handlePaymentSucceeded(sql, { provider: "test", providerEventId: "evt_bad", providerPaymentId: "pay_bad", orderId: order.id, amountCents: 1, currency: "EUR" });
    expect(r).toBe("amount_mismatch");
    const [o] = await sql`SELECT status FROM orders WHERE id = ${order.id}`;
    expect(o!.status).toBe("pending");
  });

  it("refuse de livrer une commande non payée", async () => {
    const order = await createOrder(sql, { playerUuid: player, items: [{ productId, quantity: 1 }], idempotencyKey: randomUUID() });
    await expect(fulfillOrder(sql, order.id)).rejects.toThrow(/non payée/);
  });
});
