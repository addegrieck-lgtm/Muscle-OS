import type { Sql, Tx } from "../../db";
import { publicNameSql, randomCode, setting, slugify, type Db } from "./common";
import { grantInfluence } from "./influence";

import { CRESTS, EMPIRE_COLORS } from "@vaeloria/types";

// Blasons et couleurs autorisés : définis dans @vaeloria/types (partagés avec le site).
export { CRESTS, EMPIRE_COLORS };
const RESERVED = /(vaeloria|admin|staff|moderat|mojang|minecraft|officiel)/i;

export class EmpireError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export interface EmpireInput {
  name: string;
  tag: string;
  motto: string;
  color: string;
  crest: string;
}

export function validateEmpire(i: EmpireInput): EmpireInput {
  const name = i.name.trim().replace(/\s+/g, " ");
  const tag = i.tag.trim().toUpperCase();
  if (!/^[\p{L}0-9' -]{3,24}$/u.test(name)) throw new EmpireError("invalid_name", "Nom : 3 à 24 caractères (lettres, chiffres, espaces, apostrophes, tirets).");
  if (!/^[A-Z0-9]{2,5}$/.test(tag)) throw new EmpireError("invalid_tag", "Tag : 2 à 5 lettres ou chiffres.");
  if (RESERVED.test(name) || RESERVED.test(tag)) throw new EmpireError("reserved", "Ce nom est réservé.");
  if (!(EMPIRE_COLORS as readonly string[]).includes(i.color.toLowerCase())) throw new EmpireError("invalid_color", "Couleur non disponible.");
  if (!(CRESTS as readonly string[]).includes(i.crest)) throw new EmpireError("invalid_crest", "Blason non disponible.");
  return { name, tag, motto: i.motto.trim().slice(0, 80), color: i.color.toLowerCase(), crest: i.crest };
}

export async function createEmpire(sql: Sql, userId: string, input: EmpireInput): Promise<{ slug: string }> {
  const v = validateEmpire(input);
  return sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`empire-user:${userId}`}))`;
    const member = await tx`SELECT 1 FROM empire_members WHERE user_id = ${userId}`;
    if (member.length) throw new EmpireError("already_member", "Tu fais déjà partie d'un empire. Quitte-le avant d'en fonder un autre.");
    const taken = await tx<{ name: boolean; tag: boolean }[]>`
      SELECT bool_or(lower(name) = lower(${v.name})) AS name, bool_or(tag = ${v.tag}) AS tag FROM empires WHERE status <> 'disbanded'`;
    if (taken[0]?.name) throw new EmpireError("name_taken", "Ce nom d'empire est déjà pris.");
    if (taken[0]?.tag) throw new EmpireError("tag_taken", "Ce tag est déjà pris.");
    let slug = slugify(v.name) || v.tag.toLowerCase();
    if ((await tx`SELECT 1 FROM empires WHERE slug = ${slug}`).length) slug = `${slug}-${v.tag.toLowerCase()}`;
    const [e] = await tx<{ id: string }[]>`
      INSERT INTO empires (slug, name, tag, motto, color, crest, owner_user_id, invite_code)
      VALUES (${slug}, ${v.name}, ${v.tag}, ${v.motto}, ${v.color}, ${v.crest}, ${userId}, ${randomCode(8)})
      RETURNING id`;
    await tx`INSERT INTO empire_members (user_id, empire_id, role) VALUES (${userId}, ${e!.id}, 'leader')`;
    await tx`INSERT INTO analytics_events (name, props) VALUES ('empire_create', ${tx.json({ slug })})`;
    await tx`INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id) VALUES ('user', ${userId}, 'empire.create', 'empire', ${slug})`;
    await grantInfluence(tx, { userId, kind: "empire_create", key: `empire-create:${userId}` });
    return { slug };
  });
}

export async function joinEmpire(sql: Sql, userId: string, slug: string, inviteCode?: string | null): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`empire-user:${userId}`}))`;
    const [e] = await tx<{ id: string; recruiting: boolean; code: string; members: number }[]>`
      SELECT id, recruiting, invite_code AS code, (SELECT count(*)::int FROM empire_members m WHERE m.empire_id = empires.id) AS members
      FROM empires WHERE slug = ${slug} AND status = 'active' FOR UPDATE`;
    if (!e) throw new EmpireError("not_found", "Empire introuvable.");
    if ((await tx`SELECT 1 FROM empire_members WHERE user_id = ${userId}`).length) throw new EmpireError("already_member", "Tu fais déjà partie d'un empire.");
    const invited = inviteCode && inviteCode.toUpperCase() === e.code;
    if (!e.recruiting && !invited) throw new EmpireError("closed", "Cet empire ne recrute que sur invitation.");
    const max = Number(await setting(tx, "empires.max_members", 50));
    if (e.members >= max) throw new EmpireError("full", `Cet empire est complet (${max} membres).`);
    await tx`INSERT INTO empire_members (user_id, empire_id, role) VALUES (${userId}, ${e.id}, 'member')`;
    await tx`INSERT INTO analytics_events (name, props) VALUES ('empire_join', ${tx.json({ slug, invited: Boolean(invited) })})`;
  });
}

/** Quitter un empire. Le chef qui part transmet la couronne au plus ancien ; s'il est seul, l'empire est dissous. */
export async function leaveEmpire(sql: Sql, userId: string): Promise<"left" | "disbanded"> {
  return sql.begin(async (tx) => {
    const [m] = await tx<{ empireId: string; role: string }[]>`SELECT empire_id AS "empireId", role FROM empire_members WHERE user_id = ${userId}`;
    if (!m) throw new EmpireError("not_member", "Tu ne fais partie d'aucun empire.");
    await tx`DELETE FROM empire_members WHERE user_id = ${userId}`;
    if (m.role !== "leader") return "left";
    const [heir] = await tx<{ userId: string }[]>`
      SELECT user_id AS "userId" FROM empire_members WHERE empire_id = ${m.empireId}
      ORDER BY (role = 'officer') DESC, joined_at LIMIT 1`;
    if (!heir) {
      await tx`UPDATE empires SET status = 'disbanded' WHERE id = ${m.empireId}`;
      return "disbanded";
    }
    await tx`UPDATE empire_members SET role = 'leader' WHERE user_id = ${heir.userId}`;
    await tx`UPDATE empires SET owner_user_id = ${heir.userId} WHERE id = ${m.empireId}`;
    return "left";
  });
}

export async function updateEmpire(sql: Sql, userId: string, patch: { motto?: string; description?: string; recruiting?: boolean; regenerateCode?: boolean }): Promise<void> {
  const [m] = await sql<{ empireId: string; role: string }[]>`SELECT empire_id AS "empireId", role FROM empire_members WHERE user_id = ${userId}`;
  if (!m || m.role !== "leader") throw new EmpireError("forbidden", "Seul le chef de l'empire peut le modifier.");
  await sql`
    UPDATE empires SET
      motto = coalesce(${patch.motto?.trim().slice(0, 80) ?? null}, motto),
      description = coalesce(${patch.description?.trim().slice(0, 600) ?? null}, description),
      recruiting = coalesce(${patch.recruiting ?? null}, recruiting),
      invite_code = CASE WHEN ${patch.regenerateCode ?? false} THEN ${randomCode(8)} ELSE invite_code END
    WHERE id = ${m.empireId}`;
}

export interface EmpireCard {
  slug: string; name: string; tag: string; motto: string; color: string; crest: string; recruiting: boolean;
  members: number; influence: number; territories: number; rank: number; wars: { won: number; lost: number; active: number };
  createdAt: string;
}

const cardSelect = (db: Db) => db`
  e.slug, e.name, e.tag, e.motto, e.color, e.crest, e.recruiting, e.influence, e.created_at AS "createdAt",
  (SELECT count(*)::int FROM empire_members m WHERE m.empire_id = e.id) AS members,
  coalesce((SELECT f.claims_count FROM factions f JOIN seasons s ON s.id = f.season_id AND s.status = 'active'
            WHERE lower(f.name) = lower(e.faction_name) AND f.disbanded_at IS NULL LIMIT 1), 0) AS territories,
  rank() OVER (ORDER BY e.influence DESC, e.created_at)::int AS rank,
  (SELECT count(*)::int FROM wars w WHERE w.status = 'ended' AND w.winner_empire_id = e.id) AS won,
  (SELECT count(*)::int FROM wars w WHERE w.status = 'ended' AND w.winner_empire_id IS NOT NULL AND w.winner_empire_id <> e.id AND e.id IN (w.attacker_empire_id, w.defender_empire_id)) AS lost,
  (SELECT count(*)::int FROM wars w WHERE w.status = 'active' AND e.id IN (w.attacker_empire_id, w.defender_empire_id)) AS active`;

type CardRow = Omit<EmpireCard, "wars" | "createdAt"> & { createdAt: Date; won: number; lost: number; active: number };
const toCard = ({ won, lost, active, createdAt, ...r }: CardRow): EmpireCard => ({ ...r, createdAt: createdAt.toISOString(), wars: { won, lost, active } });

export type EmpireSort = "influence" | "members" | "territories" | "recent";

export async function listEmpires(sql: Sql, opts: { q?: string; sort?: EmpireSort; recruiting?: boolean; limit?: number }) {
  const sort = { influence: sql`rank`, members: sql`members DESC, rank`, territories: sql`territories DESC, rank`, recent: sql`"createdAt" DESC` }[opts.sort ?? "influence"];
  const q = opts.q?.trim();
  const rows = await sql<CardRow[]>`
    SELECT * FROM (SELECT ${cardSelect(sql)} FROM empires e WHERE e.status = 'active') x
    WHERE true
      ${q ? sql`AND (x.name ILIKE ${"%" + q + "%"} OR x.tag ILIKE ${q + "%"})` : sql``}
      ${opts.recruiting ? sql`AND x.recruiting` : sql``}
    ORDER BY ${sort} LIMIT ${Math.min(opts.limit ?? 60, 200)}`;
  const [{ total }] = (await sql`SELECT count(*)::int AS total FROM empires WHERE status = 'active'`) as unknown as [{ total: number }];
  return { items: rows.map(toCard), total };
}

export async function getEmpire(sql: Sql, slug: string) {
  const [row] = await sql<(CardRow & { id: string; description: string; factionName: string | null })[]>`
    SELECT * FROM (SELECT e.id, e.description, e.faction_name AS "factionName", ${cardSelect(sql)} FROM empires e WHERE e.status = 'active') x
    WHERE x.slug = ${slug}`;
  if (!row) return null;
  const { id, description, factionName, ...card } = row;
  const members = await sql<{ name: string; role: string; founder: number | null; influence: number; username: string | null }[]>`
    SELECT ${publicNameSql(sql)} AS name, m.role, f.number AS founder, u.influence,
           (SELECT p.username FROM minecraft_accounts ma JOIN players p ON p.uuid = ma.player_uuid WHERE ma.user_id = u.id LIMIT 1) AS username
    FROM empire_members m JOIN users u ON u.id = m.user_id LEFT JOIN founders f ON f.user_id = u.id
    WHERE m.empire_id = ${id} ORDER BY array_position(ARRAY['leader','officer','member'], m.role), m.joined_at`;
  const wars = await sql<{ slug: string; title: string; status: string; startsAt: Date; opponent: string; opponentSlug: string; won: boolean | null }[]>`
    SELECT w.slug, w.title, w.status, w.starts_at AS "startsAt",
           o.name AS opponent, o.slug AS "opponentSlug",
           CASE WHEN w.winner_empire_id IS NULL THEN NULL ELSE w.winner_empire_id = ${id} END AS won
    FROM wars w JOIN empires o ON o.id = CASE WHEN w.attacker_empire_id = ${id} THEN w.defender_empire_id ELSE w.attacker_empire_id END
    WHERE ${id} IN (w.attacker_empire_id, w.defender_empire_id) AND w.status <> 'cancelled'
    ORDER BY w.starts_at DESC LIMIT 20`;
  return { ...toCard(card as CardRow), description, factionName, roster: members, history: wars.map((w) => ({ ...w, startsAt: w.startsAt.toISOString() })) };
}

/** État « mon empire » pour l'utilisateur connecté (îlots interactifs du site). */
export async function myEmpire(db: Db, userId: string) {
  const [r] = await db<{ slug: string; name: string; role: string; inviteCode: string; recruiting: boolean }[]>`
    SELECT e.slug, e.name, m.role, e.invite_code AS "inviteCode", e.recruiting
    FROM empire_members m JOIN empires e ON e.id = m.empire_id WHERE m.user_id = ${userId} AND e.status = 'active'`;
  if (!r) return null;
  // Le code d'invitation n'est montré qu'au chef et aux officiers.
  return r.role === "member" ? { ...r, inviteCode: null } : r;
}

export type { Tx };
