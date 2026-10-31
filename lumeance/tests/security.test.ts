import { describe, expect, it, vi } from "vitest";
import { rateLimit } from "@/lib/services/rate-limit";
import { cartSchema, contactSchema, newsletterSchema } from "@/lib/validation/schemas";

vi.mock("server-only", () => ({}));

describe("limitation de débit", () => {
  it("bloque au-delà de la limite puis libère après la fenêtre", () => {
    const t = 1_000_000;
    for (let i = 0; i < 3; i++) expect(rateLimit("k", 3, 1000, t + i)).toBe(true);
    expect(rateLimit("k", 3, 1000, t + 10)).toBe(false);
    expect(rateLimit("k", 3, 1000, t + 2000)).toBe(true);
  });
});

describe("validation des entrées publiques", () => {
  it("panier : quantités et taille bornées", () => {
    expect(cartSchema.safeParse([{ productId: "a", variantId: null, quantity: 11 }]).success).toBe(
      false,
    );
    expect(cartSchema.safeParse([{ productId: "a", variantId: null, quantity: 0 }]).success).toBe(
      false,
    );
    expect(
      cartSchema.safeParse(Array(31).fill({ productId: "a", variantId: null, quantity: 1 }))
        .success,
    ).toBe(false);
    expect(
      cartSchema.safeParse([{ productId: "a", variantId: null, quantity: 1, price: 1 }]).success,
    ).toBe(true);
  });
  it("newsletter : consentement explicite obligatoire", () => {
    expect(newsletterSchema.safeParse({ email: "a@b.fr" }).success).toBe(false);
    expect(newsletterSchema.safeParse({ email: "a@b.fr", consent: "on" }).success).toBe(true);
  });
  it("contact : pot de miel", () => {
    const ok = { name: "A", email: "a@b.fr", subject: "S", message: "Bonjour, une question." };
    expect(contactSchema.safeParse(ok).success).toBe(true);
    expect(contactSchema.safeParse({ ...ok, website: "spam" }).success).toBe(false);
  });
});

describe("paiement désactivé", () => {
  it("aucun prestataire n'est disponible, même avec le drapeau", async () => {
    process.env.PAYMENTS_ENABLED = "1";
    process.env.PAYMENT_PROVIDER = "stripe";
    const { getPaymentProvider, PaymentsDisabledError } = await import("@/lib/payments");
    expect(() => getPaymentProvider()).toThrow(PaymentsDisabledError);
    delete process.env.PAYMENTS_ENABLED;
    delete process.env.PAYMENT_PROVIDER;
  });
});
