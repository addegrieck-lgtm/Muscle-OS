import type { Sql } from "../../db";
import { setting } from "./common";

/**
 * Données de la carte : zones publiques configurées + surface des empires (nombre de chunks claimés), pour chaque monde.
 * Aucune coordonnée de claim n'est publiée.
 * Mondes affichés = ceux de map.worlds (ordre et noms) puis tout monde ayant des claims ou des zones.
 */
export async function getMap(sql: Sql) {
  const [radius, configured, zones, territories, liveEvents, activeWars] = await Promise.all([
    setting(sql, "map.world_radius", 5000),
    setting<{ key: string; name: string }[]>(sql, "map.worlds", [{ key: "vaeloria", name: "VÆLORIA" }]),
    sql<{ key: string; name: string; kind: string; world: string; x1: number; z1: number; x2: number; z2: number; description: string }[]>`
      SELECT key, name, kind, world, x1, z1, x2, z2, description FROM map_zones WHERE active
      ORDER BY array_position(ARRAY['neutral','warzone','event','koth','outpost','spawn'], kind)`,
    // Surface par empire et par monde, SANS position : publier l'emplacement des claims révélerait les bases aux raideurs.
    sql<{ slug: string; name: string; color: string; world: string; chunks: number }[]>`
      SELECT e.slug, e.name, e.color, c.world, count(*)::int AS chunks
      FROM claims c JOIN factions f ON f.id = c.faction_id JOIN seasons s ON s.id = c.season_id AND s.status = 'active'
      JOIN empires e ON lower(e.faction_name) = lower(f.name) AND e.status = 'active'
      GROUP BY e.slug, e.name, e.color, c.world ORDER BY chunks DESC, e.name`,
    sql<{ slug: string; title: string; type: string; zoneKey: string | null }[]>`
      SELECT slug, title, type, zone_key AS "zoneKey" FROM events
      WHERE published AND starts_at <= now() AND coalesce(ends_at, starts_at + interval '2 hours') > now()`,
    sql<{ slug: string; title: string }[]>`SELECT slug, title FROM wars WHERE status = 'active'`,
  ]);
  const worlds = new Map<string, { key: string; name: string; chunks: number }>();
  for (const w of Array.isArray(configured) ? configured : []) if (w?.key) worlds.set(w.key, { key: w.key, name: w.name || w.key, chunks: 0 });
  for (const z of zones) if (!worlds.has(z.world)) worlds.set(z.world, { key: z.world, name: z.world, chunks: 0 });
  for (const t of territories) {
    const w = worlds.get(t.world) ?? { key: t.world, name: t.world, chunks: 0 };
    w.chunks += t.chunks;
    worlds.set(t.world, w);
  }
  return { radius: Number(radius), worlds: [...worlds.values()], zones, territories, liveEvents, activeWars };
}

export async function listJournal(sql: Sql) {
  const rows = await sql<{ slug: string; episode: number | null; title: string; kind: string; summary: string; body: string; videoUrl: string | null; thumbnailUrl: string | null; publishedAt: Date | null }[]>`
    SELECT slug, episode, title, kind, summary, body, video_url AS "videoUrl", thumbnail_url AS "thumbnailUrl", published_at AS "publishedAt"
    FROM journal_entries WHERE published
    -- Épisodes sortis du plus récent au plus ancien, puis épisodes annoncés dans l'ordre
    ORDER BY (published_at IS NULL), published_at DESC, episode ASC NULLS LAST`;
  return rows.map((r) => ({ ...r, publishedAt: r.publishedAt?.toISOString() ?? null }));
}

export async function listRoadmap(sql: Sql) {
  return sql<{ key: string; title: string; summary: string; details: string; status: string; eta: string | null }[]>`
    SELECT key, title, summary, details, status, eta FROM roadmap_steps ORDER BY position`;
}
