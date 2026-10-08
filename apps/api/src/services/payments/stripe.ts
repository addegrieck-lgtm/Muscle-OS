/**
 * Adaptateur Stripe (Checkout Session) sans SDK : API REST + vérification de la signature
 * `Stripe-Signature` (HMAC-SHA256 de `${t}.${corps}`, tolérance 5 min). Aucune donnée bancaire
 * ne transite par VÆLORIA : le joueur paie sur la page hébergée par Stripe.
 */
import { createHmac } from "node:crypto";
import { safeEqualHex } from "../../lib/hmac";
import { header, WEBHOOK_TOLERANCE_SECONDS, WebhookSignatureError, type CheckoutRequest, type PaymentProvider, type ProviderEvent } from "./provider";

export function stripeSignature(secret: string, timestamp: number, payload: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
}

export function createStripeProvider(cfg: { secretKey: string; webhookSecret: string; fetcher?: typeof fetch; now?: () => number }): PaymentProvider {
  const fetcher = cfg.fetcher ?? fetch;
  const now = cfg.now ?? (() => Date.now());
  return {
    name: "stripe",
    async createCheckout(req: CheckoutRequest) {
      const form = new URLSearchParams({
        mode: "payment",
        success_url: req.successUrl,
        cancel_url: req.cancelUrl,
        client_reference_id: req.orderId,
        "metadata[order_id]": req.orderId,
        "metadata[public_id]": req.publicId,
        "payment_intent_data[metadata][order_id]": req.orderId,
        locale: "fr",
        // Stripe impose au moins 30 minutes ; la commande expire de son côté au même moment.
        expires_at: String(Math.floor(req.expiresAt.getTime() / 1000)),
      });
      req.lines.forEach((l, i) => {
        form.set(`line_items[${i}][quantity]`, String(l.quantity));
        form.set(`line_items[${i}][price_data][currency]`, req.currency.toLowerCase());
        form.set(`line_items[${i}][price_data][unit_amount]`, String(l.unitAmountCents));
        form.set(`line_items[${i}][price_data][product_data][name]`, l.name);
      });
      const res = await fetcher("https://api.stripe.com/v1/checkout/sessions", {
        method: "POST",
        headers: { authorization: `Bearer ${cfg.secretKey}`, "content-type": "application/x-www-form-urlencoded", "idempotency-key": `checkout:${req.orderId}` },
        body: form,
        signal: AbortSignal.timeout(10_000),
      });
      const body = (await res.json()) as { id?: string; url?: string; error?: { message?: string } };
      if (!res.ok || !body.id || !body.url) throw new Error(`Stripe : ${body.error?.message ?? res.status}`);
      return { checkoutId: body.id, url: body.url };
    },
    parseWebhook(rawBody, headers): ProviderEvent {
      const sig = header(headers, "stripe-signature");
      const parts = Object.fromEntries(sig.split(",").map((kv) => kv.split("=") as [string, string]));
      const t = Number(parts.t);
      const v1 = sig.split(",").filter((kv) => kv.startsWith("v1=")).map((kv) => kv.slice(3));
      if (!Number.isFinite(t) || v1.length === 0) throw new WebhookSignatureError("En-tête Stripe-Signature invalide");
      if (Math.abs(now() / 1000 - t) > WEBHOOK_TOLERANCE_SECONDS) throw new WebhookSignatureError("Événement trop ancien (rejeu ?)");
      const expected = stripeSignature(cfg.webhookSecret, t, rawBody);
      if (!v1.some((s) => safeEqualHex(s, expected))) throw new WebhookSignatureError("Signature Stripe invalide");

      const event = JSON.parse(rawBody) as { id: string; type: string; data: { object: Record<string, unknown> } };
      const o = event.data.object as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded":
          if (o.payment_status !== "paid") return { kind: "ignored", id: event.id, type: `${event.type}:${o.payment_status}` };
          return { kind: "payment.succeeded", id: event.id, orderId: String(o.metadata?.order_id ?? o.client_reference_id), providerPaymentId: String(o.payment_intent), amountCents: Number(o.amount_total), currency: String(o.currency).toUpperCase(), raw: event };
        case "checkout.session.async_payment_failed":
        case "checkout.session.expired":
          return { kind: "payment.failed", id: event.id, orderId: String(o.metadata?.order_id ?? o.client_reference_id), reason: event.type, raw: event };
        case "charge.refunded":
          return {
            kind: "refund.succeeded",
            id: event.id,
            providerPaymentId: String(o.payment_intent),
            refunds: ((o.refunds?.data ?? []) as { id: string; amount: number; status: string; reason: string | null }[])
              .filter((r) => r.status === "succeeded")
              .map((r) => ({ id: r.id, amountCents: r.amount, reason: r.reason })),
            raw: event,
          };
        default:
          return { kind: "ignored", id: event.id, type: event.type };
      }
    },
  };
}
