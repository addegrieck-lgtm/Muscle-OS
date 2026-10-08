import type { Sql, Tx as TxSql } from "../db";

type Tx = Sql | TxSql;

/** Seuils de l'alerte de lag (configurables par l'environnement, voir env.ts). */
export interface LagThresholds {
  /** MSPT à partir duquel le tick est considéré trop lent. */
  alertMspt: number;
  /** Durée minimale du lag avant d'ouvrir une alerte. */
  sustainMinutes: number;
}

export const DEFAULT_LAG: LagThresholds = { alertMspt: 40, sustainMinutes: 3 };

/** Hystérésis : l'épisode ne se termine que lorsque le MSPT redescend nettement sous le seuil. */
const clearMspt = (t: LagThresholds) => t.alertMspt * 0.75;

/**
 * Suit l'état de lag d'un serveur à chaque heartbeat (dans la transaction d'ingestion).
 * - MSPT ≥ seuil : début d'épisode mémorisé ; au-delà de la durée minimale, une alerte est ouverte (ou son pic mis à jour).
 * - MSPT < 75 % du seuil : l'épisode et l'éventuelle alerte sont clos.
 * - Entre les deux : rien ne change (évite d'ouvrir/fermer en boucle autour du seuil).
 */
export async function trackLag(tx: Tx, server: string, mspt: number, tps: number, at: string, t: LagThresholds): Promise<void> {
  if (mspt >= t.alertMspt) {
    const [s] = await tx<{ lagSince: Date; sustained: boolean }[]>`
      UPDATE server_status SET lag_since = coalesce(lag_since, ${at}::timestamptz) WHERE server = ${server}
      RETURNING lag_since AS "lagSince", lag_since <= ${at}::timestamptz - make_interval(secs => ${t.sustainMinutes * 60}) AS sustained`;
    if (!s?.sustained) return;
    await tx`
      INSERT INTO server_alerts (server, started_at, peak_mspt, min_tps) VALUES (${server}, ${s.lagSince}, ${mspt}, ${tps})
      ON CONFLICT (server) WHERE resolved_at IS NULL DO UPDATE
        SET peak_mspt = GREATEST(server_alerts.peak_mspt, EXCLUDED.peak_mspt), min_tps = LEAST(server_alerts.min_tps, EXCLUDED.min_tps)`;
  } else if (mspt < clearMspt(t)) {
    await tx`UPDATE server_status SET lag_since = NULL WHERE server = ${server} AND lag_since IS NOT NULL`;
    await tx`UPDATE server_alerts SET resolved_at = ${at} WHERE server = ${server} AND resolved_at IS NULL`;
  }
}

type DueAlert = {
  id: string; server: string; startedAt: Date; resolvedAt: Date | null;
  peakMspt: number; minTps: number | null; opening: boolean;
};

const fmtDuration = (ms: number) => {
  const min = Math.max(1, Math.round(ms / 60_000));
  return min < 60 ? `${min} min` : `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
};

export function alertMessage(a: DueAlert, now = new Date()): string {
  const peak = `pic ${a.peakMspt} ms/tick${a.minTps !== null ? `, TPS min ${a.minTps}` : ""}`;
  if (a.resolvedAt) {
    return `✅ **${a.server}** — lag terminé après ${fmtDuration(a.resolvedAt.getTime() - a.startedAt.getTime())} (${peak}).`;
  }
  return `⚠️ **${a.server}** — MSPT élevé depuis ${fmtDuration(now.getTime() - a.startedAt.getTime())} (${peak}). `
    + "Lancer `/spark profiler` en jeu pour trouver la cause (voir docs/MINECRAFT_PERFORMANCE.md).";
}

/**
 * Envoie sur Discord les ouvertures et résolutions d'alertes pas encore annoncées.
 * Les alertes sont réservées avant l'envoi (deux requêtes simultanées n'envoient pas deux fois) ;
 * en cas d'échec réseau la réservation est annulée et l'envoi sera retenté au prochain heartbeat.
 * Une alerte vieille de plus d'une heure est marquée sans être envoyée (pas de rafale après une coupure).
 */
export async function notifyServerAlerts(sql: Sql, webhookUrl: string | undefined, fetchFn: typeof fetch = fetch): Promise<number> {
  if (!webhookUrl) return 0;
  const due = await sql<DueAlert[]>`
    WITH due AS (
      SELECT id, notified_at IS NULL AS opening FROM server_alerts
      WHERE notified_at IS NULL OR (resolved_at IS NOT NULL AND resolved_notified_at IS NULL)
      FOR UPDATE SKIP LOCKED
    )
    UPDATE server_alerts a SET notified_at = coalesce(a.notified_at, now()),
      resolved_notified_at = CASE WHEN a.resolved_at IS NOT NULL THEN now() END
    FROM due WHERE a.id = due.id
    RETURNING a.id, a.server, a.started_at AS "startedAt", a.resolved_at AS "resolvedAt",
      a.peak_mspt AS "peakMspt", a.min_tps AS "minTps", due.opening`;
  let sent = 0;
  for (const a of due) {
    const eventAt = a.resolvedAt ?? a.startedAt;
    if (Date.now() - eventAt.getTime() > 60 * 60_000) continue;
    try {
      const res = await fetchFn(webhookUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ content: alertMessage(a), allowed_mentions: { parse: [] } }),
        signal: AbortSignal.timeout(5_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      sent++;
    } catch {
      await sql`
        UPDATE server_alerts SET notified_at = CASE WHEN ${a.opening} THEN NULL ELSE notified_at END, resolved_notified_at = NULL
        WHERE id = ${a.id}`;
    }
  }
  return sent;
}
