import type { Sql } from "./db";
import type { Env } from "./env";
import type { TtlCache } from "./lib/cache";
import type { pingMinecraft } from "./lib/minecraftPing";

export interface AppContext {
  sql: Sql;
  cache: TtlCache;
  env: Env;
  bridgeKeys: Map<string, string>;
  /** Injectable pour les tests. */
  pinger?: typeof pingMinecraft;
}

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}
