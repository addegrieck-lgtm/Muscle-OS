import type { Sql } from "../../db";
import { grantInfluence } from "./influence";

export class PollError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

export interface PollView {
  slug: string; question: string; description: string; status: "open" | "closed"; closesAt: string | null; eligibility: "account" | "linked";
  outcome: string | null; totalVotes: number; options: { id: string; label: string; votes: number; percent: number }[];
}

const isOpen = sqlOpen();
function sqlOpen() {
  return "p.status = 'open' AND p.opens_at <= now() AND (p.closes_at IS NULL OR p.closes_at > now())";
}

export async function listPolls(sql: Sql): Promise<PollView[]> {
  const polls = await sql<{ id: string; slug: string; question: string; description: string; open: boolean; closesAt: Date | null; eligibility: PollView["eligibility"]; outcome: string | null }[]>`
    SELECT p.id, p.slug, p.question, p.description, (${sql.unsafe(isOpen)}) AS open, p.closes_at AS "closesAt", p.eligibility, p.outcome
    FROM polls p WHERE p.status <> 'draft' AND p.opens_at <= now() ORDER BY (${sql.unsafe(isOpen)}) DESC, p.opens_at DESC LIMIT 50`;
  if (polls.length === 0) return [];
  const options = await sql<{ pollId: string; id: string; label: string; votes: number }[]>`
    SELECT o.poll_id AS "pollId", o.id, o.label, (SELECT count(*)::int FROM poll_votes v WHERE v.option_id = o.id) AS votes
    FROM poll_options o WHERE o.poll_id = ANY(${polls.map((p) => p.id)}::uuid[]) ORDER BY o.position`;
  return polls.map((p) => {
    const opts = options.filter((o) => o.pollId === p.id);
    const total = opts.reduce((s, o) => s + o.votes, 0);
    return {
      slug: p.slug, question: p.question, description: p.description, status: p.open ? "open" : "closed",
      closesAt: p.closesAt?.toISOString() ?? null, eligibility: p.eligibility, outcome: p.outcome, totalVotes: total,
      options: opts.map((o) => ({ id: o.id, label: o.label, votes: o.votes, percent: total ? Math.round((o.votes / total) * 100) : 0 })),
    };
  });
}

/** Un vote par compte et par sondage (clé primaire), uniquement pendant l'ouverture. */
export async function castVote(sql: Sql, userId: string, slug: string, optionId: string): Promise<void> {
  await sql.begin(async (tx) => {
    const [poll] = await tx<{ id: string; open: boolean; eligibility: string }[]>`
      SELECT p.id, (${tx.unsafe(isOpen)}) AS open, p.eligibility FROM polls p WHERE p.slug = ${slug}`;
    if (!poll) throw new PollError("not_found", "Sondage introuvable.");
    if (!poll.open) throw new PollError("closed", "Ce vote est terminé.");
    if (poll.eligibility === "linked" && !(await tx`SELECT 1 FROM minecraft_accounts WHERE user_id = ${userId} LIMIT 1`).length) {
      throw new PollError("not_linked", "Ce vote est réservé aux comptes liés à Minecraft (tape /link en jeu).");
    }
    const opt = await tx`SELECT 1 FROM poll_options WHERE id = ${optionId} AND poll_id = ${poll.id}`;
    if (!opt.length) throw new PollError("invalid_option", "Choix invalide.");
    const rows = await tx`INSERT INTO poll_votes (poll_id, user_id, option_id) VALUES (${poll.id}, ${userId}, ${optionId}) ON CONFLICT DO NOTHING RETURNING poll_id`;
    if (!rows.length) throw new PollError("already_voted", "Tu as déjà voté.");
    await tx`INSERT INTO analytics_events (name, props) VALUES ('vote', ${tx.json({ poll: slug })})`;
    await grantInfluence(tx, { userId, kind: "vote_cast", key: `vote:${poll.id}:${userId}` });
  });
}

export async function myVotes(sql: Sql, userId: string): Promise<Record<string, string>> {
  const rows = await sql<{ slug: string; optionId: string }[]>`
    SELECT p.slug, v.option_id AS "optionId" FROM poll_votes v JOIN polls p ON p.id = v.poll_id WHERE v.user_id = ${userId}`;
  return Object.fromEntries(rows.map((r) => [r.slug, r.optionId]));
}
