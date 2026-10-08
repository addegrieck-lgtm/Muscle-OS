import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { AppContext } from "../context";
import { notFound } from "../lib/errors";
import { SANDBOX_SIGNATURE_HEADER, signSandbox, type SandboxEvent } from "../services/payments/sandbox";
import { processWebhook } from "./webhooks";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/**
 * Page de paiement du prestataire de TEST (enregistrée seulement si PAYMENT_PROVIDER=sandbox,
 * jamais en production). Le bouton « Payer » fait émettre par le serveur un webhook signé,
 * exactement comme le ferait Stripe : la boutique ne fait pas de différence.
 */
export async function sandboxRoutes(app: FastifyInstance, ctx: AppContext) {
  const { sql, env } = ctx;
  const secret = env.SANDBOX_WEBHOOK_SECRET!;
  // Les boutons de la page sont de simples formulaires HTML (corps vide, ignoré).
  app.addContentTypeParser("application/x-www-form-urlencoded", { parseAs: "string" }, (_req, _body, done) => done(null, {}));

  async function load(checkoutId: string) {
    const [o] = await sql<{ id: string; publicId: string; total: number; status: string }[]>`
      SELECT id, public_id AS "publicId", total_cents AS total, status FROM orders WHERE provider = 'sandbox' AND provider_checkout_id = ${checkoutId}`;
    if (!o) throw notFound("Session de paiement");
    return o;
  }

  app.get("/checkout/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const o = await load(id);
    const amount = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(o.total / 100);
    reply.type("text/html; charset=utf-8").header("cache-control", "no-store");
    return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Paiement de test</title><style>body{font-family:system-ui;background:#f4f4f5;color:#111;display:grid;place-items:center;min-height:100vh;margin:0}
main{background:#fff;border-radius:12px;padding:28px;max-width:360px;width:calc(100% - 32px);box-shadow:0 10px 30px #0002}
.tag{display:inline-block;background:#fde68a;color:#78350f;font-size:12px;font-weight:700;padding:3px 8px;border-radius:6px}
button{width:100%;height:48px;border:0;border-radius:8px;font-size:16px;font-weight:700;margin-top:10px;cursor:pointer}
.ok{background:#16a34a;color:#fff}.ko{background:#e4e4e7;color:#111}</style></head><body><main>
<span class="tag">PRESTATAIRE DE TEST — aucun argent réel</span>
<h1 style="font-size:20px">Commande ${esc(o.publicId)}</h1><p style="font-size:28px;font-weight:800;margin:8px 0">${amount}</p>
${o.status === "pending"
  ? `<form method="post" action="./${esc(id)}/pay"><button class="ok">Payer (succès)</button></form>
     <form method="post" action="./${esc(id)}/fail"><button class="ko">Refuser le paiement</button></form>`
  : `<p>Statut : ${esc(o.status)}</p>`}
</main></body></html>`;
  });

  async function emit(event: SandboxEvent) {
    const body = JSON.stringify(event);
    const ts = Math.floor(Date.now() / 1000);
    // Corps signé puis vérifié par le même code que les webhooks reçus de l'extérieur.
    await processWebhook(ctx, "sandbox", body, { [SANDBOX_SIGNATURE_HEADER]: signSandbox(secret, ts, body) });
  }

  app.post("/checkout/:id/pay", async (req, reply) => {
    const { id } = req.params as { id: string };
    const o = await load(id);
    await emit({ id: `evt_${randomUUID()}`, type: "payment.succeeded", orderId: o.id, paymentId: `pay_${id}`, amountCents: o.total, currency: "EUR" });
    return reply.redirect(`${env.SITE_URL.replace(/\/$/, "")}/checkout/confirmation?commande=${o.publicId}`, 303);
  });

  app.post("/checkout/:id/fail", async (req, reply) => {
    const { id } = req.params as { id: string };
    const o = await load(id);
    await emit({ id: `evt_${randomUUID()}`, type: "payment.failed", orderId: o.id, paymentId: `pay_${id}`, amountCents: o.total, currency: "EUR" });
    return reply.redirect(`${env.SITE_URL.replace(/\/$/, "")}/boutique/panier?echec=${o.publicId}`, 303);
  });
}
