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

describe("grille de prix Céleste", async () => {
  const { salePrice, CATALOG_PRODUCTS } = await import("@/lib/catalog/products");
  it("×1,8 sous 500 €, ×1,5 au-delà, dizaine supérieure", () => {
    expect(salePrice(8939)).toBe(17000);
    expect(salePrice(32269)).toBe(59000);
    expect(salePrice(37099)).toBe(67000);
    expect(salePrice(57899)).toBe(87000);
    expect(salePrice(73299)).toBe(110000);
    expect(salePrice(135139)).toBe(203000);
  });
  it("16 versions, identifiants et SKU uniques, aucun prix négatif", () => {
    const c = CATALOG_PRODUCTS.find((p) => p.slug === "celeste")!;
    expect(c.variants).toHaveLength(16);
    expect(new Set(c.variants.map((v) => v.id)).size).toBe(16);
    expect(new Set(c.variants.map((v) => v.sku)).size).toBe(16);
    for (const v of c.variants) expect(v.priceAdjustment).toBeGreaterThanOrEqual(0);
    expect(c.price).toBe(17000);
  });
});

describe("grille de prix Luciole", async () => {
  const { CATALOG_PRODUCTS } = await import("@/lib/catalog/products");
  it("7 versions, prix ×1,8 / ×1,5 sur le prix hors promotion", () => {
    const l = CATALOG_PRODUCTS.find((p) => p.slug === "luciole")!;
    expect(l.variants).toHaveLength(7);
    const prices = l.variants.map((v) => (l.price + v.priceAdjustment) / 100);
    expect(prices).toEqual([180, 470, 540, 690, 770, 1050, 470]);
  });
});

describe("options Luciole", async () => {
  const { CATALOG_PRODUCTS } = await import("@/lib/catalog/products");
  const { priceCart } = await import("@/lib/services/pricing");
  it("structure + lumière obligatoires, sans changement de prix", () => {
    const l = CATALOG_PRODUCTS.find((p) => p.slug === "luciole")!;
    const v = l.variants[2]!;
    const ship = { standardAmount: 0, freeThreshold: 0 };
    const ok = priceCart(
      [
        {
          productId: l.id,
          variantId: v.id,
          quantity: 1,
          options: { structure: "noir", lumiere: "chaud" },
        },
      ],
      [l],
      ship,
    );
    expect(ok.lines[0]!.unitPrice).toBe(l.price + v.priceAdjustment);
    expect(ok.lines[0]!.variantName).toContain("Noir");
    expect(ok.lines[0]!.variantName).toContain("Blanc chaud");
    const ko = priceCart(
      [{ productId: l.id, variantId: v.id, quantity: 1, options: { lumiere: "chaud" } }],
      [l],
      ship,
    );
    expect(ko.lines).toHaveLength(0);
  });
});

describe("visuels par combinaison", async () => {
  const { existsSync } = await import("node:fs");
  const { CATALOG_PRODUCTS } = await import("@/lib/catalog/products");
  it("chaque visuel référencé existe dans public/", () => {
    for (const p of CATALOG_PRODUCTS)
      for (const v of p.variants)
        for (const url of [v.imageUrl, ...Object.values(v.imageUrls ?? {})].filter(Boolean))
          expect(existsSync(`public${url}`), url).toBe(true);
  });
});
