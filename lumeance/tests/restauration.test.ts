import { describe, expect, it } from "vitest";
import { CATALOG_PRODUCTS } from "@/lib/catalog/products";
import { PRO_SPACES, PRO_USES } from "@/lib/content/restauration";

describe("Restaurants, bars et hôtels", () => {
  it("ne cite que des pièces du catalogue", () => {
    const slugs = new Set(CATALOG_PRODUCTS.map((p) => p.slug));
    for (const slug of Object.keys(PRO_USES)) expect(slugs.has(slug), slug).toBe(true);
  });
  it("range chaque pièce dans un espace existant", () => {
    const spaces = new Set(PRO_SPACES.map((s) => s.id));
    for (const u of Object.values(PRO_USES)) expect(spaces.has(u.space)).toBe(true);
  });
  it("a au moins une pièce publiée par espace", () => {
    const published = new Set(
      CATALOG_PRODUCTS.filter((p) => p.status === "published").map((p) => p.slug),
    );
    for (const s of PRO_SPACES)
      expect(
        Object.entries(PRO_USES).some(([slug, u]) => u.space === s.id && published.has(slug)),
        s.id,
      ).toBe(true);
  });
});

describe("Remise professionnelle", () => {
  it("suit les paliers 5 / 10 / 20 % selon le montant HT des pièces", async () => {
    const { proDiscount, proPercent } = await import("@/lib/catalog/pro");
    expect(proPercent(49999)).toBe(0);
    expect(proPercent(50000)).toBe(5);
    expect(proPercent(149999)).toBe(5);
    expect(proPercent(150000)).toBe(10);
    expect(proPercent(299999)).toBe(10);
    expect(proPercent(300000)).toBe(20);
    // 590 € TTC = 491,67 € HT : sous le premier palier.
    expect(proDiscount([{ total: 59000, onPromotion: false }])).toEqual({ percent: 0, amount: 0 });
    // 2 400 € TTC = 2 000 € HT : palier 10 %, sur le montant TTC.
    expect(proDiscount([{ total: 240000, onPromotion: false }])).toEqual({
      percent: 10,
      amount: 24000,
    });
    // 3 600 € TTC = 3 000 € HT : palier 20 %.
    expect(proDiscount([{ total: 360000, onPromotion: false }]).percent).toBe(20);
  });
  it("compte les pièces en promotion pour le palier, sans les remiser", async () => {
    const { proDiscount } = await import("@/lib/catalog/pro");
    // 480 € hors promotion + 160 € en promotion = 640 € TTC (533 € HT) : palier 5 %, sur 480 €.
    expect(
      proDiscount([
        { total: 48000, onPromotion: false },
        { total: 16000, onPromotion: true },
      ]),
    ).toEqual({ percent: 5, amount: 2400 });
  });
  it("reconnaît les pièces en promotion", async () => {
    const { isOnPromotion } = await import("@/lib/catalog/pro");
    expect(isOnPromotion({ promotion: { buy: 3, free: 1 }, price: 8000 })).toBe(true);
    expect(isOnPromotion({ price: 8000, compareAtPrice: 10000 })).toBe(true);
    expect(isOnPromotion({ price: 8000, compareAtPrice: null })).toBe(false);
    const promo = CATALOG_PRODUCTS.filter(isOnPromotion).map((p) => p.slug);
    expect(promo).toEqual(expect.arrayContaining(["volute", "aiguille"]));
  });
});
