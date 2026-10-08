import type { BridgeEvent } from "@vaeloria/types";
import type { Sql, Tx as TxSql } from "../db";
import { DEFAULT_LAG, trackLag, type LagThresholds } from "./serverHealth";
import { grantInfluence } from "./world/influence";

type Tx = Sql | TxSql;

export interface IngestResult {
  accepted: number;
  duplicates: number;
  failed: { id: string; error: string }[];
}

async function activeSeasonId(tx: Tx): Promise<string | null> {
  const [row] = await tx<{ id: string }[]>`SELECT id FROM seasons WHERE status = 'active' LIMIT 1`;
  return row?.id ?? null;
}

async function upsertPlayer(tx: Tx, uuid: string, username: string, server: string, at: string) {
  await tx`
    INSERT INTO players (uuid, username, first_seen_at, last_seen_at, last_server)
    VALUES (${uuid}, ${username}, ${at}, ${at}, ${server})
    ON CONFLICT (uuid) DO UPDATE SET username = EXCLUDED.username,
      last_seen_at = GREATEST(players.last_seen_at, EXCLUDED.last_seen_at), last_server = EXCLUDED.last_server`;
  await tx`INSERT INTO username_history (player_uuid, username, seen_at) VALUES (${uuid}, ${username}, ${at})
           ON CONFLICT (player_uuid, username) DO UPDATE SET seen_at = EXCLUDED.seen_at`;
}

async function bumpSeasonStats(tx: Tx, seasonId: string | null, uuid: string, delta: { kills?: number; deaths?: number; koth?: number; playtime?: number }) {
  if (!seasonId) return;
  await tx`
    INSERT INTO player_season_stats (season_id, player_uuid, kills, deaths, koth_captures, playtime_seconds)
    VALUES (${seasonId}, ${uuid}, ${delta.kills ?? 0}, ${delta.deaths ?? 0}, ${delta.koth ?? 0}, ${delta.playtime ?? 0})
    ON CONFLICT (season_id, player_uuid) DO UPDATE SET
      kills = player_season_stats.kills + EXCLUDED.kills,
      deaths = player_season_stats.deaths + EXCLUDED.deaths,
      koth_captures = player_season_stats.koth_captures + EXCLUDED.koth_captures,
      playtime_seconds = player_season_stats.playtime_seconds + EXCLUDED.playtime_seconds`;
}

async function empireOfFaction(tx: Tx, faction: string): Promise<string | null> {
  const [e] = await tx<{ id: string }[]>`SELECT id FROM empires WHERE lower(faction_name) = lower(${faction}) AND status = 'active'`;
  return e?.id ?? null;
}

async function linkedUser(tx: Tx, uuid: string): Promise<string | null> {
  const [u] = await tx<{ userId: string }[]>`SELECT user_id AS "userId" FROM minecraft_accounts WHERE player_uuid = ${uuid}`;
  return u?.userId ?? null;
}

async function factionId(tx: Tx, seasonId: string | null, name: string): Promise<string | null> {
  if (!seasonId) return null;
  const [f] = await tx<{ id: string }[]>`
    SELECT id FROM factions WHERE season_id = ${seasonId} AND lower(name) = lower(${name}) AND disbanded_at IS NULL`;
  return f?.id ?? null;
}

/** Applique un événement aux tables métier. Doit être appelé dans une transaction. */
async function apply(tx: Tx, e: BridgeEvent, seasonId: string | null, lag: LagThresholds): Promise<void> {
  switch (e.event) {
    case "PLAYER_JOIN":
      await upsertPlayer(tx, e.uuid, e.username, e.server, e.occurredAt);
      await tx`UPDATE players SET online = true WHERE uuid = ${e.uuid}`;
      return;
    case "PLAYER_QUIT": {
      await upsertPlayer(tx, e.uuid, e.username, e.server, e.occurredAt);
      await tx`UPDATE players SET online = false, playtime_seconds = playtime_seconds + ${e.sessionSeconds} WHERE uuid = ${e.uuid}`;
      await bumpSeasonStats(tx, seasonId, e.uuid, { playtime: e.sessionSeconds });
      // Activité : influence par heure de jeu (plafonnée par jour, compte lié uniquement)
      const hours = Math.floor(e.sessionSeconds / 3600);
      const user = await linkedUser(tx, e.uuid);
      if (hours > 0 && user) await grantInfluence(tx as TxSql, { userId: user, kind: "playtime_hour", key: `playtime:${e.id}`, units: hours });
      return;
    }
    case "WAR_START": {
      const [a, d] = [await empireOfFaction(tx, e.attacker), await empireOfFaction(tx, e.defender)];
      if (!a || !d || a === d) return; // factions pas encore liées à un empire : l'événement reste journalisé
      await tx`
        INSERT INTO wars (slug, title, attacker_empire_id, defender_empire_id, status, starts_at, source, external_id)
        VALUES (${`guerre-${e.warId.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`.slice(0, 80)}, ${e.title ?? `${e.attacker} contre ${e.defender}`}, ${a}, ${d}, 'active', ${e.occurredAt}, 'bridge', ${e.warId})
        ON CONFLICT (external_id) DO NOTHING`;
      await tx`INSERT INTO war_events (war_id, kind, message, occurred_at) SELECT id, 'start', ${`${e.attacker} déclare la guerre à ${e.defender}`}, ${e.occurredAt} FROM wars WHERE external_id = ${e.warId}`;
      return;
    }
    case "WAR_END": {
      const winner = e.winner ? await empireOfFaction(tx, e.winner) : null;
      const [w] = await tx<{ id: string }[]>`
        UPDATE wars SET status = 'ended', ends_at = ${e.occurredAt}, winner_empire_id = ${winner}, attacker_score = ${e.attackerScore}, defender_score = ${e.defenderScore},
          attacker_territories = coalesce(${e.attackerTerritories ?? null}, attacker_territories), defender_territories = coalesce(${e.defenderTerritories ?? null}, defender_territories),
          participants = coalesce(${e.participants ?? null}, participants)
        WHERE external_id = ${e.warId} AND status <> 'ended' RETURNING id`;
      if (!w) return;
      await tx`INSERT INTO war_events (war_id, kind, message, occurred_at) VALUES (${w.id}, 'end', ${e.winner ? `Victoire de ${e.winner}` : "Fin de la guerre sans vainqueur"}, ${e.occurredAt})`;
      if (winner) {
        const members = await tx<{ userId: string }[]>`SELECT user_id AS "userId" FROM empire_members WHERE empire_id = ${winner}`;
        for (const m of members) await grantInfluence(tx as TxSql, { userId: m.userId, kind: "war_victory", key: `war:${w.id}:${m.userId}` });
      }
      return;
    }
    case "KOTH_START": {
      const ends = new Date(new Date(e.occurredAt).getTime() + (e.durationSeconds ?? 1800) * 1000).toISOString();
      const zone = await tx<{ key: string; name: string }[]>`SELECT key, name FROM map_zones WHERE key = ${e.koth} AND kind = 'koth'`;
      await tx`
        INSERT INTO events (slug, title, type, description, starts_at, ends_at, published, zone_key, external_id)
        VALUES (${`koth-${e.id.slice(0, 8)}`}, ${`KOTH — ${zone[0]?.name ?? e.koth}`}, 'koth', 'Capture en cours.', ${e.occurredAt}, ${ends}, true, ${zone[0]?.key ?? null}, ${`koth:${e.id}`})
        ON CONFLICT (external_id) DO NOTHING`;
      return;
    }
    case "EVENT_START": {
      const zone = e.zone ? (await tx<{ key: string }[]>`SELECT key FROM map_zones WHERE key = ${e.zone}`)[0]?.key ?? null : null;
      const slug = `${e.title}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) + `-${e.eventId.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 12)}`;
      await tx`
        INSERT INTO events (slug, title, type, starts_at, published, zone_key, external_id)
        VALUES (${slug}, ${e.title}, ${e.type}, ${e.occurredAt}, true, ${zone}, ${e.eventId})
        ON CONFLICT (external_id) DO UPDATE SET starts_at = EXCLUDED.starts_at, published = true`;
      return;
    }
    case "EVENT_END": {
      const [ev] = await tx<{ id: string }[]>`SELECT id FROM events WHERE external_id = ${e.eventId}`;
      if (!ev) return;
      const uuids = e.participants.map((p) => p.uuid);
      const [{ empires }] = (await tx`
        SELECT count(DISTINCT m.empire_id)::int AS empires FROM minecraft_accounts ma JOIN empire_members m ON m.user_id = ma.user_id
        WHERE ma.player_uuid = ANY(${uuids}::uuid[])`) as unknown as [{ empires: number }];
      await tx`UPDATE events SET ends_at = ${e.occurredAt}, participants = ${uuids.length}, empires_count = ${empires} WHERE id = ${ev.id}`;
      // Influence de participation : seulement les comptes liés (anti-faux comptes), une fois par événement.
      const users = await tx<{ userId: string }[]>`SELECT DISTINCT user_id AS "userId" FROM minecraft_accounts WHERE player_uuid = ANY(${uuids}::uuid[])`;
      for (const u of users) await grantInfluence(tx as TxSql, { userId: u.userId, kind: "event_participation", key: `event:${ev.id}:${u.userId}` });
      return;
    }
    case "PLAYER_KILL": {
      await upsertPlayer(tx, e.killer.uuid, e.killer.username, e.server, e.occurredAt);
      await upsertPlayer(tx, e.victim.uuid, e.victim.username, e.server, e.occurredAt);
      await bumpSeasonStats(tx, seasonId, e.killer.uuid, { kills: 1 });
      await bumpSeasonStats(tx, seasonId, e.victim.uuid, { deaths: 1 });
      if (seasonId) {
        await tx`
          UPDATE factions f SET kills = kills + 1 FROM faction_members m
          WHERE m.faction_id = f.id AND m.player_uuid = ${e.killer.uuid} AND f.season_id = ${seasonId} AND f.disbanded_at IS NULL`;
      }
      return;
    }
    case "FACTION_CREATE": {
      if (!seasonId) return;
      await upsertPlayer(tx, e.leader.uuid, e.leader.username, e.server, e.occurredAt);
      const [f] = await tx<{ id: string }[]>`
        INSERT INTO factions (season_id, name, leader_uuid, created_at) VALUES (${seasonId}, ${e.faction}, ${e.leader.uuid}, ${e.occurredAt})
        ON CONFLICT DO NOTHING RETURNING id`;
      const id = f?.id ?? (await factionId(tx, seasonId, e.faction));
      if (id) {
        await tx`DELETE FROM faction_members WHERE player_uuid = ${e.leader.uuid}
                 AND faction_id IN (SELECT id FROM factions WHERE season_id = ${seasonId})`;
        await tx`INSERT INTO faction_members (faction_id, player_uuid, role) VALUES (${id}, ${e.leader.uuid}, 'LEADER')`;
      }
      return;
    }
    case "FACTION_DISBAND": {
      const id = await factionId(tx, seasonId, e.faction);
      if (!id) return;
      await tx`UPDATE factions SET disbanded_at = ${e.occurredAt} WHERE id = ${id}`;
      await tx`DELETE FROM faction_members WHERE faction_id = ${id}`;
      await tx`DELETE FROM claims WHERE faction_id = ${id}`;
      return;
    }
    case "FACTION_JOIN": {
      const id = await factionId(tx, seasonId, e.faction);
      if (!id || !seasonId) return;
      await upsertPlayer(tx, e.uuid, e.username, e.server, e.occurredAt);
      await tx`DELETE FROM faction_members WHERE player_uuid = ${e.uuid}
               AND faction_id IN (SELECT id FROM factions WHERE season_id = ${seasonId})`;
      await tx`INSERT INTO faction_members (faction_id, player_uuid, role) VALUES (${id}, ${e.uuid}, ${e.role})`;
      if (e.role === "LEADER") await tx`UPDATE factions SET leader_uuid = ${e.uuid} WHERE id = ${id}`;
      return;
    }
    case "FACTION_LEAVE": {
      const id = await factionId(tx, seasonId, e.faction);
      if (id) await tx`DELETE FROM faction_members WHERE faction_id = ${id} AND player_uuid = ${e.uuid}`;
      return;
    }
    case "FACTION_CLAIM": {
      const id = await factionId(tx, seasonId, e.faction);
      if (!id || !seasonId) return;
      await tx`
        INSERT INTO claims (faction_id, season_id, world, chunk_x, chunk_z, claimed_at)
        VALUES (${id}, ${seasonId}, ${e.world}, ${e.chunkX}, ${e.chunkZ}, ${e.occurredAt})
        ON CONFLICT (season_id, world, chunk_x, chunk_z) DO UPDATE SET faction_id = EXCLUDED.faction_id, claimed_at = EXCLUDED.claimed_at`;
      await tx`UPDATE factions SET claims_count = (SELECT count(*) FROM claims WHERE faction_id = ${id}) WHERE id = ${id}`;
      return;
    }
    case "FACTION_UNCLAIM": {
      const id = await factionId(tx, seasonId, e.faction);
      if (!id || !seasonId) return;
      await tx`DELETE FROM claims WHERE season_id = ${seasonId} AND world = ${e.world} AND chunk_x = ${e.chunkX} AND chunk_z = ${e.chunkZ} AND faction_id = ${id}`;
      await tx`UPDATE factions SET claims_count = (SELECT count(*) FROM claims WHERE faction_id = ${id}) WHERE id = ${id}`;
      return;
    }
    case "FACTION_SNAPSHOT": {
      const id = await factionId(tx, seasonId, e.faction);
      if (id) await tx`UPDATE factions SET power = ${e.power}, max_power = ${e.maxPower}, wealth = ${e.wealth} WHERE id = ${id}`;
      return;
    }
    case "KOTH_CAPTURE": {
      await upsertPlayer(tx, e.uuid, e.username, e.server, e.occurredAt);
      await bumpSeasonStats(tx, seasonId, e.uuid, { koth: 1 });
      if (e.faction) {
        const id = await factionId(tx, seasonId, e.faction);
        if (id) await tx`UPDATE factions SET koth_captures = koth_captures + 1 WHERE id = ${id}`;
      }
      return;
    }
    case "ECONOMY_TRANSACTION":
      await upsertPlayer(tx, e.uuid, e.username, e.server, e.occurredAt);
      await tx`UPDATE players SET balance = ${e.balanceAfter} WHERE uuid = ${e.uuid}`;
      return;
    case "PLAYER_RANK_CHANGE":
      await upsertPlayer(tx, e.uuid, e.username, e.server, e.occurredAt);
      await tx`UPDATE players SET rank = ${e.rank} WHERE uuid = ${e.uuid}`;
      return;
    case "SERVER_HEARTBEAT": {
      const latest = await tx`
        INSERT INTO server_status (server, online, max_players, tps, mspt, version, updated_at)
        VALUES (${e.server}, ${e.online}, ${e.maxPlayers}, ${e.tps}, ${e.mspt ?? null}, ${e.version}, ${e.occurredAt})
        ON CONFLICT (server) DO UPDATE SET online = EXCLUDED.online, max_players = EXCLUDED.max_players, tps = EXCLUDED.tps,
          mspt = EXCLUDED.mspt, version = EXCLUDED.version, updated_at = EXCLUDED.updated_at
        WHERE server_status.updated_at <= EXCLUDED.updated_at
        RETURNING server`;
      // Historique agrégé par tranche de 5 minutes (pic conservé) pour la page statut et les records.
      await tx`
        INSERT INTO server_status_history (server, bucket, online, tps, mspt)
        VALUES (${e.server}, to_timestamp(floor(extract(epoch FROM ${e.occurredAt}::timestamptz) / 300) * 300), ${e.online}, ${e.tps}, ${e.mspt ?? null})
        ON CONFLICT (server, bucket) DO UPDATE SET online = GREATEST(server_status_history.online, EXCLUDED.online),
          tps = LEAST(server_status_history.tps, EXCLUDED.tps), mspt = GREATEST(server_status_history.mspt, EXCLUDED.mspt)`;
      // Suivi du lag uniquement sur le heartbeat le plus récent (un heartbeat renvoyé en retard ne rouvre pas d'épisode).
      if (latest.length > 0 && e.mspt !== undefined) await trackLag(tx, e.server, e.mspt, e.tps, e.occurredAt, lag);
      return;
    }
  }
}

/**
 * Enregistre puis traite un lot d'événements. Idempotent : un événement déjà traité
 * (même `id`) est ignoré ; un événement en échec est retraité s'il est renvoyé. Chaque événement a sa propre transaction afin qu'une
 * erreur isolée ne bloque pas le reste du lot ; l'erreur est conservée pour rejouer.
 */
export async function ingestEvents(sql: Sql, events: BridgeEvent[], lag: LagThresholds = DEFAULT_LAG): Promise<IngestResult> {
  const result: IngestResult = { accepted: 0, duplicates: 0, failed: [] };
  // Ordre chronologique : un QUIT reçu dans le même lot qu'un JOIN est appliqué après.
  const sorted = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  for (const e of sorted) {
    try {
      const inserted = await sql.begin(async (tx) => {
        const rows = await tx`
          INSERT INTO bridge_events (id, server, type, payload, occurred_at)
          VALUES (${e.id}, ${e.server}, ${e.event}, ${tx.json(e as never)}, ${e.occurredAt})
          ON CONFLICT (id) DO UPDATE SET error = NULL
          WHERE bridge_events.processed_at IS NULL -- un événement en échec peut être renvoyé et retraité
          RETURNING id`;
        if (rows.length === 0) return false;
        await apply(tx, e, await activeSeasonId(tx), lag);
        await tx`UPDATE bridge_events SET processed_at = now() WHERE id = ${e.id}`;
        return true;
      });
      if (inserted) result.accepted++;
      else result.duplicates++;
    } catch (err) {
      const message = (err as Error).message.slice(0, 500);
      result.failed.push({ id: e.id, error: message });
      // Trace hors transaction pour diagnostic / rejeu manuel.
      await sql`
        INSERT INTO bridge_events (id, server, type, payload, occurred_at, error)
        VALUES (${e.id}, ${e.server}, ${e.event}, ${sql.json(e as never)}, ${e.occurredAt}, ${message})
        ON CONFLICT (id) DO UPDATE SET error = EXCLUDED.error`.catch(() => {});
    }
  }
  return result;
}
