import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { LEADERBOARD_IDS } from "@vaeloria/config";
import { MinecraftUsername } from "@vaeloria/types";
import type { AppContext } from "../context";
import { notFound, HttpError } from "../lib/errors";
import { parse } from "../lib/validate";
import { getArticle, getFaction, getLeaderboard, getPlayer, getSeasons, getStats, getUpcomingEvents, listNews } from "../services/content";
import { getCatalog } from "../services/shop/catalog";
import { getServerStatus, getServices } from "../services/status";

/** API consommée par le site (rendu serveur Next.js) — lecture seule, mise en cache. */
export async function v1Routes(app: FastifyInstance, ctx: AppContext) {
  const { sql, cache } = ctx;
  const statusDeps = {
    sql,
    cache,
    ping: ctx.env.MC_PING_HOST ? { host: ctx.env.MC_PING_HOST, port: ctx.env.MC_PING_PORT } : undefined,
    ...(ctx.pinger ? { pinger: ctx.pinger } : {}),
  };
  const cacheFor = (seconds: number) => `public, max-age=${Math.min(seconds, 30)}, s-maxage=${seconds}, stale-while-revalidate=${seconds * 4}`;

  app.get("/server/status", async (_req, reply) => {
    reply.header("cache-control", cacheFor(10));
    return getServerStatus(statusDeps);
  });

  app.get("/server/services", async (_req, reply) => {
    reply.header("cache-control", cacheFor(20));
    return getServices({ ...statusDeps, discordConfigured: Boolean(ctx.env.DISCORD_WEBHOOK_URL) });
  });

  app.get("/server/players", async (_req, reply) => {
    reply.header("cache-control", cacheFor(15));
    return cache.wrap("players:online", 15_000, async () => {
      const rows = await sql<{ uuid: string; username: string; server: string | null }[]>`
        SELECT p.uuid, p.username, p.last_server AS server FROM players p
        -- Un serveur silencieux (crash) ne doit pas laisser de joueurs « fantômes » en ligne.
        JOIN server_status s ON s.server = p.last_server AND s.updated_at > now() - interval '90 seconds'
        WHERE p.online ORDER BY p.username LIMIT 500`;
      return { count: rows.length, players: rows };
    });
  });

  app.get("/season", async (_req, reply) => {
    reply.header("cache-control", cacheFor(60));
    return cache.wrap("season", 60_000, () => getSeasons(sql));
  });

  app.get("/leaderboards", async (req, reply) => {
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(25).default(10) }), req.query);
    reply.header("cache-control", cacheFor(60));
    return cache.wrap(`lb:all:${limit}`, 60_000, async () => ({
      boards: await Promise.all(LEADERBOARD_IDS.map((c) => getLeaderboard(sql, c, { limit }))),
    }));
  });

  app.get("/leaderboards/:category", async (req, reply) => {
    const { category } = parse(z.object({ category: z.enum(LEADERBOARD_IDS) }), req.params);
    const { page } = parse(z.object({ page: z.coerce.number().int().min(1).max(200).default(1) }), req.query);
    reply.header("cache-control", cacheFor(60));
    return cache.wrap(`lb:${category}:${page}`, 60_000, () => getLeaderboard(sql, category, { page }));
  });

  app.get("/player/:username", async (req, reply) => {
    const { username } = parse(z.object({ username: z.union([MinecraftUsername, z.string().uuid()]) }), req.params);
    const player = await cache.wrap(`player:${username.toLowerCase()}`, 30_000, () => getPlayer(sql, username));
    if (!player) throw notFound("Joueur");
    reply.header("cache-control", cacheFor(30));
    return player;
  });

  app.get("/faction/:name", async (req, reply) => {
    const { name } = parse(z.object({ name: z.string().min(2).max(24) }), req.params);
    const faction = await cache.wrap(`faction:${name.toLowerCase()}`, 30_000, () => getFaction(sql, name));
    if (!faction) throw notFound("Faction");
    reply.header("cache-control", cacheFor(30));
    return faction;
  });

  app.get("/events", async (_req, reply) => {
    reply.header("cache-control", cacheFor(60));
    return { items: await cache.wrap("events", 60_000, () => getUpcomingEvents(sql)) };
  });

  app.get("/news", async (req, reply) => {
    const q = parse(
      z.object({ page: z.coerce.number().int().min(1).max(500).default(1), category: z.enum(["actualites", "minecraft", "pvp", "factions", "guides", "serveur"]).optional() }),
      req.query,
    );
    reply.header("cache-control", cacheFor(120));
    return cache.wrap(`news:${q.page}:${q.category ?? ""}`, 120_000, () => listNews(sql, q.page, q.category));
  });

  app.get("/news/:slug", async (req, reply) => {
    const { slug } = parse(z.object({ slug: z.string().regex(/^[a-z0-9-]{1,120}$/) }), req.params);
    const article = await cache.wrap(`article:${slug}`, 300_000, () => getArticle(sql, slug));
    if (!article) throw notFound("Article");
    reply.header("cache-control", cacheFor(300));
    return article;
  });

  app.get("/faq", async (_req, reply) => {
    reply.header("cache-control", cacheFor(300));
    return cache.wrap("faq", 300_000, async () => ({
      items: await sql`SELECT id, question, answer FROM faq WHERE published ORDER BY position, question`,
    }));
  });

  app.get("/stats", async (_req, reply) => {
    reply.header("cache-control", cacheFor(120));
    return cache.wrap("stats", 120_000, () => getStats(sql));
  });

  app.get("/shop/products", async (_req, reply) => {
    reply.header("cache-control", cacheFor(300));
    return { items: (await cache.wrap("shop:catalog", 30_000, () => getCatalog(sql))).products };
  });

  // ───── Écritures publiques (rate-limit strict) ─────
  app.post(
    "/beta",
    { config: { rateLimit: { max: 5, timeWindow: "10 minutes" } } },
    async (req, reply) => {
      const body = parse(
        z.object({
          minecraftUsername: MinecraftUsername,
          email: z.string().email().max(254).optional().or(z.literal("")),
          referralCode: z.string().regex(/^[A-Za-z0-9_-]{3,20}$/).optional().or(z.literal("")),
          utmSource: z.string().max(64).optional(),
          consent: z.literal(true, { errorMap: () => ({ message: "Consentement requis" }) }),
        }),
        req.body,
      );
      const rows = await sql`
        INSERT INTO beta_signups (minecraft_username, email, referral_code, utm_source, consent_at)
        VALUES (${body.minecraftUsername}, ${body.email || null}, ${body.referralCode?.toUpperCase() || null}, ${body.utmSource ?? null}, now())
        ON CONFLICT (lower(minecraft_username)) DO NOTHING RETURNING id`;
      if (rows.length === 0) throw new HttpError(409, "already_registered", "Ce pseudo est déjà inscrit à la bêta.");
      cache.invalidate("stats");
      reply.code(201);
      return { ok: true };
    },
  );

  const AnalyticsBody = z.object({
    name: z.enum([
      "page_view", "copy_ip", "click_play", "click_discord", "click_leaderboard", "beta_signup", "account_created", "account_linked",
      // Boutique (côté navigateur). PAYMENT_SUCCESS, POINTS_EARNED, RANK_UNLOCKED… sont enregistrés par l'API elle-même.
      "shop_view", "product_view", "add_to_cart", "remove_from_cart", "checkout_started", "checkout_start",
      // Monde V2 (côté navigateur) ; REGISTER, FOUNDER_JOIN, EMPIRE_CREATE/JOIN, REFERRAL_*, VOTE sont enregistrés par l'API.
      "event_view", "war_view", "ranking_view", "share_empire", "cta_click", "map_view", "empire_view", "server_vote_open",
    ]),
    props: z.record(z.union([z.string().max(100), z.number()])).optional(),
    path: z.string().max(300).optional(),
    visitorId: z.string().regex(/^[a-z0-9]{8,40}$/).optional(),
    referrer: z.string().max(500).optional(),
    utm: z.object({ source: z.string().max(64), medium: z.string().max(64), campaign: z.string().max(100), content: z.string().max(100) }).partial().optional(),
  });

  // Collecte first-party sans cookie ni IP : alimente le funnel d'acquisition de l'admin.
  app.post("/analytics", { config: { rateLimit: { max: 60, timeWindow: "1 minute" } } }, async (req, reply) => {
    const raw = typeof req.body === "string" ? JSON.parse(req.body) : req.body; // sendBeacon envoie du text/plain
    const e = parse(AnalyticsBody, raw);
    let referrerHost: string | null = null;
    try {
      referrerHost = e.referrer ? new URL(e.referrer).host : null;
    } catch {
      /* referrer invalide ignoré */
    }
    await sql`
      INSERT INTO analytics_events (name, path, visitor_id, referrer_host, utm_source, utm_medium, utm_campaign, utm_content, props)
      VALUES (${e.name}, ${e.path ?? null}, ${e.visitorId ?? null}, ${referrerHost}, ${e.utm?.source ?? null}, ${e.utm?.medium ?? null},
              ${e.utm?.campaign ?? null}, ${e.utm?.content ?? null}, ${sql.json(Object.fromEntries(Object.entries(e.props ?? {}).slice(0, 10)))})`;
    reply.code(204);
  });
}
