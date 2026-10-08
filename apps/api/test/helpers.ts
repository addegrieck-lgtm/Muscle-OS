import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/app";
import { createDb, type Sql } from "../src/db";
import { loadEnv } from "../src/env";
import { TtlCache } from "../src/lib/cache";
import { signPayload } from "../src/lib/hmac";
import { migrate } from "../src/migrate";
import { createSandboxProvider, SANDBOX_SIGNATURE_HEADER, signSandbox, type SandboxEvent } from "../src/services/payments/sandbox";

export const TEST_DB = process.env.DATABASE_URL_TEST ?? "postgres://vaeloria:vaeloria@localhost:5432/vaeloria_test";
export const BRIDGE_ID = "test-1";
export const BRIDGE_SECRET = "s".repeat(64);
export const ADMIN_TOKEN = "admin-token-for-tests-0123456789";
export const INTERNAL_TOKEN = "internal-token-for-tests-0123456789";
export const SANDBOX_SECRET = "sandbox-secret-for-tests-0123456789abcdef";

/** Faux annuaire Mojang : seuls ces pseudos existent. */
export const MOJANG: Record<string, string> = {
  steve: "55555555-5555-4555-8555-555555555555",
  alex: "66666666-6666-4666-8666-666666666666",
};

/** Base de test remise à zéro puis migrée. Ne jamais pointer vers une base réelle. */
export async function freshDb(): Promise<Sql> {
  if (!/_test\b/.test(TEST_DB)) throw new Error("DATABASE_URL_TEST doit désigner une base *_test");
  const sql = createDb(TEST_DB, { max: 5 });
  await sql.unsafe("DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  await migrate(sql, () => {});
  return sql;
}

export async function testApp(sql: Sql, overrides: Partial<Parameters<typeof buildApp>[0]> = {}, envExtra: Record<string, string> = {}): Promise<FastifyInstance> {
  const env = loadEnv({
    NODE_ENV: "test", DATABASE_URL: TEST_DB, ADMIN_API_TOKEN: ADMIN_TOKEN, WEB_INTERNAL_TOKEN: INTERNAL_TOKEN, DEV_LOGIN: "1",
    PAYMENT_PROVIDER: "sandbox", SANDBOX_WEBHOOK_SECRET: SANDBOX_SECRET, ...envExtra,
  } as NodeJS.ProcessEnv);
  return buildApp({
    sql,
    cache: new TtlCache(),
    env,
    bridgeKeys: new Map([[BRIDGE_ID, BRIDGE_SECRET]]),
    payments: createSandboxProvider({ publicApiUrl: env.PUBLIC_API_URL, webhookSecret: SANDBOX_SECRET }),
    mojang: async (name) => (MOJANG[name.toLowerCase()] ? { uuid: MOJANG[name.toLowerCase()]!, username: name } : null),
    ...overrides,
  });
}

/** Webhook sandbox correctement signé (ou falsifié via `secret`). */
export function sandboxWebhook(app: FastifyInstance, event: SandboxEvent, opts: { secret?: string; timestamp?: number } = {}) {
  const body = JSON.stringify(event);
  return app.inject({
    method: "POST",
    url: "/webhooks/payments/sandbox",
    payload: body,
    headers: { "content-type": "application/json", [SANDBOX_SIGNATURE_HEADER]: signSandbox(opts.secret ?? SANDBOX_SECRET, opts.timestamp ?? Math.floor(Date.now() / 1000), body) },
  });
}

export async function devLogin(app: FastifyInstance, name: string): Promise<string> {
  const res = await app.inject({ method: "POST", url: "/internal/v1/auth/dev-login", headers: { "x-internal-token": INTERNAL_TOKEN }, payload: { name } });
  return res.json().token as string;
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
