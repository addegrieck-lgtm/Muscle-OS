import type { Sql } from "../../db";

export interface WarView {
  slug: string; title: string; status: "planned" | "active" | "ended" | "cancelled"; startsAt: string; endsAt: string | null;
  attacker: { slug: string; name: string; tag: string; color: string; crest: string; score: number; territories: number };
  defender: { slug: string; name: string; tag: string; color: string; crest: string; score: number; territories: number };
  participants: number; winner: string | null; summary: string;
}

const select = (sql: Sql) => sql`
  w.slug, w.title, w.status, w.starts_at AS "startsAt", w.ends_at AS "endsAt", w.participants, w.summary,
  json_build_object('slug', a.slug, 'name', a.name, 'tag', a.tag, 'color', a.color, 'crest', a.crest, 'score', w.attacker_score, 'territories', w.attacker_territories) AS attacker,
  json_build_object('slug', d.slug, 'name', d.name, 'tag', d.tag, 'color', d.color, 'crest', d.crest, 'score', w.defender_score, 'territories', w.defender_territories) AS defender,
  (SELECT x.slug FROM empires x WHERE x.id = w.winner_empire_id) AS winner`;

type Row = Omit<WarView, "startsAt" | "endsAt"> & { startsAt: Date; endsAt: Date | null };
const dto = (r: Row): WarView => ({ ...r, startsAt: r.startsAt.toISOString(), endsAt: r.endsAt?.toISOString() ?? null });

export async function listWars(sql: Sql, status?: WarView["status"], limit = 50): Promise<WarView[]> {
  const rows = await sql<Row[]>`
    SELECT ${select(sql)} FROM wars w JOIN empires a ON a.id = w.attacker_empire_id JOIN empires d ON d.id = w.defender_empire_id
    WHERE w.status <> 'cancelled' ${status ? sql`AND w.status = ${status}` : sql``}
    ORDER BY (w.status = 'active') DESC, w.starts_at DESC LIMIT ${limit}`;
  return rows.map(dto);
}

export async function getWar(sql: Sql, slug: string) {
  const [row] = await sql<(Row & { id: string })[]>`
    SELECT w.id, ${select(sql)} FROM wars w JOIN empires a ON a.id = w.attacker_empire_id JOIN empires d ON d.id = w.defender_empire_id
    WHERE w.slug = ${slug} AND w.status <> 'cancelled'`;
  if (!row) return null;
  const { id, ...war } = row;
  const events = await sql<{ kind: string; message: string; occurredAt: Date }[]>`
    SELECT kind, message, occurred_at AS "occurredAt" FROM war_events WHERE war_id = ${id} ORDER BY occurred_at DESC LIMIT 100`;
  return { ...dto(war as Row), events: events.map((e) => ({ ...e, occurredAt: e.occurredAt.toISOString() })) };
}
