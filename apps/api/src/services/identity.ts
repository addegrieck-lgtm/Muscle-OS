/**
 * Comptes VÆLORIA : connexion Discord, sessions, liaison Minecraft, résolution pseudo → UUID.
 */
import { randomBytes, randomInt } from "node:crypto";
import type { LinkedMinecraft, Me } from "@vaeloria/types";
import type { Sql } from "../db";
import { sha256 } from "../lib/hmac";
import { getProgress } from "./shop/ledger";
import { assignFounder } from "./world/founders";
import { grantInfluence } from "./world/influence";
import { attributeReferral, qualifyReferral } from "./world/referrals";

export const SESSION_DAYS = 30;

export async function createSession(sql: Sql, userId: string, userAgent?: string | null): Promise<{ token: string; expiresAt: string }> {
  const token = randomBytes(32).toString("base64url");
  const [row] = await sql<{ expiresAt: Date }[]>`
    INSERT INTO sessions (token_hash, user_id, expires_at, user_agent)
    VALUES (${sha256(token)}, ${userId}, now() + make_interval(days => ${SESSION_DAYS}), ${userAgent?.slice(0, 300) ?? null})
    RETURNING expires_at AS "expiresAt"`;
  return { token, expiresAt: row!.expiresAt.toISOString() };
}

/** Session valide → utilisateur. Expiration glissante : prolongée si elle est à moins de 15 jours. */
export async function resolveSession(sql: Sql, token: string): Promise<{ id: string; role: string } | null> {
  if (!/^[A-Za-z0-9_-]{40,60}$/.test(token)) return null;
  const [row] = await sql<{ id: string; role: string; renew: boolean }[]>`
    SELECT u.id, u.role, s.expires_at < now() + interval '15 days' AS renew
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ${sha256(token)} AND s.expires_at > now()`;
  if (!row) return null;
  if (row.renew) await sql`UPDATE sessions SET expires_at = now() + make_interval(days => ${SESSION_DAYS}) WHERE token_hash = ${sha256(token)}`;
  return { id: row.id, role: row.role };
}

export async function deleteSession(sql: Sql, token: string) {
  await sql`DELETE FROM sessions WHERE token_hash = ${sha256(token)}`;
}

/** Crée ou met à jour l'utilisateur lié à un compte Discord. */
/**
 * Crée ou met à jour l'utilisateur lié à un compte Discord.
 * À la création (= inscription) : numéro de fondateur si les inscriptions fondateurs sont ouvertes,
 * attribution du parrainage éventuel.
 */
export async function upsertDiscordUser(
  sql: Sql,
  d: { discordId: string; username: string; displayName: string; avatar: string | null },
  onboarding: { referralCode?: string | null } = {},
): Promise<string> {
  return sql.begin(async (tx) => {
    const [existing] = await tx<{ userId: string }[]>`SELECT user_id AS "userId" FROM discord_accounts WHERE discord_id = ${d.discordId}`;
    if (existing) {
      await tx`UPDATE discord_accounts SET username = ${d.username}, avatar = ${d.avatar} WHERE discord_id = ${d.discordId}`;
      await tx`UPDATE users SET display_name = ${d.displayName}, updated_at = now() WHERE id = ${existing.userId}`;
      return existing.userId;
    }
    const [user] = await tx<{ id: string }[]>`INSERT INTO users (display_name) VALUES (${d.displayName}) RETURNING id`;
    await tx`INSERT INTO discord_accounts (discord_id, user_id, username, avatar) VALUES (${d.discordId}, ${user!.id}, ${d.username}, ${d.avatar})`;
    await tx`INSERT INTO analytics_events (name) VALUES ('account_created'), ('register'), ('discord_connect')`;
    await attributeReferral(tx, user!.id, onboarding.referralCode);
    await assignFounder(tx, user!.id);
    return user!.id;
  });
}

/** Échange du code OAuth Discord côté serveur. Le secret client ne quitte jamais l'API. */
export async function exchangeDiscordCode(
  cfg: { clientId: string; clientSecret: string },
  code: string,
  redirectUri: string,
  fetcher: typeof fetch = fetch,
): Promise<{ discordId: string; username: string; displayName: string; avatar: string | null }> {
  const tokenRes = await fetcher("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, grant_type: "authorization_code", code, redirect_uri: redirectUri }),
    signal: AbortSignal.timeout(8000),
  });
  if (!tokenRes.ok) throw new Error(`Discord a refusé le code (${tokenRes.status})`);
  const { access_token } = (await tokenRes.json()) as { access_token: string };
  const meRes = await fetcher("https://discord.com/api/users/@me", { headers: { authorization: `Bearer ${access_token}` }, signal: AbortSignal.timeout(8000) });
  if (!meRes.ok) throw new Error("Profil Discord inaccessible");
  const me = (await meRes.json()) as { id: string; username: string; global_name?: string | null; avatar?: string | null };
  return {
    discordId: me.id,
    username: me.username,
    displayName: me.global_name || me.username,
    avatar: me.avatar ? `https://cdn.discordapp.com/avatars/${me.id}/${me.avatar}.png?size=128` : null,
  };
}

// ───────────── Liaison Minecraft ─────────────

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O, 1/I
export const LINK_CODE_TTL_MINUTES = 10;

/** Appelé par le plugin quand le joueur tape /link en jeu : prouve la possession du compte Minecraft. */
export async function createLinkCode(sql: Sql, player: { uuid: string; username: string }): Promise<{ code: string; expiresInMinutes: number }> {
  const code = Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("");
  await sql.begin(async (tx) => {
    await tx`INSERT INTO players (uuid, username) VALUES (${player.uuid}, ${player.username}) ON CONFLICT (uuid) DO UPDATE SET username = EXCLUDED.username`;
    await tx`DELETE FROM link_codes WHERE player_uuid = ${player.uuid} AND used_at IS NULL`;
    await tx`INSERT INTO link_codes (code, player_uuid, expires_at) VALUES (${code}, ${player.uuid}, now() + make_interval(mins => ${LINK_CODE_TTL_MINUTES}))`;
  });
  return { code, expiresInMinutes: LINK_CODE_TTL_MINUTES };
}

export async function consumeLinkCode(sql: Sql, userId: string, rawCode: string): Promise<{ uuid: string; username: string } | null> {
  const code = rawCode.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return null;
  return sql.begin(async (tx) => {
    const [row] = await tx<{ uuid: string; username: string }[]>`
      UPDATE link_codes l SET used_at = now() FROM players p
      WHERE l.code = ${code} AND l.used_at IS NULL AND l.expires_at > now() AND p.uuid = l.player_uuid
      RETURNING p.uuid, p.username`;
    if (!row) return null;
    // Le code prouve la possession actuelle : un ancien lien vers un autre compte est remplacé (journalisé).
    await tx`INSERT INTO minecraft_accounts (player_uuid, user_id) VALUES (${row.uuid}, ${userId})
             ON CONFLICT (player_uuid) DO UPDATE SET user_id = EXCLUDED.user_id, linked_at = now()`;
    await tx`INSERT INTO audit_logs (actor_type, actor_id, action, target_type, target_id) VALUES ('user', ${userId}, 'minecraft.linked', 'player', ${row.uuid})`;
    await tx`INSERT INTO analytics_events (name) VALUES ('account_linked')`;
    // Preuve d'un vrai compte Java : débloque l'influence liée et qualifie le parrainage éventuel.
    await grantInfluence(tx, { userId, kind: "account_linked", key: `linked:${userId}` });
    await qualifyReferral(tx, userId, row.uuid);
    return row;
  });
}

export async function getMe(sql: Sql, userId: string): Promise<Me | null> {
  const [user] = await sql<{ id: string; displayName: string; avatarUrl: string | null; role: string }[]>`
    SELECT u.id, u.display_name AS "displayName", d.avatar AS "avatarUrl", u.role
    FROM users u LEFT JOIN discord_accounts d ON d.user_id = u.id WHERE u.id = ${userId}`;
  if (!user) return null;
  const accounts = await sql<{ uuid: string; username: string; rank: string | null }[]>`
    SELECT p.uuid, p.username, p.rank FROM minecraft_accounts m JOIN players p ON p.uuid = m.player_uuid
    WHERE m.user_id = ${userId} ORDER BY m.linked_at`;
  const minecraft: LinkedMinecraft[] = [];
  for (const a of accounts) minecraft.push({ ...a, progress: await getProgress(sql, a.uuid) });
  return { user, minecraft };
}

export async function userOwnsPlayer(sql: Sql, userId: string, uuid: string): Promise<boolean> {
  const rows = await sql`SELECT 1 FROM minecraft_accounts WHERE user_id = ${userId} AND player_uuid = ${uuid}`;
  return rows.length > 0;
}

// ───────────── Pseudo → UUID ─────────────

export type MojangLookup = (username: string) => Promise<{ uuid: string; username: string } | null>;

export const mojangLookup: MojangLookup = async (username) => {
  const res = await fetch(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`, { signal: AbortSignal.timeout(5000) });
  if (res.status === 204 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Mojang indisponible (${res.status})`);
  const body = (await res.json()) as { id: string; name: string };
  const id = body.id.toLowerCase();
  return { uuid: `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`, username: body.name };
};

/**
 * Résout le destinataire d'un achat. Priorité aux joueurs déjà vus par le serveur (UUID certain),
 * sinon compte Java officiel via Mojang (côté serveur). L'UUID est figé dans la commande.
 */
export async function resolveRecipient(sql: Sql, username: string, lookup: MojangLookup): Promise<{ uuid: string; username: string } | null> {
  const [known] = await sql<{ uuid: string; username: string }[]>`
    SELECT uuid, username FROM players WHERE lower(username) = lower(${username}) ORDER BY last_seen_at DESC NULLS LAST LIMIT 1`;
  if (known) return known;
  return lookup(username);
}
