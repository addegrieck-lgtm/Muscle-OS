"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import type { ShopProduct } from "@vaeloria/types";
import { CartView } from "@/components/shop/CartView";

type Props = { products: ShopProduct[]; checkoutEnabled: boolean };

function WithNotice(props: Props) {
  const sp = useSearchParams();
  const notice = sp.get("echec")
    ? `Le paiement de la commande ${sp.get("echec")} n'a pas abouti. Aucun montant n'a été débité ; ton panier est intact.`
    : sp.get("annule")
      ? `Paiement de la commande ${sp.get("annule")} annulé. Ton panier est intact.`
      : null;
  return <CartView {...props} notice={notice} />;
}

/** Panier + message de retour du prestataire (lu côté client : la page reste en cache). */
export function CartWithNotice(props: Props) {
  return (
    <Suspense fallback={<CartView {...props} />}>
      <WithNotice {...props} />
    </Suspense>
  );
}
