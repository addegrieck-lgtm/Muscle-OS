import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { DELIVERY_ACTIONS, DELIVERY_TYPES } from "@vaeloria/types";
import type { AppContext } from "../context";
import { HttpError, notFound, unauthorized } from "../lib/errors";
import { safeEqualString } from "../lib/hmac";
import { parse } from "../lib/validate";
import { refreshDeliveries } from "../services/commands";
import { fulfillOrder, handleRefund } from "../services/orders";
import { flagRanksForReview, movePoints, syncRanks } from "../services/shop/ledger";

const Slug = z.string().regex(/^[a-z0-9-]{1,120}$/, "slug : minuscules, chiffres et tirets");
const Id = z.object({ id: z.string().uuid() });

const DeliveryInput = z.object({
  action: z.enum(DELIVERY_ACTIONS),
  command: z.string().trim().max(500).nullable().default(null),
  requireOnline: z.boolean().default(false),
}).refine((d) => d.command || d.action === "ADD_POINTS" || d.action === "SYNC_PLAYER", { message: "Commande requise pour cette action" });

const ProductInput = z.object({
  name: z.string().trim().min(2).max(120),
  slug: Slug,
  categoryId: z.string().uuid(),
  shortDescription: z.string().max(200).default(""),
  description: z.string().max(5000).default(""),
  priceCents: z.number().int().min(0).max(100_000),
  /** null = points calculés depuis le prix (1 € = 1 point par défaut). */
  points: z.number().int().min(0).max(100_000).nullable().default(null),
  imageUrl: z.string().url().nullable().default(null),
  stock: z.number().int().min(0).nullable().default(null),
  active: z.boolean().default(false),
  sortOrder: z.number().int().default(0),
  deliveryType: z.enum(DELIVERY_TYPES),
  deliveries: z.array(DeliveryInput).max(30).default([]),
});

const PromotionInput = z.object({
  name: z.string().trim().min(2).max(120),
  label: z.string().trim().max(40).nullable().default(null),
  kind: z.enum(["percent", "fixed", "points_bonus"]),
  value: z.number().int().min(1).max(100_000),
  targetType: z.enum(["all", "category", "product"]),
  targetId: z.string().uuid().nullable().default(null),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().default(null),
  active: z.boolean().default(true),
}).refine((p) => (p.targetType === "all") === (p.targetId === null), { message: "Cible incohérente" })
  .refine((p) => p.kind !== "percent" || p.value <= 90, { message: "Réduction maximale : 90 %" })
  .refine((p) => !p.endsAt || p.endsAt > p.startsAt, { message: "La fin doit suivre le début" });

const RankInput = z.object({
  key: z.string().regex(/^[a-z0-9_-]{2,32}$/),
  name: z.string().trim().min(2).max(40),
  minPoints: z.number().int().min(0).max(1_000_000),
  position: z.number().int().min(0).max(1000),
  productId: z.string().uuid().nullable().default(null),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().default(null),
  perks: z.array(z.string().max(120)).max(20).default([]),
  active: z.boolean().default(true),
});

/** Administration de la boutique. Même protection que /admin/v1 (jeton serveur à serveur). */
export async function adminShopRoutes(app: FastifyInstance, ctx: AppContext) {
  const { sql, cache } = ctx;

  app.addHook("onRequest", async (req) => {
    const token = ctx.env.ADMIN_API_TOKEN;
    const header = req.headers.authorization ?? "";
    if (!token || !header.startsWith("Bearer ") || !safeEqualString(header.slice(7), token)) throw unauthorized();
  });

  const audit = (action: string, targetType: string, targetId: string, metadata: object = {}) =>
    sql`INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, metadata)
        VALUES ('admin', 'admin-token', ${action}, ${targetType}, ${targetId}, ${sql.json(metadata as never)})`;
  const invalidate = () => cache.invalidate("shop:");

  // ───── Tableau de bord ─────
  app.get("/dashboard", async () => {
    const [kpi] = await sql`
      SELECT
        (SELECT coalesce(sum(amount_cents), 0)::int FROM transactions) AS "revenueTotalCents",
        (SELECT coalesce(sum(amount_cents), 0)::int FROM transactions WHERE created_at >= date_trunc('month', now())) AS "revenueMonthCents",
        (SELECT coalesce(sum(amount_cents), 0)::int FROM transactions WHERE created_at >= date_trunc('day', now())) AS "revenueTodayCents",
        (SELECT count(*)::int FROM orders WHERE paid_at >= date_trunc('day', now())) AS "ordersToday",
        (SELECT count(*)::int FROM orders WHERE paid_at >= date_trunc('month', now())) AS "ordersMonth",
        (SELECT count(*)::int FROM orders WHERE status = 'pending' AND (expires_at IS NULL OR expires_at > now())) AS "pendingPayments",
        (SELECT coalesce(sum(delta), 0)::int FROM point_transactions WHERE reason = 'purchase') AS "pointsGenerated",
        (SELECT count(*)::int FROM refunds) AS "refundsCount",
        (SELECT coalesce(sum(amount_cents), 0)::int FROM refunds) AS "refundsCents",
        (SELECT count(*)::int FROM deliveries WHERE created_at > now() - interval '30 days') AS "deliveries30d",
        (SELECT count(*)::int FROM deliveries WHERE status = 'FAILED' AND created_at > now() - interval '30 days') AS "deliveriesFailed30d",
        (SELECT count(*)::int FROM deliveries WHERE status IN ('PENDING','PROCESSING')) AS "deliveriesPending",
        (SELECT count(*)::int FROM player_ranks WHERE status = 'review') AS "ranksToReview"`;
    const ranks = await sql`
      SELECT r.key, r.name, r.min_points AS "minPoints", count(pr.player_uuid)::int AS unlocked
      FROM rank_thresholds r LEFT JOIN player_ranks pr ON pr.rank_key = r.key AND pr.status <> 'revoked'
      WHERE r.min_points > 0 GROUP BY r.key ORDER BY r.min_points`;
    const topProducts = await sql`
      SELECT i.product_name AS name, sum(i.quantity)::int AS quantity, sum(i.unit_price_cents * i.quantity)::int AS "revenueCents",
             sum(i.points_per_unit * i.quantity)::int AS points
      FROM order_items i JOIN orders o ON o.id = i.order_id
      WHERE o.status IN ('paid','fulfilled','partially_refunded') GROUP BY i.product_name ORDER BY "revenueCents" DESC LIMIT 10`;
    const funnel = await sql`
      SELECT name, count(*)::int AS count FROM analytics_events
      WHERE created_at > now() - interval '30 days' AND name IN ('shop_view','product_view','add_to_cart','remove_from_cart','checkout_started','payment_started','payment_success','payment_failed','order_delivered')
      GROUP BY name`;
    return { kpi, ranks, topProducts, funnel };
  });

  // ───── Catégories ─────
  app.get("/categories", async () => ({
    items: await sql`SELECT id, slug, name, description, position, active, seo_title AS "seoTitle", seo_description AS "seoDescription",
                     (SELECT count(*)::int FROM products p WHERE p.category_id = c.id) AS products
                     FROM product_categories c ORDER BY position`,
  }));
  app.put("/categories/:id", async (req) => {
    const { id } = parse(Id, req.params);
    const b = parse(z.object({
      name: z.string().trim().min(2).max(60), description: z.string().max(500).default(""), position: z.number().int().default(0), active: z.boolean().default(true),
      seoTitle: z.string().max(70).nullable().default(null), seoDescription: z.string().max(170).nullable().default(null),
    }), req.body);
    const rows = await sql`UPDATE product_categories SET name = ${b.name}, description = ${b.description}, position = ${b.position}, active = ${b.active},
                             seo_title = ${b.seoTitle}, seo_description = ${b.seoDescription} WHERE id = ${id} RETURNING id`;
    if (!rows.length) throw notFound("Catégorie");
    await audit("shop.category.update", "category", id);
    invalidate();
    return { ok: true };
  });

  // ───── Produits ─────
  app.get("/products", async () => ({
    items: await sql`
      SELECT p.id, p.name, p.slug, c.slug AS category, p.price_cents AS "priceCents", p.points, p.active, p.stock, p.delivery_type AS "deliveryType", p.sort_order AS "sortOrder",
             (SELECT count(*)::int FROM product_deliveries d WHERE d.product_id = p.id) AS deliveries,
             (SELECT r.name FROM rank_thresholds r WHERE r.product_id = p.id LIMIT 1) AS rank
      FROM products p JOIN product_categories c ON c.id = p.category_id ORDER BY c.position, p.sort_order, p.price_cents`,
  }));

  app.get("/products/:id", async (req) => {
    const { id } = parse(Id, req.params);
    const [p] = await sql`
      SELECT id, name, slug, category_id AS "categoryId", short_description AS "shortDescription", description, price_cents AS "priceCents",
             points, image_url AS "imageUrl", stock, active, sort_order AS "sortOrder", delivery_type AS "deliveryType"
      FROM products WHERE id = ${id}`;
    if (!p) throw notFound("Produit");
    const deliveries = await sql`SELECT action, command, require_online AS "requireOnline" FROM product_deliveries WHERE product_id = ${id} ORDER BY position`;
    return { ...p, deliveries };
  });

  async function saveProduct(id: string | null, body: unknown) {
    const b = parse(ProductInput, body);
    return sql.begin(async (tx) => {
      const row = {
        name: b.name, slug: b.slug, category_id: b.categoryId, short_description: b.shortDescription, description: b.description,
        price_cents: b.priceCents, points: b.points, image_url: b.imageUrl, stock: b.stock, active: b.active, sort_order: b.sortOrder,
        delivery_type: b.deliveryType, updated_at: new Date().toISOString(),
      };
      const [saved] = id
        ? await tx<{ id: string }[]>`UPDATE products SET ${tx(row)} WHERE id = ${id} RETURNING id`
        : await tx<{ id: string }[]>`INSERT INTO products ${tx(row)} RETURNING id`;
      if (!saved) throw notFound("Produit");
      // Les livraisons déjà créées gardent leurs commandes : modifier un produit n'affecte que les achats futurs.
      await tx`DELETE FROM product_deliveries WHERE product_id = ${saved.id}`;
      for (const [position, d] of b.deliveries.entries()) {
        await tx`INSERT INTO product_deliveries (product_id, position, action, command, require_online)
                 VALUES (${saved.id}, ${position}, ${d.action}, ${d.command || null}, ${d.requireOnline})`;
      }
      return saved.id;
    });
  }

  app.post("/products", async (req, reply) => {
    const id = await saveProduct(null, req.body).catch(conflict);
    await audit("shop.product.create", "product", id, { body: req.body });
    invalidate();
    reply.code(201);
    return { id };
  });
  app.put("/products/:id", async (req) => {
    const { id } = parse(Id, req.params);
    await saveProduct(id, req.body).catch(conflict);
    await audit("shop.product.update", "product", id, { body: req.body });
    invalidate();
    return { id };
  });
  app.delete("/products/:id", async (req) => {
    const { id } = parse(Id, req.params);
    // Un produit déjà vendu est désactivé, jamais supprimé (historique des commandes).
    const sold = await sql`SELECT 1 FROM order_items WHERE product_id = ${id} LIMIT 1`;
    if (sold.length) await sql`UPDATE products SET active = false WHERE id = ${id}`;
    else await sql`DELETE FROM products WHERE id = ${id}`;
    await audit(sold.length ? "shop.product.deactivate" : "shop.product.delete", "product", id);
    invalidate();
    return { result: sold.length ? "deactivated" : "deleted" };
  });

  // ───── Promotions ─────
  app.get("/promotions", async () => ({
    items: await sql`
      SELECT p.id, p.name, p.label, p.kind, p.value, p.target_type AS "targetType", p.target_id AS "targetId", p.starts_at AS "startsAt",
             p.ends_at AS "endsAt", p.active, coalesce(pr.name, c.name) AS "targetName",
             (p.active AND p.starts_at <= now() AND (p.ends_at IS NULL OR p.ends_at > now())) AS live
      FROM promotions p LEFT JOIN products pr ON pr.id = p.target_id LEFT JOIN product_categories c ON c.id = p.target_id
      ORDER BY p.starts_at DESC`,
  }));
  async function savePromotion(id: string | null, body: unknown) {
    const b = parse(PromotionInput, body);
    const row = { name: b.name, label: b.label, kind: b.kind, value: b.value, target_type: b.targetType, target_id: b.targetId, starts_at: b.startsAt, ends_at: b.endsAt, active: b.active };
    const [r] = id ? await sql<{ id: string }[]>`UPDATE promotions SET ${sql(row)} WHERE id = ${id} RETURNING id` : await sql<{ id: string }[]>`INSERT INTO promotions ${sql(row)} RETURNING id`;
    if (!r) throw notFound("Promotion");
    return r.id;
  }
  app.post("/promotions", async (req, reply) => {
    const id = await savePromotion(null, req.body);
    await audit("shop.promotion.create", "promotion", id, { body: req.body });
    invalidate();
    reply.code(201);
    return { id };
  });
  app.put("/promotions/:id", async (req) => {
    const { id } = parse(Id, req.params);
    await savePromotion(id, req.body);
    await audit("shop.promotion.update", "promotion", id, { body: req.body });
    invalidate();
    return { id };
  });
  app.delete("/promotions/:id", async (req) => {
    const { id } = parse(Id, req.params);
    // Une promotion appliquée à des commandes est désactivée, pas supprimée.
    const used = await sql`SELECT 1 FROM order_items WHERE promotion_id = ${id} LIMIT 1`;
    if (used.length) await sql`UPDATE promotions SET active = false WHERE id = ${id}`;
    else await sql`DELETE FROM promotions WHERE id = ${id}`;
    await audit("shop.promotion.delete", "promotion", id);
    invalidate();
    return { result: used.length ? "deactivated" : "deleted" };
  });

  // ───── Grades ─────
  app.get("/ranks", async () => ({
    items: await sql`
      SELECT r.key, r.name, r.min_points AS "minPoints", r.position, r.product_id AS "productId", p.name AS "productName", r.color, r.perks, r.active,
             (SELECT count(*)::int FROM player_ranks pr WHERE pr.rank_key = r.key AND pr.status <> 'revoked') AS holders
      FROM rank_thresholds r LEFT JOIN products p ON p.id = r.product_id ORDER BY r.position`,
  }));
  app.put("/ranks/:key", async (req) => {
    const { key } = parse(z.object({ key: z.string() }), req.params);
    const b = parse(RankInput, req.body);
    const rows = await sql`
      UPDATE rank_thresholds SET key = ${b.key}, name = ${b.name}, min_points = ${b.minPoints}, position = ${b.position}, product_id = ${b.productId},
             color = ${b.color}, perks = ${sql.json(b.perks)}, active = ${b.active}
      WHERE key = ${key} RETURNING key`.catch(conflict);
    if (!rows.length) throw notFound("Grade");
    await audit("shop.rank.update", "rank", b.key, { body: b });
    invalidate();
    return { key: b.key };
  });
  app.post("/ranks", async (req, reply) => {
    const b = parse(RankInput, req.body);
    await sql`INSERT INTO rank_thresholds (key, name, min_points, position, product_id, color, perks, active)
              VALUES (${b.key}, ${b.name}, ${b.minPoints}, ${b.position}, ${b.productId}, ${b.color}, ${sql.json(b.perks)}, ${b.active})`.catch(conflict);
    await audit("shop.rank.create", "rank", b.key);
    invalidate();
    reply.code(201);
    return { key: b.key };
  });
  /** Après une baisse de seuil : attribue les grades devenus atteignables (jamais de retrait). */
  app.post("/ranks/sync", async () => {
    const players = await sql<{ uuid: string; username: string }[]>`
      SELECT s.player_uuid AS uuid, p.username FROM shop_points s JOIN players p ON p.uuid = s.player_uuid WHERE s.balance > 0`;
    let unlocked = 0;
    for (const p of players) unlocked += (await sql.begin((tx) => syncRanks(tx, p.uuid, p.username))).length;
    await audit("shop.rank.sync", "rank", "*", { players: players.length, unlocked });
    return { players: players.length, unlocked };
  });
  app.get("/ranks/reviews", async () => ({
    items: await sql`
      SELECT pr.player_uuid AS uuid, p.username, pr.rank_key AS "rankKey", r.name AS "rankName", r.min_points AS "minPoints",
             coalesce(s.balance, 0) AS balance, pr.unlocked_at AS "unlockedAt"
      FROM player_ranks pr JOIN players p ON p.uuid = pr.player_uuid JOIN rank_thresholds r ON r.key = pr.rank_key
      LEFT JOIN shop_points s ON s.player_uuid = pr.player_uuid WHERE pr.status = 'review' ORDER BY pr.unlocked_at`,
  }));
  app.post("/ranks/reviews", async (req) => {
    const b = parse(z.object({ uuid: z.string().uuid(), rankKey: z.string(), decision: z.enum(["keep", "revoke"]) }), req.body);
    const rows = await sql`UPDATE player_ranks SET status = ${b.decision === "keep" ? "active" : "revoked"}
                           WHERE player_uuid = ${b.uuid} AND rank_key = ${b.rankKey} AND status = 'review' RETURNING rank_key`;
    if (!rows.length) throw notFound("Grade à examiner");
    await audit(`shop.rank.review.${b.decision}`, "player", b.uuid, { rank: b.rankKey });
    // Le retrait en jeu (commande LuckPerms) reste une action manuelle du staff : volontairement non automatisé.
    return { ok: true };
  });

  // ───── Commandes ─────
  app.get("/orders", async (req) => {
    const { status } = parse(z.object({ status: z.string().max(30).optional() }), req.query);
    return {
      items: await sql`
        SELECT o.public_id AS "publicId", o.status, o.total_cents AS "totalCents", o.points_total AS "pointsTotal", o.recipient_username AS recipient,
               o.created_at AS "createdAt", o.paid_at AS "paidAt", o.provider,
               (SELECT count(*)::int FROM deliveries d WHERE d.order_id = o.id AND d.status = 'FAILED') AS "failedDeliveries"
        FROM orders o ${status ? sql`WHERE o.status = ${status}` : sql``} ORDER BY o.created_at DESC LIMIT 200`,
    };
  });

  async function orderId(publicId: string) {
    const [o] = await sql<{ id: string }[]>`SELECT id FROM orders WHERE public_id = ${publicId}`;
    if (!o) throw notFound("Commande");
    return o.id;
  }

  app.get("/orders/:publicId", async (req) => {
    const { publicId } = parse(z.object({ publicId: z.string().regex(/^VAL-\d{4}-\d{6}$/) }), req.params);
    const id = await orderId(publicId);
    const [order] = await sql`SELECT o.*, u.display_name AS buyer FROM orders o LEFT JOIN users u ON u.id = o.user_id WHERE o.id = ${id}`;
    const [items, payments, events, deliveries, points, refunds] = await Promise.all([
      sql`SELECT product_name AS name, quantity, unit_price_cents AS "unitPriceCents", original_price_cents AS "originalPriceCents", points_per_unit AS "pointsPerUnit" FROM order_items WHERE order_id = ${id} ORDER BY id`,
      sql`SELECT provider, provider_payment_id AS "providerPaymentId", status, amount_cents AS "amountCents", created_at AS "createdAt" FROM payments WHERE order_id = ${id}`,
      sql`SELECT provider_event_id AS id, type, outcome, received_at AS "receivedAt" FROM payment_events WHERE order_id = ${id} ORDER BY received_at`,
      sql`SELECT d.id, d.label, d.status, d.created_at AS "createdAt", d.delivered_at AS "deliveredAt",
                 coalesce((SELECT json_agg(json_build_object('status', l.status, 'message', l.message, 'at', l.created_at) ORDER BY l.created_at) FROM delivery_logs l WHERE l.delivery_id = d.id), '[]') AS logs
          FROM deliveries d WHERE d.order_id = ${id} ORDER BY d.created_at`,
      sql`SELECT delta, balance_after AS "balanceAfter", reason, label, created_at AS "createdAt" FROM point_transactions WHERE order_id = ${id} ORDER BY id`,
      sql`SELECT r.amount_cents AS "amountCents", r.reason, r.source, r.created_at AS "createdAt" FROM refunds r JOIN payments p ON p.id = r.payment_id WHERE p.order_id = ${id}`,
    ]);
    return { order, items, payments, events, deliveries, points, refunds };
  });

  /** Relance la livraison d'une commande payée (idempotent : rien n'est livré deux fois). */
  app.post("/orders/:publicId/fulfill", async (req) => {
    const { publicId } = parse(z.object({ publicId: z.string() }), req.params);
    const r = await fulfillOrder(sql, await orderId(publicId)).catch((e: Error) => {
      throw new HttpError(409, "not_paid", e.message);
    });
    await audit("shop.order.fulfill", "order", publicId, r);
    return r;
  });

  /** Remboursement effectué hors webhook (ex. prestataire sans notification). Préférer le webhook quand il existe. */
  app.post("/orders/:publicId/refund", async (req) => {
    const { publicId } = parse(z.object({ publicId: z.string() }), req.params);
    const b = parse(z.object({ amountCents: z.number().int().min(1), reason: z.string().trim().min(3).max(300) }), req.body);
    const [p] = await sql<{ provider: string; providerPaymentId: string; total: number; refunded: number }[]>`
      SELECT p.provider, p.provider_payment_id AS "providerPaymentId", o.total_cents AS total,
             coalesce((SELECT sum(amount_cents) FROM refunds r WHERE r.payment_id = p.id), 0)::int AS refunded
      FROM payments p JOIN orders o ON o.id = p.order_id WHERE o.public_id = ${publicId} AND p.status <> 'failed' LIMIT 1`;
    if (!p) throw new HttpError(409, "not_paid", "Aucun paiement à rembourser");
    if (b.amountCents > p.total - p.refunded) throw new HttpError(400, "too_much", "Montant supérieur au reste remboursable");
    const ref = `admin-${randomUUID()}`;
    const r = await handleRefund(sql, { provider: p.provider, providerEventId: ref, providerPaymentId: p.providerPaymentId, providerRefundId: ref, amountCents: b.amountCents, reason: b.reason, source: "admin", actor: "admin-token" });
    return { result: r };
  });

  // ───── Livraisons ─────
  app.get("/deliveries", async (req) => {
    const { status } = parse(z.object({ status: z.enum(["PENDING", "PROCESSING", "DELIVERED", "FAILED", "CANCELLED"]).optional() }), req.query);
    return {
      items: await sql`
        SELECT d.id, d.label, d.status, p.username, o.public_id AS "orderPublicId", d.created_at AS "createdAt", d.delivered_at AS "deliveredAt",
               (SELECT l.message FROM delivery_logs l WHERE l.delivery_id = d.id ORDER BY l.created_at DESC LIMIT 1) AS "lastMessage"
        FROM deliveries d JOIN players p ON p.uuid = d.player_uuid LEFT JOIN orders o ON o.id = d.order_id
        ${status ? sql`WHERE d.status = ${status}` : sql``} ORDER BY d.created_at DESC LIMIT 200`,
    };
  });
  app.post("/deliveries/:id/retry", async (req) => {
    const { id } = parse(Id, req.params);
    const rows = await sql`UPDATE minecraft_commands SET status = 'PENDING', retry_count = 0, error = NULL, lease_until = NULL
                           WHERE delivery_id = ${id} AND status IN ('FAILED') RETURNING id`;
    if (!rows.length) throw new HttpError(409, "not_retryable", "Aucune commande en échec pour cette livraison");
    await sql`UPDATE deliveries SET status = 'PENDING', updated_at = now() WHERE id = ${id}`;
    await sql`INSERT INTO delivery_logs (delivery_id, status, message) VALUES (${id}, 'PENDING', 'Relancée par un administrateur')`;
    await refreshDeliveries(sql, [id]);
    await audit("shop.delivery.retry", "delivery", id);
    return { ok: true };
  });

  // ───── Points ─────
  app.post("/points/adjust", async (req) => {
    const b = parse(z.object({ uuid: z.string().uuid(), delta: z.number().int().min(-100_000).max(100_000).refine((n) => n !== 0), label: z.string().trim().min(3).max(120) }), req.body);
    const result = await sql.begin(async (tx) => {
      const [p] = await tx<{ username: string }[]>`SELECT username FROM players WHERE uuid = ${b.uuid}`;
      if (!p) throw notFound("Joueur");
      const moved = await movePoints(tx, { playerUuid: b.uuid, delta: b.delta, reason: "admin_adjustment", label: b.label, actor: "admin-token", idempotencyKey: `admin:${randomUUID()}` });
      const ranks = b.delta > 0 ? await syncRanks(tx, b.uuid, p.username) : [];
      const review = b.delta < 0 ? await flagRanksForReview(tx, b.uuid) : [];
      return { balance: moved?.after, ranksUnlocked: ranks, ranksToReview: review };
    });
    await audit("shop.points.adjust", "player", b.uuid, { delta: b.delta, label: b.label });
    return result;
  });

  app.get("/settings", async () => {
    const [row] = await sql<{ value: unknown }[]>`SELECT value FROM site_settings WHERE key = 'shop.points_per_euro'`;
    return { pointsPerEuro: Number(row?.value ?? 1), paymentProvider: ctx.payments?.name ?? null };
  });
  app.put("/settings", async (req) => {
    const b = parse(z.object({ pointsPerEuro: z.number().min(0).max(100) }), req.body);
    await sql`INSERT INTO site_settings (key, value) VALUES ('shop.points_per_euro', ${sql.json(b.pointsPerEuro)})
              ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
    await audit("shop.settings.update", "settings", "shop.points_per_euro", b);
    invalidate();
    return b;
  });
}

/** Contrainte d'unicité (slug, clé, position) → 409 lisible. */
function conflict(e: unknown): never {
  const err = e as { code?: string; detail?: string };
  if (err.code === "23505") throw new HttpError(409, "conflict", `Déjà utilisé : ${err.detail ?? "valeur unique"}`);
  if (err.code === "23503") throw new HttpError(409, "conflict", "Référence invalide (catégorie ou produit inexistant)");
  throw e;
}
