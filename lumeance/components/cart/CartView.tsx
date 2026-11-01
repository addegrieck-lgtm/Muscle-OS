"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useTransition } from "react";
import { quoteCart } from "@/app/actions/public";
import { LuminaireArt } from "@/components/art/LuminaireArt";
import { useCart } from "@/components/cart/CartProvider";
import { ButtonLink, buttonClass } from "@/components/ui/Button";
import { formatPrice } from "@/lib/money";
import type { CartQuote } from "@/lib/services/pricing";

export function CartView({ checkoutOpen }: { checkoutOpen: boolean }) {
  const { lines, ready, setQuantity, remove } = useCart();
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!ready) return;
    start(async () => {
      try {
        setQuote(await quoteCart(lines));
        setError(false);
      } catch {
        setError(true);
      }
    });
  }, [lines, ready]);

  if (!ready || (!quote && !error)) {
    return <p className="t-small py-20 text-brun/50">Chargement du panier…</p>;
  }
  if (error) {
    return (
      <p className="py-20">
        Le panier est momentanément indisponible. Merci de réessayer dans un instant.
      </p>
    );
  }
  if (!quote || quote.lines.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="t-h3">Votre panier est vide.</p>
        <p className="mt-4 text-brun/70">Laissez-vous guider par nos collections.</p>
        <div className="mt-10">
          <ButtonLink href="/collections">Découvrir la collection</ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`grid gap-16 lg:grid-cols-12 ${pending ? "opacity-70" : ""} transition-opacity`}
    >
      <div className="lg:col-span-7">
        {quote.removed.length > 0 && (
          <div role="alert" className="t-small mb-8 border-l border-champagne bg-creme px-4 py-3">
            {quote.removed.map((r) => (
              <p key={r.productId}>{r.reason}</p>
            ))}
          </div>
        )}
        <ul className="divide-y divide-brun/10 border-y border-brun/10">
          {quote.lines.map((l) => (
            <li
              key={`${l.productId}-${l.variantId}-${JSON.stringify(l.options)}`}
              className="flex gap-5 py-7 md:gap-8"
            >
              <Link
                href={`/produit/${l.slug}`}
                className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden bg-noir md:w-32"
              >
                {l.imageUrl ? (
                  <Image
                    src={l.imageUrl}
                    alt=""
                    fill
                    sizes="128px"
                    unoptimized={l.imageUrl.startsWith("/")}
                    className="object-cover"
                  />
                ) : (
                  <LuminaireArt form={l.art} seed={l.slug} className="h-full w-full" label="" />
                )}
              </Link>
              <div className="flex flex-1 flex-col">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link
                      href={`/produit/${l.slug}`}
                      className="font-serif text-2xl leading-tight hover:text-champagne"
                    >
                      {l.name}
                    </Link>
                    {l.variantName && <p className="t-small mt-1 text-brun/60">{l.variantName}</p>}
                    <p className="t-small mt-1 text-brun/40">Réf. {l.reference}</p>
                    {l.isDemo && (
                      <p className="t-small mt-1 text-champagne">Pièce fictive (aperçu)</p>
                    )}
                  </div>
                  <p className="font-serif text-xl">{formatPrice(l.total)}</p>
                </div>
                <div className="mt-auto flex items-center justify-between pt-4">
                  <div
                    className="flex items-center border border-brun/20"
                    role="group"
                    aria-label={`Quantité pour ${l.name}`}
                  >
                    <button
                      type="button"
                      className="px-3 py-1.5 disabled:opacity-30"
                      disabled={l.quantity <= 1}
                      onClick={() =>
                        setQuantity(
                          {
                            productId: l.productId,
                            variantId: l.variantId,
                            options: l.options ?? undefined,
                          },
                          l.quantity - 1,
                        )
                      }
                      aria-label="Diminuer"
                    >
                      −
                    </button>
                    <span className="w-8 text-center t-small">{l.quantity}</span>
                    <button
                      type="button"
                      className="px-3 py-1.5 disabled:opacity-30"
                      disabled={l.quantity >= 10}
                      onClick={() =>
                        setQuantity(
                          {
                            productId: l.productId,
                            variantId: l.variantId,
                            options: l.options ?? undefined,
                          },
                          l.quantity + 1,
                        )
                      }
                      aria-label="Augmenter"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      remove({
                        productId: l.productId,
                        variantId: l.variantId,
                        options: l.options ?? undefined,
                      })
                    }
                    className="t-small text-brun/60 underline-offset-4 hover:text-brun hover:underline"
                  >
                    Retirer
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside className="lg:col-span-5" aria-label="Récapitulatif">
        <div className="bg-creme/70 p-7 md:p-10 lg:sticky lg:top-28">
          <h2 className="t-eyebrow">Récapitulatif</h2>
          <dl className="mt-8 space-y-4">
            <div className="flex justify-between">
              <dt>Sous-total</dt>
              <dd>{formatPrice(quote.subtotal)}</dd>
            </div>
            {quote.discounts.map((d) => (
              <div key={d.productId} className="flex justify-between gap-4 text-champagne">
                <dt>Offre {d.label}</dt>
                <dd className="shrink-0">− {formatPrice(d.amount)}</dd>
              </div>
            ))}
            <div className="flex justify-between text-brun/70">
              <dt>Livraison</dt>
              <dd>
                {quote.shipping === null
                  ? "À confirmer"
                  : quote.shipping === 0
                    ? "Offerte"
                    : formatPrice(quote.shipping)}
              </dd>
            </div>
            <div className="flex justify-between border-t border-brun/15 pt-4 font-serif text-2xl">
              <dt>Total TTC</dt>
              <dd>{formatPrice(quote.total)}</dd>
            </div>
          </dl>
          <p className="t-small mt-3 text-brun/50">
            Montants recalculés par nos serveurs à partir du catalogue en vigueur.
          </p>

          {checkoutOpen ? (
            <Link href="/commande" className={buttonClass("solid", "mt-8 w-full")}>
              Passer commande
            </Link>
          ) : (
            <div className="mt-8">
              <button
                type="button"
                disabled
                className={buttonClass("solid", "w-full")}
                aria-describedby="checkout-note"
              >
                Commande en ligne bientôt disponible
              </button>
              <p id="checkout-note" className="t-small mt-4 text-brun/75">
                La boutique n’est pas encore ouverte : aucun paiement n’est possible et aucune
                coordonnée bancaire n’est demandée. Votre panier est conservé sur cet appareil
                pendant 30 jours.
              </p>
              <Link href="/contact" className="t-eyebrow mt-6 inline-block text-champagne">
                Être informé de l’ouverture
              </Link>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
