import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";
import { createDb, type Sql } from "../src/db";
import { loadEnv } from "../src/env";
import { TtlCache } from "../src/lib/cache";
import { signPayload } from "../src/lib/hmac";
import { migrate } from "../src/migrate";

export const TEST_DB = process.env.DATABASE_URL_TEST ?? "postgres://vaeloria:vaeloria@localhost:5432/vaeloria_test";
export const BRIDGE_ID = "test-1";
export const BRIDGE_SECRET = "s".repeat(64);
export const ADMIN_TOKEN = "admin-token-for-tests-0123456789";

/** Base de test remise à zéro puis migrée. Ne jamais pointer vers une base réelle. */
export async function freshDb(): Promise<Sql> {
  if (!/_test\b/.test(TEST_DB)) throw new Error("DATABASE_URL_TEST doit désigner une base *_test");
  const sql = createDb(TEST_DB, { max: 5 });
  await sql.unsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate(sql, () => {});
  return sql;
}

export async function testApp(sql: Sql, overrides: Partial<Parameters<typeof buildApp>[0]> = {}): Promise<FastifyInstance> {
  const env = loadEnv({ NODE_ENV: "test", DATABASE_URL: TEST_DB, ADMIN_API_TOKEN: ADMIN_TOKEN } as NodeJS.ProcessEnv);
  return buildApp({ sql, cache: new TtlCache(), env, bridgeKeys: new Map([[BRIDGE_ID, BRIDGE_SECRET]]), ...overrides });
}

export function signedHeaders(body: string, opts: { nonce?: string; timestamp?: number; secret?: string; keyId?: string } = {}) {
  const timestamp = String(opts.timestamp ?? Date.now());
  const nonce = opts.nonce ?? randomUUID();
  return {
    "content-type": "application/json",
    "x-vaeloria-key": opts.keyId ?? BRIDGE_ID,
    "x-vaeloria-timestamp": timestamp,
    "x-vaeloria-nonce": nonce,
    "x-vaeloria-signature": signPayload(opts.secret ?? BRIDGE_SECRET, timestamp, nonce, body),
  };
}

export const ev = (event: Record<string, unknown>) => ({ id: randomUUID(), server: "factions", occurredAt: new Date().toISOString(), ...event });

export async function activeSeason(sql: Sql): Promise<string> {
  const [s] = await sql<{ id: string }[]>`
    INSERT INTO seasons (number, name, status, starts_at) VALUES (1, 'Saison I', 'active', now()) RETURNING id`;
  return s!.id;
}
