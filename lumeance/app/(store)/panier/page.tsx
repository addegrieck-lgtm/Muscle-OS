import { CartView } from "@/components/cart/CartView";
import { PageHeader } from "@/components/ui/PageHeader";
import { checkoutAvailable } from "@/lib/payments";
import { pageMetadata } from "@/lib/seo/metadata";

export const metadata = pageMetadata({
  title: "Panier",
  description: "Votre sélection LUMÉANCE.",
  path: "/panier",
  noindex: true,
});

export default function CartPage() {
  return (
    <>
      <PageHeader eyebrow="Votre sélection" title="Panier" />
      <div className="container-luxe pb-32">
        {/* Parcours de commande ouvert seulement si Stripe est entièrement configuré. */}
        <CartView checkoutOpen={checkoutAvailable()} />
      </div>
    </>
  );
}
