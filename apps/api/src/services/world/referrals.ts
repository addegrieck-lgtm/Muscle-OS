/**
 * Parrainage : vaeloria.fr/invite/CODE.
 * clic (dédoublonné par visiteur et par jour) → inscription (attribution) → qualification
 * quand la recrue lie un compte Minecraft Java (un compte Minecraft ne qualifie qu'une seule fois).
 * L'influence n'est versée qu'à la qualification : créer des comptes Discord vides ne rapporte rien.
 */
import { createHash } from "node:crypto";
import type { Sql, Tx } from "../../db";
import { grantInfluence } from "./influence";

/** Au-delà, les attributions du jour sont refusées (parrain suspect) — à ajuster dans le code si besoin. */
export const MAX_REFERRALS_PER_DAY = 25;

export async function recordClick(sql: Sql, code: string, visitorKey: string): Promise<boolean> {
  const valid = await sql`SELECT 1 FROM users WHERE invite_code = ${code}`;
  if (!valid.length) return false;
  const visitorHash = createHash("sha256").update(`${code}:${visitorKey}`).digest("hex").slice(0, 32);
  const rows = await sql`INSERT INTO referral_clicks (code, visitor_hash) VALUES (${code}, ${visitorHash}) ON CONFLICT DO NOTHING RETURNING id`;
  if (rows.length) await sql`INSERT INTO analytics_events (name, props) VALUES ('referral_click', ${sql.json({ code })})`;
  return true;
}

export async function attributeReferral(tx: Tx, referredUserId: string, rawCode: string | null | undefined): Promise<"attributed" | "ignored" | "rejected"> {
  const code = (rawCode ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9]{6,12}$/.test(code)) return "ignored";
  const [referrer] = await tx<{ id: string }[]>`SELECT id FROM users WHERE invite_code = ${code}`;
  if (!referrer || referrer.id === referredUserId) return "ignored";
  const [{ today }] = (await tx`SELECT count(*)::int AS today FROM user_referrals WHERE referrer_user_id = ${referrer.id} AND created_at >= date_trunc('day', now())`) as unknown as [{ today: number }];
  const status = today >= MAX_REFERRALS_PER_DAY ? "rejected" : "pending";
  const rows = await tx`
    INSERT INTO user_referrals (referred_user_id, referrer_user_id, code, status, reject_reason)
    VALUES (${referredUserId}, ${referrer.id}, ${code}, ${status}, ${status === "rejected" ? "Trop d'inscriptions le même jour" : null})
    ON CONFLICT DO NOTHING RETURNING referred_user_id`;
  if (!rows.length) return "ignored";
  await tx`INSERT INTO analytics_events (name, props) VALUES ('referral_register', ${tx.json({ code, status })})`;
  return status === "rejected" ? "rejected" : "attributed";
}

/** Appelé quand la recrue lie son compte Minecraft : preuve d'un vrai compte Java. */
export async function qualifyReferral(tx: Tx, referredUserId: string, playerUuid: string): Promise<boolean> {
  // Un même compte Minecraft ne peut qualifier qu'un parrainage, même s'il change de compte VÆLORIA
  // (contrainte d'unicité sur qualified_player_uuid).
  const already = await tx`SELECT 1 FROM user_referrals WHERE qualified_player_uuid = ${playerUuid}`;
  if (already.length) return false;
  const rows = await tx<{ referrer: string }[]>`
    UPDATE user_referrals SET status = 'qualified', qualified_at = now(), qualified_player_uuid = ${playerUuid}
    WHERE referred_user_id = ${referredUserId} AND status = 'pending'
    RETURNING referrer_user_id AS referrer`;
  if (!rows[0]) return false;
  await grantInfluence(tx, { userId: rows[0].referrer, kind: "referral_qualified", key: `referral:${referredUserId}`, label: "Recrue qualifiée" });
  return true;
}

export async function referralStats(sql: Sql, userId: string) {
  const [r] = await sql<{ code: string | null; clicks: number; registered: number; qualified: number }[]>`
    SELECT u.invite_code AS code,
           (SELECT count(*)::int FROM referral_clicks c WHERE c.code = u.invite_code) AS clicks,
           (SELECT count(*)::int FROM user_referrals r WHERE r.referrer_user_id = u.id AND r.status <> 'rejected') AS registered,
           (SELECT count(*)::int FROM user_referrals r WHERE r.referrer_user_id = u.id AND r.status = 'qualified') AS qualified
    FROM users u WHERE u.id = ${userId}`;
  return r ?? { code: null, clicks: 0, registered: 0, qualified: 0 };
}
