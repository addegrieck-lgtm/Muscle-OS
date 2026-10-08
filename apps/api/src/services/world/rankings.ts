import { RANKING_CATEGORIES } from "@vaeloria/types";
import type { Sql } from "../../db";
import { getLeaderboard } from "../content";
import { publicNameSql } from "./common";

export { RANKING_CATEGORIES };
export type RankingCategory = (typeof RANKING_CATEGORIES)[number]["id"];
export const RANKING_IDS = RANKING_CATEGORIES.map((c) => c.id) as [RankingCategory, ...RankingCategory[]];

export interface RankingEntry {
  rank: number; name: string; href: string | null; value: number; secondary: string | null; color: string | null;
}

/** Tous les classements V2 sous un même format, à partir de données réelles uniquement. */
export async function getRanking(sql: Sql, category: RankingCategory, limit = 50): Promise<RankingEntry[]> {
  switch (category) {
    case "empires": {
      const rows = await sql<{ slug: string; name: string; tag: string; color: string; influence: number; members: number }[]>`
        SELECT e.slug, e.name, e.tag, e.color, e.influence, (SELECT count(*)::int FROM empire_members m WHERE m.empire_id = e.id) AS members
        FROM empires e WHERE e.status = 'active' ORDER BY e.influence DESC, e.created_at LIMIT ${limit}`;
      return rows.map((r, i) => ({ rank: i + 1, name: r.name, href: `/empire/${r.slug}`, value: r.influence, secondary: `[${r.tag}] · ${r.members} membres`, color: r.color }));
    }
    case "guerres": {
      const rows = await sql<{ slug: string; name: string; color: string; wins: number; played: number }[]>`
        SELECT e.slug, e.name, e.color,
               count(*) FILTER (WHERE w.winner_empire_id = e.id)::int AS wins, count(*)::int AS played
        FROM empires e JOIN wars w ON e.id IN (w.attacker_empire_id, w.defender_empire_id) AND w.status = 'ended'
        WHERE e.status = 'active' GROUP BY e.id HAVING count(*) FILTER (WHERE w.winner_empire_id = e.id) > 0
        ORDER BY wins DESC, played LIMIT ${limit}`;
      return rows.map((r, i) => ({ rank: i + 1, name: r.name, href: `/empire/${r.slug}`, value: r.wins, secondary: `${r.played} guerre${r.played > 1 ? "s" : ""}`, color: r.color }));
    }
    case "recruteurs": {
      const rows = await sql<{ name: string; founder: number | null; qualified: number }[]>`
        SELECT ${publicNameSql(sql)} AS name, (SELECT number FROM founders f WHERE f.user_id = u.id) AS founder, x.qualified
        FROM (SELECT referrer_user_id AS id, count(*)::int AS qualified FROM user_referrals WHERE status = 'qualified' GROUP BY 1) x
        JOIN users u ON u.id = x.id ORDER BY x.qualified DESC LIMIT ${limit}`;
      return rows.map((r, i) => ({ rank: i + 1, name: r.name, href: null, value: r.qualified, secondary: r.founder ? `Fondateur #${r.founder}` : null, color: null }));
    }
    default: {
      // Classements issus du jeu (synchronisés par VæloriaBridge)
      const map = { guerriers: "kills", richesse: "wealth", territoires: "territory", saison: "factions" } as const;
      const board = await getLeaderboard(sql, map[category], { limit });
      const player = category === "guerriers";
      return board.entries.map((e) => ({
        rank: e.rank, name: e.name, href: player ? `/joueur/${encodeURIComponent(e.name)}` : `/faction/${encodeURIComponent(e.name)}`,
        value: e.value, secondary: e.secondary ?? null, color: null,
      }));
    }
  }
}
