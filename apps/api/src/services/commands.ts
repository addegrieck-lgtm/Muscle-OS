import type { Sql } from "../db";

export interface QueuedCommand {
  id: string;
  playerUuid: string | null;
  /** Type d'ordre (GRANT_RANK, GIVE_KIT…). `command` peut être nul pour ADD_POINTS / SYNC_PLAYER. */
  action: string;
  command: string | null;
  requireOnline: boolean;
  retryCount: number;
}

/** Durée pendant laquelle une commande réclamée est réservée au serveur qui l'a prise. */
export const COMMAND_LEASE_SECONDS = 60;

export async function enqueueCommand(
  sql: Sql,
  input: {
    playerUuid: string | null;
    command: string | null;
    source: string;
    idempotencyKey: string;
    server?: string | null;
    requireOnline?: boolean;
    entitlementId?: string | null;
    deliveryId?: string | null;
    action?: string;
  },
): Promise<{ id: string; created: boolean }> {
  const [row] = await sql<{ id: string; created: boolean }[]>`
    WITH ins AS (
      INSERT INTO minecraft_commands (player_uuid, server, command, require_online, source, entitlement_id, delivery_id, action, idempotency_key)
      VALUES (${input.playerUuid}, ${input.server ?? null}, ${input.command}, ${input.requireOnline ?? false}, ${input.source},
              ${input.entitlementId ?? null}, ${input.deliveryId ?? null}, ${input.action ?? "COMMAND"}, ${input.idempotencyKey})
      ON CONFLICT (idempotency_key) DO NOTHING RETURNING id
    )
    SELECT id, true AS created FROM ins
    UNION ALL
    SELECT id, false AS created FROM minecraft_commands WHERE idempotency_key = ${input.idempotencyKey} AND NOT EXISTS (SELECT 1 FROM ins)`;
  return row!;
}

/**
 * Réserve jusqu'à `limit` commandes pour un serveur. Une commande SENT dont le bail a expiré
 * (plugin planté avant l'accusé) est de nouveau distribuée : rien n'est perdu.
 * SKIP LOCKED permet plusieurs serveurs/instances en parallèle sans double distribution.
 */
export async function claimCommands(sql: Sql, server: string, limit = 25): Promise<QueuedCommand[]> {
  // Les commandes ayant épuisé leurs tentatives passent en FAILED (visible dans l'admin).
  const exhausted = await sql<{ deliveryId: string | null }[]>`
    UPDATE minecraft_commands SET status = 'FAILED', error = coalesce(error, 'Nombre maximal de tentatives atteint')
    WHERE status = 'SENT' AND lease_until < now() AND retry_count >= max_retries
    RETURNING delivery_id AS "deliveryId"`;
  const rows = await claimRaw(sql, server, limit);
  await refreshDeliveries(sql, [...exhausted, ...rows].map((r) => r.deliveryId), "nombre maximal de tentatives atteint");
  return rows.map(({ deliveryId: _d, ...r }) => r);
}

async function claimRaw(sql: Sql, server: string, limit: number): Promise<(QueuedCommand & { deliveryId: string | null })[]> {
  return sql<(QueuedCommand & { deliveryId: string | null })[]>`
    UPDATE minecraft_commands c SET status = 'SENT', sent_at = now(),
      lease_until = now() + make_interval(secs => ${COMMAND_LEASE_SECONDS}), retry_count = c.retry_count + 1
    WHERE c.id IN (
      SELECT id FROM minecraft_commands
      WHERE (status = 'PENDING' OR (status = 'SENT' AND lease_until < now()))
        AND retry_count < max_retries
        AND (server IS NULL OR server = ${server})
      ORDER BY created_at
      LIMIT ${limit}
      FOR UPDATE SKIP LOCKED
    )
    RETURNING c.id, c.player_uuid AS "playerUuid", c.action, c.command, c.require_online AS "requireOnline",
              c.retry_count AS "retryCount", c.delivery_id AS "deliveryId"`;
}

export async function ackCommand(
  sql: Sql,
  id: string,
  ack: { status: "DELIVERED" | "FAILED" | "DEFERRED"; error?: string },
): Promise<"ok" | "not_found" | "already_final"> {
  const [cur] = await sql<{ status: string; deliveryId: string | null }[]>`SELECT status, delivery_id AS "deliveryId" FROM minecraft_commands WHERE id = ${id}`;
  if (!cur) return "not_found";
  if (cur.status === "DELIVERED" || cur.status === "CANCELLED") return "already_final"; // accusé dupliqué : sans effet
  if (ack.status === "DELIVERED") {
    await sql`UPDATE minecraft_commands SET status = 'DELIVERED', executed_at = now(), lease_until = NULL, error = NULL WHERE id = ${id}`;
  } else if (ack.status === "DEFERRED") {
    // Joueur hors ligne : retour en file sans consommer de tentative.
    await sql`UPDATE minecraft_commands SET status = 'PENDING', lease_until = NULL, retry_count = greatest(retry_count - 1, 0) WHERE id = ${id}`;
  } else {
    await sql`
      UPDATE minecraft_commands SET error = ${ack.error ?? "Erreur inconnue"}, lease_until = NULL,
        status = CASE WHEN retry_count >= max_retries THEN 'FAILED' ELSE 'PENDING' END
      WHERE id = ${id}`;
  }
  await refreshDeliveries(sql, [cur.deliveryId], ack.status === "FAILED" ? ack.error : undefined);
  return "ok";
}

/**
 * Recalcule le statut métier des livraisons à partir de leurs ordres Minecraft :
 * tous DELIVERED → DELIVERED ; un FAILED définitif → FAILED ; un SENT → PROCESSING ; sinon PENDING.
 * Chaque changement est journalisé dans delivery_logs.
 */
export async function refreshDeliveries(sql: Sql, ids: (string | null)[], detail?: string): Promise<void> {
  const unique = [...new Set(ids.filter((i): i is string => Boolean(i)))];
  if (unique.length === 0) return;
  const changed = await sql<{ id: string; status: string }[]>`
    WITH agg AS (
      SELECT d.id,
        CASE
          WHEN bool_and(c.status = 'DELIVERED') THEN 'DELIVERED'
          WHEN bool_or(c.status = 'FAILED') THEN 'FAILED'
          WHEN bool_or(c.status = 'SENT') OR bool_or(c.status = 'DELIVERED') THEN 'PROCESSING'
          ELSE 'PENDING'
        END AS next
      FROM deliveries d JOIN minecraft_commands c ON c.delivery_id = d.id
      WHERE d.id = ANY(${unique}::uuid[]) AND d.status <> 'CANCELLED' AND c.status <> 'CANCELLED'
      GROUP BY d.id
    )
    UPDATE deliveries d SET status = agg.next, updated_at = now(),
      delivered_at = CASE WHEN agg.next = 'DELIVERED' THEN now() ELSE d.delivered_at END
    FROM agg WHERE agg.id = d.id AND d.status <> agg.next
    RETURNING d.id, d.status`;
  for (const c of changed) {
    const message = { DELIVERED: "Livré en jeu", FAILED: `Échec : ${detail ?? "voir la file des commandes"}`, PROCESSING: "Pris en charge par le serveur", PENDING: "En attente (joueur hors ligne ou serveur indisponible)" }[c.status] ?? c.status;
    await sql`INSERT INTO delivery_logs (delivery_id, status, message) VALUES (${c.id}, ${c.status}, ${message})`;
    if (c.status === "DELIVERED") {
      await sql`INSERT INTO analytics_events (name, props) VALUES ('order_delivered', ${sql.json({ deliveryId: c.id })})`;
    }
  }
}
