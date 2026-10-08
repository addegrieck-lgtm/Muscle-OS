/**
 * Points boutique, grades et livraisons. Toutes les fonctions prennent une transaction
 * et sont idempotentes : les rejouer (webhook en double, reprise après panne) ne change rien.
 */
import type { PointsEntry, RankProgress } from "@vaeloria/types";
import type { Sql, Tx } from "../../db";
import { enqueueCommand } from "../commands";
import { loadRanks } from "./catalog";
import { rankProgress } from "./pricing";

type Db = Sql | Tx;
const asSql = (db: Db) => db as unknown as Sql;

// ───────────── Points ─────────────

export interface PointsMovement {
  playerUuid: string;
  delta: number;
  reason: PointsEntry["reason"];
  label: string;
  idempotencyKey: string;
  orderId?: string | null;
  orderItemId?: string | null;
  refundId?: string | null;
  actor?: string | null;
}

/** Ajoute (ou retire) des points. Retourne null si ce mouvement a déjà été enregistré. */
export async function movePoints(tx: Tx, m: PointsMovement): Promise<{ before: number; after: number } | null> {
  if (m.delta === 0) return null;
  await tx`INSERT INTO shop_points (player_uuid) VALUES (${m.playerUuid}) ON CONFLICT DO NOTHING`;
  const [row] = await tx<{ balance: number }[]>`SELECT balance FROM shop_points WHERE player_uuid = ${m.playerUuid} FOR UPDATE`;
  const before = row!.balance;
  const after = before + m.delta;
  const inserted = await tx`
    INSERT INTO point_transactions (player_uuid, delta, balance_after, reason, label, order_id, order_item_id, refund_id, actor, idempotency_key)
    VALUES (${m.playerUuid}, ${m.delta}, ${after}, ${m.reason}, ${m.label}, ${m.orderId ?? null}, ${m.orderItemId ?? null},
            ${m.refundId ?? null}, ${m.actor ?? null}, ${m.idempotencyKey})
    ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`;
  if (inserted.length === 0) return null;
  await tx`
    UPDATE shop_points SET balance = ${after}, updated_at = now(),
      lifetime_earned = lifetime_earned + ${Math.max(0, m.delta)}
    WHERE player_uuid = ${m.playerUuid}`;
  if (m.delta > 0) {
    await tx`INSERT INTO analytics_events (name, props) VALUES ('points_earned', ${tx.json({ player: m.playerUuid, points: m.delta, reason: m.reason })})`;
  }
  return { before, after };
}

export async function getBalance(db: Db, playerUuid: string): Promise<number> {
  const [row] = await db<{ balance: number }[]>`SELECT balance FROM shop_points WHERE player_uuid = ${playerUuid}`;
  return row?.balance ?? 0;
}

export async function getProgress(db: Db, playerUuid: string): Promise<RankProgress> {
  const [balance, ranks] = await Promise.all([getBalance(db, playerUuid), loadRanks(db)]);
  return rankProgress(Math.max(0, balance), ranks);
}

export async function pointsHistory(db: Db, playerUuid: string, limit = 100): Promise<PointsEntry[]> {
  const rows = await db<(Omit<PointsEntry, "createdAt"> & { createdAt: Date })[]>`
    SELECT t.id, t.delta, t.balance_after AS "balanceAfter", t.reason, t.label, o.public_id AS "orderPublicId", t.created_at AS "createdAt"
    FROM point_transactions t LEFT JOIN orders o ON o.id = t.order_id
    WHERE t.player_uuid = ${playerUuid} ORDER BY t.created_at DESC, t.id DESC LIMIT ${limit}`;
  return rows.map((r) => ({ ...r, id: Number(r.id), createdAt: r.createdAt.toISOString() }));
}

// ───────────── Livraisons ─────────────

export interface DeliveryTemplate {
  action: string;
  command: string | null;
  requireOnline: boolean;
}

export async function productTemplates(db: Db, productId: string): Promise<DeliveryTemplate[]> {
  return db<DeliveryTemplate[]>`
    SELECT action, command, require_online AS "requireOnline" FROM product_deliveries WHERE product_id = ${productId} ORDER BY position`;
}

export function renderCommand(template: string | null, vars: { uuid: string; username: string; quantity: number }): string | null {
  if (template === null) return null;
  return template.replaceAll("{uuid}", vars.uuid).replaceAll("{username}", vars.username).replaceAll("{quantity}", String(vars.quantity));
}

/**
 * Crée une livraison et ses ordres Minecraft. La clé d'idempotence garantit qu'une même
 * livraison n'existe qu'une fois, quel que soit le nombre de rejeux.
 */
export async function createDelivery(
  tx: Tx,
  d: {
    playerUuid: string;
    username: string;
    label: string;
    idempotencyKey: string;
    templates: DeliveryTemplate[];
    quantity?: number;
    orderId?: string | null;
    orderItemId?: string | null;
    entitlementId?: string | null;
    rankKey?: string | null;
  },
): Promise<string | null> {
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO deliveries (player_uuid, order_id, order_item_id, entitlement_id, rank_key, label, idempotency_key, status)
    VALUES (${d.playerUuid}, ${d.orderId ?? null}, ${d.orderItemId ?? null}, ${d.entitlementId ?? null}, ${d.rankKey ?? null},
            ${d.label}, ${d.idempotencyKey}, ${d.templates.length ? "PENDING" : "FAILED"})
    ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`;
  if (!row) return null;
  if (d.templates.length === 0) {
    // Produit mal configuré : la livraison est visible en échec dans l'admin au lieu d'être perdue.
    await tx`INSERT INTO delivery_logs (delivery_id, status, message) VALUES (${row.id}, 'FAILED', 'Aucune action de livraison configurée pour ce produit')`;
    return row.id;
  }
  await tx`INSERT INTO delivery_logs (delivery_id, status, message) VALUES (${row.id}, 'PENDING', 'Livraison créée, en attente du serveur')`;
  for (const [n, t] of d.templates.entries()) {
    await enqueueCommand(asSql(tx), {
      playerUuid: d.playerUuid,
      action: t.action,
      command: renderCommand(t.command, { uuid: d.playerUuid, username: d.username, quantity: d.quantity ?? 1 }),
      requireOnline: t.requireOnline,
      source: d.orderId ? "shop" : "reward",
      entitlementId: d.entitlementId ?? null,
      deliveryId: row.id,
      idempotencyKey: `delivery:${row.id}:${n}`,
    });
  }
  return row.id;
}

/** Annule les livraisons pas encore prises en charge (remboursement). Le déjà-livré reste intact. */
export async function cancelPendingDeliveries(tx: Tx, orderId: string, reason: string): Promise<number> {
  const rows = await tx<{ id: string }[]>`
    UPDATE deliveries SET status = 'CANCELLED', updated_at = now() WHERE order_id = ${orderId} AND status = 'PENDING' RETURNING id`;
  for (const r of rows) {
    await tx`UPDATE minecraft_commands SET status = 'CANCELLED', lease_until = NULL WHERE delivery_id = ${r.id} AND status = 'PENDING'`;
    await tx`INSERT INTO delivery_logs (delivery_id, status, message) VALUES (${r.id}, 'CANCELLED', ${reason})`;
  }
  return rows.length;
}

// ───────────── Grades ─────────────

/** Débloque un grade (une seule fois par joueur) et livre son contenu (produit associé au grade). */
export async function unlockRank(
  tx: Tx,
  p: { playerUuid: string; username: string; rankKey: string; source: "points" | "purchase" | "admin"; orderId?: string | null },
): Promise<boolean> {
  await tx`INSERT INTO players (uuid, username) VALUES (${p.playerUuid}, ${p.username}) ON CONFLICT DO NOTHING`;
  const inserted = await tx<{ name: string; productId: string | null }[]>`
    WITH ins AS (
      INSERT INTO player_ranks (player_uuid, rank_key, source, order_id)
      VALUES (${p.playerUuid}, ${p.rankKey}, ${p.source}, ${p.orderId ?? null})
      ON CONFLICT DO NOTHING RETURNING rank_key
    )
    SELECT r.name, r.product_id AS "productId" FROM ins JOIN rank_thresholds r ON r.key = ins.rank_key`;
  const rank = inserted[0];
  if (!rank) return false;
  const templates = rank.productId ? await productTemplates(tx, rank.productId) : [];
  await createDelivery(tx, {
    playerUuid: p.playerUuid,
    username: p.username,
    label: `Grade ${rank.name}`,
    idempotencyKey: `rank:${p.playerUuid}:${p.rankKey}`,
    templates,
    orderId: p.orderId ?? null,
    rankKey: p.rankKey,
  });
  await tx`UPDATE players SET rank = ${rank.name} WHERE uuid = ${p.playerUuid}`;
  await tx`INSERT INTO analytics_events (name, props) VALUES ('rank_unlocked', ${tx.json({ player: p.playerUuid, rank: p.rankKey, source: p.source })})`;
  await tx`INSERT INTO audit_logs (actor_type, action, target_type, target_id, metadata)
           VALUES ('system', 'rank.unlocked', 'player', ${p.playerUuid}, ${tx.json({ rank: p.rankKey, source: p.source })})`;
  return true;
}

/**
 * Attribue tous les grades atteints par le solde actuel et pas encore détenus, dans l'ordre croissant.
 * Rejouable : utilisé après chaque crédit de points et par « Recalculer les grades » (admin).
 */
export async function syncRanks(tx: Tx, playerUuid: string, username: string, orderId: string | null = null): Promise<string[]> {
  const balance = await getBalance(tx, playerUuid);
  const eligible = await tx<{ key: string }[]>`
    SELECT r.key FROM rank_thresholds r
    WHERE r.active AND r.min_points > 0 AND r.min_points <= ${balance}
      AND NOT EXISTS (SELECT 1 FROM player_ranks pr WHERE pr.player_uuid = ${playerUuid} AND pr.rank_key = r.key)
    ORDER BY r.min_points`;
  const unlocked: string[] = [];
  for (const r of eligible) {
    if (await unlockRank(tx, { playerUuid, username, rankKey: r.key, source: "points", orderId })) unlocked.push(r.key);
  }
  return unlocked;
}

/** Après une baisse de solde : les grades dont le seuil n'est plus atteint passent « à examiner », jamais retirés d'office. */
export async function flagRanksForReview(tx: Tx, playerUuid: string): Promise<string[]> {
  const balance = await getBalance(tx, playerUuid);
  const rows = await tx<{ rank_key: string }[]>`
    UPDATE player_ranks pr SET status = 'review' FROM rank_thresholds r
    WHERE pr.rank_key = r.key AND pr.player_uuid = ${playerUuid} AND pr.status = 'active' AND r.min_points > ${balance}
    RETURNING pr.rank_key`;
  for (const r of rows) {
    await tx`INSERT INTO audit_logs (actor_type, action, target_type, target_id, metadata)
             VALUES ('system', 'rank.review_required', 'player', ${playerUuid}, ${tx.json({ rank: r.rank_key, balance })})`;
  }
  return rows.map((r) => r.rank_key);
}
