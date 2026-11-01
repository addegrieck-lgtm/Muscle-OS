import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { priceRange } = await import("@/lib/catalog/price-range");
const { requestSubject } = await import("@/lib/catalog/request-subject");
const { clientIp } = await import("@/lib/services/rate-limit");
const { filterProducts } = await import("@/lib/services/catalog");
const { PUBLISHED_CATALOG } = await import("@/lib/catalog/products");

const variant = (id: string, adj: number, active = true) => ({
  id,
  name: id,
  sku: `SKU-${id}`,
  finish: null,
  priceAdjustment: adj,
  stockQuantity: 0,
  active,
});

describe("priceRange", () => {
  it("sans version : le prix de base", () => {
    expect(priceRange({ price: 17000, variants: [] })).toEqual({
      min: 17000,
      max: 17000,
      varies: false,
    });
  });
  it("avec versions : seules les versions actives comptent, ajustements négatifs compris", () => {
    const r = priceRange({
      price: 50000,
      variants: [
        variant("a", -10000),
        variant("b", 0),
        variant("c", 30000),
        variant("d", -40000, false),
      ],
    } as never);
    expect(r).toEqual({ min: 40000, max: 80000, varies: true });
  });
});

describe("filtre budget", () => {
  it("une pièce dont une version entre dans le budget est retenue", () => {
    const celeste = PUBLISHED_CATALOG.find((p) => p.slug === "celeste")!;
    const { min, max } = priceRange(celeste);
    expect(max).toBeGreaterThan(min);
    expect(filterProducts([celeste], { maxPrice: min })).toHaveLength(1);
    expect(filterProducts([celeste], { maxPrice: min - 1 })).toHaveLength(0);
  });
});

describe("requestSubject", () => {
  it("reprend pièce, version, options et quantité, borné à 160 caractères", () => {
    const product = {
      name: "Céleste",
      options: [
        {
          id: "lumiere",
          label: "Couleur de lumière",
          values: [{ id: "chaud", label: "Blanc chaud" }],
        },
      ],
    };
    expect(
      requestSubject(
        product,
        { name: "26 sphères", finish: "Pavillon rond" },
        { lumiere: "chaud" },
        2,
      ),
    ).toBe("Demande : Céleste — 26 sphères (Pavillon rond) · Blanc chaud · ×2");
    expect(requestSubject({ name: "Silhouette", options: [] }, null, {}, 1)).toBe(
      "Demande : Silhouette",
    );
    expect(requestSubject({ name: "x".repeat(300), options: [] }, null, {}, 1).length).toBe(160);
  });
});

describe("clientIp", () => {
  const h = (o: Record<string, string>) => new Headers(o);
  it("préfère l'adresse posée par Cloudflare à x-forwarded-for (falsifiable)", () => {
    expect(
      clientIp(h({ "cf-connecting-ip": "203.0.113.7", "x-forwarded-for": "1.2.3.4, 203.0.113.7" })),
    ).toBe("203.0.113.7");
  });
  it("repli sur x-forwarded-for hors Cloudflare, puis « local »", () => {
    expect(clientIp(h({ "x-forwarded-for": "198.51.100.2, 10.0.0.1" }))).toBe("198.51.100.2");
    expect(clientIp(h({}))).toBe("local");
  });
});
