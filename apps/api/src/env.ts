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

  // ── Comptes ──
  /** Jeton partagé site ↔ API pour les routes /internal (connexion). */
  WEB_INTERNAL_TOKEN: z.string().min(24).optional(),
  DISCORD_CLIENT_ID: z.string().optional(),
  DISCORD_CLIENT_SECRET: z.string().optional(),
  /**
   * Code secret permettant à un compte connecté de devenir propriétaire (accès au back-office).
   * À définir au déploiement, utiliser une fois, puis retirer. Vide = désactivé.
   */
  ADMIN_SETUP_CODE: z.string().min(16, "ADMIN_SETUP_CODE : 16 caractères minimum").optional().or(z.literal("")),
  /** Connexion sans Discord pour le développement uniquement (refusée en production). */
  DEV_LOGIN: z.enum(["0", "1"]).default("0"),

  // ── Boutique / paiement ──
  SITE_URL: z.string().url().default("http://localhost:3000"),
  PUBLIC_API_URL: z.string().url().default("http://localhost:4000"),
  PAYMENT_PROVIDER: z.enum(["none", "sandbox", "stripe"]).default("none"),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  SANDBOX_WEBHOOK_SECRET: z.string().min(32).optional(),
}).superRefine((e, ctx) => {
  if (e.NODE_ENV === "production" && e.PAYMENT_PROVIDER === "sandbox") ctx.addIssue({ code: "custom", path: ["PAYMENT_PROVIDER"], message: "sandbox interdit en production" });
  if (e.NODE_ENV === "production" && e.DEV_LOGIN === "1") ctx.addIssue({ code: "custom", path: ["DEV_LOGIN"], message: "connexion de développement interdite en production" });
  if (e.PAYMENT_PROVIDER === "stripe" && (!e.STRIPE_SECRET_KEY || !e.STRIPE_WEBHOOK_SECRET)) ctx.addIssue({ code: "custom", path: ["STRIPE_SECRET_KEY"], message: "STRIPE_SECRET_KEY et STRIPE_WEBHOOK_SECRET requis" });
  if (e.PAYMENT_PROVIDER === "sandbox" && !e.SANDBOX_WEBHOOK_SECRET) ctx.addIssue({ code: "custom", path: ["SANDBOX_WEBHOOK_SECRET"], message: "requis avec PAYMENT_PROVIDER=sandbox" });
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
