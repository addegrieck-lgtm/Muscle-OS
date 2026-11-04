import { describe, expect, it } from "vitest";
import { PUBLISHED_CATALOG } from "@/lib/catalog/products";
import { productJsonLd, shippingRate } from "@/lib/seo/jsonld";
import { merchantFeed } from "@/lib/seo/merchant-feed";
import { auditProduct } from "@/lib/seo/product-audit";

const ship = { standardAmount: 0, freeThreshold: 0, deliveryNote: "", countries: ["FR"] };
const organza = PUBLISHED_CATALOG.find((p) => p.slug === "organza")!;

describe("données structurées produit", () => {
  it("ajoutent livraison, retours 14 jours et état neuf, sans note sans avis", () => {
    const ld = productJsonLd(organza, [], ship)!;
    const offer = ld.offers as Record<string, unknown>;
    expect(offer.itemCondition).toBe("https://schema.org/NewCondition");
    expect(offer.shippingDetails).toMatchObject({
      shippingRate: { value: "0.00", currency: "EUR" },
    });
    expect(offer.hasMerchantReturnPolicy).toMatchObject({ merchantReturnDays: 14 });
    expect(ld).not.toHaveProperty("aggregateRating");
    for (const u of ld.image as string[]) expect(u).toMatch(/^https?:\/\//);
  });

  it("calcule les frais réels de livraison", () => {
    expect(shippingRate(ship, 1000)).toBe(0);
    expect(shippingRate({ ...ship, standardAmount: 1500, freeThreshold: 50000 }, 1000)).toBe(1500);
    expect(shippingRate({ ...ship, standardAmount: 1500, freeThreshold: 50000 }, 60000)).toBe(0);
    expect(shippingRate(undefined, 1000)).toBeNull();
  });
});

describe("flux Google Shopping", () => {
  const xml = merchantFeed(PUBLISHED_CATALOG, {
    siteUrl: "https://x.fr",
    brand: "LUMÉANCE",
    shipping: ship,
  });

  it("une ligne par version active, avec le prix réel et sans code GTIN inventé", () => {
    const versions = PUBLISHED_CATALOG.reduce(
      (n, p) => n + Math.max(1, p.variants.filter((v) => v.active).length),
      0,
    );
    expect(xml.match(/<item>/g)).toHaveLength(versions);
    expect(xml).not.toMatch(/<g:gtin>/);
    const v = organza.variants.find((x) => x.active)!;
    expect(xml).toContain(`<g:id>${v.sku}</g:id>`);
    expect(xml).toContain(
      `<g:price>${((organza.price + v.priceAdjustment) / 100).toFixed(2)} EUR</g:price>`,
    );
  });

  it("est un XML sûr (caractères échappés, liens absolus)", () => {
    const evil = { ...organza, name: "A & <B>", variants: [] };
    const out = merchantFeed([evil], { siteUrl: "https://x.fr", brand: "L", shipping: ship });
    expect(out).toContain("A &amp; &lt;B&gt;");
    expect(out).not.toMatch(/<g:image_link>\//);
  });
});

describe("audit des fiches produits", () => {
  it("signale les manques comme « à demander au fournisseur » sans rien inventer", () => {
    const a = auditProduct(
      { ...organza, weight: null, specifications: [] },
      { articles: 0, rooms: 1, reviews: 0 },
    );
    const weight = a.checks.find((c) => c.id === "weight")!;
    expect(weight.supplier).toBe(true);
    expect(a.checks.find((c) => c.id === "light")!.severity).toBe("error");
    expect(a.checks.find((c) => c.id === "warranty")!.detail).toMatch(/confirmation écrite/);
    expect(a.score).toBeGreaterThan(0);
    expect(a.score).toBeLessThan(100);
  });

  it("toutes les fiches en ligne ont un prix, des photos décrites et leurs dimensions", () => {
    for (const p of PUBLISHED_CATALOG) {
      const a = auditProduct(p, { articles: 1, rooms: 1, reviews: 0 });
      for (const id of ["offer", "photos", "dims"])
        expect(a.checks.find((c) => c.id === id)!.severity, `${p.slug} ${id}`).not.toBe("error");
    }
  });
});
