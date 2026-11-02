import { describe, expect, it } from "vitest";
import { CATALOG_PRODUCTS } from "@/lib/catalog/products";
import { PRO_SPACES, PRO_USES } from "@/lib/content/restauration";

describe("Restaurants, bars et hôtels", () => {
  it("ne cite que des pièces du catalogue", () => {
    const slugs = new Set(CATALOG_PRODUCTS.map((p) => p.slug));
    for (const slug of Object.keys(PRO_USES)) expect(slugs.has(slug), slug).toBe(true);
  });
  it("range chaque pièce dans un espace existant", () => {
    const spaces = new Set(PRO_SPACES.map((s) => s.id));
    for (const u of Object.values(PRO_USES)) expect(spaces.has(u.space)).toBe(true);
  });
  it("a au moins une pièce publiée par espace", () => {
    const published = new Set(
      CATALOG_PRODUCTS.filter((p) => p.status === "published").map((p) => p.slug),
    );
    for (const s of PRO_SPACES)
      expect(
        Object.entries(PRO_USES).some(([slug, u]) => u.space === s.id && published.has(slug)),
        s.id,
      ).toBe(true);
  });
});
