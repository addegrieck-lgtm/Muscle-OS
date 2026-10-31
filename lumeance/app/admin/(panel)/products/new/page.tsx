import { Flash, PageTitle, flashFrom } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/ProductForm";
import { CATALOG_ROLES, requireAdmin } from "@/lib/auth/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createProduct } from "../actions";

export const metadata = { title: "Nouveau produit" };

export default async function NewProduct({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>;
}) {
  await requireAdmin(CATALOG_ROLES);
  const supabase = await createSupabaseServerClient();
  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .order("position");
  return (
    <>
      <PageTitle
        title="Nouveau produit"
        subtitle="Créé en brouillon par défaut : rien n’est publié sans votre validation."
      />
      <Flash {...flashFrom(await searchParams)} />
      <ProductForm action={createProduct} categories={categories ?? []} />
    </>
  );
}
