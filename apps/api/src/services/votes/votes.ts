/**
 * Votes pour le serveur. Un seul grand livre (`server_votes`) alimenté par deux canaux :
 * le bouton « J'ai voté » du site (vérification par IP auprès du site de vote) et Votifier en jeu.
 *
 * Règles :
 *  - un vote par site, par joueur et par délai de revote (`cooldown_minutes`), quel que soit le canal ;
 *  - un même vote (même IP) ne peut pas être revendiqué par deux joueurs pendant ce délai ;
 *  - récompenses : influence (règle `server_vote`, plafonnée) + commande en jeu facultative du site.
 */
import { createHash } from "node:crypto";
import type { MyServerVotes, VotePage, VoteSiteView } from "@vaeloria/types";
import type { Sql, Tx } from "../../db";
import { grantInfluence } from "../world/influence";
import { hasVoted, type VerifierId, type VoteFetch } from "./verifiers";

export class VoteError extends Error {
  constructor(public readonly code: "not_found" | "not_linked" | "not_configured" | "cooldown" | "not_voted" | "ip_used" | "unavailable", message: string, public readonly nextAt?: string) {
    super(message);
  }
}

interface SiteRow { id: string; key: string; name: string; verifier: "none" | VerifierId; verificationKey: string | null; cooldownMinutes: number; rewardCommand: string | null; active: boolean }

const SITE_COLUMNS = `id, key, name, verifier, verification_key AS "verificationKey", cooldown_minutes AS "cooldownMinutes", reward_command AS "rewardCommand", active`;

export function hashIp(ip: string, pepper: string): string {
  return createHash("sha256").update(`vote:${pepper}:${ip}`).digest("hex").slice(0, 40);
}

const monthStart = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
};

export async function votePage(sql: Sql): Promise<VotePage> {
  const start = monthStart();
  const [sites, top, total] = await Promise.all([
    sql<VoteSiteView[]>`
      SELECT key, name, vote_url AS "voteUrl", cooldown_minutes AS "cooldownMinutes", reward_label AS "rewardLabel",
             (verifier <> 'none' AND coalesce(verification_key, '') <> '') AS verifiable
      FROM vote_sites WHERE active ORDER BY position, name`,
    sql<{ username: string; votes: number }[]>`
      SELECT p.username, count(*)::int AS votes FROM server_votes v JOIN players p ON p.uuid = v.player_uuid
      WHERE v.voted_at >= ${start} GROUP BY p.uuid, p.username ORDER BY votes DESC, min(v.voted_at) LIMIT 10`,
    sql<{ n: number }[]>`SELECT count(*)::int AS n FROM server_votes WHERE voted_at >= ${start}`,
  ]);
  return { sites, month: { start: start.toISOString(), total: total[0]?.n ?? 0, top } };
}

/** Compte Minecraft utilisé pour voter : celui demandé (s'il appartient au compte) ou le premier lié. */
async function playerOf(sql: Sql | Tx, userId: string, uuid?: string): Promise<{ uuid: string; username: string } | null> {
  const [p] = await sql<{ uuid: string; username: string }[]>`
    SELECT p.uuid, p.username FROM minecraft_accounts a JOIN players p ON p.uuid = a.player_uuid
    WHERE a.user_id = ${userId} ${uuid ? sql`AND a.player_uuid = ${uuid}` : sql``}
    ORDER BY a.linked_at LIMIT 1`;
  return p ?? null;
}

export async function myServerVotes(sql: Sql, userId: string): Promise<MyServerVotes> {
  const player = await playerOf(sql, userId);
  if (!player) return { player: null, sites: [], monthVotes: 0 };
  const rows = await sql<{ key: string; last: Date | null; cooldown: number }[]>`
    SELECT s.key, s.cooldown_minutes AS cooldown,
           (SELECT max(v.voted_at) FROM server_votes v WHERE v.site_id = s.id AND v.player_uuid = ${player.uuid}) AS last
    FROM vote_sites s WHERE s.active ORDER BY s.position`;
  const [{ n }] = (await sql`SELECT count(*)::int AS n FROM server_votes WHERE player_uuid = ${player.uuid} AND voted_at >= ${monthStart()}`) as unknown as [{ n: number }];
  return {
    player,
    monthVotes: n,
    sites: rows.map((r) => {
      const next = r.last ? new Date(r.last.getTime() + r.cooldown * 60_000) : null;
      return { key: r.key, lastVotedAt: r.last?.toISOString() ?? null, nextAt: next && next > new Date() ? next.toISOString() : null };
    }),
  };
}

export type RecordResult = { status: "recorded"; id: string; influence: number } | { status: "cooldown"; nextAt: string } | { status: "ip_used" };

/** Enregistre un vote s'il respecte le délai de revote. À appeler dans une transaction. */
export async function recordVote(tx: Tx, v: { site: SiteRow; playerUuid: string; username: string; userId: string | null; source: "web" | "votifier" | "admin"; ipHash?: string | null; externalId?: string | null; at?: Date }): Promise<RecordResult> {
  const at = v.at ?? new Date();
  // Sérialise les votes d'un même joueur sur un même site (les deux canaux peuvent arriver en même temps).
  await tx`SELECT pg_advisory_xact_lock(hashtext(${`server-vote:${v.site.id}:${v.playerUuid}`}))`;
  const since = new Date(at.getTime() - v.site.cooldownMinutes * 60_000);
  const [last] = await tx<{ votedAt: Date }[]>`
    SELECT voted_at AS "votedAt" FROM server_votes WHERE site_id = ${v.site.id} AND player_uuid = ${v.playerUuid} AND voted_at > ${since}
    ORDER BY voted_at DESC LIMIT 1`;
  if (last) return { status: "cooldown", nextAt: new Date(last.votedAt.getTime() + v.site.cooldownMinutes * 60_000).toISOString() };
  if (v.ipHash) {
    await tx`SELECT pg_advisory_xact_lock(hashtext(${`server-vote-ip:${v.site.id}:${v.ipHash}`}))`;
    const shared = await tx`
      SELECT 1 FROM server_votes WHERE site_id = ${v.site.id} AND ip_hash = ${v.ipHash} AND voted_at > ${since} AND player_uuid <> ${v.playerUuid} LIMIT 1`;
    if (shared.length) return { status: "ip_used" };
  }
  const [row] = await tx<{ id: string }[]>`
    INSERT INTO server_votes (site_id, player_uuid, username, user_id, source, ip_hash, external_id, voted_at)
    VALUES (${v.site.id}, ${v.playerUuid}, ${v.username}, ${v.userId}, ${v.source}, ${v.ipHash ?? null}, ${v.externalId ?? null}, ${at})
    RETURNING id::text`;
  const id = row!.id;
  const userId = v.userId ?? (await tx<{ userId: string }[]>`SELECT user_id AS "userId" FROM minecraft_accounts WHERE player_uuid = ${v.playerUuid}`)[0]?.userId ?? null;
  const influence = userId ? await grantInfluence(tx, { userId, kind: "server_vote", key: `server-vote:${id}`, label: `Vote sur ${v.site.name}` }) : 0;
  if (v.site.rewardCommand) {
    const command = v.site.rewardCommand.replaceAll("{username}", v.username).replaceAll("{uuid}", v.playerUuid);
    await tx`
      INSERT INTO minecraft_commands (player_uuid, command, require_online, source, action, idempotency_key)
      VALUES (${v.playerUuid}, ${command}, true, 'vote', 'COMMAND', ${`server-vote:${id}`})
      ON CONFLICT (idempotency_key) DO NOTHING`;
  }
  await tx`INSERT INTO analytics_events (name, props) VALUES ('server_vote', ${tx.json({ site: v.site.key, source: v.source })})`;
  return { status: "recorded", id, influence };
}

/** « J'ai voté » depuis le site : vérifie auprès du site de vote avec l'IP du joueur. */
export async function claimWebVote(sql: Sql, fetcher: VoteFetch, input: { userId: string; siteKey: string; ip: string; pepper: string; playerUuid?: string }): Promise<{ influence: number; nextAt: string }> {
  const [site] = await sql<SiteRow[]>`SELECT ${sql.unsafe(SITE_COLUMNS)} FROM vote_sites WHERE key = ${input.siteKey} AND active`;
  if (!site) throw new VoteError("not_found", "Site de vote introuvable.");
  if (site.verifier === "none" || !site.verificationKey) throw new VoteError("not_configured", "Ce site est comptabilisé automatiquement en jeu : rien à faire ici.");
  const player = await playerOf(sql, input.userId, input.playerUuid);
  if (!player) throw new VoteError("not_linked", "Lie d'abord ton compte Minecraft (tape /link en jeu) pour recevoir tes récompenses.");

  // Délai de revote vérifié avant d'interroger le site (évite des appels inutiles).
  const [last] = await sql<{ votedAt: Date }[]>`
    SELECT max(voted_at) AS "votedAt" FROM server_votes WHERE site_id = ${site.id} AND player_uuid = ${player.uuid}`;
  if (last?.votedAt && last.votedAt.getTime() + site.cooldownMinutes * 60_000 > Date.now()) {
    const nextAt = new Date(last.votedAt.getTime() + site.cooldownMinutes * 60_000).toISOString();
    throw new VoteError("cooldown", "Vote déjà comptabilisé. Tu pourras revoter plus tard.", nextAt);
  }

  let voted: boolean;
  try {
    voted = await hasVoted(fetcher, site.verifier, site.verificationKey, input.ip);
  } catch {
    throw new VoteError("unavailable", `${site.name} ne répond pas pour le moment. Ton vote sera aussi comptabilisé en jeu s'il y est relié.`);
  }
  if (!voted) throw new VoteError("not_voted", `Aucun vote trouvé sur ${site.name} depuis ta connexion. Vote d'abord, puis reviens cliquer ici (le site peut mettre une minute à l'enregistrer).`);

  const r = await sql.begin((tx) => recordVote(tx, { site, playerUuid: player.uuid, username: player.username, userId: input.userId, source: "web", ipHash: hashIp(input.ip, input.pepper) }));
  if (r.status === "cooldown") throw new VoteError("cooldown", "Vote déjà comptabilisé. Tu pourras revoter plus tard.", r.nextAt);
  if (r.status === "ip_used") throw new VoteError("ip_used", "Ce vote a déjà été revendiqué par un autre joueur depuis la même connexion.");
  return { influence: r.influence, nextAt: new Date(Date.now() + site.cooldownMinutes * 60_000).toISOString() };
}

/** Vote reçu en jeu par Votifier (événement SERVER_VOTE du bridge). Silencieux si le joueur ou le site est inconnu. */
export async function ingestVotifierVote(tx: Tx, e: { id: string; service: string; username: string; address?: string | null; occurredAt: string }, pepper: string): Promise<void> {
  const [site] = await tx<SiteRow[]>`SELECT ${tx.unsafe(SITE_COLUMNS)} FROM vote_sites WHERE active AND lower(votifier_service) = lower(${e.service})`;
  if (!site) return;
  const [player] = await tx<{ uuid: string; username: string }[]>`
    SELECT uuid, username FROM players WHERE lower(username) = lower(${e.username}) ORDER BY last_seen_at DESC NULLS LAST LIMIT 1`;
  if (!player) return; // jamais connecté : pas de compte à récompenser
  const ipHash = e.address && e.address !== "127.0.0.1" ? hashIp(e.address, pepper) : null;
  await recordVote(tx, { site, playerUuid: player.uuid, username: player.username, userId: null, source: "votifier", ipHash, externalId: e.id, at: new Date(e.occurredAt) });
}
