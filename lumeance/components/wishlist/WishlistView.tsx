"use client";

import Link from "next/link";
import { ProductCard } from "@/components/catalog/ProductCard";
import { ButtonLink } from "@/components/ui/Button";
import { useAccount } from "@/components/account/AccountProvider";
import { useWishlist } from "@/components/wishlist/WishlistProvider";
import type { Product } from "@/types/catalog";

export function WishlistView({ products }: { products: Product[] }) {
  const { ids, ready, synced } = useWishlist();
  const { loggedIn } = useAccount();
  if (!ready) return <p className="t-small py-20 text-brun/50">Chargement…</p>;

  const byId = new Map(products.map((p) => [p.id, p]));
  // Ordre de la liste (plus récentes d'abord) ; pièces retirées du catalogue ignorées.
  const items = ids.map((id) => byId.get(id)).filter((p): p is Product => Boolean(p));

  return (
    <>
      <p className="t-small mb-12 max-w-xl text-brun/70">
        {synced ? (
          "Vos envies sont enregistrées dans votre compte et vous suivent sur tous vos appareils."
        ) : (
          <>
            Vos envies sont gardées sur cet appareil.{" "}
            {!loggedIn && (
              <>
                <Link
                  href="/compte/connexion?suite=/envies"
                  className="underline underline-offset-4"
                >
                  Connectez-vous
                </Link>{" "}
                pour les retrouver sur tous vos appareils.
              </>
            )}
          </>
        )}
      </p>
      {items.length === 0 ? (
        <div className="py-16 text-center">
          <p className="t-h3">Aucune pièce pour l’instant.</p>
          <p className="mt-4 text-brun/70">Touchez le cœur d’une pièce pour la mettre de côté.</p>
          <div className="mt-10">
            <ButtonLink href="/collections">Découvrir la collection</ButtonLink>
          </div>
        </div>
      ) : (
        <div className="grid gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p, i) => (
            <ProductCard key={p.id} product={p} index={i} reveal={false} />
          ))}
        </div>
      )}
    </>
  );
}
