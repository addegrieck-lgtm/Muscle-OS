import { describe, expect, it } from "vitest";
import { defaultPoints, priceProduct, rankProgress, type PromotionRule } from "../src/services/shop/pricing";

const product = { id: "p1", categoryId: "c1", priceCents: 1500, points: null };
const now = new Date("2026-10-10T12:00:00Z");
const promo = (o: Partial<PromotionRule>): PromotionRule => ({
  id: "x", name: "Promo", label: null, kind: "percent", value: 10, targetType: "product", targetId: "p1",
  startsAt: new Date("2026-10-01"), endsAt: null, active: true, ...o,
});
const RANKS = [
  { key: "joueur", name: "Joueur", minPoints: 0, color: null, perks: [] },
  { key: "guerrier", name: "Guerrier", minPoints: 15, color: null, perks: [] },
  { key: "seigneur", name: "Seigneur", minPoints: 35, color: null, perks: [] },
  { key: "roi", name: "Roi", minPoints: 65, color: null, perks: [] },
  { key: "vaelorian", name: "VÆLORIAN", minPoints: 100, color: null, perks: [] },
];

describe("points par défaut", () => {
  it("1 € = 1 point, arrondi inférieur", () => {
    expect(defaultPoints(500, 1)).toBe(5);
    expect(defaultPoints(2200, 1)).toBe(22);
    expect(defaultPoints(1299, 1)).toBe(12);
    expect(defaultPoints(1000, 2)).toBe(20);
  });
});

describe("priceProduct", () => {
  it("sans promotion : prix = prix catalogue, points = prix", () => {
    expect(priceProduct(product, [], 1, now)).toMatchObject({ priceCents: 1500, points: 15, promotion: null });
  });

  it("points fixés indépendamment du prix", () => {
    expect(priceProduct({ ...product, priceCents: 2000, points: 15 }, [], 1, now).points).toBe(15);
    expect(priceProduct({ ...product, points: 20 }, [], 1, now).points).toBe(20);
  });

  it("réduction % : les points suivent le prix payé", () => {
    expect(priceProduct(product, [promo({ value: 20 })], 1, now)).toMatchObject({ priceCents: 1200, points: 12, originalCents: 1500 });
  });

  it("garde la meilleure réduction, sans cumul", () => {
    const r = priceProduct(product, [promo({ id: "a", value: 10 }), promo({ id: "b", kind: "fixed", value: 400 })], 1, now);
    expect(r.priceCents).toBe(1100);
    expect(r.promotionId).toBe("b");
  });

  it("bonus de points (exemple WEEK-END VÆLORIA : 15 € → +18 points)", () => {
    const r = priceProduct(product, [promo({ kind: "points_bonus", value: 3, label: "WEEK-END VÆLORIA" })], 1, now);
    expect(r).toMatchObject({ priceCents: 1500, basePoints: 15, points: 18 });
    expect(r.promotion?.label).toBe("WEEK-END VÆLORIA");
  });

  it("ignore les promotions inactives, futures, expirées ou d'un autre produit", () => {
    const ignored = [
      promo({ active: false }),
      promo({ startsAt: new Date("2026-11-01") }),
      promo({ endsAt: new Date("2026-10-05") }),
      promo({ targetId: "autre" }),
      promo({ targetType: "category", targetId: "autre-cat" }),
    ];
    expect(priceProduct(product, ignored, 1, now).priceCents).toBe(1500);
  });

  it("promotion de catégorie et globale", () => {
    expect(priceProduct(product, [promo({ targetType: "category", targetId: "c1" })], 1, now).priceCents).toBe(1350);
    expect(priceProduct(product, [promo({ targetType: "all", targetId: null })], 1, now).priceCents).toBe(1350);
  });

  it("le prix ne descend jamais sous zéro", () => {
    expect(priceProduct(product, [promo({ kind: "fixed", value: 99_999 })], 1, now).priceCents).toBe(0);
  });
});

describe("rankProgress", () => {
  it("73 points : Roi, encore 27 pour VÆLORIAN", () => {
    const p = rankProgress(73, RANKS);
    expect(p.current.key).toBe("roi");
    expect(p.next?.key).toBe("vaelorian");
    expect(p.missing).toBe(27);
    expect(p.percent).toBe(73);
    expect(p.top).toMatchObject({ percent: 73, unlocked: false });
  });

  it("100 points et plus : VÆLORIAN débloqué", () => {
    const p = rankProgress(130, RANKS);
    expect(p.current.key).toBe("vaelorian");
    expect(p.next).toBeNull();
    expect(p.missing).toBe(0);
    expect(p.top.unlocked).toBe(true);
  });

  it("suit les seuils modifiés en base (15→20, 100→120)", () => {
    const changed = RANKS.map((r) => (r.key === "guerrier" ? { ...r, minPoints: 20 } : r.key === "vaelorian" ? { ...r, minPoints: 120 } : r));
    expect(rankProgress(15, changed).current.key).toBe("joueur");
    expect(rankProgress(100, changed).top).toMatchObject({ percent: 83, unlocked: false });
  });

  it("0 point : Joueur, même si aucun seuil à 0 n'est configuré", () => {
    const p = rankProgress(0, RANKS.slice(1));
    expect(p.current.name).toBe("Joueur");
    expect(p.next?.key).toBe("guerrier");
  });
});
