import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context";
import { HttpError, notFound, unauthorized } from "../lib/errors";
import { safeEqualString } from "../lib/hmac";
import { parse } from "../lib/validate";
import { grantInfluence, rebuildInfluence } from "../services/world/influence";

const Slug = z.string().regex(/^[a-z0-9-]{2,80}$/, "slug : minuscules, chiffres et tirets");
const Id = z.object({ id: z.string().uuid() });
const dt = z.string().datetime();

/** Administration du monde V2. Même protection que /admin/v1 (jeton serveur à serveur). */
export async function adminWorldRoutes(app: FastifyInstance, ctx: AppContext) {
  const { sql, cache } = ctx;

  app.addHook("onRequest", async (req) => {
    const token = ctx.env.ADMIN_API_TOKEN;
    const h = req.headers.authorization ?? "";
    if (!token || !h.startsWith("Bearer ") || !safeEqualString(h.slice(7), token)) throw unauthorized();
  });
  app.addHook("onResponse", async (req) => {
    if (req.method !== "GET") cache.invalidate("world:");
  });

  const audit = (action: string, targetType: string, targetId: string, metadata: object = {}) =>
    sql`INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id, metadata)
        VALUES ('admin', 'admin-token', ${action}, ${targetType}, ${targetId}, ${sql.json(metadata as never)})`;
  const conflict = (e: unknown): never => {
    const err = e as { code?: string; detail?: string };
    if (err.code === "23505") throw new HttpError(409, "conflict", `Déjà utilisé : ${err.detail ?? ""}`);
    if (err.code === "23503") throw new HttpError(409, "conflict", "Référence invalide");
    if (err.code === "23514") throw new HttpError(400, "invalid", "Valeur refusée par une règle de la base");
    throw e;
  };

  // ───── Réglages ─────
  const Settings = z.object({ foundersCap: z.number().int().min(1).max(1_000_000), foundersOpen: z.boolean(), empiresMaxMembers: z.number().int().min(2).max(500), worldRadius: z.number().int().min(500).max(100_000),
    // Une ligne par monde : « clé = Nom affiché » (clé = nom du dossier du monde en jeu).
    mapWorlds: z.string().max(2000).default("world = Monde principal") });
  const WORLD_KEY = /^[A-Za-z0-9_.-]{1,64}$/;
  const parseWorlds = (text: string) => {
    const out: { key: string; name: string }[] = [];
    for (const line of text.split(/\r?\n/)) {
      const [rawKey, ...rest] = line.split("=");
      const key = rawKey?.trim() ?? "";
      if (!key) continue;
      if (!WORLD_KEY.test(key)) throw new HttpError(400, "invalid_world", `Nom de monde invalide : « ${key} »`);
      if (!out.some((w) => w.key === key)) out.push({ key, name: rest.join("=").trim().slice(0, 40) || key });
    }
    if (out.length === 0) throw new HttpError(400, "invalid_world", "Au moins un monde est nécessaire.");
    return out.slice(0, 12);
  };
  app.get("/settings", async () => {
    const rows = await sql<{ key: string; value: unknown }[]>`SELECT key, value FROM site_settings WHERE key IN ('founders.cap','founders.open','empires.max_members','map.world_radius','map.worlds')`;
    const v = Object.fromEntries(rows.map((r) => [r.key, r.value]));
    const [{ count }] = (await sql`SELECT last AS count FROM founder_counter`) as unknown as [{ count: number }];
    return { foundersCap: Number(v["founders.cap"] ?? 3000), foundersOpen: v["founders.open"] !== false, empiresMaxMembers: Number(v["empires.max_members"] ?? 50), worldRadius: Number(v["map.world_radius"] ?? 5000),
      mapWorlds: (Array.isArray(v["map.worlds"]) ? (v["map.worlds"] as { key: string; name: string }[]) : [{ key: "world", name: "Monde principal" }]).map((w) => `${w.key} = ${w.name}`).join("\n"),
      foundersCount: count };
  });
  app.put("/settings", async (req) => {
    const b = parse(Settings, req.body);
    const worlds = parseWorlds(b.mapWorlds);
    for (const [key, value] of [["founders.cap", b.foundersCap], ["founders.open", b.foundersOpen], ["empires.max_members", b.empiresMaxMembers], ["map.world_radius", b.worldRadius], ["map.worlds", worlds]] as const) {
      await sql`INSERT INTO site_settings (key, value) VALUES (${key}, ${sql.json(value)}) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`;
    }
    await audit("world.settings", "settings", "world", b);
    return b;
  });

  // ───── CRUD générique ─────
  function crud<T extends z.ZodTypeAny>(path: string, table: string, pk: string, schema: T, toRow: (v: z.infer<T>) => Record<string, unknown>, orderBy: string) {
    app.get(`/${path}`, async () => ({ items: await sql`SELECT * FROM ${sql(table)} ORDER BY ${sql.unsafe(orderBy)} LIMIT 500` }));
    app.post(`/${path}`, async (req, reply) => {
      const [row] = await sql`INSERT INTO ${sql(table)} ${sql(toRow(parse(schema, req.body)))} RETURNING *`.catch(conflict);
      await audit(`world.${path}.create`, path, String(row![pk]));
      reply.code(201);
      return row;
    });
    app.put(`/${path}/:id`, async (req) => {
      const { id } = req.params as { id: string };
      const [row] = await sql`UPDATE ${sql(table)} SET ${sql(toRow(parse(schema, req.body)))} WHERE ${sql(pk)}::text = ${id} RETURNING *`.catch(conflict);
      if (!row) throw notFound("Élément");
      await audit(`world.${path}.update`, path, id);
      return row;
    });
    app.delete(`/${path}/:id`, async (req, reply) => {
      const { id } = req.params as { id: string };
      const rows = await sql`DELETE FROM ${sql(table)} WHERE ${sql(pk)}::text = ${id} RETURNING 1`.catch(conflict);
      if (!rows.length) throw notFound("Élément");
      await audit(`world.${path}.delete`, path, id);
      reply.code(204);
    });
  }

  crud("milestones", "founder_milestones", "threshold",
    z.object({ threshold: z.number().int().min(1), title: z.string().min(2).max(120), description: z.string().max(500).default(""), reward: z.string().max(200).nullable().default(null), reveal: z.string().max(2000).nullable().default(null) }),
    (v) => v, "threshold");

  crud("journal", "journal_entries", "id",
    z.object({ slug: Slug, episode: z.number().int().min(0).nullable().default(null), title: z.string().min(3).max(160), kind: z.enum(["video", "short", "update", "coulisses", "milestone"]),
      summary: z.string().max(400).default(""), body: z.string().max(20_000).default(""), videoUrl: z.string().url().nullable().default(null), thumbnailUrl: z.string().url().nullable().default(null),
      published: z.boolean().default(false), publishedAt: dt.nullable().default(null) }),
    (v) => ({ slug: v.slug, episode: v.episode, title: v.title, kind: v.kind, summary: v.summary, body: v.body, video_url: v.videoUrl, thumbnail_url: v.thumbnailUrl, published: v.published, published_at: v.publishedAt }),
    "coalesce(published_at, created_at) DESC");

  crud("roadmap", "roadmap_steps", "key",
    z.object({ key: z.string().regex(/^[a-z0-9-]{2,40}$/), title: z.string().min(2).max(80), summary: z.string().max(300).default(""), details: z.string().max(4000).default(""),
      status: z.enum(["done", "current", "upcoming"]), position: z.number().int(), eta: z.string().max(60).nullable().default(null) }),
    (v) => v, "position");

  crud("zones", "map_zones", "id",
    z.object({ key: z.string().regex(/^[a-z0-9-]{2,40}$/), name: z.string().min(2).max(60), kind: z.enum(["spawn", "neutral", "koth", "warzone", "event", "outpost"]),
      world: z.string().regex(/^[A-Za-z0-9_.-]{1,64}$/).default("world"),
      x1: z.number().int(), z1: z.number().int(), x2: z.number().int(), z2: z.number().int(), description: z.string().max(400).default(""), active: z.boolean().default(true) })
      .refine((z_) => z_.x2 > z_.x1 && z_.z2 > z_.z1, { message: "x2 > x1 et z2 > z1" }),
    (v) => v, "key");

  // ───── Influence ─────
  app.get("/influence", async () => ({ items: await sql`SELECT kind, label, points, daily_cap AS "dailyCap", once_per_user AS "oncePerUser", requires_linked AS "requiresLinked", active FROM influence_rules ORDER BY kind` }));
  app.put("/influence/:kind", async (req) => {
    const { kind } = req.params as { kind: string };
    const b = parse(z.object({ points: z.number().int().min(0).max(10_000), dailyCap: z.number().int().min(1).nullable(), requiresLinked: z.boolean(), active: z.boolean() }), req.body);
    const rows = await sql`UPDATE influence_rules SET points = ${b.points}, daily_cap = ${b.dailyCap}, requires_linked = ${b.requiresLinked}, active = ${b.active} WHERE kind = ${kind} RETURNING kind`;
    if (!rows.length) throw notFound("Règle");
    await audit("world.influence.rule", "influence_rule", kind, b);
    return { ok: true };
  });
  app.post("/influence/rebuild", async () => {
    await sql.begin((tx) => rebuildInfluence(tx));
    await audit("world.influence.rebuild", "influence", "*");
    return { ok: true };
  });

  // ───── Empires (modération) ─────
  app.get("/empires", async () => ({
    items: await sql`
      SELECT e.slug, e.name, e.tag, e.status, e.influence, e.faction_name AS "factionName", e.recruiting, e.created_at AS "createdAt",
             (SELECT count(*)::int FROM empire_members m WHERE m.empire_id = e.id) AS members
      FROM empires e ORDER BY e.created_at DESC LIMIT 500`,
  }));
  app.put("/empires/:slug", async (req) => {
    const { slug } = req.params as { slug: string };
    const b = parse(z.object({ name: z.string().min(3).max(24), status: z.enum(["active", "disbanded", "banned"]), factionName: z.string().max(24).nullable() }), req.body);
    const rows = await sql`UPDATE empires SET name = ${b.name}, status = ${b.status}, faction_name = ${b.factionName} WHERE slug = ${slug} RETURNING id`.catch(conflict);
    if (!rows.length) throw notFound("Empire");
    await audit("world.empire.moderate", "empire", slug, b);
    return { ok: true };
  });

  // ───── Guerres ─────
  const empireId = async (slug: string) => {
    const [e] = await sql<{ id: string }[]>`SELECT id FROM empires WHERE slug = ${slug} AND status = 'active'`;
    if (!e) throw new HttpError(400, "unknown_empire", `Empire inconnu : ${slug}`);
    return e.id;
  };
  const WarInput = z.object({
    slug: Slug, title: z.string().min(3).max(120), attacker: Slug, defender: Slug, status: z.enum(["planned", "active", "ended", "cancelled"]),
    startsAt: dt, endsAt: dt.nullable().default(null), attackerScore: z.number().int().min(0).default(0), defenderScore: z.number().int().min(0).default(0),
    attackerTerritories: z.number().int().min(0).default(0), defenderTerritories: z.number().int().min(0).default(0), participants: z.number().int().min(0).default(0),
    winner: Slug.nullable().default(null), summary: z.string().max(2000).default(""),
  });
  async function warRow(body: unknown) {
    const b = parse(WarInput, body);
    return {
      b,
      row: {
        slug: b.slug, title: b.title, attacker_empire_id: await empireId(b.attacker), defender_empire_id: await empireId(b.defender), status: b.status,
        starts_at: b.startsAt, ends_at: b.endsAt, attacker_score: b.attackerScore, defender_score: b.defenderScore, attacker_territories: b.attackerTerritories,
        defender_territories: b.defenderTerritories, participants: b.participants, winner_empire_id: b.winner ? await empireId(b.winner) : null, summary: b.summary,
      },
    };
  }
  /** Fin de guerre : influence « victoire » pour chaque membre lié de l'empire gagnant (une seule fois). */
  async function rewardVictory(warId: string) {
    await sql.begin(async (tx) => {
      const members = await tx<{ userId: string }[]>`
        SELECT m.user_id AS "userId" FROM wars w JOIN empire_members m ON m.empire_id = w.winner_empire_id WHERE w.id = ${warId} AND w.status = 'ended'`;
      for (const m of members) await grantInfluence(tx, { userId: m.userId, kind: "war_victory", key: `war:${warId}:${m.userId}` });
    });
  }
  app.get("/wars", async () => ({
    items: await sql`
      SELECT w.slug, w.title, w.status, w.starts_at AS "startsAt", a.slug AS attacker, d.slug AS defender, w.attacker_score AS "attackerScore", w.defender_score AS "defenderScore",
             w.attacker_territories AS "attackerTerritories", w.defender_territories AS "defenderTerritories", w.participants, w.ends_at AS "endsAt",
             (SELECT slug FROM empires x WHERE x.id = w.winner_empire_id) AS winner, w.summary, w.source
      FROM wars w JOIN empires a ON a.id = w.attacker_empire_id JOIN empires d ON d.id = w.defender_empire_id ORDER BY w.starts_at DESC LIMIT 200`,
  }));
  app.post("/wars", async (req, reply) => {
    const { b, row } = await warRow(req.body);
    const [w] = await sql<{ id: string }[]>`INSERT INTO wars ${sql(row)} RETURNING id`.catch(conflict);
    await sql`INSERT INTO war_events (war_id, kind, message) VALUES (${w!.id}, 'start', ${`Déclaration de guerre : ${b.title}`})`;
    if (b.status === "ended") await rewardVictory(w!.id);
    await audit("world.war.create", "war", b.slug);
    reply.code(201);
    return { slug: b.slug };
  });
  app.put("/wars/:slug", async (req) => {
    const { slug } = req.params as { slug: string };
    const { b, row } = await warRow(req.body);
    const [w] = await sql<{ id: string }[]>`UPDATE wars SET ${sql(row)} WHERE slug = ${slug} RETURNING id`.catch(conflict);
    if (!w) throw notFound("Guerre");
    if (b.status === "ended") await rewardVictory(w.id);
    await audit("world.war.update", "war", slug, b);
    return { slug: b.slug };
  });
  app.post("/wars/:slug/events", async (req, reply) => {
    const { slug } = req.params as { slug: string };
    const b = parse(z.object({ kind: z.enum(["capture", "battle", "note", "end"]), message: z.string().min(3).max(300) }), req.body);
    const rows = await sql`INSERT INTO war_events (war_id, kind, message) SELECT id, ${b.kind}, ${b.message} FROM wars WHERE slug = ${slug} RETURNING id`;
    if (!rows.length) throw notFound("Guerre");
    reply.code(201);
    return { ok: true };
  });

  // ───── Conseil ─────
  app.get("/polls", async () => ({
    items: await sql`
      SELECT p.id, p.slug, p.question, p.description, p.status, p.opens_at AS "opensAt", p.closes_at AS "closesAt", p.eligibility, p.outcome,
             coalesce((SELECT json_agg(json_build_object('id', o.id, 'label', o.label, 'votes', (SELECT count(*) FROM poll_votes v WHERE v.option_id = o.id)) ORDER BY o.position)
                       FROM poll_options o WHERE o.poll_id = p.id), '[]') AS options
      FROM polls p ORDER BY p.created_at DESC LIMIT 200`,
  }));
  const PollInput = z.object({
    slug: Slug, question: z.string().min(5).max(200), description: z.string().max(1000).default(""), status: z.enum(["draft", "open", "closed"]),
    opensAt: dt.optional(), closesAt: dt.nullable().default(null), eligibility: z.enum(["account", "linked"]).default("account"),
    outcome: z.string().max(500).nullable().default(null), options: z.array(z.string().trim().min(1).max(100)).min(2).max(8),
  });
  app.post("/polls", async (req, reply) => {
    const b = parse(PollInput, req.body);
    await sql.begin(async (tx) => {
      const [p] = await tx<{ id: string }[]>`
        INSERT INTO polls (slug, question, description, status, opens_at, closes_at, eligibility, outcome)
        VALUES (${b.slug}, ${b.question}, ${b.description}, ${b.status}, ${b.opensAt ?? new Date().toISOString()}, ${b.closesAt}, ${b.eligibility}, ${b.outcome})
        RETURNING id`;
      for (const [i, label] of b.options.entries()) await tx`INSERT INTO poll_options (poll_id, label, position) VALUES (${p!.id}, ${label}, ${i})`;
    }).catch(conflict);
    await audit("world.poll.create", "poll", b.slug);
    reply.code(201);
    return { slug: b.slug };
  });
  app.put("/polls/:id", async (req) => {
    const { id } = parse(Id, req.params);
    const b = parse(PollInput, req.body);
    await sql.begin(async (tx) => {
      const rows = await tx`UPDATE polls SET slug = ${b.slug}, question = ${b.question}, description = ${b.description}, status = ${b.status},
                              opens_at = coalesce(${b.opensAt ?? null}, opens_at), closes_at = ${b.closesAt}, eligibility = ${b.eligibility}, outcome = ${b.outcome}
                            WHERE id = ${id} RETURNING id`;
      if (!rows.length) throw notFound("Sondage");
      // Les choix ne sont modifiables qu'avant le premier vote (sinon les résultats seraient faussés).
      const voted = await tx`SELECT 1 FROM poll_votes WHERE poll_id = ${id} LIMIT 1`;
      if (!voted.length) {
        await tx`DELETE FROM poll_options WHERE poll_id = ${id}`;
        for (const [i, label] of b.options.entries()) await tx`INSERT INTO poll_options (poll_id, label, position) VALUES (${id}, ${label}, ${i})`;
      }
    }).catch(conflict);
    await audit("world.poll.update", "poll", id, { status: b.status });
    return { ok: true };
  });

  // ───── Parrainages ─────
  app.get("/referrals", async () => ({
    items: await sql`
      SELECT r.code, r.status, r.created_at AS "createdAt", r.qualified_at AS "qualifiedAt", r.reject_reason AS "rejectReason", r.referred_user_id AS "referredUserId",
             (SELECT count(*)::int FROM user_referrals x WHERE x.referrer_user_id = r.referrer_user_id AND x.created_at >= date_trunc('day', now())) AS "referrerToday"
      FROM user_referrals r ORDER BY r.created_at DESC LIMIT 300`,
  }));
  app.post("/referrals/:referredUserId/reject", async (req) => {
    const { referredUserId } = req.params as { referredUserId: string };
    const b = parse(z.object({ reason: z.string().min(3).max(200) }), req.body);
    const rows = await sql`UPDATE user_referrals SET status = 'rejected', reject_reason = ${b.reason} WHERE referred_user_id = ${referredUserId} AND status = 'pending' RETURNING code`;
    if (!rows.length) throw notFound("Parrainage en attente");
    await audit("world.referral.reject", "user", referredUserId, b);
    return { ok: true };
  });
}
