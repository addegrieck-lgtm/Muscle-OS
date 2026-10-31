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
