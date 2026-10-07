import type { BridgeEvent } from "@vaeloria/types";
import type { Sql, Tx as TxSql } from "../db";

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

async function factionId(tx: Tx, seasonId: string | null, name: string): Promise<string | null> {
  if (!seasonId) return null;
  const [f] = await tx<{ id: string }[]>`
    SELECT id FROM factions WHERE season_id = ${seasonId} AND lower(name) = lower(${name}) AND disbanded_at IS NULL`;
  return f?.id ?? null;
}

/** Applique un événement aux tables métier. Doit être appelé dans une transaction. */
async function apply(tx: Tx, e: BridgeEvent, seasonId: string | null): Promise<void> {
  switch (e.event) {
    case "PLAYER_JOIN":
      await upsertPlayer(tx, e.uuid, e.username, e.server, e.occurredAt);
      await tx`UPDATE players SET online = true WHERE uuid = ${e.uuid}`;
      return;
    case "PLAYER_QUIT":
      await upsertPlayer(tx, e.uuid, e.username, e.server, e.occurredAt);
      await tx`UPDATE players SET online = false, playtime_seconds = playtime_seconds + ${e.sessionSeconds} WHERE uuid = ${e.uuid}`;
      await bumpSeasonStats(tx, seasonId, e.uuid, { playtime: e.sessionSeconds });
      return;
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
      await tx`
        INSERT INTO server_status (server, online, max_players, tps, mspt, version, updated_at)
        VALUES (${e.server}, ${e.online}, ${e.maxPlayers}, ${e.tps}, ${e.mspt ?? null}, ${e.version}, ${e.occurredAt})
        ON CONFLICT (server) DO UPDATE SET online = EXCLUDED.online, max_players = EXCLUDED.max_players, tps = EXCLUDED.tps,
          mspt = EXCLUDED.mspt, version = EXCLUDED.version, updated_at = EXCLUDED.updated_at
        WHERE server_status.updated_at <= EXCLUDED.updated_at`;
      // Historique agrégé par tranche de 5 minutes (pic conservé) pour la page statut et les records.
      await tx`
        INSERT INTO server_status_history (server, bucket, online, tps)
        VALUES (${e.server}, to_timestamp(floor(extract(epoch FROM ${e.occurredAt}::timestamptz) / 300) * 300), ${e.online}, ${e.tps})
        ON CONFLICT (server, bucket) DO UPDATE SET online = GREATEST(server_status_history.online, EXCLUDED.online), tps = LEAST(server_status_history.tps, EXCLUDED.tps)`;
      return;
    }
  }
}

/**
 * Enregistre puis traite un lot d'événements. Idempotent : un événement déjà traité
 * (même `id`) est ignoré ; un événement en échec est retraité s'il est renvoyé. Chaque événement a sa propre transaction afin qu'une
 * erreur isolée ne bloque pas le reste du lot ; l'erreur est conservée pour rejouer.
 */
export async function ingestEvents(sql: Sql, events: BridgeEvent[]): Promise<IngestResult> {
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
        await apply(tx, e, await activeSeasonId(tx));
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
