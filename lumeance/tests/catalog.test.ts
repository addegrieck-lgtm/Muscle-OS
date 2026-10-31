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

describe("mapProduct — variantes", () => {
  it("trie les variantes du moins cher au plus cher, puis par nom", async () => {
    const { mapProduct } = await import("@/lib/services/mappers");
    const v = (name: string, price_adjustment: number) => ({
      id: name,
      name,
      sku: name,
      finish: "Acier poli",
      price_adjustment,
      stock_quantity: 0,
      active: true,
    });
    const product = mapProduct(
      {
        id: "p",
        slug: "cascade",
        name: "Cascade",
        reference: "LUM-CASCADE",
        short_description: null,
        description: null,
        price: 23000,
        compare_at_price: null,
        category_id: null,
        status: "draft",
        featured: false,
        dimensions: null,
        weight: null,
        materials: null,
        finishes: null,
        technical_specifications: null,
        delivery_information: null,
        assembly_information: null,
        stock_quantity: 0,
        seo_title: null,
        seo_description: null,
        product_variants: [
          v("Rond · 46", 226000),
          v("Rond · 7", 24000),
          v("Linéaire · 7", 24000),
          v("Rond · 3", 0),
        ],
      },
      (path) => path,
    );
    expect(product.variants.map((x) => x.name)).toEqual([
      "Rond · 3",
      "Linéaire · 7",
      "Rond · 7",
      "Rond · 46",
    ]);
  });
});
