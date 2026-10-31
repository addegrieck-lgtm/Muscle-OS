"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useSelectedVariant } from "@/components/product/VariantContext";
import { buttonClass } from "@/components/ui/Button";
import { formatPrice } from "@/lib/money";
import type { Product, ProductVariant } from "@/types/catalog";

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const variants = product.variants.filter((v) => v.active);
  const shared = useSelectedVariant();
  const [localId, setLocalId] = useState<string | null>(variants[0]?.id ?? null);
  const variantId = shared ? shared.variantId : localId;
  const setVariantId = shared ? shared.setVariantId : setLocalId;
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

      {variants.length > 0 && product.optionLabels ? (
        <TwoLevelSelector
          product={product}
          variants={variants}
          variantId={variantId}
          onChange={setVariantId}
        />
      ) : (
        variants.length > 0 && (
          <fieldset>
            <legend className="t-eyebrow text-brun/60">
              {variants.some((v) => v.finish) ? "Finition" : "Version"}
            </legend>
            <div className="mt-3 flex flex-wrap gap-2">
              {variants.map((v) => (
                <Chip
                  key={v.id}
                  name="variant"
                  checked={v.id === variantId}
                  onChange={() => setVariantId(v.id)}
                >
                  {v.name}
                  {v.priceAdjustment !== 0 && (
                    <span className="ml-2 opacity-70">
                      {v.priceAdjustment > 0 ? "+" : "−"}
                      {formatPrice(Math.abs(v.priceAdjustment))}
                    </span>
                  )}
                </Chip>
              ))}
            </div>
          </fieldset>
        )
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

function Chip({
  name,
  checked,
  onChange,
  children,
}: {
  name: string;
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={`t-small cursor-pointer border px-4 py-2.5 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-1 has-[:focus-visible]:outline-champagne ${checked ? "border-brun bg-brun text-ivoire" : "border-brun/20 hover:border-brun/60"}`}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="sr-only" />
      {children}
    </label>
  );
}

/** Sélecteur à deux niveaux : groupe (ex. forme du pavillon) puis version, avec prix absolu. */
function TwoLevelSelector({
  product,
  variants,
  variantId,
  onChange,
}: {
  product: Product;
  variants: ProductVariant[];
  variantId: string | null;
  onChange: (id: string) => void;
}) {
  const groups = [...new Set(variants.map((v) => v.finish ?? ""))];
  const current = variants.find((v) => v.id === variantId) ?? variants[0]!;
  const group = current.finish ?? "";
  const inGroup = variants.filter((v) => (v.finish ?? "") === group);
  const label = (g: string) => g.replace(/^Pavillon\s+/i, "").replace(/^./, (c) => c.toUpperCase());

  return (
    <div className="space-y-5">
      {groups.length > 1 && (
        <fieldset>
          <legend className="t-eyebrow text-brun/60">{product.optionLabels!.group}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {groups.map((g) => (
              <Chip
                key={g}
                name="variant-group"
                checked={g === group}
                onChange={() => onChange(variants.find((v) => (v.finish ?? "") === g)!.id)}
              >
                {label(g)}
              </Chip>
            ))}
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend className="t-eyebrow text-brun/60">{product.optionLabels!.variant}</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {inGroup.map((v) => (
            <Chip
              key={v.id}
              name="variant"
              checked={v.id === current.id}
              onChange={() => onChange(v.id)}
            >
              {v.name.replace(/\s*sphères?$/, "")}
              <span className="ml-2 opacity-70">
                {formatPrice(product.price + v.priceAdjustment)}
              </span>
            </Chip>
          ))}
        </div>
        {current.details && <p className="t-small mt-3 text-brun/65">{current.details}</p>}
      </fieldset>
    </div>
  );
}
