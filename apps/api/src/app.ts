import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import type { AppContext } from "./context";
import { HttpError } from "./lib/errors";
import { openApiSpec } from "./openapi";
import { adminRoutes } from "./routes/admin";
import { bridgeRoutes } from "./routes/bridge";
import { publicRoutes } from "./routes/public";
import { v1Routes } from "./routes/v1";
import { adminShopRoutes } from "./routes/adminShop";
import { internalRoutes } from "./routes/internal";
import { meRoutes } from "./routes/me";
import { sandboxRoutes } from "./routes/sandbox";
import { shopRoutes } from "./routes/shop";
import { webhookRoutes } from "./routes/webhooks";
import { adminWorldRoutes } from "./routes/adminWorld";
import { worldRoutes } from "./routes/world";

export async function buildApp(ctx: AppContext): Promise<FastifyInstance> {
  const isProd = ctx.env.NODE_ENV === "production";
  const app = Fastify({
    logger: ctx.env.NODE_ENV === "test" ? false : { level: isProd ? "info" : "debug", redact: ["req.headers.authorization", "req.headers['x-api-key']", "req.headers['x-vaeloria-signature']"] },
    trustProxy: true, // derrière le reverse proxy / CDN : IP réelle pour le rate limiting
    bodyLimit: 512 * 1024,
  });

  // Corps brut conservé pour la vérification HMAC du bridge.
  app.addContentTypeParser("application/json", { parseAs: "string" }, (req, body, done) => {
    req.rawBody = body as string;
    if (!body) return done(null, undefined);
    try {
      done(null, JSON.parse(body as string));
    } catch {
      done(new HttpError(400, "invalid_json", "JSON invalide"), undefined);
    }
  });
  app.addContentTypeParser("text/plain", { parseAs: "string" }, (_req, body, done) => done(null, body));

  await app.register(cors, {
    origin: ctx.env.CORS_ORIGINS.split(",").map((s) => s.trim()),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: false,
  });
  await app.register(rateLimit, { global: true, max: 300, timeWindow: "1 minute" });

  app.setErrorHandler((error, req, reply) => {
    if (error instanceof HttpError) {
      return reply.code(error.statusCode).send({ error: { code: error.code, message: error.message, details: error.details } });
    }
    const status = (error as { statusCode?: number }).statusCode ?? 500;
    if (status === 429) return reply.code(429).send({ error: { code: "rate_limited", message: "Trop de requêtes, réessayez dans un instant." } });
    if (status < 500) return reply.code(status).send({ error: { code: "bad_request", message: error.message } });
    req.log.error(error);
    return reply.code(500).send({ error: { code: "internal", message: "Erreur interne" } });
  });
  app.setNotFoundHandler((_req, reply) => reply.code(404).send({ error: { code: "not_found", message: "Route inconnue" } }));

  app.get("/health", { config: { rateLimit: false } }, async () => {
    await ctx.sql`SELECT 1`;
    return { ok: true };
  });

  app.get("/docs/openapi.json", async () => openApiSpec({ includePrivate: !isProd }));

  await app.register((i) => v1Routes(i, ctx), { prefix: "/api/v1" });
  await app.register((i) => publicRoutes(i, ctx), { prefix: "/public/v1" });
  await app.register((i) => bridgeRoutes(i, ctx), { prefix: "/bridge/v1" });
  await app.register((i) => adminRoutes(i, ctx), { prefix: "/admin/v1" });
  await app.register((i) => shopRoutes(i, ctx), { prefix: "/api/v1/shop" });
  await app.register((i) => meRoutes(i, ctx), { prefix: "/api/v1/me" });
  await app.register((i) => worldRoutes(i, ctx), { prefix: "/api/v1" });
  await app.register((i) => adminWorldRoutes(i, ctx), { prefix: "/admin/v1/world" });
  await app.register((i) => internalRoutes(i, ctx), { prefix: "/internal/v1" });
  await app.register((i) => webhookRoutes(i, ctx), { prefix: "/webhooks" });
  await app.register((i) => adminShopRoutes(i, ctx), { prefix: "/admin/v1/shop" });
  if (ctx.payments?.name === "sandbox" && !isProd) await app.register((i) => sandboxRoutes(i, ctx), { prefix: "/sandbox" });

  return app;
}
