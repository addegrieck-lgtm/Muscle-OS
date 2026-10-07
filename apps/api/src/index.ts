import { buildApp } from "./app";
import { createDb } from "./db";
import { loadEnv, parseBridgeKeys } from "./env";
import { TtlCache } from "./lib/cache";
import { migrate } from "./migrate";

const env = loadEnv();
const sql = createDb(env.DATABASE_URL);
await migrate(sql, (m) => console.log(m));

const app = await buildApp({ sql, cache: new TtlCache(), env, bridgeKeys: parseBridgeKeys(env.BRIDGE_KEYS) });

const shutdown = async (signal: string) => {
  app.log.info(`${signal} reçu, arrêt propre`);
  await app.close();
  await sql.end({ timeout: 5 });
  process.exit(0);
};
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

await app.listen({ port: env.PORT, host: env.HOST });
