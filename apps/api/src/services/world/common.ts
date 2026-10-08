import type { Sql, Tx } from "../../db";

export type Db = Sql | Tx;

export async function setting<T>(db: Db, key: string, fallback: T): Promise<T> {
  const [row] = await db<{ value: unknown }[]>`SELECT value FROM site_settings WHERE key = ${key}`;
  return (row?.value as T) ?? fallback;
}

/**
 * Nom public d'un compte : pseudo Minecraft lié, sinon « Fondateur #N », sinon « Joueur ».
 * Le pseudo Discord n'est jamais exposé publiquement.
 */
export const publicNameSql = (db: Db, userAlias = "u") => db.unsafe(`coalesce(
  (SELECT p.username FROM minecraft_accounts ma JOIN players p ON p.uuid = ma.player_uuid WHERE ma.user_id = ${userAlias}.id ORDER BY ma.linked_at LIMIT 1),
  (SELECT 'Fondateur #' || f.number FROM founders f WHERE f.user_id = ${userAlias}.id),
  'Joueur')`);

/** Pseudo Minecraft lié (null sinon) : seul identifiant utilisable pour un lien de profil /joueur. */
export const usernameSql = (db: Db, userAlias = "u") =>
  db.unsafe(`(SELECT p.username FROM minecraft_accounts ma JOIN players p ON p.uuid = ma.player_uuid WHERE ma.user_id = ${userAlias}.id ORDER BY ma.linked_at LIMIT 1)`);

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function randomCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function slugify(v: string): string {
  return v.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/æ/g, "ae").replace(/œ/g, "oe")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}
