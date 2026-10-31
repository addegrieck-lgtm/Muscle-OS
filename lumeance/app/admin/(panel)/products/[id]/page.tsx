import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Badge,
  BtnLink,
  Card,
  Field,
  Flash,
  PageTitle,
  flashFrom,
  inputClass,
} from "@/components/admin/ui";
import { ProductForm, type ProductRecord } from "@/components/admin/ProductForm";
import { SubmitButton } from "@/components/admin/SubmitButton";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { centsToInput } from "@/lib/money";
import { storagePublicUrl } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  addProductImage,
  deleteProduct,
  saveVariant,
  setProductStatus,
  updateProduct,
  updateProductImage,
} from "../actions";

export const metadata = { title: "Produit" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> };

export default async function EditProduct({ params, searchParams }: Props) {
  await requireAdmin(CATALOG_ROLES);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createSupabaseServerClient();
  const [
    { data: product },
    { data: categories },
    { data: images },
    { data: variants },
    { data: media },
  ] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).maybeSingle(),
    supabase.from("categories").select("id, name").order("position"),
    supabase.from("product_images").select("*").eq("product_id", id).order("position"),
    supabase.from("product_variants").select("*").eq("product_id", id).order("created_at"),
    supabase
      .from("media_assets")
      .select("storage_path, alt_text")
      .order("created_at", { ascending: false })
      .limit(60),
  ]);
  if (!product) notFound();
  const sp = await searchParams;

  return (
    <>
      <PageTitle
        title={product.name}
        subtitle={`Réf. ${product.reference}`}
        actions={
          <>
            <Badge value={product.status} />
            <BtnLink href={`/admin/products/${id}/apercu`}>Prévisualiser</BtnLink>
            {(["published", "draft", "archived"] as const)
              .filter((s) => s !== product.status)
              .map((s) => (
                <form key={s} action={setProductStatus}>
                  <input type="hidden" name="id" value={id} />
                  <input type="hidden" name="status" value={s} />
                  <SubmitButton variant={s === "published" ? "primary" : "secondary"}>
                    {s === "published" ? "Publier" : s === "draft" ? "Dépublier" : "Archiver"}
                  </SubmitButton>
                </form>
              ))}
          </>
        }
      />
      <Flash {...flashFrom(sp)} />
      <ProductForm
        action={updateProduct}
        product={product as ProductRecord}
        categories={categories ?? []}
      />

      <div className="mt-8 grid gap-6 xl:grid-cols-2">
        <Card title="Photographies">
          <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
            {(images ?? []).map((img) => (
              <li key={img.id} className="border border-brun/10 bg-white p-2">
                <div className="relative aspect-[4/5] bg-creme">
                  <Image
                    src={storagePublicUrl(img.storage_path)}
                    alt={img.alt_text}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  {img.is_primary && (
                    <span className="absolute left-1 top-1 bg-brun px-1.5 text-[0.6rem] uppercase text-ivoire">
                      Principale
                    </span>
                  )}
                </div>
                <form action={updateProductImage} className="mt-2 space-y-2">
                  <input type="hidden" name="product_id" value={id} />
                  <input type="hidden" name="image_id" value={img.id} />
                  <input
                    name="alt_text"
                    defaultValue={img.alt_text}
                    required
                    maxLength={250}
                    className={`${inputClass} text-xs`}
                    aria-label="Texte alternatif"
                  />
                  <input
                    name="position"
                    type="number"
                    min={0}
                    max={100}
                    defaultValue={img.position}
                    className={`${inputClass} text-xs`}
                    aria-label="Position"
                  />
                  <div className="flex flex-wrap gap-1">
                    <button
                      name="op"
                      value="save"
                      className="border border-brun/20 px-2 py-1 text-[0.65rem] uppercase"
                    >
                      Enregistrer
                    </button>
                    {!img.is_primary && (
                      <button
                        name="op"
                        value="primary"
                        className="border border-brun/20 px-2 py-1 text-[0.65rem] uppercase"
                      >
                        Principale
                      </button>
                    )}
                    <button
                      name="op"
                      value="delete"
                      className="border border-[#8a3b2a]/30 px-2 py-1 text-[0.65rem] uppercase text-[#8a3b2a]"
                    >
                      Retirer
                    </button>
                  </div>
                </form>
              </li>
            ))}
          </ul>
          <form action={addProductImage} className="mt-6 space-y-3 border-t border-brun/10 pt-5">
            <input type="hidden" name="id" value={id} />
            <Field label="Nouvelle image" hint="JPEG, PNG, WebP ou AVIF — 10 Mo maximum">
              <input
                type="file"
                name="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="text-sm"
              />
            </Field>
            <Field label="… ou un média existant">
              <select name="existing_path" className={inputClass} defaultValue="">
                <option value="">—</option>
                {(media ?? []).map((m) => (
                  <option key={m.storage_path} value={m.storage_path}>
                    {m.alt_text || m.storage_path}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Texte alternatif"
              hint="Décrire la photographie, ex. « Suspension en verre ambré au-dessus d’une table en chêne »"
            >
              <input name="alt_text" required maxLength={250} className={inputClass} />
            </Field>
            <SubmitButton>Ajouter l’image</SubmitButton>
          </form>
        </Card>

        <Card title="Variantes et finitions">
          <div className="space-y-4">
            {[...(variants ?? []), null].map((v) => (
              <form
                key={v?.id ?? "new"}
                action={saveVariant}
                className="grid grid-cols-2 gap-2 border-b border-brun/10 pb-4 md:grid-cols-6"
              >
                <input type="hidden" name="product_id" value={id} />
                {v && <input type="hidden" name="variant_id" value={v.id} />}
                <input
                  name="name"
                  placeholder="Nom"
                  required
                  defaultValue={v?.name}
                  className={`${inputClass} md:col-span-2`}
                  aria-label="Nom"
                />
                <input
                  name="sku"
                  placeholder="SKU"
                  required
                  defaultValue={v?.sku}
                  className={inputClass}
                  aria-label="SKU"
                />
                <input
                  name="finish"
                  placeholder="Finition"
                  defaultValue={v?.finish ?? ""}
                  className={inputClass}
                  aria-label="Finition"
                />
                <input
                  name="price_adjustment"
                  placeholder="± €"
                  defaultValue={
                    v
                      ? (v.price_adjustment < 0 ? "-" : "") +
                        centsToInput(Math.abs(Number(v.price_adjustment)))
                      : "0"
                  }
                  className={inputClass}
                  aria-label="Ajustement de prix"
                />
                <input
                  name="stock_quantity"
                  type="number"
                  min={0}
                  defaultValue={v?.stock_quantity ?? 0}
                  className={inputClass}
                  aria-label="Stock"
                />
                <label className="flex items-center gap-2 text-xs md:col-span-2">
                  <input
                    type="checkbox"
                    name="active"
                    defaultChecked={v?.active ?? true}
                    className="accent-champagne"
                  />{" "}
                  Active
                </label>
                <div className="flex gap-2 md:col-span-4 md:justify-end">
                  <SubmitButton variant="secondary">
                    {v ? "Enregistrer" : "Ajouter la variante"}
                  </SubmitButton>
                  {v && (
                    <button
                      name="op"
                      value="delete"
                      className="border border-[#8a3b2a]/30 px-3 text-[0.65rem] uppercase text-[#8a3b2a]"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </form>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Zone sensible" className="mt-8 border-[#8a3b2a]/20">
        <p className="mb-4 text-sm text-brun/70">
          Préférez l’archivage : il retire le produit du site sans perdre son historique. La
          suppression est définitive (les commandes passées conservent leur instantané).
        </p>
        <form action={deleteProduct} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={id} />
          <Field label={`Saisir « ${product.reference} » pour confirmer`}>
            <input name="confirm" required className={inputClass} autoComplete="off" />
          </Field>
          <SubmitButton variant="danger" confirm="Supprimer définitivement ce produit ?">
            Supprimer
          </SubmitButton>
        </form>
      </Card>
    </>
  );
}
