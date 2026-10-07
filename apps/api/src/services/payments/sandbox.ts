/**
 * Prestataire de TEST, refusé en production. Il imite un vrai prestataire : page de paiement
 * hors du site, puis webhook HMAC signé vers l'API. Aucune validation n'a lieu dans le navigateur.
 */
import { createHmac, randomUUID } from "node:crypto";
import { safeEqualHex } from "../../lib/hmac";
import { header, WEBHOOK_TOLERANCE_SECONDS, WebhookSignatureError, type PaymentProvider, type ProviderEvent } from "./provider";

export const SANDBOX_SIGNATURE_HEADER = "x-sandbox-signature";

export function signSandbox(secret: string, timestamp: number, body: string) {
  return `t=${timestamp},v1=${createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex")}`;
}

export interface SandboxEvent {
  id: string;
  type: "payment.succeeded" | "payment.failed" | "refund.succeeded";
  orderId?: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  refundId?: string;
}

export function createSandboxProvider(cfg: { publicApiUrl: string; webhookSecret: string; now?: () => number }): PaymentProvider {
  const now = cfg.now ?? (() => Date.now());
  return {
    name: "sandbox",
    async createCheckout() {
      const checkoutId = `sbx_${randomUUID().replaceAll("-", "")}`;
      return { checkoutId, url: `${cfg.publicApiUrl.replace(/\/$/, "")}/sandbox/checkout/${checkoutId}` };
    },
    parseWebhook(rawBody, headers): ProviderEvent {
      const sig = header(headers, SANDBOX_SIGNATURE_HEADER);
      const m = /^t=(\d+),v1=([0-9a-f]{64})$/.exec(sig);
      if (!m) throw new WebhookSignatureError("Signature sandbox absente");
      const t = Number(m[1]);
      if (Math.abs(now() / 1000 - t) > WEBHOOK_TOLERANCE_SECONDS) throw new WebhookSignatureError("Événement trop ancien (rejeu ?)");
      const expected = createHmac("sha256", cfg.webhookSecret).update(`${t}.${rawBody}`).digest("hex");
      if (!safeEqualHex(m[2]!, expected)) throw new WebhookSignatureError("Signature sandbox invalide");
      const e = JSON.parse(rawBody) as SandboxEvent;
      if (e.type === "payment.succeeded") return { kind: "payment.succeeded", id: e.id, orderId: e.orderId!, providerPaymentId: e.paymentId, amountCents: e.amountCents, currency: e.currency, raw: e };
      if (e.type === "payment.failed") return { kind: "payment.failed", id: e.id, orderId: e.orderId!, reason: "Paiement refusé (sandbox)", raw: e };
      return { kind: "refund.succeeded", id: e.id, providerPaymentId: e.paymentId, refunds: [{ id: e.refundId!, amountCents: e.amountCents, reason: null }], raw: e };
    },
  };
}
