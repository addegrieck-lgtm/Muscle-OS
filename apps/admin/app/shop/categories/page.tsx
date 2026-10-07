import { ErrorBox, H1 } from "@/components/Shell";
import { CategoryForm } from "@/components/ShopForms";
import { ShopNav } from "@/components/ShopNav";
import { adminApi } from "@/lib/api";

export default async function CategoriesPage() {
  let items: (Parameters<typeof CategoryForm>[0]["cat"] & { slug: string; products: number })[];
  try {
    items = (await adminApi<{ items: typeof items }>("/shop/categories")).items;
  } catch (e) {
    return <><H1>Catégories</H1><ShopNav active="/shop/categories" /><ErrorBox message={(e as Error).message} /></>;
  }
  return (
    <>
      <H1>Catégories</H1>
      <ShopNav active="/shop/categories" />
      <div className="max-w-3xl space-y-3">
        {items.map((c) => (
          <div key={c.id}>
            <p className="mb-1 text-xs text-subtle">/boutique/{c.slug} · {c.products} produit(s)</p>
            <CategoryForm cat={c} />
          </div>
        ))}
      </div>
    </>
  );
}
