import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { MinecraftUsername, type OrderView } from "@vaeloria/types";
import type { AppContext } from "../context";
import { requireUser } from "../lib/auth";
import { HttpError, notFound } from "../lib/errors";
import { parse } from "../lib/validate";
import { mojangLookup, resolveRecipient } from "../services/identity";
import { createOrder, OrderError } from "../services/orders";
import { getCatalog, getProduct, MAX_LINES, MAX_QUANTITY, quote } from "../services/shop/catalog";
import { iso } from "../services/status";

const Items = z.array(z.object({ productId: z.string().uuid(), quantity: z.number().int().min(1).max(MAX_QUANTITY) })).min(1).max(MAX_LINES);

/** Boutique publique (catalogue, devis) + achat (session obligatoire). */
export async function shopRoutes(app: FastifyInstance, ctx: AppContext) {
  const { sql, cache } = ctx;
  const cacheFor = (s: number) => `public, max-age=${Math.min(s, 30)}, s-maxage=${s}, stale-while-revalidate=${s * 4}`;

  app.get("/catalog", async (_req, reply) => {
    reply.header("cache-control", cacheFor(60));
    // Cache court : une promotion qui démarre ou se termine apparaît en moins d'une minute.
    return cache.wrap("shop:catalog", 30_000, () => getCatalog(sql));
  });

  app.get("/products/:slug", async (req, reply) => {
    const { slug } = parse(z.object({ slug: z.string().regex(/^[a-z0-9-]{1,120}$/) }), req.params);
    const product = await cache.wrap(`shop:product:${slug}`, 30_000, () => getProduct(sql, slug));
    if (!product) throw notFound("Produit");
    reply.header("cache-control", cacheFor(60));
    return product;
  });

  app.post("/quote", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (req) => {
    const { items } = parse(z.object({ items: Items }), req.body);
    const { promotionIds: _p, ...q } = await quote(sql, items);
    return q;
  });

  app.post("/checkout", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (req, reply) => {
    const user = await requireUser(sql, req);
    const body = parse(z.object({ items: Items, recipient: MinecraftUsername, idempotencyKey: z.string().uuid() }), req.body);
    if (!ctx.payments) throw new HttpError(503, "payments_disabled", "Le paiement n'est pas encore ouvert.");

    let recipient: { uuid: string; username: string } | null;
    try {
      recipient = await resolveRecipient(sql, body.recipient, ctx.mojang ?? mojangLookup);
    } catch {
      throw new HttpError(503, "mojang_unavailable", "Impossible de vérifier ce pseudo pour le moment, réessaie dans un instant.");
    }
    if (!recipient) throw new HttpError(422, "unknown_player", "Ce pseudo ne correspond à aucun compte Minecraft Java.");

    let order;
    try {
      order = await createOrder(sql, { recipient, userId: user.id, items: body.items, idempotencyKey: body.idempotencyKey });
    } catch (e) {
      if (e instanceof OrderError) throw new HttpError(409, e.code, e.message, e.details);
      throw e;
    }

    // Double clic / rejeu : même clé = même commande ; on ne relance pas un paiement déjà encaissé.
    const [state] = await sql<{ status: string }[]>`SELECT status FROM orders WHERE id = ${order.id}`;
    if (state?.status !== "pending") throw new HttpError(409, "order_not_pending", "Cette commande n'est plus en attente de paiement.");

    const items = await sql<{ name: string; unitAmountCents: number; quantity: number }[]>`
      SELECT product_name AS name, unit_price_cents AS "unitAmountCents", quantity FROM order_items WHERE order_id = ${order.id} ORDER BY id`;
    const [{ expiresAt }] = (await sql`SELECT expires_at AS "expiresAt" FROM orders WHERE id = ${order.id}`) as unknown as [{ expiresAt: Date }];
    const site = ctx.env.SITE_URL.replace(/\/$/, "");
    const checkout = await ctx.payments.createCheckout({
      orderId: order.id,
      publicId: order.publicId,
      currency: "EUR",
      lines: items,
      totalCents: order.totalCents,
      successUrl: `${site}/checkout/confirmation?commande=${order.publicId}`,
      cancelUrl: `${site}/boutique/panier?annule=${order.publicId}`,
      customerReference: user.id,
      expiresAt,
    });
    await sql`UPDATE orders SET provider = ${ctx.payments.name}, provider_checkout_id = ${checkout.checkoutId} WHERE id = ${order.id}`;
    await sql`INSERT INTO analytics_events (name, props) VALUES ('payment_started', ${sql.json({ order: order.publicId, total: order.totalCents })})`;
    reply.code(201);
    return { publicId: order.publicId, totalCents: order.totalCents, pointsTotal: order.pointsTotal, paymentUrl: checkout.url };
  });

  app.get("/orders/:publicId", async (req) => {
    const user = await requireUser(sql, req);
    const { publicId } = parse(z.object({ publicId: z.string().regex(/^VAL-\d{4}-\d{6}$/) }), req.params);
    const view = await orderView(sql, publicId, user.id);
    if (!view) throw notFound("Commande");
    return view;
  });

  /** Clé d'idempotence prête à l'emploi (le site peut aussi la générer). */
  app.get("/idempotency-key", async () => ({ key: randomUUID() }));
}

export async function orderView(sql: AppContext["sql"], publicId: string, userId: string | null): Promise<OrderView | null> {
  const [o] = await sql<{ id: string; status: OrderView["status"]; uuid: string; username: string; totalCents: number; pointsTotal: number; createdAt: Date; paidAt: Date | null; online: boolean }[]>`
    SELECT o.id, o.status, o.player_uuid AS uuid, coalesce(o.recipient_username, p.username) AS username, o.total_cents AS "totalCents",
           o.points_total AS "pointsTotal", o.created_at AS "createdAt", o.paid_at AS "paidAt",
           (p.online AND EXISTS (SELECT 1 FROM server_status s WHERE s.server = p.last_server AND s.updated_at > now() - interval '90 seconds')) AS online
    FROM orders o JOIN players p ON p.uuid = o.player_uuid
    WHERE o.public_id = ${publicId} ${userId ? sql`AND o.user_id = ${userId}` : sql``}`;
  if (!o) return null;
  const [items, deliveries] = await Promise.all([
    sql<OrderView["items"]>`SELECT product_name AS name, quantity, unit_price_cents AS "unitPriceCents", points_per_unit * quantity AS points
                            FROM order_items WHERE order_id = ${o.id} ORDER BY id`,
    sql<(Omit<OrderView["deliveries"][number], "deliveredAt"> & { deliveredAt: Date | null })[]>`
      SELECT label, status, delivered_at AS "deliveredAt" FROM deliveries WHERE order_id = ${o.id} ORDER BY created_at`,
  ]);
  return {
    publicId,
    status: o.status,
    recipient: { uuid: o.uuid, username: o.username },
    totalCents: o.totalCents,
    pointsTotal: o.pointsTotal,
    createdAt: iso(o.createdAt),
    paidAt: o.paidAt ? iso(o.paidAt) : null,
    items,
    deliveries: deliveries.map((d) => ({ ...d, deliveredAt: d.deliveredAt ? iso(d.deliveredAt) : null })),
    recipientOnline: Boolean(o.online),
  };
}
