import { describe, expect, it } from "vitest";
import { parseSpecs, productFromForm, slugify } from "@/lib/admin/forms";

function fd(entries: Record<string, string>) {
  const f = new FormData();
  Object.entries(entries).forEach(([k, v]) => f.set(k, v));
  return f;
}

const valid = {
  name: "Halo Céleste",
  reference: "LUM-LUS-001",
  price: "740",
  status: "draft",
  materials: "Métal, Cristal",
  dim_diameter: "100",
  weight: "6,5",
  technical_specifications: "Culot : E14\nTension : 230 V",
};

describe("formulaire produit", () => {
  it("convertit euros, cm et kg en unités entières", () => {
    const r = productFromForm(fd(valid));
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.slug).toBe("halo-celeste");
    expect(r.data.price).toBe(74000);
    expect(r.data.dimensions).toEqual({ diameter: 1000 });
    expect(r.data.weight).toBe(6500);
    expect(r.data.materials).toEqual(["Métal", "Cristal"]);
    expect(r.data.technical_specifications).toEqual([
      { label: "Culot", value: "E14" },
      { label: "Tension", value: "230 V" },
    ]);
    expect(r.data.featured).toBe(false);
  });
  it("refuse un prix barré inférieur au prix", () => {
    expect(productFromForm(fd({ ...valid, compare_at_price: "500" })).success).toBe(false);
  });
  it("refuse un prix invalide", () => {
    expect(productFromForm(fd({ ...valid, price: "abc" })).success).toBe(false);
  });
  it("refuse une ligne de fiche technique sans valeur", () => {
    expect(productFromForm(fd({ ...valid, technical_specifications: "Culot" })).success).toBe(
      false,
    );
  });
  it("slugify et specs", () => {
    expect(slugify("Liane d’or — Édition")).toBe("liane-d-or-edition");
    expect(parseSpecs(" A : 1 \n\n B:2")).toEqual([
      { label: "A", value: "1" },
      { label: "B", value: "2" },
    ]);
  });
});
