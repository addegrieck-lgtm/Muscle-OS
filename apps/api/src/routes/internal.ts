import type { FastifyInstance } from "fastify";
import { z } from "zod";
import type { AppContext } from "../context";
import { HttpError, unauthorized } from "../lib/errors";
import { safeEqualString } from "../lib/hmac";
import { parse } from "../lib/validate";
import { createSession, exchangeDiscordCode, upsertDiscordUser } from "../services/identity";

/**
 * Routes serveur-à-serveur appelées par le site (Next) pour ouvrir une session.
 * Le site garde le jeton dans un cookie HttpOnly ; le navigateur ne voit jamais ces routes.
 */
export async function internalRoutes(app: FastifyInstance, ctx: AppContext) {
  const { sql, env } = ctx;

  app.addHook("onRequest", async (req) => {
    const t = req.headers["x-internal-token"];
    if (!env.WEB_INTERNAL_TOKEN || typeof t !== "string" || !safeEqualString(t, env.WEB_INTERNAL_TOKEN)) throw unauthorized();
  });

  app.post("/auth/discord", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req) => {
    const { code, redirectUri, userAgent, referralCode } = parse(z.object({ code: z.string().min(5).max(200), redirectUri: z.string().url(), userAgent: z.string().max(300).optional(), referralCode: z.string().max(20).optional() }), req.body);
    if (!env.DISCORD_CLIENT_ID || !env.DISCORD_CLIENT_SECRET) throw new HttpError(503, "discord_not_configured", "Connexion Discord non configurée");
    let profile;
    try {
      profile = await exchangeDiscordCode({ clientId: env.DISCORD_CLIENT_ID, clientSecret: env.DISCORD_CLIENT_SECRET }, code, redirectUri, ctx.discordFetch);
    } catch (e) {
      throw new HttpError(401, "discord_refused", (e as Error).message);
    }
    const userId = await upsertDiscordUser(sql, profile, { referralCode });
    return createSession(sql, userId, userAgent);
  });

  /** Développement uniquement : se connecter sans Discord pour tester la boutique de bout en bout. */
  app.post("/auth/dev-login", async (req) => {
    if (env.DEV_LOGIN !== "1" || env.NODE_ENV === "production") throw new HttpError(404, "not_found", "Route inconnue");
    const { name, referralCode } = parse(z.object({ name: z.string().regex(/^[A-Za-z0-9_]{3,16}$/), referralCode: z.string().max(20).optional() }), req.body);
    const userId = await upsertDiscordUser(sql, { discordId: `dev-${name.toLowerCase()}`, username: name, displayName: name, avatar: null }, { referralCode });
    return createSession(sql, userId, "dev-login");
  });
}
