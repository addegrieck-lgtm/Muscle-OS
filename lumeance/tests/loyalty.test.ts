import { describe, expect, it } from "vitest";
import {
  accountDiscounts,
  circleLevel,
  nextCircleLevel,
  REFERRAL_AMOUNT,
} from "@/lib/catalog/loyalty";

const line = (total: number, onPromotion = false) => ({ total, onPromotion });

describe("Cercle Luméance", () => {
  it("suit le cumul des achats payés", () => {
    expect(circleLevel(99999)).toBeNull();
    expect(circleLevel(100000)?.percent).toBe(5);
    expect(circleLevel(250000)?.percent).toBe(8);
    expect(nextCircleLevel(40000)).toEqual({
      level: expect.objectContaining({ id: "ivoire" }),
      remaining: 60000,
    });
    expect(nextCircleLevel(300000)).toBeNull();
  });
  it("remise sur les pièces hors promotion seulement", () => {
    const r = accountDiscounts([line(20000), line(8000, true)], 28000, {
      type: "particulier",
      spent: 120000,
      referredFirstOrder: false,
      credits: [],
    });
    expect(r.discounts).toEqual([{ kind: "cercle", label: "Cercle Ivoire −5 %", amount: 1000 }]);
  });
});

describe("Parrainage", () => {
  const base = { type: "particulier" as const, spent: 0, credits: [] };
  it("30 € au filleul sur sa 1re commande, dès 300 € de pièces", () => {
    expect(
      accountDiscounts([line(29999)], 29999, { ...base, referredFirstOrder: true }).discounts,
    ).toEqual([]);
    expect(
      accountDiscounts([line(30000)], 30000, { ...base, referredFirstOrder: true }).discounts,
    ).toEqual([{ kind: "filleul", label: "Parrainage — bienvenue", amount: REFERRAL_AMOUNT }]);
  });
  it("un seul avoir du parrain par commande", () => {
    const r = accountDiscounts([line(40000)], 40000, {
      ...base,
      referredFirstOrder: false,
      credits: [
        { id: "a", amount: 3000 },
        { id: "b", amount: 3000 },
      ],
    });
    expect(r.usedCreditId).toBe("a");
    expect(r.discounts.map((d) => d.kind)).toEqual(["avoir"]);
  });
});

describe("Comptes entreprise", () => {
  it("aucune remise tant que le compte n'est pas validé", () => {
    expect(
      accountDiscounts([line(360000)], 360000, { type: "entreprise", proApproved: false })
        .discounts,
    ).toEqual([]);
  });
  it("palier HT appliqué au compte validé, sans Cercle ni parrainage", () => {
    const r = accountDiscounts([line(240000), line(16000, true)], 256000, {
      type: "entreprise",
      proApproved: true,
    });
    // 2 560 € TTC = 2 133 € HT : palier 10 %, sur les 2 400 € hors promotion.
    expect(r.discounts).toEqual([
      { kind: "pro", label: "Remise professionnelle −10 %", amount: 24000 },
    ]);
  });
});
