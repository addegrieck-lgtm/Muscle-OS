import type { LeaderboardCategory } from "@vaeloria/config";
import type { FactionProfile, GameEvent, Leaderboard, NewsArticle, PlayerProfile, Season } from "@vaeloria/types";
import type { Sql } from "../db";
import { iso } from "./status";

// ───────────── Saisons ─────────────
type SeasonRow = Omit<Season, "stats" | "startsAt" | "endsAt"> & { startsAt: Date; endsAt: Date | null };

async function seasonStats(sql: Sql, id: string) {
  const [s] = await sql<{ players: number; factions: number }[]>`
    SELECT (SELECT count(*)::int FROM player_season_stats WHERE season_id = ${id}) AS players,
           (SELECT count(*)::int FROM factions WHERE season_id = ${id} AND disbanded_at IS NULL) AS factions`;
  return s ?? { players: 0, factions: 0 };
}

export async function getSeasons(sql: Sql): Promise<{ current: Season | null; upcoming: Season | null }> {
  const rows = await sql<SeasonRow[]>`
    SELECT id, number, name, status, starts_at AS "startsAt", ends_at AS "endsAt", description, rewards, objectives
    FROM seasons WHERE status IN ('active','upcoming') ORDER BY number`;
  const toDto = async (r: SeasonRow | undefined): Promise<Season | null> =>
    r ? { ...r, startsAt: iso(r.startsAt), endsAt: r.endsAt ? iso(r.endsAt) : null, stats: await seasonStats(sql, r.id) } : null;
  return { current: await toDto(rows.find((r) => r.status === "active")), upcoming: await toDto(rows.find((r) => r.status === "upcoming")) };
}

// ───────────── Classements ─────────────
const PAGE_SIZE = 50;

export async function getLeaderboard(sql: Sql, category: LeaderboardCategory, opts: { limit?: number; page?: number } = {}): Promise<Leaderboard> {
  const limit = Math.min(opts.limit ?? PAGE_SIZE, 100);
  const offset = ((opts.page ?? 1) - 1) * limit;
  const [season] = await sql<{ id: string }[]>`SELECT id FROM seasons WHERE status = 'active' LIMIT 1`;
  const base = { category, seasonId: season?.id ?? null, updatedAt: new Date().toISOString() };
  if (!season) return { ...base, entries: [], total: 0 };
  const sid = season.id;

  type Row = { id: string; name: string; value: number; secondary: string | null; total: number };
  let rows: Row[];
  const factionOrder = {
    factions: sql`(f.power + f.claims_count * 2 + f.koth_captures * 25 + f.kills)`,
    power: sql`f.power`,
    territory: sql`f.claims_count`,
    koth: sql`f.koth_captures`,
  } as const;

  if (category === "kills" || category === "activity") {
    const value = category === "kills" ? sql`s.kills` : sql`(s.playtime_seconds / 3600)`;
    rows = await sql<Row[]>`
      SELECT p.uuid::text AS id, p.username AS name, ${value}::float8 AS value,
             (SELECT f.name FROM faction_members m JOIN factions f ON f.id = m.faction_id
              WHERE m.player_uuid = p.uuid AND f.season_id = ${sid} AND f.disbanded_at IS NULL LIMIT 1) AS secondary,
             count(*) OVER ()::int AS total
      FROM player_season_stats s JOIN players p ON p.uuid = s.player_uuid
      WHERE s.season_id = ${sid} AND ${value} > 0
      ORDER BY value DESC, p.username LIMIT ${limit} OFFSET ${offset}`;
  } else if (category === "wealth") {
    rows = await sql<Row[]>`
      SELECT f.id::text, f.name, f.wealth::float8 AS value, NULL AS secondary, count(*) OVER ()::int AS total
      FROM factions f WHERE f.season_id = ${sid} AND f.disbanded_at IS NULL AND f.wealth > 0
      ORDER BY f.wealth DESC, f.name LIMIT ${limit} OFFSET ${offset}`;
  } else {
    const value = factionOrder[category];
    rows = await sql<Row[]>`
      SELECT f.id::text, f.name, ${value}::float8 AS value,
             (SELECT count(*) FROM faction_members m WHERE m.faction_id = f.id) || ' membres' AS secondary,
             count(*) OVER ()::int AS total
      FROM factions f WHERE f.season_id = ${sid} AND f.disbanded_at IS NULL
      ORDER BY value DESC, f.name LIMIT ${limit} OFFSET ${offset}`;
  }
  return {
    ...base,
    total: rows[0]?.total ?? 0,
    entries: rows.map((r, i) => ({ rank: offset + i + 1, id: r.id, name: r.name, value: Math.round(r.value), secondary: r.secondary })),
  };
}

// ───────────── Joueurs & factions ─────────────
export async function getPlayer(sql: Sql, usernameOrUuid: string): Promise<PlayerProfile | null> {
  const isUuid = /^[0-9a-f-]{36}$/i.test(usernameOrUuid);
  const [p] = await sql<{ uuid: string; username: string; rank: string | null; firstSeenAt: Date; lastSeenAt: Date | null; playtime: number; balance: number | null }[]>`
    SELECT uuid, username, rank, first_seen_at AS "firstSeenAt", last_seen_at AS "lastSeenAt",
           playtime_seconds::float8 AS playtime, balance
    FROM players WHERE ${isUuid ? sql`uuid = ${usernameOrUuid.toLowerCase()}::uuid` : sql`lower(username) = lower(${usernameOrUuid})`}
    ORDER BY last_seen_at DESC NULLS LAST LIMIT 1`;
  if (!p) return null;
  const [stats] = await sql<{ kills: number; deaths: number; koth: number }[]>`
    SELECT s.kills, s.deaths, s.koth_captures AS koth FROM player_season_stats s
    JOIN seasons se ON se.id = s.season_id AND se.status = 'active' WHERE s.player_uuid = ${p.uuid}`;
  const [faction] = await sql<{ name: string; role: string; power: number }[]>`
    SELECT f.name, m.role, f.power FROM faction_members m JOIN factions f ON f.id = m.faction_id
    JOIN seasons se ON se.id = f.season_id AND se.status = 'active'
    WHERE m.player_uuid = ${p.uuid} AND f.disbanded_at IS NULL LIMIT 1`;
  const achievements = await sql<{ id: string; label: string; unlockedAt: Date }[]>`
    SELECT achievement_id AS id, label, unlocked_at AS "unlockedAt" FROM player_achievements WHERE player_uuid = ${p.uuid} ORDER BY unlocked_at DESC`;
  const [world] = await sql<{ founder: number | null; empire: PlayerProfile["empire"]; won: number; lost: number; leader: boolean; recruits: number }[]>`
    SELECT (SELECT number FROM founders f WHERE f.user_id = ma.user_id) AS founder,
           (SELECT json_build_object('slug', e.slug, 'name', e.name, 'tag', e.tag, 'color', e.color, 'crest', e.crest, 'role', m.role)
              FROM empire_members m JOIN empires e ON e.id = m.empire_id AND e.status = 'active' WHERE m.user_id = ma.user_id) AS empire,
           (SELECT count(*)::int FROM wars w JOIN empire_members m ON m.user_id = ma.user_id WHERE w.status = 'ended' AND w.winner_empire_id = m.empire_id) AS won,
           (SELECT count(*)::int FROM wars w JOIN empire_members m ON m.user_id = ma.user_id WHERE w.status = 'ended' AND w.winner_empire_id IS NOT NULL
              AND w.winner_empire_id <> m.empire_id AND m.empire_id IN (w.attacker_empire_id, w.defender_empire_id)) AS lost,
           EXISTS (SELECT 1 FROM empire_members m WHERE m.user_id = ma.user_id AND m.role = 'leader') AS leader,
           (SELECT count(*)::int FROM user_referrals r WHERE r.referrer_user_id = ma.user_id AND r.status = 'qualified') AS recruits
    FROM minecraft_accounts ma WHERE ma.player_uuid = ${p.uuid}`;
  const badges: { id: string; label: string }[] = [];
  if (world?.founder) badges.push({ id: "founder", label: `Fondateur #${world.founder}` });
  if (world?.leader) badges.push({ id: "leader", label: "Chef d'empire" });
  if ((world?.recruits ?? 0) >= 3) badges.push({ id: "recruiter", label: "Recruteur" });
  if ((world?.won ?? 0) > 0) badges.push({ id: "victor", label: "Vainqueur de guerre" });
  const kills = stats?.kills ?? 0;
  const deaths = stats?.deaths ?? 0;
  return {
    uuid: p.uuid,
    username: p.username,
    rank: p.rank,
    faction: faction ? { name: faction.name, role: faction.role } : null,
    stats: {
      kills,
      deaths,
      kd: deaths === 0 ? kills : Math.round((kills / deaths) * 100) / 100,
      power: faction?.power ?? null,
      balance: p.balance,
      playtimeSeconds: p.playtime,
      kothCaptures: stats?.koth ?? 0,
    },
    firstSeenAt: iso(p.firstSeenAt),
    lastSeenAt: p.lastSeenAt ? iso(p.lastSeenAt) : null,
    achievements: achievements.map((a) => ({ ...a, unlockedAt: iso(a.unlockedAt) })),
    founder: world?.founder ?? null,
    empire: world?.empire ?? null,
    wars: { won: world?.won ?? 0, lost: world?.lost ?? 0 },
    badges,
  };
}

export async function getFaction(sql: Sql, name: string): Promise<FactionProfile | null> {
  const [f] = await sql<(Omit<FactionProfile, "members" | "leader" | "rank" | "createdAt"> & { createdAt: Date; leaderUuid: string | null; seasonId: string; score: number })[]>`
    SELECT f.id, f.name, f.description, f.power, f.max_power AS "maxPower", f.claims_count AS claims, f.kills, f.wealth,
           f.koth_captures AS "kothCaptures", f.created_at AS "createdAt", f.leader_uuid AS "leaderUuid", f.season_id AS "seasonId",
           (f.power + f.claims_count * 2 + f.koth_captures * 25 + f.kills) AS score
    FROM factions f JOIN seasons s ON s.id = f.season_id AND s.status = 'active'
    WHERE lower(f.name) = lower(${name}) AND f.disbanded_at IS NULL`;
  if (!f) return null;
  const members = await sql<{ uuid: string; username: string; role: string }[]>`
    SELECT p.uuid, p.username, m.role FROM faction_members m JOIN players p ON p.uuid = m.player_uuid
    WHERE m.faction_id = ${f.id}
    ORDER BY array_position(ARRAY['LEADER','OFFICER','MEMBER','RECRUIT'], m.role), p.username`;
  const [rank] = await sql<{ rank: number }[]>`
    SELECT count(*)::int + 1 AS rank FROM factions
    WHERE season_id = ${f.seasonId} AND disbanded_at IS NULL AND (power + claims_count * 2 + koth_captures * 25 + kills) > ${f.score}`;
  const leader = members.find((m) => m.uuid === f.leaderUuid) ?? null;
  const { leaderUuid: _l, seasonId: _s, score: _sc, createdAt, ...rest } = f;
  return { ...rest, createdAt: iso(createdAt), leader: leader && { uuid: leader.uuid, username: leader.username }, members, rank: rank?.rank ?? null };
}

// ───────────── Événements, news, boutique ─────────────
export async function getUpcomingEvents(sql: Sql): Promise<GameEvent[]> {
  const rows = await sql<EventRow[]>`
    SELECT ${eventColumns(sql)} FROM events WHERE published AND coalesce(ends_at, starts_at + interval '2 hours') > now()
    ORDER BY starts_at LIMIT 50`;
  return rows.map(eventDto);
}

type EventRow = Omit<GameEvent, "startsAt" | "endsAt"> & { startsAt: Date; endsAt: Date | null };
const eventColumns = (sql: Sql) => sql`
  id, slug, title, type, description, starts_at AS "startsAt", ends_at AS "endsAt", location, rewards,
  participants, empires_count AS "empiresCount", zone_key AS "zoneKey",
  (starts_at <= now() AND coalesce(ends_at, starts_at + interval '2 hours') > now()) AS live`;
const eventDto = (r: EventRow): GameEvent => ({ ...r, startsAt: iso(r.startsAt), endsAt: r.endsAt ? iso(r.endsAt) : null });

export async function getEvent(sql: Sql, slug: string): Promise<GameEvent | null> {
  const [r] = await sql<EventRow[]>`SELECT ${eventColumns(sql)} FROM events WHERE published AND slug = ${slug}`;
  return r ? eventDto(r) : null;
}

export async function pastEvents(sql: Sql, limit = 20): Promise<GameEvent[]> {
  const rows = await sql<EventRow[]>`
    SELECT ${eventColumns(sql)} FROM events WHERE published AND coalesce(ends_at, starts_at + interval '2 hours') <= now()
    ORDER BY starts_at DESC LIMIT ${limit}`;
  return rows.map(eventDto);
}

type NewsRow = Omit<NewsArticle, "publishedAt" | "updatedAt"> & { publishedAt: Date; updatedAt: Date };
const newsDto = (r: NewsRow): NewsArticle => ({ ...r, publishedAt: iso(r.publishedAt), updatedAt: iso(r.updatedAt) });

export async function listNews(sql: Sql, page = 1, category?: string, pageSize = 12) {
  const offset = (page - 1) * pageSize;
  const rows = await sql<(NewsRow & { total: number })[]>`
    SELECT id, slug, title, excerpt, '' AS body, category, cover_url AS "coverUrl", author,
           published_at AS "publishedAt", updated_at AS "updatedAt", count(*) OVER ()::int AS total
    FROM news WHERE status = 'published' AND published_at <= now() ${category ? sql`AND category = ${category}` : sql``}
    ORDER BY published_at DESC LIMIT ${pageSize} OFFSET ${offset}`;
  return { items: rows.map(({ total: _t, ...r }) => newsDto(r)), total: rows[0]?.total ?? 0, page, pageSize };
}

export async function getArticle(sql: Sql, slug: string): Promise<NewsArticle | null> {
  const [r] = await sql<NewsRow[]>`
    SELECT id, slug, title, excerpt, body, category, cover_url AS "coverUrl", author, published_at AS "publishedAt", updated_at AS "updatedAt"
    FROM news WHERE slug = ${slug} AND status = 'published' AND published_at <= now()`;
  return r ? newsDto(r) : null;
}

export async function getStats(sql: Sql) {
  const [r] = await sql<{ players: number; factions: number; kills: number; betaSignups: number }[]>`
    SELECT (SELECT count(*)::int FROM players) AS players,
           (SELECT count(*)::int FROM factions f JOIN seasons s ON s.id = f.season_id AND s.status = 'active' WHERE f.disbanded_at IS NULL) AS factions,
           (SELECT coalesce(sum(kills), 0)::int FROM player_season_stats) AS kills,
           (SELECT count(*)::int FROM beta_signups) AS "betaSignups"`;
  return r!;
}
