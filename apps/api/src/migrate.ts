import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createDb, type Sql } from "./db";

const here = dirname(fileURLToPath(import.meta.url));
// src/ en dev, dist/ en production : les migrations sont toujours dans ../migrations
const MIGRATIONS_DIR = join(here, "..", "migrations");

/** Applique les fichiers NNN_nom.sql non encore appliqués, chacun dans une transaction. */
export async function migrate(sql: Sql, log: (msg: string) => void = console.log): Promise<string[]> {
  await sql`CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())`;
  // Verrou consultatif : deux instances qui démarrent en même temps ne migrent pas en parallèle.
  await sql`SELECT pg_advisory_lock(727274)`;
  try {
    const applied = new Set((await sql<{ name: string }[]>`SELECT name FROM schema_migrations`).map((r) => r.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort();
    const done: string[] = [];
    for (const file of files) {
      if (applied.has(file)) continue;
      const content = await readFile(join(MIGRATIONS_DIR, file), "utf8");
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`INSERT INTO schema_migrations (name) VALUES (${file})`;
      });
      log(`migration appliquée : ${file}`);
      done.push(file);
    }
    return done;
  } finally {
    await sql`SELECT pg_advisory_unlock(727274)`;
  }
}

// Exécution directe uniquement (`tsx src/migrate.ts` ou `node dist/migrate.js`), pas quand le module est bundlé dans index.js.
if (/migrate\.(ts|js)$/.test(process.argv[1] ?? "")) {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL manquant");
  const sql = createDb(url, { max: 1 });
  migrate(sql)
    .then((done) => console.log(done.length ? `${done.length} migration(s) appliquée(s)` : "Base à jour"))
    .finally(() => sql.end());
}
