import type {
  CheckoutSession,
  CheckoutSessionRequest,
  PaymentProvider,
  VerifiedEvent,
} from "./types";

/**
 * Stripe Checkout, appelé directement par son API HTTP (fetch) : aucune dépendance, compatible
 * Cloudflare Workers. Le client est redirigé vers la page de paiement hébergée par Stripe :
 * aucune donnée bancaire ne transite par le site.
 *
 * Seul le webhook signé confirme un paiement ; la signature est vérifiée avec WebCrypto
 * (HMAC-SHA256, tolérance de 5 minutes contre le rejeu).
 */
const API = "https://api.stripe.com/v1";
const TOLERANCE_S = 300;
/** Durée de validité de la page de paiement (l'avoir éventuel reste réservé pendant ce temps). */
const SESSION_TTL_S = 2 * 3600;

type Params = Record<string, string | number | undefined>;

function encode(params: Params): string {
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) body.append(k, String(v));
  return body.toString();
}

export class StripeApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "StripeApiError";
  }
}

const enc = new TextEncoder();

function hex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Comparaison à temps constant de deux chaînes hexadécimales. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function stripeSignature(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(payload)));
}

/** Vérifie l'en-tête Stripe-Signature (« t=…,v1=… ») ; lève une erreur sinon. */
export async function verifyStripeSignature(
  rawBody: string,
  header: string | null,
  secret: string,
  now = Math.floor(Date.now() / 1000),
): Promise<void> {
  if (!header) throw new Error("Signature absente");
  let timestamp = NaN;
  const signatures: string[] = [];
  for (const part of header.split(",")) {
    const [k, v] = part.split("=", 2);
    if (k === "t") timestamp = Number(v);
    else if (k === "v1" && v) signatures.push(v);
  }
  if (!Number.isFinite(timestamp) || signatures.length === 0)
    throw new Error("Signature mal formée");
  if (Math.abs(now - timestamp) > TOLERANCE_S) throw new Error("Signature expirée");
  const expected = await stripeSignature(secret, `${timestamp}.${rawBody}`);
  if (!signatures.some((s) => safeEqual(s, expected))) throw new Error("Signature invalide");
}

interface StripeSessionObject {
  id: string;
  object: string;
  payment_status?: "paid" | "unpaid" | "no_payment_required";
  amount_total?: number | null;
  currency?: string | null;
  client_reference_id?: string | null;
  metadata?: Record<string, string> | null;
  payment_intent?: string | { id: string } | null;
}

/** Traduit un événement Stripe (déjà authentifié) en événement neutre. */
export function mapStripeEvent(event: {
  id: string;
  type: string;
  data: { object: StripeSessionObject };
}): VerifiedEvent {
  const s = event.data.object;
  const base = {
    provider: "stripe",
    eventId: event.id,
    orderId: s.metadata?.order_id ?? s.client_reference_id ?? null,
    amount: typeof s.amount_total === "number" ? s.amount_total : null,
    currency: s.currency ? s.currency.toUpperCase() : null,
    providerReference:
      (typeof s.payment_intent === "string" ? s.payment_intent : s.payment_intent?.id) ?? s.id,
    raw: event,
  };
  if (s.object !== "checkout.session") return { ...base, type: "other" };
  switch (event.type) {
    case "checkout.session.completed":
      // Moyens de paiement différés (virement SEPA…) : « unpaid » ici, la confirmation arrive
      // plus tard par checkout.session.async_payment_succeeded.
      return { ...base, type: s.payment_status === "paid" ? "payment.succeeded" : "other" };
    case "checkout.session.async_payment_succeeded":
      return { ...base, type: "payment.succeeded" };
    case "checkout.session.async_payment_failed":
      return { ...base, type: "payment.failed" };
    case "checkout.session.expired":
      return { ...base, type: "payment.expired" };
    default:
      return { ...base, type: "other" };
  }
}

export function createStripeProvider(secretKey: string, webhookSecret: string): PaymentProvider {
  async function call<T>(
    method: "GET" | "POST",
    path: string,
    params?: Params,
    idempotencyKey?: string,
  ): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${secretKey}`,
      "Stripe-Version": "2024-06-20",
    };
    if (method === "POST") headers["Content-Type"] = "application/x-www-form-urlencoded";
    if (idempotencyKey) headers["Idempotency-Key"] = idempotencyKey;
    const res = await fetch(`${API}${path}`, {
      method,
      headers,
      body: method === "POST" && params ? encode(params) : undefined,
    });
    const data = (await res.json().catch(() => ({}))) as T & {
      error?: { message?: string; code?: string };
    };
    if (!res.ok)
      throw new StripeApiError(
        data.error?.message ?? `Stripe : erreur ${res.status}`,
        res.status,
        data.error?.code,
      );
    return data;
  }

  return {
    name: "stripe",

    async createCheckoutSession(req: CheckoutSessionRequest): Promise<CheckoutSession> {
      const session = await call<{ id: string; url: string }>(
        "POST",
        "/checkout/sessions",
        {
          mode: "payment",
          locale: "fr",
          customer_email: req.customerEmail,
          client_reference_id: req.orderId,
          "line_items[0][quantity]": 1,
          "line_items[0][price_data][currency]": req.currency.toLowerCase(),
          "line_items[0][price_data][unit_amount]": req.amount,
          "line_items[0][price_data][product_data][name]": req.description,
          "metadata[order_id]": req.orderId,
          "metadata[order_number]": req.orderNumber,
          "payment_intent_data[description]": req.description,
          "payment_intent_data[metadata][order_id]": req.orderId,
          "payment_intent_data[metadata][order_number]": req.orderNumber,
          success_url: req.successUrl,
          cancel_url: req.cancelUrl,
          expires_at: Math.floor(Date.now() / 1000) + SESSION_TTL_S,
        },
        req.idempotencyKey,
      );
      return { provider: "stripe", sessionId: session.id, redirectUrl: session.url };
    },

    async verifyWebhook(rawBody: string, headers: Headers): Promise<VerifiedEvent> {
      await verifyStripeSignature(rawBody, headers.get("stripe-signature"), webhookSecret);
      return mapStripeEvent(JSON.parse(rawBody));
    },

    async getCheckoutSession(sessionId: string) {
      if (!/^cs_[A-Za-z0-9_]+$/.test(sessionId)) return null;
      try {
        const s = await call<StripeSessionObject>(
          "GET",
          `/checkout/sessions/${encodeURIComponent(sessionId)}`,
        );
        return {
          orderId: s.metadata?.order_id ?? s.client_reference_id ?? null,
          paid: s.payment_status === "paid",
        };
      } catch (e) {
        if (e instanceof StripeApiError && e.status === 404) return null;
        throw e;
      }
    },

    async refund(providerReference: string, amount: number, idempotencyKey: string) {
      if (!providerReference.startsWith("pi_"))
        throw new Error("Référence de paiement Stripe invalide");
      const r = await call<{ id: string; status: string }>(
        "POST",
        "/refunds",
        { payment_intent: providerReference, amount },
        idempotencyKey,
      );
      if (r.status === "failed" || r.status === "canceled")
        throw new Error(`Remboursement refusé par Stripe (${r.status})`);
      return { reference: r.id };
    },
  };
}
