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
  it("ne s'applique pas sous 500 € de pièces, promotions comprises", async () => {
    const { proDiscount } = await import("@/lib/catalog/pro");
    expect(proDiscount([{ total: 49999, onPromotion: false }])).toBe(0);
    expect(proDiscount([{ total: 50000, onPromotion: false }])).toBe(10000);
    // 400 € hors promotion + 160 € en promotion = 560 € : remise sur les 400 €.
    expect(
      proDiscount([
        { total: 40000, onPromotion: false },
        { total: 16000, onPromotion: true },
      ]),
    ).toBe(8000);
  });
  it("retire 20 % hors pièces en promotion", async () => {
    const { proDiscount, isOnPromotion } = await import("@/lib/catalog/pro");
    expect(
      proDiscount([
        { total: 36000, onPromotion: false },
        { total: 16000, onPromotion: true },
      ]),
    ).toBe(7200);
    expect(isOnPromotion({ promotion: { buy: 3, free: 1 }, price: 8000 })).toBe(true);
    expect(isOnPromotion({ price: 8000, compareAtPrice: 10000 })).toBe(true);
    expect(isOnPromotion({ price: 8000, compareAtPrice: null })).toBe(false);
  });
  it("exclut Volute et Aiguille, en promotion", () => {
    return import("@/lib/catalog/pro").then(({ isOnPromotion }) => {
      const promo = CATALOG_PRODUCTS.filter(isOnPromotion).map((p) => p.slug);
      expect(promo).toEqual(expect.arrayContaining(["volute", "aiguille"]));
    });
  });
});
