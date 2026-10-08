import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context";
import { requireUser, sessionToken } from "../lib/auth";
import { HttpError, notFound } from "../lib/errors";
import { parse } from "../lib/validate";
import { consumeLinkCode, deleteSession, getMe, userOwnsPlayer } from "../services/identity";
import { getProgress, pointsHistory } from "../services/shop/ledger";
import { createEmpire, CRESTS, EMPIRE_COLORS, EmpireError, joinEmpire, leaveEmpire, myEmpire, updateEmpire } from "../services/world/empires";
import { castVote, myVotes, PollError } from "../services/world/polls";
import { referralStats } from "../services/world/referrals";
import { iso } from "../services/status";
import { claimWebVote, myServerVotes, VoteError } from "../services/votes/votes";
import { isIP } from "node:net";
import { safeEqualString } from "../lib/hmac";

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

  /** État personnel dans le monde : fondateur, parrainage, empire, votes. */
  app.get("/world", async (req) => {
    const user = await requireUser(sql, req);
    const [founder, referral, empire, votes, linked, influence] = await Promise.all([
      sql<{ number: number }[]>`SELECT number FROM founders WHERE user_id = ${user.id}`,
      referralStats(sql, user.id),
      myEmpire(sql, user.id),
      myVotes(sql, user.id),
      sql`SELECT 1 FROM minecraft_accounts WHERE user_id = ${user.id} LIMIT 1`,
      sql<{ influence: number }[]>`SELECT influence FROM users WHERE id = ${user.id}`,
    ]);
    return { founder: founder[0]?.number ?? null, referral, empire, votes, linked: linked.length > 0, influence: influence[0]?.influence ?? 0 };
  });

  const empireError = (e: unknown): never => {
    if (e instanceof EmpireError) throw new HttpError(e.code === "not_found" ? 404 : e.code === "forbidden" ? 403 : 409, e.code, e.message);
    throw e;
  };
  const afterEmpireChange = () => ctx.cache.invalidate("world:");

  // Limité par compte (et non par IP : plusieurs joueurs partagent souvent une connexion).
  const perUser = (max: number) => ({ rateLimit: { max, timeWindow: "10 minutes", keyGenerator: (r: { headers: Record<string, unknown>; ip: string }) => String(r.headers.authorization ?? r.ip) } });
  app.post("/empire", { config: perUser(15) }, async (req, reply) => {
    const user = await requireUser(sql, req);
    const b = parse(z.object({
      name: z.string().max(40), tag: z.string().max(8), motto: z.string().max(80).default(""),
      color: z.enum(EMPIRE_COLORS), crest: z.enum(CRESTS),
    }), req.body);
    const r = await createEmpire(sql, user.id, b).catch(empireError);
    afterEmpireChange();
    reply.code(201);
    return r;
  });
  app.post("/empire/join", { config: perUser(20) }, async (req) => {
    const user = await requireUser(sql, req);
    const b = parse(z.object({ slug: z.string().regex(/^[a-z0-9-]{2,40}$/), code: z.string().max(12).optional() }), req.body);
    await joinEmpire(sql, user.id, b.slug, b.code).catch(empireError);
    afterEmpireChange();
    return { ok: true };
  });
  app.post("/empire/leave", async (req) => {
    const user = await requireUser(sql, req);
    const r = await leaveEmpire(sql, user.id).catch(empireError);
    afterEmpireChange();
    return { result: r };
  });
  app.patch("/empire", async (req) => {
    const user = await requireUser(sql, req);
    const b = parse(z.object({ motto: z.string().max(80).optional(), description: z.string().max(600).optional(), recruiting: z.boolean().optional(), regenerateCode: z.boolean().optional() }), req.body);
    await updateEmpire(sql, user.id, b).catch(empireError);
    afterEmpireChange();
    return { ok: true };
  });

  app.post("/votes", { config: perUser(20) }, async (req) => {
    const user = await requireUser(sql, req);
    const b = parse(z.object({ slug: z.string().regex(/^[a-z0-9-]{2,80}$/), optionId: z.string().uuid() }), req.body);
    try {
      await castVote(sql, user.id, b.slug, b.optionId);
    } catch (e) {
      if (e instanceof PollError) throw new HttpError(e.code === "not_found" ? 404 : 409, e.code, e.message);
      throw e;
    }
    ctx.cache.invalidate("world:"); // le vote change aussi l'influence (empires, classements)
    return { ok: true };
  });

  // ───── Votes pour le serveur ─────
  /**
   * IP du joueur pour la vérification auprès du site de vote. Le site (Next) relaie l'IP du visiteur
   * dans `x-vaeloria-client-ip`, accepté uniquement avec le jeton interne ; sinon l'IP de l'appelant.
   */
  const clientIp = (req: { headers: Record<string, string | string[] | undefined>; ip: string }): string => {
    const t = req.headers["x-internal-token"];
    const relayed = req.headers["x-vaeloria-client-ip"];
    if (ctx.env.WEB_INTERNAL_TOKEN && typeof t === "string" && safeEqualString(t, ctx.env.WEB_INTERNAL_TOKEN) && typeof relayed === "string" && isIP(relayed.trim())) return relayed.trim();
    return req.ip.replace(/^::ffff:/, "");
  };

  app.get("/server-votes", async (req) => {
    const user = await requireUser(sql, req);
    return myServerVotes(sql, user.id);
  });

  app.post("/server-votes/:site/claim", { config: perUser(30) }, async (req) => {
    const user = await requireUser(sql, req);
    const { site } = parse(z.object({ site: z.string().regex(/^[a-z0-9-]{2,40}$/) }), req.params);
    const b = parse(z.object({ uuid: z.string().uuid().optional() }), req.body ?? {});
    try {
      const r = await claimWebVote(sql, ctx.voteFetch ?? fetch, { userId: user.id, siteKey: site, ip: clientIp(req), pepper: ctx.env.WEB_INTERNAL_TOKEN ?? "", playerUuid: b.uuid });
      ctx.cache.invalidate("world:");
      return { ok: true, ...r };
    } catch (e) {
      if (e instanceof VoteError) {
        const status = { not_found: 404, not_linked: 403, not_configured: 409, cooldown: 409, not_voted: 409, ip_used: 409, unavailable: 503 }[e.code];
        throw new HttpError(status, e.code, e.message, e.nextAt ? { nextAt: e.nextAt } : undefined);
      }
      throw e;
    }
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
