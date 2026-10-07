import type { Sql } from "../db";

export interface QueuedCommand {
  id: string;
  playerUuid: string | null;
  command: string;
  requireOnline: boolean;
  retryCount: number;
}

/** Durée pendant laquelle une commande réclamée est réservée au serveur qui l'a prise. */
export const COMMAND_LEASE_SECONDS = 60;

export async function enqueueCommand(
  sql: Sql,
  input: { playerUuid: string | null; command: string; source: string; idempotencyKey: string; server?: string | null; requireOnline?: boolean; entitlementId?: string | null },
): Promise<{ id: string; created: boolean }> {
  const [row] = await sql<{ id: string; created: boolean }[]>`
    WITH ins AS (
      INSERT INTO minecraft_commands (player_uuid, server, command, require_online, source, entitlement_id, idempotency_key)
      VALUES (${input.playerUuid}, ${input.server ?? null}, ${input.command}, ${input.requireOnline ?? false}, ${input.source}, ${input.entitlementId ?? null}, ${input.idempotencyKey})
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
  await sql`
    UPDATE minecraft_commands SET status = 'FAILED', error = coalesce(error, 'Nombre maximal de tentatives atteint')
    WHERE status = 'SENT' AND lease_until < now() AND retry_count >= max_retries`;
  const rows = await sql<QueuedCommand[]>`
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
    RETURNING c.id, c.player_uuid AS "playerUuid", c.command, c.require_online AS "requireOnline", c.retry_count AS "retryCount"`;
  return rows;
}

export async function ackCommand(
  sql: Sql,
  id: string,
  ack: { status: "DELIVERED" | "FAILED" | "DEFERRED"; error?: string },
): Promise<"ok" | "not_found" | "already_final"> {
  const [cur] = await sql<{ status: string }[]>`SELECT status FROM minecraft_commands WHERE id = ${id}`;
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
  return "ok";
}
