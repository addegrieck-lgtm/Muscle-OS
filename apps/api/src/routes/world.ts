import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context";
import { notFound } from "../lib/errors";
import { parse } from "../lib/validate";
import { getEvent, getUpcomingEvents, pastEvents } from "../services/content";
import { getEmpire, listEmpires } from "../services/world/empires";
import { founderStats, listFounders } from "../services/world/founders";
import { votePage } from "../services/votes/votes";
import { listPolls } from "../services/world/polls";
import { getRanking, RANKING_IDS } from "../services/world/rankings";
import { recordClick } from "../services/world/referrals";
import { getWar, listWars } from "../services/world/wars";
import { getMap, listJournal, listRoadmap } from "../services/world/world";

/** Le monde de VÆLORIA : lecture publique, mise en cache (les chiffres sont réels, jamais inventés). */
export async function worldRoutes(app: FastifyInstance, ctx: AppContext) {
  const { sql, cache } = ctx;
  const cacheFor = (s: number) => `public, max-age=${Math.min(s, 30)}, s-maxage=${s}, stale-while-revalidate=${s * 4}`;
  const cached = <T>(key: string, ttl: number, fn: () => Promise<T>) => cache.wrap(`world:${key}`, ttl * 1000, fn);

  /** Tout ce dont l'accueil a besoin, en un appel. */
  app.get("/world/home", async (_req, reply) => {
    reply.header("cache-control", cacheFor(20));
    return cached("home", 20, async () => {
      const [founders, empires, activeWars, recentWars, events, polls, journal] = await Promise.all([
        founderStats(sql), listEmpires(sql, { limit: 6 }), listWars(sql, "active", 3), listWars(sql, "ended", 3),
        getUpcomingEvents(sql), listPolls(sql), listJournal(sql),
      ]);
      return {
        founders, empires: empires.items, empireCount: empires.total, wars: activeWars.length ? activeWars : recentWars,
        warsActive: activeWars.length, events: events.slice(0, 4), poll: polls.find((p) => p.status === "open") ?? null, journal: journal.slice(0, 3),
      };
    });
  });

  /** Sites de vote actifs et meilleurs voteurs du mois. */
  app.get("/vote", async (_req, reply) => {
    reply.header("cache-control", cacheFor(30));
    return cached("vote", 30, () => votePage(sql));
  });

  app.get("/founders", async (_req, reply) => {
    reply.header("cache-control", cacheFor(15));
    return cached("founders", 15, () => founderStats(sql));
  });
  app.get("/founders/list", async (req, reply) => {
    const q = parse(z.object({ sort: z.enum(["number", "recruiters", "influence"]).default("number"), page: z.coerce.number().int().min(1).max(100).default(1) }), req.query);
    reply.header("cache-control", cacheFor(30));
    return cached(`founders:${q.sort}:${q.page}`, 30, () => listFounders(sql, q.sort, q.page));
  });

  app.get("/empires", async (req, reply) => {
    const q = parse(z.object({
      q: z.string().max(40).optional(), sort: z.enum(["influence", "members", "territories", "recent"]).default("influence"),
      recruiting: z.enum(["1", "0"]).optional(), limit: z.coerce.number().int().min(1).max(200).default(60),
    }), req.query);
    reply.header("cache-control", cacheFor(20));
    return cached(`empires:${JSON.stringify(q)}`, 20, () => listEmpires(sql, { q: q.q, sort: q.sort, recruiting: q.recruiting === "1", limit: q.limit }));
  });
  app.get("/empires/:slug", async (req, reply) => {
    const { slug } = parse(z.object({ slug: z.string().regex(/^[a-z0-9-]{2,40}$/) }), req.params);
    const e = await cached(`empire:${slug}`, 20, () => getEmpire(sql, slug));
    if (!e) throw notFound("Empire");
    reply.header("cache-control", cacheFor(20));
    return e;
  });

  app.get("/wars", async (req, reply) => {
    const { status } = parse(z.object({ status: z.enum(["planned", "active", "ended"]).optional() }), req.query);
    reply.header("cache-control", cacheFor(15));
    return { items: await cached(`wars:${status ?? ""}`, 15, () => listWars(sql, status)) };
  });
  app.get("/wars/:slug", async (req, reply) => {
    const { slug } = parse(z.object({ slug: z.string().regex(/^[a-z0-9-]{2,80}$/) }), req.params);
    const w = await cached(`war:${slug}`, 10, () => getWar(sql, slug));
    if (!w) throw notFound("Guerre");
    reply.header("cache-control", cacheFor(10));
    return w;
  });

  app.get("/world/map", async (_req, reply) => {
    reply.header("cache-control", cacheFor(60));
    return cached("map", 60, () => getMap(sql));
  });

  app.get("/rankings/:category", async (req, reply) => {
    const { category } = parse(z.object({ category: z.enum(RANKING_IDS) }), req.params);
    reply.header("cache-control", cacheFor(60));
    return { category, entries: await cached(`ranking:${category}`, 60, () => getRanking(sql, category)) };
  });

  app.get("/council/polls", async (_req, reply) => {
    reply.header("cache-control", cacheFor(15));
    return { items: await cached("polls", 15, () => listPolls(sql)) };
  });

  app.get("/journal", async (_req, reply) => {
    reply.header("cache-control", cacheFor(120));
    return { items: await cached("journal", 120, () => listJournal(sql)) };
  });
  app.get("/roadmap", async (_req, reply) => {
    reply.header("cache-control", cacheFor(300));
    return { items: await cached("roadmap", 300, () => listRoadmap(sql)) };
  });

  app.get("/events/:slug", async (req, reply) => {
    const { slug } = parse(z.object({ slug: z.string().regex(/^[a-z0-9-]{1,120}$/) }), req.params);
    const e = await cached(`event:${slug}`, 30, () => getEvent(sql, slug));
    if (!e) throw notFound("Événement");
    reply.header("cache-control", cacheFor(30));
    return e;
  });
  app.get("/events-past", async (_req, reply) => {
    reply.header("cache-control", cacheFor(300));
    return { items: await cached("events:past", 300, () => pastEvents(sql)) };
  });

  /** Clic sur un lien d'invitation (relayé par le site). Dédoublonné par visiteur et par jour. */
  app.post("/referrals/click", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { code, visitorKey } = parse(z.object({ code: z.string().regex(/^[A-Za-z0-9]{6,12}$/), visitorKey: z.string().min(8).max(200) }), req.body);
    const valid = await recordClick(sql, code.toUpperCase(), visitorKey);
    reply.code(valid ? 204 : 404);
  });
}
