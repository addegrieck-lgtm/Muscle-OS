import { z } from "zod";

const Env = z.object({
  NODE_ENV: z.enum(["development", "test", "staging", "production"]).default("development"),
  PORT: z.coerce.number().int().default(4000),
  HOST: z.string().default("0.0.0.0"),
  DATABASE_URL: z.string().url(),
  CORS_ORIGINS: z.string().default("http://localhost:3000,http://localhost:3001"),
  BRIDGE_KEYS: z.string().default(""),
  ADMIN_API_TOKEN: z.string().min(24, "ADMIN_API_TOKEN doit faire au moins 24 caractères").optional(),
  MC_PING_HOST: z.string().optional(),
  MC_PING_PORT: z.coerce.number().int().default(25565),
  DISCORD_WEBHOOK_URL: z.string().url().optional().or(z.literal("")),
});

export type Env = z.infer<typeof Env>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  const parsed = Env.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${issues}`);
  }
  return parsed.data;
}

/** "id1:secret1,id2:secret2" → Map. Plusieurs clés = rotation sans interruption. */
export function parseBridgeKeys(raw: string): Map<string, string> {
  const keys = new Map<string, string>();
  for (const pair of raw.split(",").map((s) => s.trim()).filter(Boolean)) {
    const idx = pair.indexOf(":");
    if (idx <= 0) throw new Error("BRIDGE_KEYS mal formé (attendu id:secret)");
    const id = pair.slice(0, idx);
    const secret = pair.slice(idx + 1);
    if (secret.length < 32) throw new Error(`Secret de la clé bridge "${id}" trop court (32 caractères minimum)`);
    keys.set(id, secret);
  }
  return keys;
}
