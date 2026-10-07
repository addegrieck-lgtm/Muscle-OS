import type { Sql } from "./db";
import type { Env } from "./env";
import type { TtlCache } from "./lib/cache";
import type { pingMinecraft } from "./lib/minecraftPing";
import type { MojangLookup } from "./services/identity";
import type { PaymentProvider } from "./services/payments/provider";

export interface AppContext {
  sql: Sql;
  cache: TtlCache;
  env: Env;
  bridgeKeys: Map<string, string>;
  /** Prestataire de paiement actif (null = boutique en lecture seule). */
  payments: PaymentProvider | null;
  /** Injectables pour les tests. */
  pinger?: typeof pingMinecraft;
  mojang?: MojangLookup;
  discordFetch?: typeof fetch;
}

declare module "fastify" {
  interface FastifyRequest {
    user?: { id: string; role: string };
  }
}

declare module "fastify" {
  interface FastifyRequest {
    rawBody?: string;
  }
}
