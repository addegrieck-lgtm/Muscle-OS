import type { FastifyInstance, FastifyRequest } from "fastify";
import { LEADERBOARD_IDS } from "@vaeloria/config";
import { z } from "zod";
import type { AppContext } from "../context";
import { sha256 } from "../lib/hmac";
import { parse } from "../lib/validate";
import { getLeaderboard, getSeasons } from "../services/content";
import { getServerStatus } from "../services/status";

/**
 * API publique limitée (sites de vote, bots Discord communautaires, overlays de stream).
 * Sans clé : 30 req/min/IP. Avec clé `x-api-key` valide : quota de la clé.
 */
export async function publicRoutes(app: FastifyInstance, ctx: AppContext) {
  const { sql, cache } = ctx;

  async function keyQuota(req: FastifyRequest): Promise<{ id: string; max: number } | null> {
    const raw = req.headers["x-api-key"];
    if (typeof raw !== "string" || !raw.startsWith("vk_")) return null;
    return cache.wrap(`apikey:${sha256(raw)}`, 60_000, async () => {
      const [k] = await sql<{ id: string; max: number }[]>`
        UPDATE api_keys SET last_used_at = now() WHERE key_hash = ${sha256(raw)} AND revoked_at IS NULL
        RETURNING id, rate_limit_per_min AS max`;
      return k ?? null;
    });
  }

  const limit = {
    rateLimit: {
      max: async (req: FastifyRequest) => (await keyQuota(req))?.max ?? 30,
      keyGenerator: async (req: FastifyRequest) => (await keyQuota(req))?.id ?? req.ip,
      timeWindow: "1 minute",
    },
  };
  const statusDeps = { sql, cache, ping: ctx.env.MC_PING_HOST ? { host: ctx.env.MC_PING_HOST, port: ctx.env.MC_PING_PORT } : undefined, ...(ctx.pinger ? { pinger: ctx.pinger } : {}) };

  app.addHook("onSend", async (_req, reply) => {
    reply.header("access-control-allow-origin", "*");
    reply.header("cache-control", "public, max-age=15, s-maxage=30");
  });

  app.get("/status", { config: limit }, async () => {
    const s = await getServerStatus(statusDeps);
    return { state: s.state, online: s.online, maxPlayers: s.maxPlayers, version: s.version, checkedAt: s.checkedAt };
  });

  app.get("/players", { config: limit }, async () => {
    const s = await getServerStatus(statusDeps);
    return { online: s.online, maxPlayers: s.maxPlayers };
  });

  app.get("/leaderboards", { config: limit }, async (req) => {
    const { category } = parse(z.object({ category: z.enum(LEADERBOARD_IDS).default("factions") }), req.query);
    const lb = await cache.wrap(`lb:${category}:public`, 60_000, () => getLeaderboard(sql, category, { limit: 10 }));
    return { category, updatedAt: lb.updatedAt, entries: lb.entries.map(({ rank, name, value }) => ({ rank, name, value })) };
  });

  app.get("/season", { config: limit }, async () => {
    const { current, upcoming } = await cache.wrap("season", 60_000, () => getSeasons(sql));
    const pick = (s: typeof current) => s && { number: s.number, name: s.name, status: s.status, startsAt: s.startsAt, endsAt: s.endsAt };
    return { current: pick(current), upcoming: pick(upcoming) };
  });
}
