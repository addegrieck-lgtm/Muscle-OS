import type { Sql, Tx } from "../../db";
import { publicNameSql, usernameSql, randomCode, setting, type Db } from "./common";
import { grantInfluence } from "./influence";

export interface FounderStats {
  count: number;
  cap: number;
  open: boolean;
  milestones: { threshold: number; title: string; description: string; reward: string | null; reached: boolean; reveal: string | null }[];
}

/**
 * Attribue un numéro de fondateur (sans trou, dans la limite configurée) et un code d'invitation.
 * Idempotent : un compte n'a qu'un numéro.
 */
export async function assignFounder(tx: Tx, userId: string): Promise<number | null> {
  const [existing] = await tx<{ number: number }[]>`SELECT number FROM founders WHERE user_id = ${userId}`;
  await ensureInviteCode(tx, userId);
  if (existing) return existing.number;
  const [open, cap] = await Promise.all([setting(tx, "founders.open", true), setting(tx, "founders.cap", 3000)]);
  if (!open) return null;
  // Verrou de ligne sur le compteur : numéros séquentiels et sans trou, même en concurrence.
  const [counter] = await tx<{ last: number }[]>`SELECT last FROM founder_counter FOR UPDATE`;
  if (counter!.last >= Number(cap)) return null;
  const number = counter!.last + 1;
  await tx`UPDATE founder_counter SET last = ${number}`;
  await tx`INSERT INTO founders (number, user_id) VALUES (${number}, ${userId})`;
  await tx`INSERT INTO analytics_events (name, props) VALUES ('founder_join', ${tx.json({ number })})`;
  await grantInfluence(tx, { userId, kind: "founder_join", key: `founder:${userId}` });
  return number;
}

export async function ensureInviteCode(tx: Tx, userId: string): Promise<string> {
  const [u] = await tx<{ code: string | null }[]>`SELECT invite_code AS code FROM users WHERE id = ${userId}`;
  if (u?.code) return u.code;
  for (let i = 0; i < 5; i++) {
    const code = randomCode(7);
    const rows = await tx`UPDATE users SET invite_code = ${code} WHERE id = ${userId} AND invite_code IS NULL
                          AND NOT EXISTS (SELECT 1 FROM users WHERE invite_code = ${code}) RETURNING id`;
    if (rows.length) return code;
  }
  throw new Error("Impossible de générer un code d'invitation");
}

export async function founderStats(db: Db): Promise<FounderStats> {
  const [cap, open, counter, milestones] = await Promise.all([
    setting(db, "founders.cap", 3000),
    setting(db, "founders.open", true),
    db<{ last: number }[]>`SELECT last FROM founder_counter`,
    db<{ threshold: number; title: string; description: string; reward: string | null; reveal: string | null }[]>`
      SELECT threshold, title, description, reward, reveal FROM founder_milestones ORDER BY threshold`,
  ]);
  const count = counter[0]?.last ?? 0;
  return {
    count,
    cap: Number(cap),
    open: Boolean(open),
    // Le contenu « révélé » n'est envoyé qu'une fois le palier atteint.
    milestones: milestones.map((m) => ({ ...m, reached: count >= m.threshold, reveal: count >= m.threshold ? m.reveal : null })),
  };
}

export type FounderSort = "number" | "recruiters" | "influence";

export async function listFounders(sql: Sql, sort: FounderSort, page = 1, pageSize = 50) {
  const order = { number: sql`f.number ASC`, recruiters: sql`invites DESC, f.number ASC`, influence: sql`u.influence DESC, f.number ASC` }[sort];
  const rows = await sql<{ number: number; name: string; username: string | null; empire: string | null; empireSlug: string | null; invites: number; influence: number; total: number }[]>`
    SELECT f.number, ${publicNameSql(sql)} AS name, ${usernameSql(sql)} AS username, e.name AS empire, e.slug AS "empireSlug",
           (SELECT count(*)::int FROM user_referrals r WHERE r.referrer_user_id = u.id AND r.status = 'qualified') AS invites,
           u.influence, count(*) OVER ()::int AS total
    FROM founders f JOIN users u ON u.id = f.user_id
    LEFT JOIN empire_members m ON m.user_id = u.id LEFT JOIN empires e ON e.id = m.empire_id AND e.status = 'active'
    ORDER BY ${order} LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`;
  return { items: rows.map(({ total: _t, ...r }) => r), total: rows[0]?.total ?? 0, page, pageSize };
}
