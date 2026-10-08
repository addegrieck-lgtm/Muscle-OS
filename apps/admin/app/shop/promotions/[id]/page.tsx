import { notFound } from "next/navigation";
import { H1 } from "@/components/Shell";
import { PromotionForm } from "@/components/ShopForms";
import { ShopNav } from "@/components/ShopNav";
import { adminApi } from "@/lib/api";

export default async function PromotionEdit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [promos, products, cats] = await Promise.all([
    adminApi<{ items: Parameters<typeof PromotionForm>[0]["promo"][] }>("/shop/promotions"),
    adminApi<{ items: { id: string; name: string }[] }>("/shop/products"),
    adminApi<{ items: { id: string; name: string }[] }>("/shop/categories"),
  ]);
  const promo = id === "new" ? null : promos.items.find((p) => p?.id === id) ?? null;
  if (id !== "new" && !promo) notFound();
  const targets = [
    { value: "all", label: "Toute la boutique" },
    ...cats.items.map((c) => ({ value: `category:${c.id}`, label: `Catégorie — ${c.name}` })),
    ...products.items.map((p) => ({ value: `product:${p.id}`, label: `Produit — ${p.name}` })),
  ];
  return (
    <>
      <H1>{promo ? `Modifier — ${promo.name}` : "Créer une promotion"}</H1>
      <ShopNav active="/shop/promotions" />
      <PromotionForm promo={promo} targets={targets} />
    </>
  );
}
