// Génère supabase/import-produits.sql à partir du catalogue écrit dans le code
// (lib/catalog/products.ts) : la migration de présentation + les pièces, versions et images.
//
//   npm run catalog:sql
//
// Le fichier produit est SANS RISQUE à rejouer : une pièce (référence), une version (SKU) ou une
// image déjà présente n'est jamais modifiée. Les changements faits dans l'administration sont
// donc conservés.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CATALOG_PRODUCTS } from "../lib/catalog/products.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const q = (v: string | null | undefined) => (v == null ? "null" : `'${v.replace(/'/g, "''")}'`);
const json = (v: unknown) => `${q(JSON.stringify(v))}::jsonb`;
const arr = (v: string[]) => (v.length ? `array[${v.map(q).join(", ")}]::text[]` : "'{}'::text[]");
const productId = (reference: string) =>
  `(select id from public.products where reference = ${q(reference)})`;

const migration = [
  "supabase/migrations/20261101000100_product_presentation.sql",
  "supabase/migrations/20261102000100_product_promotion.sql",
]
  .map((f) => readFileSync(join(root, f), "utf8").trim())
  .join("\n\n");

const parts: string[] = [
  "-- LUMÉANCE — import des pièces du catalogue dans Supabase.",
  "-- GÉNÉRÉ par « npm run catalog:sql » depuis lib/catalog/products.ts : ne pas modifier à la main.",
  "-- À coller dans Supabase → SQL Editor → Run. Sans risque à rejouer : ce qui existe déjà",
  "-- (même référence, même SKU, même image) n'est pas modifié.",
  "",
  "begin;",
  "",
  "-- ════ Colonnes de présentation ════",
  migration.trim(),
  "",
];

for (const p of CATALOG_PRODUCTS) {
  parts.push(`-- ════ ${p.name} (${p.reference}) ════`);
  parts.push(
    `insert into public.products (slug, name, reference, short_description, description, price,
  compare_at_price, category_id, status, featured, dimensions, weight, materials, finishes,
  technical_specifications, delivery_information, assembly_information, stock_quantity,
  seo_title, seo_description, options, option_labels, art, promotion)
values (${q(p.slug)}, ${q(p.name)}, ${q(p.reference)}, ${q(p.shortDescription)}, ${q(p.description)},
  ${p.price}, ${p.compareAtPrice ?? "null"},
  (select id from public.categories where slug = ${q(p.categorySlug)}),
  ${q(p.status)}, ${p.featured}, ${json(p.dimensions)}, ${p.weight ?? "null"},
  ${arr(p.materials)}, ${arr(p.finishes)}, ${json(p.specifications)},
  ${q(p.deliveryInformation)}, ${q(p.assemblyInformation)}, ${p.stockQuantity},
  ${q(p.seoTitle)}, ${q(p.seoDescription)}, ${json(p.options ?? [])},
  ${p.optionLabels ? json(p.optionLabels) : "null"}, ${q(p.art)},
  ${p.promotion ? json(p.promotion) : "null"})
on conflict (reference) do nothing;`,
  );
  p.variants.forEach((v, i) => {
    parts.push(
      `insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values (${productId(p.reference)}, ${q(v.name)}, ${q(v.sku)}, ${q(v.finish)}, ${v.priceAdjustment},
  ${v.stockQuantity}, ${v.active}, ${q(v.details)}, ${q(v.imageUrl)}, ${json(v.imageUrls ?? {})}, ${i})
on conflict (sku) do nothing;`,
    );
  });
  for (const img of p.images) {
    parts.push(
      `insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select ${productId(p.reference)}, ${q(img.url)}, ${q(img.alt)}, ${q(img.caption)}, ${img.position},
  ${img.isPrimary} and not exists (select 1 from public.product_images
    where product_id = ${productId(p.reference)} and is_primary)
where not exists (select 1 from public.product_images
  where product_id = ${productId(p.reference)} and storage_path = ${q(img.url)});`,
    );
  }
  parts.push("");
}

parts.push(
  "commit;",
  "",
  "-- Vérification : une ligne par pièce, avec son nombre de versions et d'images.",
  `select p.reference, p.name, p.status, c.slug as categorie,
  (select count(*) from public.product_variants v where v.product_id = p.id) as versions,
  (select count(*) from public.product_images i where i.product_id = p.id) as images
from public.products p left join public.categories c on c.id = p.category_id
order by p.reference;`,
  "",
);

const out = join(root, "supabase/import-produits.sql");
writeFileSync(out, parts.join("\n"));
console.log(`✔ ${out} — ${CATALOG_PRODUCTS.length} pièces`);
