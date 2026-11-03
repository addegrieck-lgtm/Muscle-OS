import { describe, expect, it } from "vitest";
import {
  displayName,
  hashReviewToken,
  isWellFormedToken,
  newReviewToken,
  reviewSchema,
  summarize,
} from "@/lib/services/reviews";
import { productJsonLd } from "@/lib/seo/jsonld";
import { CATALOG_PRODUCTS } from "@/lib/catalog/products";

describe("avis vérifiés", () => {
  it("génère des jetons uniques et bien formés, dont seule l'empreinte est stable", async () => {
    const a = newReviewToken();
    const b = newReviewToken();
    expect(a).not.toBe(b);
    expect(isWellFormedToken(a)).toBe(true);
    expect(isWellFormedToken("court")).toBe(false);
    expect(await hashReviewToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashReviewToken(a)).toBe(await hashReviewToken(a));
  });
  it("valide un avis complet et refuse note absente, texte court et consentement manquant", () => {
    const base = {
      token: newReviewToken(),
      productId: "11111111-1111-4111-8111-111111111111",
      rating: "5",
      authorName: "Marie D.",
      body: "Très belle pièce, conforme aux photos.",
      consent: "on",
    };
    expect(reviewSchema.safeParse(base).success).toBe(true);
    const bad = reviewSchema.safeParse({ ...base, rating: "", body: "court", consent: undefined });
    expect(bad.success).toBe(false);
    const fields = bad.error!.issues.map((i) => i.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["rating", "body", "consent"]));
  });
  it("affiche prénom et initiale, jamais le nom complet", () => {
    expect(displayName("Marie", "Dupont")).toBe("Marie D.");
    expect(displayName("Marie", "")).toBe("Marie");
    expect(displayName("", "Dupont")).toBe("");
  });
  it("calcule la moyenne et la répartition", () => {
    const s = summarize([{ rating: 5 }, { rating: 4 }, { rating: 4 }]);
    expect(s).toEqual({ count: 3, average: 4.3, distribution: { 1: 0, 2: 0, 3: 0, 4: 2, 5: 1 } });
    expect(summarize([]).count).toBe(0);
  });
  it("n'ajoute la note aux données structurées que s'il existe des avis publiés", () => {
    const p = CATALOG_PRODUCTS[0]!;
    expect(productJsonLd(p)).not.toHaveProperty("aggregateRating");
    const ld = productJsonLd(p, [
      {
        id: "1",
        authorName: "Marie D.",
        rating: 5,
        title: null,
        body: "Superbe.",
        photos: [],
        purchasedAt: "2026-11-01T00:00:00Z",
        publishedAt: "2026-11-10T00:00:00Z",
        adminReply: null,
      },
    ]) as Record<string, unknown>;
    expect(ld.aggregateRating).toMatchObject({ ratingValue: 5, reviewCount: 1 });
  });
});
