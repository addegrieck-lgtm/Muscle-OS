import Link from "next/link";
import {
  Badge,
  BtnLink,
  Flash,
  PageTitle,
  Table,
  flashFrom,
  inputClass,
} from "@/components/admin/ui";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { formatPrice } from "@/lib/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Produits" };
const STATUS_LABELS: Record<string, string> = {
  draft: "Brouillon",
  published: "Publié",
  archived: "Archivé",
};

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin(CATALOG_ROLES);
  const sp = await searchParams;
  const supabase = await createSupabaseServerClient();
  let q = supabase
    .from("products")
    .select(
      "id, name, reference, price, compare_at_price, status, featured, stock_quantity, categories(name), product_images(id)",
    )
    .order("updated_at", { ascending: false })
    .limit(200);
  if (sp.statut && ["draft", "published", "archived"].includes(sp.statut))
    q = q.eq("status", sp.statut);
  if (sp.q) {
    const term = sp.q
      .replace(/[%,()]/g, " ")
      .trim()
      .slice(0, 60);
    q = q.or(`name.ilike.%${term}%,reference.ilike.%${term}%`);
  }
  const { data } = await q;
  return (
    <>
      <PageTitle
        title="Produits"
        subtitle={`${data?.length ?? 0} produit(s)`}
        actions={
          <BtnLink href="/admin/products/new" variant="primary">
            Nouveau produit
          </BtnLink>
        }
      />
      <Flash {...flashFrom(sp)} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={sp.q}
          placeholder="Nom ou référence"
          className={`${inputClass} max-w-xs`}
        />
        <select
          name="statut"
          defaultValue={sp.statut ?? ""}
          className={`${inputClass} max-w-[12rem]`}
        >
          <option value="">Tous les statuts</option>
          <option value="published">Publiés</option>
          <option value="draft">Brouillons</option>
          <option value="archived">Archivés</option>
        </select>
        <button className="border border-brun/20 px-4 text-xs uppercase tracking-[0.14em]">
          Filtrer
        </button>
      </form>
      <Table
        head={["Produit", "Référence", "Catégorie", "Prix", "Stock", "Images", "Statut"]}
        empty={data?.length ? undefined : "Aucun produit."}
      >
        {(data ?? []).map((p) => (
          <tr key={p.id} className="hover:bg-creme/40">
            <td className="px-4 py-3">
              <Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">
                {p.name}
              </Link>
              {p.featured && <span className="ml-2 text-xs text-champagne">★ signature</span>}
            </td>
            <td className="px-4 py-3 text-brun/70">{p.reference}</td>
            <td className="px-4 py-3">
              {(p.categories as unknown as { name: string } | null)?.name ?? "—"}
            </td>
            <td className="px-4 py-3">
              {formatPrice(Number(p.price))}
              {p.compare_at_price && (
                <span className="ml-2 text-xs text-brun/40 line-through">
                  {formatPrice(Number(p.compare_at_price))}
                </span>
              )}
            </td>
            <td className={`px-4 py-3 ${p.stock_quantity <= 2 ? "text-[#8a3b2a]" : ""}`}>
              {p.stock_quantity}
            </td>
            <td className="px-4 py-3">{(p.product_images as unknown[]).length}</td>
            <td className="px-4 py-3">
              <Badge value={p.status} label={STATUS_LABELS[p.status]} />
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
