import { DatabaseError, type Db } from './db';

/**
 * Migrations versionnées : l'élément i fait passer le schéma de la version i à i + 1.
 * Ne jamais modifier une migration publiée : en ajouter une nouvelle à la fin.
 */
export const MIGRATIONS: readonly string[] = [
  // v1 — schéma initial
  `
  CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS challenges (
    id TEXT PRIMARY KEY NOT NULL,
    owner_id TEXT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('classic', 'reverse', 'free', 'custom')),
    currency TEXT NOT NULL,
    target_cents INTEGER NOT NULL CHECK (target_cents >= 0),
    unit_cents INTEGER NOT NULL CHECK (unit_cents > 0),
    week_count INTEGER NOT NULL CHECK (week_count > 0),
    start_date TEXT NOT NULL,
    strategy TEXT CHECK (strategy IS NULL OR strategy IN ('equal', 'increasing', 'decreasing')),
    icon TEXT NOT NULL,
    color TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'completed', 'archived')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );

  CREATE TABLE IF NOT EXISTS challenge_weeks (
    challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    week_index INTEGER NOT NULL CHECK (week_index > 0),
    planned_cents INTEGER CHECK (planned_cents IS NULL OR planned_cents >= 0),
    skipped INTEGER NOT NULL DEFAULT 0 CHECK (skipped IN (0, 1)),
    updated_at TEXT NOT NULL,
    PRIMARY KEY (challenge_id, week_index)
  );

  CREATE TABLE IF NOT EXISTS deposits (
    id TEXT PRIMARY KEY NOT NULL,
    challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
    week_index INTEGER NOT NULL CHECK (week_index > 0),
    amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
    deposited_on TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS deposits_challenge_idx ON deposits (challenge_id, week_index);
  `,
];

export const DATABASE_VERSION = MIGRATIONS.length;

/** Applique les migrations manquantes, chacune dans une transaction. */
export async function migrate(db: Db): Promise<number> {
  await db.execAsync('PRAGMA foreign_keys = ON;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const current = row?.user_version ?? 0;
  if (current > DATABASE_VERSION) {
    throw new DatabaseError(
      `La base locale (v${current}) est plus récente que l'application (v${DATABASE_VERSION}). Mettez l'application à jour.`,
    );
  }
  for (let version = current; version < DATABASE_VERSION; version++) {
    try {
      await db.withTransactionAsync(async () => {
        await db.execAsync(MIGRATIONS[version]);
        await db.execAsync(`PRAGMA user_version = ${version + 1}`);
      });
    } catch (error) {
      throw new DatabaseError(`Échec de la migration v${version + 1}`, error);
    }
  }
  return DATABASE_VERSION;
}
