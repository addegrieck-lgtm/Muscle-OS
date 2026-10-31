import { CartView } from "@/components/cart/CartView";
import { PageHeader } from "@/components/ui/PageHeader";
import { paymentsEnabled } from "@/lib/env";
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
        {/* V1 : le parcours de commande reste fermé tant que le paiement n'est pas intégré. */}
        <CartView checkoutOpen={paymentsEnabled() && false} />
      </div>
    </>
  );
}
