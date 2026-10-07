import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Sql } from "../src/db";
import { loadEnv } from "../src/env";
import { createStripeProvider, stripeSignature } from "../src/services/payments/stripe";
import { seedShopExamples } from "../src/shopSeed";
import { ADMIN_TOKEN, MOJANG, devLogin, freshDb, sandboxWebhook, signedHeaders, testApp, TEST_DB } from "./helpers";

let sql: Sql;
let app: FastifyInstance;
let token: string;
const STEVE = MOJANG.steve!;
const ids: Record<string, string> = {};
const auth = () => ({ authorization: `Session ${token}` });
const admin = { authorization: `Bearer ${ADMIN_TOKEN}` };

beforeAll(async () => {
  sql = await freshDb();
  await seedShopExamples(sql);
  app = await testApp(sql);
  token = await devLogin(app, "Adrien");
  for (const r of await sql<{ slug: string; id: string }[]>`SELECT slug, id FROM products`) ids[r.slug] = r.id;
});
afterAll(async () => {
  await app.close();
  await sql.end();
});

async function buy(items: { slug: string; quantity?: number }[], recipient = "Steve") {
  const res = await app.inject({
    method: "POST", url: "/api/v1/shop/checkout", headers: auth(),
    payload: { items: items.map((i) => ({ productId: ids[i.slug]!, quantity: i.quantity ?? 1 })), recipient, idempotencyKey: randomUUID() },
  });
  expect(res.statusCode, res.body).toBe(201);
  return res.json() as { publicId: string; totalCents: number; pointsTotal: number; paymentUrl: string };
}

/** Paie via la page du prestataire de test (webhook signé émis côté serveur). */
async function pay(paymentUrl: string) {
  const path = new URL(paymentUrl).pathname;
  // Comme le navigateur : formulaire HTML (application/x-www-form-urlencoded)
  const res = await app.inject({ method: "POST", url: `${path}/pay`, headers: { "content-type": "application/x-www-form-urlencoded" }, payload: "" });
  expect(res.statusCode).toBe(303);
}

const balance = async () => ((await sql`SELECT balance FROM shop_points WHERE player_uuid = ${STEVE}`)[0]?.balance as number | undefined) ?? 0;

describe("catalogue", () => {
  it("expose catégories, produits d'exemple et grades depuis la base", async () => {
    const c = (await app.inject({ url: "/api/v1/shop/catalog" })).json();
    expect(c.categories.map((x: { slug: string }) => x.slug)).toEqual(["grades", "spawners", "items", "kits", "packs", "cosmetiques"]);
    expect(c.ranks.map((r: { key: string; minPoints: number }) => `${r.key}:${r.minPoints}`)).toEqual(["joueur:0", "guerrier:15", "seigneur:35", "roi:65", "vaelorian:100"]);
    const spawner = c.products.find((p: { slug: string }) => p.slug === "pack-5-spawners");
    expect(spawner.price).toMatchObject({ priceCents: 2200, points: 22 });
    expect(c.products.find((p: { slug: string }) => p.slug === "grade-roi").rankKey).toBe("roi");
  });

  it("le devis ignore tout prix ou point envoyé par le navigateur", async () => {
    const res = await app.inject({
      method: "POST", url: "/api/v1/shop/quote",
      payload: { items: [{ productId: ids["pack-guerre"], quantity: 2, priceCents: 1, points: 9999 }] },
    });
    expect(res.json()).toMatchObject({ totalCents: 5000, totalPoints: 50, rejected: [] });
  });

  it("refuse un produit inactif dans le devis", async () => {
    await sql`UPDATE products SET active = false WHERE slug = 'tag-fondateur'`;
    const q = (await app.inject({ method: "POST", url: "/api/v1/shop/quote", payload: { items: [{ productId: ids["tag-fondateur"], quantity: 1 }] } })).json();
    expect(q.rejected[0].reason).toBe("Produit indisponible");
    await sql`UPDATE products SET active = true WHERE slug = 'tag-fondateur'`;
  });
});

describe("checkout", () => {
  it("exige un compte VÆLORIA", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/shop/checkout", payload: { items: [{ productId: ids["pack-fer"], quantity: 1 }], recipient: "Steve", idempotencyKey: randomUUID() } });
    expect(res.statusCode).toBe(401);
  });

  it("refuse un pseudo qui n'est pas un compte Minecraft", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/shop/checkout", headers: auth(), payload: { items: [{ productId: ids["pack-fer"], quantity: 1 }], recipient: "Personne", idempotencyKey: randomUUID() } });
    expect(res.statusCode).toBe(422);
  });

  it("rien n'est crédité tant que le webhook n'est pas arrivé", async () => {
    const order = await buy([{ slug: "pack-guerre" }]);
    expect(order.paymentUrl).toContain("/sandbox/checkout/");
    const view = (await app.inject({ url: `/api/v1/shop/orders/${order.publicId}`, headers: auth() })).json();
    expect(view.status).toBe("pending");
    expect(await balance()).toBe(0);
  });

  it("une commande n'est visible que par son acheteur", async () => {
    const order = await buy([{ slug: "pack-fer" }]);
    const other = await devLogin(app, "Intrus");
    expect((await app.inject({ url: `/api/v1/shop/orders/${order.publicId}`, headers: { authorization: `Session ${other}` } })).statusCode).toBe(404);
  });
});

describe("webhooks", () => {
  it("rejette une signature falsifiée ou un événement trop ancien", async () => {
    const order = await buy([{ slug: "pack-diamant" }]);
    const [o] = await sql`SELECT id FROM orders WHERE public_id = ${order.publicId}`;
    const event = { id: `evt_${randomUUID()}`, type: "payment.succeeded" as const, orderId: o!.id as string, paymentId: "pay_x", amountCents: 1000, currency: "EUR" };
    expect((await sandboxWebhook(app, event, { secret: "x".repeat(40) })).statusCode).toBe(400);
    expect((await sandboxWebhook(app, event, { timestamp: Math.floor(Date.now() / 1000) - 3600 })).statusCode).toBe(400);
    const [after] = await sql`SELECT status FROM orders WHERE id = ${o!.id}`;
    expect(after!.status).toBe("pending");
  });

  it("paiement confirmé → points, grade franchi, livraisons ; rejouer l'événement ne change rien", async () => {
    const order = await buy([{ slug: "pack-guerre" }]);
    const [o] = await sql`SELECT id FROM orders WHERE public_id = ${order.publicId}`;
    const event = { id: `evt_${randomUUID()}`, type: "payment.succeeded" as const, orderId: o!.id as string, paymentId: `pay_${randomUUID()}`, amountCents: 2500, currency: "EUR" };
    expect((await sandboxWebhook(app, event)).json().result).toBe("processed");
    expect((await sandboxWebhook(app, event)).json().result).toBe("duplicate");
    expect(await balance()).toBe(25);

    const view = (await app.inject({ url: `/api/v1/shop/orders/${order.publicId}`, headers: auth() })).json();
    expect(view).toMatchObject({ status: "fulfilled", pointsTotal: 25 });
    expect(view.deliveries.map((d: { label: string }) => d.label).sort()).toEqual(["Grade Guerrier", "Pack Guerre"]);
    expect((await sql`SELECT count(*)::int AS n FROM point_transactions WHERE order_id = ${o!.id}`)[0]!.n).toBe(1);
  });

  it("acheter un grade déjà obtenu par les points ne le livre pas une seconde fois", async () => {
    const order = await buy([{ slug: "grade-guerrier" }]);
    await pay(order.paymentUrl);
    expect(await balance()).toBe(40); // 25 + 15 → Seigneur (35) franchi
    const ranks = await sql`SELECT rank_key, source FROM player_ranks WHERE player_uuid = ${STEVE} ORDER BY unlocked_at`;
    expect(ranks.map((r) => r.rank_key)).toEqual(["guerrier", "seigneur"]);
    expect((await sql`SELECT count(*)::int AS n FROM deliveries WHERE rank_key = 'guerrier'`)[0]!.n).toBe(1);
  });

  it("plusieurs seuils franchis d'un coup : grades attribués dans l'ordre", async () => {
    const order = await buy([{ slug: "pack-endgame" }, { slug: "pack-fer", quantity: 3 }]); // 50 + 12 = 62 → 102 points
    await pay(order.paymentUrl);
    expect(await balance()).toBe(102);
    const ranks = await sql`SELECT rank_key FROM player_ranks WHERE player_uuid = ${STEVE} ORDER BY unlocked_at, rank_key`;
    expect(ranks.map((r) => r.rank_key)).toEqual(expect.arrayContaining(["roi", "vaelorian"]));
    const [{ players_rank }] = (await sql`SELECT rank AS players_rank FROM players WHERE uuid = ${STEVE}`) as unknown as [{ players_rank: string }];
    expect(players_rank).toBe("VÆLORIAN");
  });

  it("le solde est toujours égal à la somme du grand livre", async () => {
    const [{ sum }] = (await sql`SELECT sum(delta)::int AS sum FROM point_transactions WHERE player_uuid = ${STEVE}`) as unknown as [{ sum: number }];
    expect(sum).toBe(await balance());
  });
});

describe("livraison Minecraft", () => {
  it("le plugin reçoit des ordres typés ; l'accusé passe la livraison à DELIVERED", async () => {
    const order = await buy([{ slug: "spawner-zombie" }]);
    await pay(order.paymentUrl);
    const post = (url: string, payload: object) => {
      const body = JSON.stringify(payload);
      return app.inject({ method: "POST", url, payload: body, headers: signedHeaders(body) });
    };
    // Vide la file (toutes les commandes des achats précédents) et accuse tout
    for (let i = 0; i < 20; i++) {
      const cmds = (await post("/bridge/v1/commands/claim", { server: "factions", limit: 100 })).json().commands as { id: string; action: string }[];
      if (cmds.length === 0) break;
      expect(cmds.every((c) => typeof c.action === "string")).toBe(true);
      for (const c of cmds) await post(`/bridge/v1/commands/${c.id}/ack`, { status: "DELIVERED" });
    }
    const view = (await app.inject({ url: `/api/v1/shop/orders/${order.publicId}`, headers: auth() })).json();
    expect(view.deliveries).toEqual([expect.objectContaining({ label: "Spawner Zombie", status: "DELIVERED" })]);
    const actions = await sql`SELECT DISTINCT action FROM minecraft_commands`;
    expect(actions.map((a) => a.action)).toEqual(expect.arrayContaining(["GRANT_RANK", "GIVE_KIT", "GIVE_SPAWNER", "SYNC_PLAYER"]));
    const logs = await sql`SELECT l.status FROM delivery_logs l JOIN deliveries d ON d.id = l.delivery_id JOIN orders o ON o.id = d.order_id WHERE o.public_id = ${order.publicId} ORDER BY l.id`;
    expect(logs.map((l) => l.status)).toEqual(["PENDING", "PROCESSING", "DELIVERED"]);
  });
});

describe("compte joueur", () => {
  it("liaison par code /link puis historique des points", async () => {
    const body = JSON.stringify({ uuid: STEVE, username: "Steve" });
    const { code } = (await app.inject({ method: "POST", url: "/bridge/v1/link-codes", payload: body, headers: signedHeaders(body) })).json();
    expect(code).toMatch(/^[A-Z2-9]{6}$/);
    expect((await app.inject({ url: `/api/v1/me/points/${STEVE}`, headers: auth() })).statusCode).toBe(404); // pas encore lié
    expect((await app.inject({ method: "POST", url: "/api/v1/me/link", headers: auth(), payload: { code } })).statusCode).toBe(200);
    expect((await app.inject({ method: "POST", url: "/api/v1/me/link", headers: auth(), payload: { code } })).statusCode).toBe(400); // usage unique

    const me = (await app.inject({ url: "/api/v1/me", headers: auth() })).json();
    expect(me.minecraft[0]).toMatchObject({ username: "Steve", progress: { points: 107, current: { key: "vaelorian" }, top: { unlocked: true } } });
    const pts = (await app.inject({ url: `/api/v1/me/points/${STEVE}`, headers: auth() })).json();
    expect(pts.history[0]).toMatchObject({ delta: 5, label: "Spawner Zombie", balanceAfter: 107 });
    expect(pts.history.at(-1)).toMatchObject({ delta: 25, label: "Pack Guerre" });
  });
});

describe("remboursements", () => {
  it("remboursement total : points retirés, livraisons non effectuées annulées, grade à examiner (jamais retiré d'office)", async () => {
    const order = await buy([{ slug: "pack-endgame" }]);
    await pay(order.paymentUrl);
    expect(await balance()).toBe(157);
    const [p] = await sql`SELECT p.provider_payment_id FROM payments p JOIN orders o ON o.id = p.order_id WHERE o.public_id = ${order.publicId}`;
    // Seuil VÆLORIAN relevé pour vérifier le passage « à examiner » après retrait des points
    await sql`UPDATE rank_thresholds SET min_points = 150 WHERE key = 'vaelorian'`;
    const event = { id: `evt_${randomUUID()}`, type: "refund.succeeded" as const, paymentId: p!.provider_payment_id as string, amountCents: 5000, currency: "EUR", refundId: `re_${randomUUID()}` };
    expect((await sandboxWebhook(app, event)).statusCode).toBe(200);
    expect((await sandboxWebhook(app, event)).json().result).toBe("duplicate");
    expect(await balance()).toBe(107);
    const [o] = await sql`SELECT status FROM orders WHERE public_id = ${order.publicId}`;
    expect(o!.status).toBe("refunded");
    const d = await sql`SELECT DISTINCT d.status FROM deliveries d JOIN orders o ON o.id = d.order_id WHERE o.public_id = ${order.publicId}`;
    expect(d.map((x) => x.status)).toEqual(["CANCELLED"]);
    const [rank] = await sql`SELECT status FROM player_ranks WHERE player_uuid = ${STEVE} AND rank_key = 'vaelorian'`;
    expect(rank!.status).toBe("review");
    const history = await sql`SELECT count(*)::int AS n FROM point_transactions WHERE player_uuid = ${STEVE}`;
    expect(history[0]!.n).toBeGreaterThan(5); // l'historique n'est jamais supprimé
    await sql`UPDATE rank_thresholds SET min_points = 100 WHERE key = 'vaelorian'`;
  });
});

describe("administration boutique", () => {
  it("modifie un seuil de grade sans toucher au code (15 → 20)", async () => {
    const res = await app.inject({ method: "PUT", url: "/admin/v1/shop/ranks/guerrier", headers: admin, payload: { key: "guerrier", name: "Guerrier", minPoints: 20, position: 1, productId: ids["grade-guerrier"] } });
    expect(res.statusCode).toBe(200);
    const c = (await app.inject({ url: "/api/v1/shop/catalog" })).json();
    expect(c.ranks.find((r: { key: string }) => r.key === "guerrier").minPoints).toBe(20);
  });

  it("crée un produit avec points ≠ prix et ses commandes de livraison", async () => {
    const [cat] = await sql`SELECT id FROM product_categories WHERE slug = 'packs'`;
    const res = await app.inject({
      method: "POST", url: "/admin/v1/shop/products", headers: admin,
      payload: { name: "Pack Test", slug: "pack-test", categoryId: cat!.id, priceCents: 2000, points: 15, active: true, deliveryType: "PACK",
        deliveries: [{ action: "GIVE_ITEM", command: "give {username} minecraft:diamond {quantity}", requireOnline: true }] },
    });
    expect(res.statusCode, res.body).toBe(201);
    const q = (await app.inject({ method: "POST", url: "/api/v1/shop/quote", payload: { items: [{ productId: res.json().id, quantity: 1 }] } })).json();
    expect(q).toMatchObject({ totalCents: 2000, totalPoints: 15 });
    const dup = await app.inject({ method: "POST", url: "/admin/v1/shop/products", headers: admin, payload: { name: "Doublon", slug: "pack-test", categoryId: cat!.id, priceCents: 1, deliveryType: "PACK" } });
    expect(dup.statusCode).toBe(409);
  });

  it("une promotion bonus de points s'applique immédiatement", async () => {
    await app.inject({
      method: "POST", url: "/admin/v1/shop/promotions", headers: admin,
      payload: { name: "Week-end", label: "WEEK-END VÆLORIA", kind: "points_bonus", value: 3, targetType: "product", targetId: ids["pack-3-spawners"], startsAt: new Date(Date.now() - 1000).toISOString() },
    });
    const q = (await app.inject({ method: "POST", url: "/api/v1/shop/quote", payload: { items: [{ productId: ids["pack-3-spawners"], quantity: 1 }] } })).json();
    expect(q).toMatchObject({ totalCents: 1500, totalPoints: 18 });
  });

  it("tableau de bord : CA, points générés, grades débloqués", async () => {
    const d = (await app.inject({ url: "/admin/v1/shop/dashboard", headers: admin })).json();
    expect(d.kpi.revenueTotalCents).toBe(2500 + 1500 + 6200 + 500 + 5000 - 5000);
    expect(d.kpi.pointsGenerated).toBe(157);
    expect(d.ranks.find((r: { key: string }) => r.key === "vaelorian").unlocked).toBe(1);
    expect(d.kpi.ranksToReview).toBe(1);
  });

  it("retrouve un joueur créé par un achat (jamais connecté en jeu)", async () => {
    const r = (await app.inject({ url: "/admin/v1/players?q=Stev", headers: admin })).json();
    expect(r.items.map((p: { uuid: string }) => p.uuid)).toContain(STEVE);
  });

  it("refuse l'accès sans jeton admin", async () => {
    expect((await app.inject({ url: "/admin/v1/shop/dashboard" })).statusCode).toBe(401);
  });
});

describe("Stripe", () => {
  const secret = "whsec_test_secret";
  const now = 1_800_000_000_000;
  const stripe = createStripeProvider({ secretKey: "sk_test", webhookSecret: secret, now: () => now });
  const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed", data: { object: { payment_status: "paid", metadata: { order_id: "o1" }, payment_intent: "pi_1", amount_total: 2500, currency: "eur" } } });
  const t = Math.floor(now / 1000);

  it("accepte une signature valide et normalise l'événement", () => {
    const e = stripe.parseWebhook(body, { "stripe-signature": `t=${t},v1=${stripeSignature(secret, t, body)}` });
    expect(e).toMatchObject({ kind: "payment.succeeded", orderId: "o1", providerPaymentId: "pi_1", amountCents: 2500, currency: "EUR" });
  });
  it("rejette signature fausse, corps modifié et rejeu tardif", () => {
    expect(() => stripe.parseWebhook(body, { "stripe-signature": `t=${t},v1=${"0".repeat(64)}` })).toThrow();
    expect(() => stripe.parseWebhook(body.replace("2500", "1"), { "stripe-signature": `t=${t},v1=${stripeSignature(secret, t, body)}` })).toThrow();
    expect(() => stripe.parseWebhook(body, { "stripe-signature": `t=${t - 600},v1=${stripeSignature(secret, t - 600, body)}` })).toThrow(/ancien/);
  });
});

describe("configuration", () => {
  it("refuse le prestataire de test et la connexion de dev en production", () => {
    expect(() => loadEnv({ NODE_ENV: "production", DATABASE_URL: TEST_DB, PAYMENT_PROVIDER: "sandbox", SANDBOX_WEBHOOK_SECRET: "s".repeat(40) } as NodeJS.ProcessEnv)).toThrow(/sandbox/);
    expect(() => loadEnv({ NODE_ENV: "production", DATABASE_URL: TEST_DB, DEV_LOGIN: "1" } as NodeJS.ProcessEnv)).toThrow(/développement/);
  });
});
