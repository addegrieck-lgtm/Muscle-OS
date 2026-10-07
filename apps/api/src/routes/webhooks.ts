import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context";
import { HttpError } from "../lib/errors";
import { handlePaymentFailed, handlePaymentSucceeded, handleRefund } from "../services/orders";
import { WebhookSignatureError } from "../services/payments/provider";

/**
 * Seule porte d'entrée qui confirme un paiement. Le corps brut est vérifié (signature + fraîcheur)
 * avant toute lecture ; chaque événement n'est traité qu'une fois (payment_events).
 */
/**
 * Vérifie puis traite un webhook de prestataire. Partagé par la route publique et par la page
 * du prestataire de test (qui fournit un corps réellement signé : même chemin de vérification).
 */
export async function processWebhook(ctx: AppContext, provider: string, rawBody: string, headers: Record<string, string | string[] | undefined>): Promise<string> {
  const { sql } = ctx;
  const p = ctx.payments;
  if (!p || p.name !== provider) throw new HttpError(404, "not_found", "Prestataire inconnu");

  let event;
  try {
    event = p.parseWebhook(rawBody, headers);
  } catch (e) {
    if (e instanceof WebhookSignatureError) {
      await sql`INSERT INTO audit_logs (actor_type, action, target_type, target_id, metadata)
                VALUES ('webhook', 'webhook.rejected', 'provider', ${provider}, ${sql.json({ reason: e.message })})`;
      throw new HttpError(400, "invalid_signature", e.message);
    }
    throw new HttpError(400, "invalid_payload", "Événement illisible");
  }

  let result: string;
  switch (event.kind) {
    case "payment.succeeded":
      result = await handlePaymentSucceeded(sql, { provider, providerEventId: event.id, providerPaymentId: event.providerPaymentId, orderId: event.orderId, amountCents: event.amountCents, currency: event.currency, payload: event.raw });
      break;
    case "payment.failed":
      result = await handlePaymentFailed(sql, { provider, providerEventId: event.id, orderId: event.orderId, reason: event.reason, payload: event.raw });
      break;
    case "refund.succeeded": {
      const outcomes = [];
      for (const r of event.refunds) {
        outcomes.push(await handleRefund(sql, { provider, providerEventId: `${event.id}:${r.id}`, providerPaymentId: event.providerPaymentId, providerRefundId: r.id, amountCents: r.amountCents, reason: r.reason, payload: event.raw }));
      }
      result = outcomes.join(",") || "no_refund";
      break;
    }
    default:
      result = "ignored";
  }
  ctx.cache.invalidate("shop:");
  return result;
}

/**
 * Seule porte d'entrée qui confirme un paiement. Le corps brut est vérifié (signature + fraîcheur)
 * avant toute lecture ; chaque événement n'est traité qu'une fois (payment_events).
 */
export async function webhookRoutes(app: FastifyInstance, ctx: AppContext) {
  app.post("/payments/:provider", { config: { rateLimit: { max: 300, timeWindow: "1 minute" } } }, async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const result = await processWebhook(ctx, provider, req.rawBody ?? "", req.headers);
    // 200 même pour un doublon : le prestataire arrête de renvoyer l'événement.
    reply.code(200);
    return { received: true, result };
  });
}
