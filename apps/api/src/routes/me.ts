import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context";
import { requireUser, sessionToken } from "../lib/auth";
import { HttpError, notFound } from "../lib/errors";
import { parse } from "../lib/validate";
import { consumeLinkCode, deleteSession, getMe, userOwnsPlayer } from "../services/identity";
import { getProgress, pointsHistory } from "../services/shop/ledger";
import { iso } from "../services/status";

/** Espace joueur. Toutes les routes exigent une session. */
export async function meRoutes(app: FastifyInstance, ctx: AppContext) {
  const { sql } = ctx;

  app.addHook("onSend", async (_req, reply) => {
    reply.header("cache-control", "private, no-store");
  });

  app.get("/", async (req) => {
    const user = await requireUser(sql, req);
    const me = await getMe(sql, user.id);
    if (!me) throw notFound("Compte");
    return me;
  });

  app.post("/logout", async (req, reply) => {
    const token = sessionToken(req);
    if (token) await deleteSession(sql, token);
    reply.code(204);
  });

  app.post("/link", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (req) => {
    const user = await requireUser(sql, req);
    const { code } = parse(z.object({ code: z.string().min(4).max(12) }), req.body);
    const linked = await consumeLinkCode(sql, user.id, code);
    if (!linked) throw new HttpError(400, "invalid_code", "Code invalide ou expiré. Tape /link en jeu pour en obtenir un nouveau.");
    return linked;
  });

  app.get("/points/:uuid", async (req) => {
    const user = await requireUser(sql, req);
    const { uuid } = parse(z.object({ uuid: z.string().uuid() }), req.params);
    if (!(await userOwnsPlayer(sql, user.id, uuid))) throw notFound("Compte Minecraft");
    const [progress, history] = await Promise.all([getProgress(sql, uuid), pointsHistory(sql, uuid)]);
    return { progress, history };
  });

  app.get("/orders", async (req) => {
    const user = await requireUser(sql, req);
    const rows = await sql<{ publicId: string; status: string; totalCents: number; pointsTotal: number; recipient: string; createdAt: Date; items: string }[]>`
      SELECT o.public_id AS "publicId", o.status, o.total_cents AS "totalCents", o.points_total AS "pointsTotal",
             coalesce(o.recipient_username, '') AS recipient, o.created_at AS "createdAt",
             string_agg(i.product_name || CASE WHEN i.quantity > 1 THEN ' ×' || i.quantity ELSE '' END, ', ' ORDER BY i.id) AS items
      FROM orders o JOIN order_items i ON i.order_id = o.id
      WHERE o.user_id = ${user.id} AND (o.status <> 'pending' OR o.created_at > now() - interval '1 hour')
      GROUP BY o.id ORDER BY o.created_at DESC LIMIT 50`;
    return { items: rows.map((r) => ({ ...r, createdAt: iso(r.createdAt) })) };
  });
}
