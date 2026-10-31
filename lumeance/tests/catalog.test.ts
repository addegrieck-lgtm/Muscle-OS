import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { filterProducts, materialFacets, relatedProducts } = await import("@/lib/services/catalog");
const { DEMO_PRODUCTS } = await import("@/lib/demo/catalog");
const { productJsonLd, jsonLdScript } = await import("@/lib/seo/jsonld");

describe("catalogue", () => {
  it("filtre par catégorie, matière et budget", () => {
    const l = filterProducts(DEMO_PRODUCTS, {
      category: "lustres",
      material: "cristal",
      maxPrice: 80000,
    });
    expect(l.length).toBeGreaterThan(0);
    for (const p of l) {
      expect(p.categorySlug).toBe("lustres");
      expect(p.price).toBeLessThanOrEqual(80000);
      expect(p.materials.some((m) => m.toLowerCase().includes("cristal"))).toBe(true);
    }
  });
  it("trie par prix", () => {
    const l = filterProducts(DEMO_PRODUCTS, { sort: "price-asc" });
    for (let i = 1; i < l.length; i++) expect(l[i]!.price).toBeGreaterThanOrEqual(l[i - 1]!.price);
  });
  it("facettes et produits associés", () => {
    expect(materialFacets(DEMO_PRODUCTS)).toContain("Verre");
    const r = relatedProducts(DEMO_PRODUCTS, DEMO_PRODUCTS[0]!);
    expect(r).toHaveLength(3);
    expect(r.find((p) => p.id === DEMO_PRODUCTS[0]!.id)).toBeUndefined();
  });
  it("les pièces de démonstration sont marquées et sans données inventées", () => {
    for (const p of DEMO_PRODUCTS) {
      expect(p.isDemo).toBe(true);
      expect(p.specifications).toEqual([]);
      expect(p.description).toMatch(/fictive/);
      expect(productJsonLd(p)).toBeNull();
    }
  });
  it("JSON-LD sûr dans une balise script", () => {
    expect(jsonLdScript({ a: "</script><script>alert(1)</script>" })).not.toContain("</script>");
  });
});

describe("catalogue réel (code)", async () => {
  const { CATALOG_PRODUCTS } = await import("@/lib/catalog/products");
  it("aucune fiche publiée sans prix, image ni texte alternatif", () => {
    for (const p of CATALOG_PRODUCTS.filter((x) => x.status === "published")) {
      expect(p.price).toBeGreaterThan(0);
      expect(p.images.length).toBeGreaterThan(0);
      for (const i of p.images) expect(i.alt.length).toBeGreaterThan(10);
      expect(p.isDemo).toBe(false);
    }
  });
  it("références et slugs uniques", () => {
    expect(new Set(CATALOG_PRODUCTS.map((p) => p.slug)).size).toBe(CATALOG_PRODUCTS.length);
    expect(new Set(CATALOG_PRODUCTS.map((p) => p.reference)).size).toBe(CATALOG_PRODUCTS.length);
  });
});
