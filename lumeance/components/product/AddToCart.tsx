"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { buttonClass } from "@/components/ui/Button";
import { formatPrice } from "@/lib/money";
import type { Product } from "@/types/catalog";

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const variants = product.variants.filter((v) => v.active);
  const [variantId, setVariantId] = useState<string | null>(variants[0]?.id ?? null);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = variants.find((v) => v.id === variantId) ?? null;
  const price = product.price + (variant?.priceAdjustment ?? 0);
  const available =
    product.isDemo || (variant ? variant.stockQuantity > 0 : product.stockQuantity > 0);

  return (
    <div className="space-y-6">
      <p className="font-serif text-3xl" aria-live="polite">
        {product.compareAtPrice && (
          <span className="mr-3 text-xl text-brun/40 line-through">
            {formatPrice(product.compareAtPrice)}
          </span>
        )}
        {formatPrice(price)}
        <span className="t-small ml-3 font-sans text-brun/50">TTC</span>
      </p>

      {variants.length > 0 && (
        <fieldset>
          <legend className="t-eyebrow text-brun/60">Finition</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {variants.map((v) => (
              <label
                key={v.id}
                className={`t-small cursor-pointer border px-4 py-2.5 transition-colors ${v.id === variantId ? "border-brun bg-brun text-ivoire" : "border-brun/20 hover:border-brun/60"}`}
              >
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={v.id === variantId}
                  onChange={() => setVariantId(v.id)}
                  className="sr-only"
                />
                {v.name}
                {v.priceAdjustment !== 0 && (
                  <span className="ml-2 opacity-70">
                    {v.priceAdjustment > 0 ? "+" : "−"}
                    {formatPrice(Math.abs(v.priceAdjustment))}
                  </span>
                )}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className="flex items-stretch gap-3">
        <div className="flex items-center border border-brun/20" role="group" aria-label="Quantité">
          <button
            type="button"
            className="h-full px-4 text-lg disabled:opacity-30"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Diminuer la quantité"
          >
            −
          </button>
          <span className="w-8 text-center" aria-live="polite">
            {qty}
          </span>
          <button
            type="button"
            className="h-full px-4 text-lg disabled:opacity-30"
            onClick={() => setQty((q) => Math.min(10, q + 1))}
            disabled={qty >= 10}
            aria-label="Augmenter la quantité"
          >
            +
          </button>
        </div>
        <button
          type="button"
          disabled={!available}
          className={buttonClass("solid", "flex-1")}
          onClick={() => {
            add({ productId: product.id, variantId: variant?.id ?? null, quantity: qty });
            setAdded(true);
          }}
        >
          {available ? "Ajouter au panier" : "Disponibilité sur demande"}
        </button>
      </div>
      {!available && (
        <p className="t-small text-brun/70">
          Cette pièce est disponible sur demande.{" "}
          <Link href="/contact" className="underline underline-offset-4">
            Nous contacter
          </Link>{" "}
          pour un conseil ou un devis.
        </p>
      )}
      <p className="t-small min-h-6 text-champagne" role="status">
        {added && (
          <>
            Ajouté à votre panier.{" "}
            <Link href="/panier" className="underline underline-offset-4">
              Voir le panier
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
