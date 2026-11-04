/**
 * Flux produits pour Google Merchant Center (fiches gratuites Google Shopping), au format RSS 2.0
 * « g: ». Une ligne par version, regroupées par pièce. Uniquement des données du catalogue :
 * pas de code GTIN (identifier_exists = no), aucune caractéristique ajoutée. Fonction pure.
 */
import { categoryLabel } from "@/lib/navigation";
import type { Product, ShippingSettings } from "@/types/catalog";
import { shippingRate } from "./jsonld";

const esc = (s: string) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    // Caractères de contrôle interdits en XML.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");

const money = (cents: number) => `${(cents / 100).toFixed(2)} EUR`;
const abs = (site: string, u: string) => (/^https?:\/\//.test(u) ? u : `${site}${u}`);

export function merchantFeed(
  products: Product[],
  opts: { siteUrl: string; brand: string; shipping?: ShippingSettings },
): string {
  const items = products
    .filter((p) => !p.isDemo && p.status === "published")
    .flatMap((p) => {
      const versions = p.variants.filter((v) => v.active);
      const list = versions.length ? versions : [null];
      return list.map((v) => {
        const price = p.price + (v?.priceAdjustment ?? 0);
        const stock = v ? v.stockQuantity : p.stockQuantity;
        const image = v?.imageUrl ?? p.images[0]?.url;
        const extra = p.images
          .map((i) => i.url)
          .filter((u) => u !== image)
          .slice(0, 10);
        const rate = shippingRate(opts.shipping, price);
        const link = `${opts.siteUrl}/produit/${p.slug}`;
        const lines = [
          ["g:id", v?.sku ?? p.reference],
          ["g:item_group_id", p.reference],
          ["g:title", v ? `${p.name} — ${v.name}` : p.name],
          [
            "g:description",
            [p.shortDescription, p.description].filter(Boolean).join("\n\n").slice(0, 5000),
          ],
          ["g:link", link],
          ...(image ? [["g:image_link", abs(opts.siteUrl, image)]] : []),
          ...extra.map((u) => ["g:additional_image_link", abs(opts.siteUrl, u)]),
          ["g:availability", stock > 0 ? "in_stock" : "out_of_stock"],
          ["g:price", money(price)],
          ["g:condition", "new"],
          ["g:brand", opts.brand],
          ["g:identifier_exists", "no"],
          ["g:product_type", categoryLabel(p.categorySlug)],
          ...(p.materials.length ? [["g:material", p.materials.join("/").slice(0, 200)]] : []),
          ...(v?.finish ? [["g:color", v.finish]] : []),
        ];
        const ship =
          rate !== null
            ? (opts.shipping?.countries.length ? opts.shipping.countries : ["FR"])
                .map(
                  (c) =>
                    `<g:shipping><g:country>${esc(c)}</g:country><g:price>${money(rate)}</g:price></g:shipping>`,
                )
                .join("")
            : "";
        return `<item>${lines.map(([k, val]) => `<${k}>${esc(String(val))}</${k}>`).join("")}${ship}</item>`;
      });
    });
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>${esc(opts.brand)}</title><link>${esc(opts.siteUrl)}</link><description>Catalogue ${esc(opts.brand)}</description>
${items.join("\n")}
</channel></rss>`;
}
