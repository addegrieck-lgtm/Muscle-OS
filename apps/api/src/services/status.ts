import type { ServerStatus, ServiceStatus, Incident } from "@vaeloria/types";
import type { Sql } from "../db";
import type { TtlCache } from "../lib/cache";
import { pingMinecraft } from "../lib/minecraftPing";

/** Un heartbeat plus ancien que ce délai est considéré comme perdu. */
export const HEARTBEAT_STALE_MS = 90_000;

export interface StatusDeps {
  sql: Sql;
  cache: TtlCache;
  ping?: { host: string; port: number } | undefined;
  pinger?: typeof pingMinecraft;
}

async function maintenance(sql: Sql): Promise<boolean> {
  const [row] = await sql<{ value: unknown }[]>`SELECT value FROM site_settings WHERE key = 'maintenance'`;
  return row?.value === true;
}

export function getServerStatus(deps: StatusDeps): Promise<ServerStatus> {
  return deps.cache.wrap("status:server", 10_000, async () => {
    const checkedAt = new Date().toISOString();
    const empty: ServerStatus = { state: "unknown", online: null, maxPlayers: null, version: null, motd: null, latencyMs: null, source: "none", checkedAt };
    if (await maintenance(deps.sql)) return { ...empty, state: "maintenance" };

    // 1. Heartbeats du plugin (source la plus fiable, agrège tous les serveurs du réseau)
    const rows = await deps.sql<{ online: number; max: number; version: string | null; fresh: boolean }[]>`
      SELECT online, max_players AS max, version,
             updated_at > now() - make_interval(secs => ${HEARTBEAT_STALE_MS / 1000}) AS fresh
      FROM server_status`;
    const fresh = rows.filter((r) => r.fresh);
    if (fresh.length > 0) {
      return {
        ...empty,
        state: "online",
        online: fresh.reduce((s, r) => s + r.online, 0),
        maxPlayers: fresh.reduce((s, r) => s + r.max, 0),
        version: fresh[0]!.version,
        source: "bridge",
      };
    }

    // 2. Repli : Server List Ping effectué par l'API (jamais par le navigateur)
    if (deps.ping) {
      try {
        const r = await (deps.pinger ?? pingMinecraft)(deps.ping.host, deps.ping.port);
        return { ...empty, state: "online", online: r.online, maxPlayers: r.max, version: r.version, motd: r.motd, latencyMs: r.latencyMs, source: "ping" };
      } catch {
        return { ...empty, state: rows.length > 0 ? "offline" : "unknown", source: "ping" };
      }
    }
    return rows.length > 0 ? { ...empty, state: "offline", source: "bridge" } : empty;
  });
}

export async function getServices(deps: StatusDeps & { discordConfigured: boolean }): Promise<{ services: ServiceStatus[]; incidents: Incident[] }> {
  return deps.cache.wrap("status:services", 20_000, async () => {
    const t0 = Date.now();
    let dbOk = true;
    try {
      await deps.sql`SELECT 1`;
    } catch {
      dbOk = false;
    }
    const dbLatency = Date.now() - t0;
    const server = dbOk ? await getServerStatus(deps) : null;
    const servers = dbOk
      ? await deps.sql<{ server: string; fresh: boolean; tps: number | null }[]>`
          SELECT server, tps, updated_at > now() - make_interval(secs => ${HEARTBEAT_STALE_MS / 1000}) AS fresh FROM server_status`
      : [];
    const factions = servers.find((s) => s.server === "factions");
    const mcState = (s: ServerStatus | null): ServiceStatus["state"] =>
      !s || s.state === "unknown" ? "unknown" : s.state === "online" ? "operational" : s.state === "maintenance" ? "degraded" : "down";

    const services: ServiceStatus[] = [
      { id: "website", label: "Site web", state: "operational", latencyMs: null },
      { id: "api", label: "API", state: "operational", latencyMs: null },
      { id: "database", label: "Base de données", state: dbOk ? (dbLatency > 500 ? "degraded" : "operational") : "down", latencyMs: dbOk ? dbLatency : null },
      { id: "minecraft", label: "Réseau Minecraft", state: mcState(server), latencyMs: server?.latencyMs ?? null },
      {
        id: "factions",
        label: "Serveur Factions",
        state: !factions ? "unknown" : !factions.fresh ? "down" : (factions.tps ?? 20) < 15 ? "degraded" : "operational",
        latencyMs: null,
        ...(factions?.tps != null ? { detail: `${factions.tps.toFixed(1)} TPS` } : {}),
      },
      { id: "discord-bot", label: "Bot Discord", state: deps.discordConfigured ? "operational" : "unknown", latencyMs: null },
    ];
    const incidents = dbOk
      ? await deps.sql<Incident[]>`
          SELECT id, title, severity, status, body, started_at AS "startedAt", resolved_at AS "resolvedAt"
          FROM incidents WHERE resolved_at IS NULL OR resolved_at > now() - interval '30 days'
          ORDER BY started_at DESC LIMIT 20`
      : [];
    return { services, incidents: incidents.map((i) => ({ ...i, startedAt: iso(i.startedAt), resolvedAt: i.resolvedAt ? iso(i.resolvedAt) : null })) };
  });
}

export const iso = (d: string | Date) => (d instanceof Date ? d.toISOString() : new Date(d).toISOString());
