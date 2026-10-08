import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context";
import { HttpError, notFound, unauthorized } from "../lib/errors";
import { safeEqualString } from "../lib/hmac";
import { parse } from "../lib/validate";
import { enqueueCommand } from "../services/commands";
import { normalizeEmail, setRole } from "../services/identity";
import { randomUUID } from "node:crypto";

const Slug = z.string().regex(/^[a-z0-9-]{1,120}$/, "slug : minuscules, chiffres et tirets");
const Id = z.object({ id: z.string().uuid() });

const NewsInput = z.object({
  slug: Slug,
  title: z.string().min(3).max(160),
  excerpt: z.string().max(300).default(""),
  body: z.string().max(100_000).default(""),
  category: z.enum(["actualites", "minecraft", "pvp", "factions", "guides", "serveur"]),
  coverUrl: z.string().url().nullable().default(null),
  author: z.string().max(80).default("Équipe VÆLORIA"),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  publishedAt: z.string().datetime().nullable().default(null),
});

const EventInput = z.object({
  slug: Slug,
  title: z.string().min(3).max(160),
  type: z.enum(["koth", "boss", "tournament", "supply_drop", "war", "seasonal", "other"]),
  description: z.string().max(5000).default(""),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime().nullable().default(null),
  location: z.string().max(120).nullable().default(null),
  rewards: z.string().max(500).nullable().default(null),
  published: z.boolean().default(false),
});

/**
 * Back-office. Phase 1 : authentification serveur-à-serveur par jeton (l'app admin
 * est elle-même protégée). Phase 7 : remplacé par sessions Discord + rôles.
 */
export async function adminRoutes(app: FastifyInstance, ctx: AppContext) {
  const { sql, cache } = ctx;

  app.addHook("onRequest", async (req) => {
    const token = ctx.env.ADMIN_API_TOKEN;
    const header = req.headers.authorization ?? "";
    if (!token || !header.startsWith("Bearer ") || !safeEqualString(header.slice(7), token)) throw unauthorized();
  });

  const audit = (action: string, targetType: string, targetId: string, metadata: object = {}) =>
    sql`INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, metadata)
        VALUES ('admin', 'admin-token', ${action}, ${targetType}, ${targetId}, ${sql.json(metadata as never)})`;

  // ───── Dashboard ─────
  app.get("/dashboard", async () => {
    const [kpi] = await sql`
      SELECT
        (SELECT count(*)::int FROM players p JOIN server_status s ON s.server = p.last_server
         WHERE p.online AND s.updated_at > now() - interval '90 seconds') AS "onlinePlayers",
        (SELECT count(*)::int FROM players WHERE first_seen_at > now() - interval '24 hours') AS "newPlayers24h",
        (SELECT count(*)::int FROM players WHERE first_seen_at > now() - interval '7 days') AS "newPlayers7d",
        (SELECT count(*)::int FROM players WHERE last_seen_at > now() - interval '7 days') AS "activePlayers7d",
        (SELECT coalesce(sum(amount_cents), 0)::int FROM transactions WHERE created_at > now() - interval '30 days') AS "revenue30dCents",
        (SELECT count(*)::int FROM orders WHERE created_at > now() - interval '30 days') AS "orders30d",
        (SELECT count(*)::int FROM bridge_events WHERE error IS NOT NULL AND received_at > now() - interval '24 hours') AS "bridgeErrors24h",
        (SELECT count(*)::int FROM minecraft_commands WHERE status = 'FAILED') AS "failedCommands",
        (SELECT count(*)::int FROM minecraft_commands WHERE status IN ('PENDING','SENT')) AS "pendingCommands",
        (SELECT count(*)::int FROM beta_signups) AS "betaSignups",
        (SELECT count(*)::int FROM incidents WHERE resolved_at IS NULL) AS "openIncidents"`;
    const servers = await sql`
      SELECT server, online, max_players AS "maxPlayers", tps, mspt, version, updated_at AS "updatedAt",
             updated_at > now() - interval '90 seconds' AS fresh, lag_since AS "lagSince" FROM server_status ORDER BY server`;
    const alerts = await sql`
      SELECT id, server, started_at AS "startedAt", resolved_at AS "resolvedAt", peak_mspt AS "peakMspt", min_tps AS "minTps"
      FROM server_alerts ORDER BY started_at DESC LIMIT 10`;
    const events = await sql`SELECT id, title, type, starts_at AS "startsAt" FROM events WHERE starts_at > now() ORDER BY starts_at LIMIT 5`;
    return { kpi, servers, events, alerts, lagAlertMspt: ctx.env.LAG_ALERT_MSPT };
  });

  // ───── Joueurs ─────
  app.get("/players", async (req) => {
    const { q } = parse(z.object({ q: z.string().trim().min(2).max(64) }), req.query);
    return {
      items: await sql`
        SELECT DISTINCT p.uuid, p.username, p.rank, p.online, p.last_seen_at AS "lastSeenAt", d.username AS discord, f.name AS faction
        FROM players p
        LEFT JOIN minecraft_accounts ma ON ma.player_uuid = p.uuid
        LEFT JOIN discord_accounts d ON d.user_id = ma.user_id
        LEFT JOIN faction_members fm ON fm.player_uuid = p.uuid
        LEFT JOIN factions f ON f.id = fm.faction_id AND f.disbanded_at IS NULL
        LEFT JOIN username_history h ON h.player_uuid = p.uuid
        WHERE p.uuid::text = lower(${q}) OR p.username ILIKE ${q + "%"} OR h.username ILIKE ${q + "%"} OR d.username ILIKE ${q + "%"} OR d.discord_id = ${q} OR f.name ILIKE ${q}
        ORDER BY p.username LIMIT 50`,
    };
  });

  app.get("/players/:uuid", async (req) => {
    const { uuid } = parse(z.object({ uuid: z.string().uuid() }), req.params);
    const [player] = await sql`SELECT * FROM players WHERE uuid = ${uuid}`;
    if (!player) throw notFound("Joueur");
    const [history, orders, commands, auditLog, stats] = await Promise.all([
      sql`SELECT username, seen_at AS "seenAt" FROM username_history WHERE player_uuid = ${uuid} ORDER BY seen_at DESC`,
      sql`SELECT public_id AS "publicId", status, total_cents AS "totalCents", created_at AS "createdAt" FROM orders WHERE player_uuid = ${uuid} ORDER BY created_at DESC LIMIT 50`,
      sql`SELECT id, command, status, source, created_at AS "createdAt", executed_at AS "executedAt", error FROM minecraft_commands WHERE player_uuid = ${uuid} ORDER BY created_at DESC LIMIT 50`,
      sql`SELECT action, actor_type AS "actorType", metadata, created_at AS "createdAt" FROM audit_logs WHERE target_type = 'player' AND target_id = ${uuid} ORDER BY created_at DESC LIMIT 50`,
      sql`SELECT s.*, se.name AS season FROM player_season_stats s JOIN seasons se ON se.id = s.season_id WHERE player_uuid = ${uuid} ORDER BY se.number DESC`,
    ]);
    return { player, history, orders, commands, audit: auditLog, stats };
  });

  // ───── CRUD générique (news, events, products, faq, incidents) ─────
  function crud<T extends z.ZodObject<z.ZodRawShape>>(path: string, table: string, schema: T, toRow: (v: z.infer<T>) => Record<string, unknown>, orderBy: string, cacheKeys: string[]) {
    app.get(`/${path}`, async () => ({ items: await sql`SELECT * FROM ${sql(table)} ORDER BY ${sql.unsafe(orderBy)} LIMIT 500` }));
    app.post(`/${path}`, async (req, reply) => {
      const row = toRow(parse(schema, req.body));
      const [created] = await sql`INSERT INTO ${sql(table)} ${sql(row)} RETURNING *`;
      await audit(`${path}.create`, path, String(created!.id));
      cacheKeys.forEach((k) => cache.invalidate(k));
      reply.code(201);
      return created;
    });
    app.put(`/${path}/:id`, async (req) => {
      const { id } = parse(Id, req.params);
      const row = toRow(parse(schema, req.body));
      const [updated] = await sql`UPDATE ${sql(table)} SET ${sql(row)} WHERE id = ${id} RETURNING *`;
      if (!updated) throw notFound("Élément");
      await audit(`${path}.update`, path, id);
      cacheKeys.forEach((k) => cache.invalidate(k));
      return updated;
    });
    app.delete(`/${path}/:id`, async (req, reply) => {
      const { id } = parse(Id, req.params);
      const deleted = await sql`DELETE FROM ${sql(table)} WHERE id = ${id} RETURNING id`;
      if (deleted.length === 0) throw notFound("Élément");
      await audit(`${path}.delete`, path, id);
      cacheKeys.forEach((k) => cache.invalidate(k));
      reply.code(204);
    });
  }

  crud("news", "news", NewsInput, (v) => ({
    slug: v.slug, title: v.title, excerpt: v.excerpt, body: v.body, category: v.category, cover_url: v.coverUrl, author: v.author, status: v.status,
    published_at: v.status === "published" ? (v.publishedAt ?? new Date().toISOString()) : v.publishedAt, updated_at: new Date().toISOString(),
  }), "updated_at DESC", ["news", "article"]);

  crud("events", "events", EventInput, (v) => ({
    slug: v.slug, title: v.title, type: v.type, description: v.description, starts_at: v.startsAt, ends_at: v.endsAt, location: v.location, rewards: v.rewards, published: v.published,
  }), "starts_at DESC", ["events"]);

  crud("faq", "faq", z.object({ question: z.string().min(3).max(300), answer: z.string().min(1).max(5000), position: z.number().int().default(0), published: z.boolean().default(true) }),
    (v) => v, "position", ["faq"]);

  crud("incidents", "incidents", z.object({
    title: z.string().min(3).max(200),
    severity: z.enum(["minor", "major", "critical", "maintenance"]),
    status: z.enum(["investigating", "identified", "monitoring", "resolved"]),
    body: z.string().max(5000).default(""),
  }), (v) => ({ ...v, resolved_at: v.status === "resolved" ? new Date().toISOString() : null }), "started_at DESC", ["status:"]);

  // ───── File de commandes Minecraft ─────
  app.get("/commands", async (req) => {
    const { status } = parse(z.object({ status: z.enum(["PENDING", "SENT", "DELIVERED", "FAILED", "CANCELLED"]).optional() }), req.query);
    return {
      items: await sql`
        SELECT c.id, c.player_uuid AS "playerUuid", p.username, c.command, c.status, c.source, c.retry_count AS "retryCount",
               c.created_at AS "createdAt", c.executed_at AS "executedAt", c.error
        FROM minecraft_commands c LEFT JOIN players p ON p.uuid = c.player_uuid
        ${status ? sql`WHERE c.status = ${status}` : sql``}
        ORDER BY c.created_at DESC LIMIT 200`,
    };
  });

  app.post("/commands", async (req, reply) => {
    const body = parse(z.object({ playerUuid: z.string().uuid().nullable(), command: z.string().min(1).max(300), server: z.string().max(32).nullable().default(null), requireOnline: z.boolean().default(false) }), req.body);
    const r = await enqueueCommand(sql, { ...body, source: "admin", idempotencyKey: `admin:${randomUUID()}` });
    await audit("command.enqueue", "player", body.playerUuid ?? "*", { command: body.command });
    reply.code(201);
    return r;
  });

  app.post("/commands/:id/retry", async (req) => {
    const { id } = parse(Id, req.params);
    const rows = await sql`UPDATE minecraft_commands SET status = 'PENDING', retry_count = 0, error = NULL, lease_until = NULL WHERE id = ${id} AND status IN ('FAILED','CANCELLED') RETURNING id`;
    if (rows.length === 0) throw new HttpError(409, "not_retryable", "Seules les commandes FAILED ou CANCELLED peuvent être relancées");
    await audit("command.retry", "command", id);
    return { ok: true };
  });

  // ───── Réglages ─────
  app.get("/settings/maintenance", async () => {
    const [row] = await sql<{ value: unknown }[]>`SELECT value FROM site_settings WHERE key = 'maintenance'`;
    return { enabled: row?.value === true };
  });

  app.put("/settings/maintenance", async (req) => {
    const { enabled } = parse(z.object({ enabled: z.boolean() }), req.body);
    await sql`INSERT INTO site_settings (key, value) VALUES ('maintenance', ${sql.json(enabled)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
    await audit("settings.maintenance", "settings", "maintenance", { enabled });
    cache.invalidate("status:");
    return { enabled };
  });

  // ───── Coûts ─────
  app.get("/costs", async () => {
    const items = await sql<{ name: string; provider: string; category: string; monthlyEur: number; variableRatio: number }[]>`
      SELECT name, provider, category, monthly_eur AS "monthlyEur", variable_ratio AS "variableRatio" FROM cost_items WHERE active ORDER BY monthly_eur DESC`;
    const [ref] = await sql<{ value: number }[]>`SELECT value FROM site_settings WHERE key = 'costs.reference_players'`;
    const [peak] = await sql<{ peak: number }[]>`SELECT coalesce(max(online), 0)::int AS peak FROM server_status_history WHERE bucket > now() - interval '30 days'`;
    const metrics = await sql`SELECT * FROM infra_metrics ORDER BY collected_at DESC LIMIT 1`;
    const referencePlayers = Number(ref?.value ?? 100);
    const fixed = items.reduce((s, i) => s + i.monthlyEur * (1 - i.variableRatio), 0);
    const variable = items.reduce((s, i) => s + i.monthlyEur * i.variableRatio, 0);
    // Modèle volontairement simple : la part variable croît linéairement au-delà de la capacité de référence.
    const projected = (players: number) => Math.round((fixed + variable * Math.max(1, players / referencePlayers)) * 100) / 100;
    return {
      items,
      monthlyTotalEur: Math.round((fixed + variable) * 100) / 100,
      referencePlayers,
      peakOnline30d: peak?.peak ?? 0,
      projections: { players100: projected(100), players1000: projected(1000) },
      latestMetrics: metrics[0] ?? null,
    };
  });

  // ───── Équipe : accès au back-office par rôle ─────
  app.get("/team", async () => ({
    items: await sql`
      SELECT u.display_name AS "displayName", u.email, u.role, u.created_at AS "createdAt",
             (SELECT max(s.created_at) FROM sessions s WHERE s.user_id = u.id) AS "lastLoginAt"
      FROM users u WHERE u.role <> 'player' ORDER BY u.role DESC, u.created_at`,
  }));
  app.put("/team", async (req) => {
    const b = parse(z.object({ email: z.string().trim().email(), role: z.enum(["player", "moderator", "admin", "owner"]), actor: z.string().max(120).default("admin") }), req.body);
    if (b.role !== "owner") {
      const [{ owners }] = (await sql`SELECT count(*)::int AS owners FROM users WHERE role = 'owner' AND lower(email) <> ${normalizeEmail(b.email)}`) as unknown as [{ owners: number }];
      if (owners === 0) throw new HttpError(409, "last_owner", "Impossible : il doit toujours rester au moins un propriétaire.");
    }
    const u = await setRole(sql, b.email, b.role, b.actor);
    if (!u) throw new HttpError(404, "not_found", "Aucun compte avec cette adresse. La personne doit d'abord créer son compte sur le site.");
    return { ok: true, displayName: u.displayName, role: b.role };
  });

  // ───── Acquisition : funnel & marketing ─────
  app.get("/funnel", async (req) => {
    const { days } = parse(z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }), req.query);
    const [f] = await sql`
      SELECT
        (SELECT count(DISTINCT visitor_id)::int FROM analytics_events WHERE name = 'page_view' AND created_at > now() - make_interval(days => ${days})) AS visitors,
        (SELECT count(DISTINCT visitor_id)::int FROM analytics_events WHERE name = 'copy_ip' AND created_at > now() - make_interval(days => ${days})) AS "copiedIp",
        (SELECT count(DISTINCT visitor_id)::int FROM analytics_events WHERE name = 'click_discord' AND created_at > now() - make_interval(days => ${days})) AS discord,
        (SELECT count(*)::int FROM players WHERE first_seen_at > now() - make_interval(days => ${days})) AS "firstJoin",
        (SELECT count(*)::int FROM minecraft_accounts WHERE linked_at > now() - make_interval(days => ${days})) AS "linkedAccounts",
        (SELECT count(DISTINCT m.player_uuid)::int FROM faction_members m JOIN players p ON p.uuid = m.player_uuid WHERE p.first_seen_at > now() - make_interval(days => ${days})) AS "joinedFaction",
        (SELECT count(DISTINCT s.player_uuid)::int FROM player_season_stats s JOIN players p ON p.uuid = s.player_uuid WHERE (s.kills + s.deaths) > 0 AND p.first_seen_at > now() - make_interval(days => ${days})) AS "firstPvp",
        (SELECT count(*)::int FROM players WHERE first_seen_at > now() - make_interval(days => ${days}) AND last_seen_at > first_seen_at + interval '1 day') AS returned,
        (SELECT count(*)::int FROM players WHERE first_seen_at > now() - make_interval(days => ${days}) AND last_seen_at > first_seen_at + interval '7 days') AS recurring`;
    // Parcours V2 (monde) : comptes, fondateurs, empires, parrainages, Conseil. Événements serveur, comptés sur la période.
    const world = await sql<{ name: string; n: number }[]>`
      SELECT name, count(*)::int AS n FROM analytics_events
      WHERE created_at > now() - make_interval(days => ${days})
        AND name IN ('register', 'founder_join', 'account_linked', 'empire_create', 'empire_join', 'referral_click', 'referral_register', 'vote', 'share_empire', 'cta_click', 'map_view', 'war_view', 'event_view', 'ranking_view', 'empire_view')
      GROUP BY name`;
    return { days, steps: f, world: Object.fromEntries(world.map((r) => [r.name, r.n])) };
  });

  app.get("/marketing", async (req) => {
    const { days } = parse(z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }), req.query);
    const since = sql`created_at > now() - make_interval(days => ${days})`;
    const [sources, campaigns, referrers, daily] = await Promise.all([
      sql`SELECT coalesce(utm_source, '(direct)') AS source, count(DISTINCT visitor_id)::int AS visitors,
                 count(DISTINCT visitor_id) FILTER (WHERE name = 'copy_ip')::int AS "copiedIp",
                 count(DISTINCT visitor_id) FILTER (WHERE name = 'click_discord')::int AS discord
          FROM analytics_events WHERE ${since} GROUP BY 1 ORDER BY visitors DESC LIMIT 50`,
      sql`SELECT utm_source AS source, utm_medium AS medium, utm_campaign AS campaign, utm_content AS content, count(DISTINCT visitor_id)::int AS visitors
          FROM analytics_events WHERE ${since} AND utm_campaign IS NOT NULL GROUP BY 1,2,3,4 ORDER BY visitors DESC LIMIT 100`,
      sql`SELECT referrer_host AS host, count(DISTINCT visitor_id)::int AS visitors FROM analytics_events
          WHERE ${since} AND referrer_host IS NOT NULL GROUP BY 1 ORDER BY 2 DESC LIMIT 30`,
      sql`SELECT date_trunc('day', created_at) AS day, count(DISTINCT visitor_id)::int AS visitors FROM analytics_events
          WHERE ${since} AND name = 'page_view' GROUP BY 1 ORDER BY 1`,
    ]);
    return { days, sources, campaigns, referrers, daily };
  });

  app.get("/audit", async () => ({ items: await sql`SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200` }));
}
