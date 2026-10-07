import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { BRIDGE_HEADERS, BridgeEventBatch, CommandAck } from "@vaeloria/types";
import type { AppContext } from "../context";
import { HttpError, unauthorized } from "../lib/errors";
import { SIGNATURE_MAX_SKEW_MS, safeEqualHex, signPayload } from "../lib/hmac";
import { parse } from "../lib/validate";
import { ingestEvents } from "../services/bridgeIngest";
import { ackCommand, claimCommands } from "../services/commands";

/**
 * Canal serveur Minecraft → API. Chaque requête est signée (HMAC-SHA256) :
 *   signature = HMAC(secret, `${timestamp}.${nonce}.${corps brut}`)
 * Rejetée si : clé inconnue, horodatage hors fenêtre de 5 min, nonce déjà vu, signature fausse.
 */
export async function bridgeRoutes(app: FastifyInstance, ctx: AppContext) {
  const { sql, bridgeKeys } = ctx;

  async function verify(req: FastifyRequest): Promise<string> {
    const h = (name: string) => {
      const v = req.headers[name];
      return typeof v === "string" ? v : "";
    };
    const keyId = h(BRIDGE_HEADERS.keyId);
    const timestamp = h(BRIDGE_HEADERS.timestamp);
    const nonce = h(BRIDGE_HEADERS.nonce);
    const signature = h(BRIDGE_HEADERS.signature);
    const secret = bridgeKeys.get(keyId);
    if (!secret || !timestamp || !signature || !/^[A-Za-z0-9-]{16,64}$/.test(nonce)) throw unauthorized("Signature manquante ou clé inconnue");
    const ts = Number(timestamp);
    if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > SIGNATURE_MAX_SKEW_MS) throw unauthorized("Horodatage hors fenêtre");
    const expected = signPayload(secret, timestamp, nonce, req.rawBody ?? "");
    if (!safeEqualHex(expected, signature)) throw unauthorized("Signature invalide");
    // Nonce à usage unique (vérifié après la signature pour ne pas remplir la table avec des requêtes forgées).
    const fresh = await sql`INSERT INTO bridge_nonces (nonce) VALUES (${`${keyId}:${nonce}`}) ON CONFLICT DO NOTHING RETURNING nonce`;
    if (fresh.length === 0) throw unauthorized("Nonce déjà utilisé (rejeu)");
    return keyId;
  }

  app.addHook("preHandler", async (req) => {
    req.log = req.log.child({ bridgeKey: await verify(req) });
  });

  // Nettoyage périodique des nonces expirés (au-delà de la fenêtre, un rejeu est rejeté par l'horodatage).
  const sweep = setInterval(() => {
    sql`DELETE FROM bridge_nonces WHERE created_at < now() - interval '15 minutes'`.catch(() => {});
  }, 5 * 60_000);
  sweep.unref();
  app.addHook("onClose", async () => clearInterval(sweep));

  app.post("/events", { config: { rateLimit: { max: 600, timeWindow: "1 minute" } } }, async (req) => {
    const { events } = parse(BridgeEventBatch, req.body);
    const result = await ingestEvents(sql, events);
    if (result.accepted > 0) {
      ctx.cache.invalidate("status:");
      ctx.cache.invalidate("players:");
    }
    return result;
  });

  app.post("/commands/claim", async (req) => {
    const { server, limit } = parse(z.object({ server: z.string().min(1).max(32), limit: z.number().int().min(1).max(100).default(25) }), req.body);
    return { commands: await claimCommands(sql, server, limit) };
  });

  app.post("/commands/:id/ack", async (req) => {
    const { id } = parse(z.object({ id: z.string().uuid() }), req.params);
    const ack = parse(CommandAck, req.body);
    const r = await ackCommand(sql, id, ack);
    if (r === "not_found") throw new HttpError(404, "not_found", "Commande introuvable");
    return { result: r };
  });
}
