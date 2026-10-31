import { describe, expect, it } from "vitest";
import { allowedTransitions, canTransition, csvCell, toCsv } from "@/lib/services/orders";

describe("statuts de commande", () => {
  it("n'autorise jamais « payée » à la main", () => {
    expect(canTransition("pending_payment", "paid", "unpaid")).toBe(false);
    expect(canTransition("draft", "paid", "paid")).toBe(false);
  });
  it("exige un paiement confirmé pour préparer et expédier", () => {
    expect(allowedTransitions("paid", "unpaid")).not.toContain("preparing");
    expect(allowedTransitions("paid", "paid")).toContain("preparing");
    expect(canTransition("preparing", "shipped", "paid")).toBe(true);
  });
  it("les statuts finaux sont figés", () => {
    expect(allowedTransitions("delivered", "paid")).toEqual([]);
    expect(allowedTransitions("cancelled", "unpaid")).toEqual([]);
  });
});

describe("export CSV", () => {
  it("échappe les séparateurs et guillemets", () => {
    expect(csvCell('Lustre "Aurore"; laiton')).toBe('"Lustre ""Aurore""; laiton"');
  });
  it("neutralise les injections de formules", () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell("+33 6")).toBe("'+33 6");
  });
  it("produit un BOM et des fins de ligne CRLF", () => {
    const out = toCsv(["a", "b"], [[1, null]]);
    expect(out.startsWith("﻿")).toBe(true);
    expect(out).toBe("﻿a;b\r\n1;\r\n");
  });
});
