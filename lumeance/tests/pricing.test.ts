import { describe, expect, it } from "vitest";
import { DEMO_PRODUCTS } from "@/lib/demo/catalog";
import { priceCart } from "@/lib/services/pricing";
import type { Product } from "@/types/catalog";

const base = DEMO_PRODUCTS[0]!;
const withVariants = DEMO_PRODUCTS.find((p) => p.variants.length > 0)!;
const noShipping = { standardAmount: 0, freeThreshold: 0 };

describe("recalcul serveur du panier", () => {
  it("utilise les prix du catalogue, jamais ceux du client", () => {
    const q = priceCart(
      [{ productId: base.id, variantId: null, quantity: 2 }],
      DEMO_PRODUCTS,
      noShipping,
    );
    expect(q.lines[0]!.unitPrice).toBe(base.price);
    expect(q.subtotal).toBe(base.price * 2);
    expect(q.total).toBe(base.price * 2);
    expect(q.shipping).toBeNull();
  });
  it("applique l'ajustement de variante", () => {
    const v = withVariants.variants[1]!;
    const q = priceCart(
      [{ productId: withVariants.id, variantId: v.id, quantity: 1 }],
      DEMO_PRODUCTS,
      noShipping,
    );
    expect(q.total).toBe(withVariants.price + v.priceAdjustment);
  });
  it("exige une finition quand le produit en propose", () => {
    const q = priceCart(
      [{ productId: withVariants.id, variantId: null, quantity: 1 }],
      DEMO_PRODUCTS,
      noShipping,
    );
    expect(q.lines).toHaveLength(0);
    expect(q.removed[0]!.reason).toMatch(/finition/);
  });
  it("retire les produits inconnus ou dépubliés", () => {
    const draft: Product = { ...base, id: "draft", status: "draft" };
    const q = priceCart(
      [
        { productId: "inconnu", variantId: null, quantity: 1 },
        { productId: "draft", variantId: null, quantity: 1 },
      ],
      [...DEMO_PRODUCTS, draft],
      noShipping,
    );
    expect(q.lines).toHaveLength(0);
    expect(q.removed).toHaveLength(2);
  });
  it("fusionne les doublons et plafonne la quantité", () => {
    const q = priceCart(
      [
        { productId: base.id, variantId: null, quantity: 8 },
        { productId: base.id, variantId: null, quantity: 8 },
      ],
      DEMO_PRODUCTS,
      noShipping,
    );
    expect(q.lines).toHaveLength(1);
    expect(q.lines[0]!.quantity).toBe(10);
  });
  it("calcule la livraison et sa gratuité", () => {
    const ship = { standardAmount: 2500, freeThreshold: 100000 };
    expect(
      priceCart([{ productId: base.id, variantId: null, quantity: 1 }], DEMO_PRODUCTS, ship)
        .shipping,
    ).toBe(2500);
    expect(
      priceCart([{ productId: base.id, variantId: null, quantity: 2 }], DEMO_PRODUCTS, ship)
        .shipping,
    ).toBe(0);
  });
});

describe("options sans incidence sur le prix (couleur de lumière)", async () => {
  const { CATALOG_PRODUCTS } = await import("@/lib/catalog/products");
  const { lineKey } = await import("@/lib/services/pricing");
  const celeste = CATALOG_PRODUCTS.find((p) => p.slug === "celeste")!;
  const v = celeste.variants[3]!;
  const ship = { standardAmount: 0, freeThreshold: 0 };
  it("accepte une couleur connue sans changer le prix, et l'affiche", () => {
    const q = priceCart(
      [{ productId: celeste.id, variantId: v.id, quantity: 1, options: { lumiere: "froid" } }],
      [celeste],
      ship,
    );
    expect(q.lines[0]!.unitPrice).toBe(celeste.price + v.priceAdjustment);
    expect(q.lines[0]!.variantName).toContain("Blanc froid");
    expect(q.lines[0]!.options).toEqual({ lumiere: "froid" });
  });
  it("refuse une couleur absente, inconnue ou une option inventée", () => {
    const cases: (Record<string, string> | undefined)[] = [undefined, { lumiere: "rose" }, { lumiere: "chaud", autre: "x" }];
    for (const options of cases) {
      const q = priceCart(
        [{ productId: celeste.id, variantId: v.id, quantity: 1, options }],
        [celeste],
        ship,
      );
      expect(q.lines).toHaveLength(0);
    }
  });
  it("deux couleurs = deux lignes distinctes", () => {
    const q = priceCart(
      [
        { productId: celeste.id, variantId: v.id, quantity: 1, options: { lumiere: "chaud" } },
        { productId: celeste.id, variantId: v.id, quantity: 2, options: { lumiere: "neutre" } },
      ],
      [celeste],
      ship,
    );
    expect(q.lines).toHaveLength(2);
    expect(lineKey({ productId: "a", variantId: null, options: { b: "1", a: "2" } })).toBe(
      lineKey({ productId: "a", variantId: null, options: { a: "2", b: "1" } }),
    );
  });
});
