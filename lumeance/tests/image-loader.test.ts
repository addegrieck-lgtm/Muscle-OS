import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import imageLoader from "@/lib/image-loader";
import { VARIANT_WIDTHS } from "@/lib/image-widths.mjs";
import { CATALOG_PRODUCTS } from "@/lib/catalog/products";

describe("chargeur d'images", () => {
  it("sert la plus petite version réduite suffisante", () => {
    const src = "/products/organza/ambiance-salon.webp";
    expect(imageLoader({ src, width: 96 })).toBe(`/img-w/320${src}`);
    expect(imageLoader({ src, width: 640 })).toBe(`/img-w/640${src}`);
    expect(imageLoader({ src, width: 828 })).toBe(`/img-w/960${src}`);
  });
  it("garde l'original au-delà et pour les images externes", () => {
    expect(imageLoader({ src: "/products/a/b.webp", width: 1600 })).toBe(
      "/products/a/b.webp?w=1600",
    );
    const ext = "https://x.supabase.co/storage/v1/object/public/media/a.jpg";
    expect(imageLoader({ src: ext, width: 640 })).toBe(`${ext}?w=640`);
    expect(imageLoader({ src: "/brand/logo.svg", width: 640 })).toBe("/brand/logo.svg?w=640");
  });
  it.runIf(existsSync("public/img-w"))(
    "a généré toutes les versions des photos du catalogue",
    () => {
      for (const p of CATALOG_PRODUCTS)
        for (const img of p.images)
          if (img.url.startsWith("/products/"))
            for (const w of VARIANT_WIDTHS)
              expect(existsSync(`public/img-w/${w}${img.url}`), img.url).toBe(true);
    },
  );
});
