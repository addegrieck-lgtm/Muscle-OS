import { describe, expect, it } from "vitest";
import { centsToInput, formatPrice, parseEuroInput } from "@/lib/money";

describe("montants en centimes", () => {
  it("formate sans décimales inutiles", () => {
    expect(formatPrice(89000)).toBe("890 €");
    expect(formatPrice(129050)).toBe("1 290,50 €");
  });
  it("convertit une saisie sans flottant", () => {
    expect(parseEuroInput("890")).toBe(89000);
    expect(parseEuroInput("890,5")).toBe(89050);
    expect(parseEuroInput("1 290.05 €")).toBe(129005);
    expect(parseEuroInput("0,1")).toBe(10);
    expect(parseEuroInput("12,345")).toBeNull();
    expect(parseEuroInput("-5")).toBeNull();
    expect(parseEuroInput("abc")).toBeNull();
  });
  it("aller-retour saisie", () => {
    for (const c of [0, 5, 100, 89050, 123456]) expect(parseEuroInput(centsToInput(c))).toBe(c);
  });
});
