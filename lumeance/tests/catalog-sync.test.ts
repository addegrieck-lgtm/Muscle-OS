import { describe, expect, it } from "vitest";
import { CATALOG_PRODUCTS } from "@/lib/catalog/products";
import { imageRows, productRow, variantRows } from "@/lib/admin/catalog-import";
import { planIsEmpty, syncPlan, type DbProduct } from "@/lib/admin/catalog-sync";

// Reproduit une pièce telle qu'importée en base (prix renvoyés en chaînes, comme PostgREST).
function inDb(p = CATALOG_PRODUCTS.find((x) => x.slug === "constellation")!): DbProduct {
  return {
    ...productRow(p, "cat"),
    price: String(p.price),
    id: "pid",
    reference: p.reference,
    product_variants: variantRows(p, "pid").map((v, i) => ({
      ...v,
      id: `v${i}`,
      price_adjustment: String(v.price_adjustment),
    })),
    product_images: imageRows(p, "pid").map((img, i) => ({ ...img, id: `i${i}` })),
  };
}
const constellation = CATALOG_PRODUCTS.find((x) => x.slug === "constellation")!;

describe("mise à jour depuis le catalogue", () => {
  it("ne propose rien quand la base correspond au code", () => {
    for (const p of CATALOG_PRODUCTS) expect(planIsEmpty(syncPlan(p, inDb(p), "cat"))).toBe(true);
  });

  it("détecte un changement de prix et de statut, sans toucher au stock", () => {
    const db = { ...inDb(), price: "1000", status: "draft", stock_quantity: 2 };
    const plan = syncPlan(constellation, db, "cat");
    expect(plan.product).toEqual({ price: constellation.price, status: "published" });
    expect(plan.changes[0]).toMatch(/prix.*statut/);
  });

  it("ajoute, modifie et retire les versions du catalogue, garde les versions manuelles", () => {
    const db = inDb();
    const vs = db.product_variants!;
    vs[0] = { ...vs[0]!, price_adjustment: "999", stock_quantity: 1 };
    vs.splice(1, 1); // version absente de la base
    vs.push({ id: "old", sku: "LUM-SUS-003-A6-TC" }, { id: "manuelle", sku: "SUR-MESURE-1" });
    const plan = syncPlan(constellation, db, "cat");
    expect(plan.variantsUpdate).toEqual([{ id: "v0", patch: { price_adjustment: 0 } }]);
    expect(plan.variantsInsert.map((v) => v.sku)).toEqual([constellation.variants[1]!.sku]);
    expect(plan.variantsDelete).toEqual(["old"]);
  });

  it("remplace une photo du site, sans toucher aux photos importées", () => {
    const db = inDb();
    db.product_images![1] = {
      ...db.product_images![1]!,
      storage_path: "/products/constellation/ambiance-arc-noir.webp",
    };
    db.product_images!.push({ id: "upload", storage_path: "media/photo.jpg", is_primary: false });
    const plan = syncPlan(constellation, db, "cat");
    expect(plan.imagesDelete).toEqual(["i1"]);
    expect(plan.imagesInsert.map((i) => i.storage_path)).toEqual([
      "/products/constellation/ambiance-droite-doree.webp",
    ]);
  });

  it("laisse principale une photo importée marquée principale", () => {
    const db = inDb();
    db.product_images = [{ id: "upload", storage_path: "media/photo.jpg", is_primary: true }];
    const plan = syncPlan(constellation, db, "cat");
    expect(plan.imagesInsert.every((i) => i.is_primary === false)).toBe(true);
  });
});
