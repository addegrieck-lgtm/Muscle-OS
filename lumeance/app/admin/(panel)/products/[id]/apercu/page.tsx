import { notFound } from "next/navigation";
import { BtnLink } from "@/components/admin/ui";
import { ProductGallery } from "@/components/product/ProductGallery";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/money";
import { PRODUCT_SELECT } from "@/lib/services/catalog";
import { mapProduct, type ProductRow } from "@/lib/services/mappers";
import { storagePublicUrl } from "@/lib/supabase/public";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Aperçu produit" };

/** Aperçu fidèle d'une fiche, y compris en brouillon (lecture admin via RLS). */
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin(CATALOG_ROLES);
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const p = mapProduct(data as ProductRow, storagePublicUrl);
  return (
    <div className="bg-ivoire p-6">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-champagne">
          Aperçu — {p.status === "published" ? "publié" : "non publié"}
        </p>
        <BtnLink href={`/admin/products/${id}`}>Retour à l’édition</BtnLink>
      </div>
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <ProductGallery product={p} />
        </div>
        <div className="lg:col-span-5">
          <h1 className="t-h1">{p.name}</h1>
          <p className="mt-2 text-sm text-brun/50">Réf. {p.reference}</p>
          <p className="t-lead mt-6">{p.shortDescription}</p>
          <p className="mt-6 font-serif text-3xl">{formatPrice(p.price)}</p>
          <div className="mt-6 space-y-3 whitespace-pre-line text-brun/80">{p.description}</div>
          {p.specifications.length > 0 && (
            <dl className="mt-6 grid grid-cols-2 gap-2 text-sm">
              {p.specifications.map((s) => (
                <div key={s.label} className="contents">
                  <dt className="text-brun/55">{s.label}</dt>
                  <dd>{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
    </div>
  );
}
