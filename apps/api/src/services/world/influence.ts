/**
 * InfluenceService — l'influence se gagne par des actions utiles à VÆLORIA (recruter, voter,
 * participer…). Règles, points et plafonds sont en base (`influence_rules`), modifiables dans l'admin.
 *
 * Anti-faux comptes :
 *  - les actions faciles à automatiser exigent un compte Minecraft lié (preuve /link en jeu) ;
 *  - plafond quotidien par compte et par type ; actions uniques (une fois par compte) ;
 *  - clé d'idempotence : une même action ne rapporte jamais deux fois.
 */
import type { Tx } from "../../db";

export interface InfluenceGrant {
  userId: string;
  kind: string;
  /** Identifie l'action de façon unique (ex. `vote:<poll>:<user>`). */
  key: string;
  label?: string;
  /** Multiplicateur (ex. heures de jeu). */
  units?: number;
}

export async function grantInfluence(tx: Tx, g: InfluenceGrant): Promise<number> {
  const [rule] = await tx<{ label: string; points: number; dailyCap: number | null; once: boolean; linked: boolean }[]>`
    SELECT label, points, daily_cap AS "dailyCap", once_per_user AS once, requires_linked AS linked
    FROM influence_rules WHERE kind = ${g.kind} AND active`;
  if (!rule || rule.points === 0) return 0;

  // Sérialise les attributions d'un même compte (plafonds fiables même en concurrence).
  await tx`SELECT pg_advisory_xact_lock(hashtext(${`influence:${g.userId}`}))`;

  if (rule.linked) {
    const linked = await tx`SELECT 1 FROM minecraft_accounts WHERE user_id = ${g.userId} LIMIT 1`;
    if (linked.length === 0) return 0;
  }
  if (rule.once) {
    const done = await tx`SELECT 1 FROM influence_events WHERE user_id = ${g.userId} AND kind = ${g.kind} LIMIT 1`;
    if (done.length) return 0;
  }
  let units = Math.max(1, Math.floor(g.units ?? 1));
  if (rule.dailyCap !== null) {
    const [{ n }] = (await tx`
      SELECT count(*)::int AS n FROM influence_events
      WHERE user_id = ${g.userId} AND kind = ${g.kind} AND created_at >= date_trunc('day', now())`) as unknown as [{ n: number }];
    units = Math.min(units, rule.dailyCap - n);
    if (units <= 0) return 0;
  }
  const points = rule.points * units;
  const [member] = await tx<{ empireId: string }[]>`SELECT empire_id AS "empireId" FROM empire_members WHERE user_id = ${g.userId}`;
  const inserted = await tx`
    INSERT INTO influence_events (user_id, empire_id, kind, points, label, idempotency_key)
    VALUES (${g.userId}, ${member?.empireId ?? null}, ${g.kind}, ${points}, ${g.label ?? rule.label}, ${g.key})
    ON CONFLICT (idempotency_key) DO NOTHING RETURNING id`;
  if (inserted.length === 0) return 0;
  await tx`UPDATE users SET influence = influence + ${points} WHERE id = ${g.userId}`;
  if (member) await tx`UPDATE empires SET influence = influence + ${points} WHERE id = ${member.empireId}`;
  return points;
}

/** Recalcule les caches d'influence depuis le grand livre (outil admin, rejouable). */
export async function rebuildInfluence(tx: Tx): Promise<void> {
  await tx`UPDATE users u SET influence = coalesce((SELECT sum(points) FROM influence_events e WHERE e.user_id = u.id), 0)`;
  await tx`UPDATE empires m SET influence = coalesce((SELECT sum(points) FROM influence_events e WHERE e.empire_id = m.id), 0)`;
}
