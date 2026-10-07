import { H1 } from "@/components/Shell";
import { ProductForm } from "@/components/ProductForm";
import { ShopNav } from "@/components/ShopNav";
import { adminApi } from "@/lib/api";

export default async function ProductEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [product, cats, settings] = await Promise.all([
    id === "new" ? Promise.resolve(null) : adminApi<Parameters<typeof ProductForm>[0]["product"]>(`/shop/products/${id}`),
    adminApi<{ items: { id: string; name: string }[] }>("/shop/categories"),
    adminApi<{ pointsPerEuro: number }>("/shop/settings"),
  ]);
  return (
    <>
      <H1>{product ? `Modifier — ${product.name}` : "Créer un produit"}</H1>
      <ShopNav active="/shop/products" />
      <ProductForm product={product} categories={cats.items} pointsPerEuro={settings.pointsPerEuro} />
    </>
  );
}
