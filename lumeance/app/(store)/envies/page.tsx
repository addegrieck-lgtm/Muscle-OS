import { PageHeader } from "@/components/ui/PageHeader";
import { WishlistView } from "@/components/wishlist/WishlistView";
import { getProducts } from "@/lib/services/catalog";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Mes envies",
  description: "Les pièces LUMÉANCE que vous avez mises de côté.",
  path: "/envies",
  noindex: true,
});

export default async function WishlistPage() {
  const products = (await getProducts()).filter((p) => p.status === "published");
  return (
    <>
      <PageHeader eyebrow="Votre sélection" title="Mes envies" />
      <div className="container-luxe pb-32">
        <WishlistView products={products} />
      </div>
    </>
  );
}
