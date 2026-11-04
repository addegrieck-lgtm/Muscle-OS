import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createStripeProvider,
  mapStripeEvent,
  stripeSignature,
  verifyStripeSignature,
} from "@/lib/payments/stripe";

vi.mock("server-only", () => ({}));

const SECRET = "whsec_test_secret";

async function signed(body: string, t: number, secret = SECRET) {
  return `t=${t},v1=${await stripeSignature(secret, `${t}.${body}`)}`;
}

describe("webhook Stripe : signature", () => {
  const body = JSON.stringify({ id: "evt_1" });
  const now = 1_800_000_000;

  it("accepte une signature valide", async () => {
    await expect(verifyStripeSignature(body, await signed(body, now), SECRET, now)).resolves.toBe(
      undefined,
    );
  });

  it("accepte plusieurs v1 dont une seule valide (rotation du secret)", async () => {
    const good = await signed(body, now);
    await expect(
      verifyStripeSignature(body, `${good},v1=${"0".repeat(64)}`, SECRET, now),
    ).resolves.toBe(undefined);
  });

  it("refuse un corps modifié, un mauvais secret, une signature absente ou trop ancienne", async () => {
    const header = await signed(body, now);
    await expect(verifyStripeSignature(body + " ", header, SECRET, now)).rejects.toThrow();
    await expect(verifyStripeSignature(body, header, "whsec_autre", now)).rejects.toThrow();
    await expect(verifyStripeSignature(body, null, SECRET, now)).rejects.toThrow();
    await expect(verifyStripeSignature(body, "t=abc", SECRET, now)).rejects.toThrow();
    await expect(verifyStripeSignature(body, header, SECRET, now + 301)).rejects.toThrow(/expirée/);
  });
});

describe("webhook Stripe : traduction des événements", () => {
  const session = (over: Record<string, unknown> = {}) => ({
    id: "cs_test_1",
    object: "checkout.session",
    payment_status: "paid" as const,
    amount_total: 97000,
    currency: "eur",
    client_reference_id: "ref-order",
    metadata: { order_id: "meta-order" },
    payment_intent: "pi_123",
    ...over,
  });

  it("paiement immédiat confirmé", () => {
    const e = mapStripeEvent({
      id: "evt_1",
      type: "checkout.session.completed",
      data: { object: session() },
    });
    expect(e).toMatchObject({
      type: "payment.succeeded",
      orderId: "meta-order",
      amount: 97000,
      currency: "EUR",
      providerReference: "pi_123",
    });
  });

  it("paiement différé : rien tant que la confirmation n'est pas arrivée", () => {
    const pending = session({ payment_status: "unpaid" });
    expect(
      mapStripeEvent({ id: "e", type: "checkout.session.completed", data: { object: pending } })
        .type,
    ).toBe("other");
    expect(
      mapStripeEvent({
        id: "e",
        type: "checkout.session.async_payment_succeeded",
        data: { object: session() },
      }).type,
    ).toBe("payment.succeeded");
    expect(
      mapStripeEvent({
        id: "e",
        type: "checkout.session.async_payment_failed",
        data: { object: pending },
      }).type,
    ).toBe("payment.failed");
  });

  it("expiration, événements inconnus et objets étrangers", () => {
    expect(
      mapStripeEvent({ id: "e", type: "checkout.session.expired", data: { object: session() } })
        .type,
    ).toBe("payment.expired");
    expect(
      mapStripeEvent({ id: "e", type: "customer.created", data: { object: session() } }).type,
    ).toBe("other");
    expect(
      mapStripeEvent({
        id: "e",
        type: "checkout.session.completed",
        data: { object: session({ object: "payment_intent" }) },
      }).type,
    ).toBe("other");
  });

  it("référence de commande de secours : client_reference_id", () => {
    const e = mapStripeEvent({
      id: "e",
      type: "checkout.session.completed",
      data: { object: session({ metadata: {} }) },
    });
    expect(e.orderId).toBe("ref-order");
  });
});

describe("prestataire Stripe", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of [
      "PAYMENTS_ENABLED",
      "PAYMENT_PROVIDER",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ])
      delete process.env[k];
  });

  it("n'est actif qu'avec l'interrupteur ET des clés valides", async () => {
    const { getPaymentProvider, checkoutAvailable } = await import("@/lib/payments");
    process.env.PAYMENTS_ENABLED = "1";
    process.env.PAYMENT_PROVIDER = "stripe";
    expect(checkoutAvailable()).toBe(false);
    process.env.STRIPE_SECRET_KEY = "pk_test_publique"; // clé publique : refusée
    process.env.STRIPE_WEBHOOK_SECRET = SECRET;
    expect(checkoutAvailable()).toBe(false);
    process.env.STRIPE_SECRET_KEY = "sk_test_123";
    expect(getPaymentProvider().name).toBe("stripe");
    process.env.PAYMENTS_ENABLED = "0";
    expect(checkoutAvailable()).toBe(false);
  });

  it("crée une session Checkout au montant recalculé, avec clé d'idempotence", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(
      async () =>
        new Response(JSON.stringify({ id: "cs_1", url: "https://checkout.stripe.com/c/pay/cs_1" })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const p = createStripeProvider("sk_test_123", SECRET);
    const s = await p.createCheckoutSession({
      orderId: "o-1",
      orderNumber: "LUM-2026-001001",
      amount: 97000,
      currency: "EUR",
      customerEmail: "client@example.test",
      description: "LUMÉANCE — commande LUM-2026-001001",
      successUrl:
        "https://maisonlumeance.fr/commande/confirmation?session_id={CHECKOUT_SESSION_ID}",
      cancelUrl: "https://maisonlumeance.fr/panier",
      idempotencyKey: "checkout:o-1",
    });
    expect(s.redirectUrl).toBe("https://checkout.stripe.com/c/pay/cs_1");
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.stripe.com/v1/checkout/sessions");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer sk_test_123");
    expect(headers["Idempotency-Key"]).toBe("checkout:o-1");
    const body = new URLSearchParams(String(init.body));
    expect(body.get("mode")).toBe("payment");
    expect(body.get("line_items[0][price_data][unit_amount]")).toBe("97000");
    expect(body.get("line_items[0][price_data][currency]")).toBe("eur");
    expect(body.get("metadata[order_id]")).toBe("o-1");
    expect(body.get("payment_intent_data[metadata][order_id]")).toBe("o-1");
    expect(body.get("success_url")).toContain("{CHECKOUT_SESSION_ID}");
  });

  it("remboursement : référence vérifiée, refus remonté", async () => {
    const p = createStripeProvider("sk_test_123", SECRET);
    await expect(p.refund("cs_pas_un_paiement", 100, "k")).rejects.toThrow();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "re_1", status: "failed" }))),
    );
    await expect(p.refund("pi_1", 100, "k")).rejects.toThrow(/refusé/);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "re_2", status: "succeeded" }))),
    );
    await expect(p.refund("pi_1", 100, "k")).resolves.toEqual({ reference: "re_2" });
  });
});

describe("réglages du paiement saisis dans Cloudflare", () => {
  afterEach(() => {
    for (const k of [
      "PAYMENTS_ENABLED",
      "PAYMENT_PROVIDER",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
    ])
      delete process.env[k];
  });

  it("tolère espaces, guillemets et majuscules ; le diagnostic ne révèle aucune valeur", async () => {
    const { checkoutAvailable, paymentsDiagnostic } = await import("@/lib/payments");
    process.env.PAYMENTS_ENABLED = " true ";
    process.env.PAYMENT_PROVIDER = "Stripe\n";
    process.env.STRIPE_SECRET_KEY = ' "sk_test_123" ';
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc ";
    expect(checkoutAvailable()).toBe(true);
    expect(paymentsDiagnostic().every((c) => c.ok)).toBe(true);
    process.env.STRIPE_WEBHOOK_SECRET = "abc";
    const d = paymentsDiagnostic();
    expect(d.filter((c) => !c.ok).map((c) => c.name)).toEqual(["STRIPE_WEBHOOK_SECRET"]);
    delete process.env.PAYMENTS_ENABLED;
    expect(paymentsDiagnostic()[0]).toMatchObject({
      ok: false,
      detail: expect.stringMatching(/absente/),
    });
    process.env.STRIPE_SECRET_KEY = "pk_test_publique";
    expect(paymentsDiagnostic()[2]!.detail).toMatch(/clé publique/);
    expect(JSON.stringify(d)).not.toContain("sk_test_123");
  });
});
