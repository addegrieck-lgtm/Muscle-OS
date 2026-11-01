"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "@/components/cart/CartProvider";
import { useSelectedVariant } from "@/components/product/VariantContext";
import { buttonClass } from "@/components/ui/Button";
import { formatPrice } from "@/lib/money";
import { requestSubject } from "@/lib/catalog/request-subject";
import { promotionLabel } from "@/lib/catalog/promotion";
import type { Product, ProductVariant } from "@/types/catalog";

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const variants = product.variants.filter((v) => v.active);
  const shared = useSelectedVariant();
  const [localId, setLocalId] = useState<string | null>(variants[0]?.id ?? null);
  const variantId = shared ? shared.variantId : localId;
  const setVariantId = shared ? shared.setVariantId : setLocalId;
  const [localOptions, setLocalOptions] = useState<Record<string, string>>(() =>
    Object.fromEntries((product.options ?? []).map((o) => [o.id, o.values[0]!.id])),
  );
  const options = shared ? shared.options : localOptions;
  const setOption = shared
    ? shared.setOption
    : (id: string, value: string) => setLocalOptions((o) => ({ ...o, [id]: value }));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = variants.find((v) => v.id === variantId) ?? null;
  const price = product.price + (variant?.priceAdjustment ?? 0);
  const available =
    product.isDemo || (variant ? variant.stockQuantity > 0 : product.stockQuantity > 0);

  return (
    <div className="space-y-6">
      <p className="font-serif text-3xl" aria-live="polite">
        {/* Prix de référence affiché seulement s'il porte sur la version choisie (prix de base) :
            sinon, une version plus chère afficherait un prix barré inférieur au prix réel. */}
        {product.compareAtPrice && price === product.price && (
          <span className="mr-3 text-xl text-brun/40 line-through">
            {formatPrice(product.compareAtPrice)}
          </span>
        )}
        {formatPrice(price)}
        <span className="t-small ml-3 font-sans text-brun/50">TTC</span>
      </p>
      {product.promotion && (
        <p className="t-eyebrow -mt-3 text-champagne">
          Offre : {promotionLabel(product.promotion)}
          <span className="block font-sans text-[0.8rem] normal-case tracking-normal text-brun/60">
            Toutes versions et finitions confondues ; la moins chère est offerte.
          </span>
        </p>
      )}

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
              {variants.some((v) => v.finish) ? "Finition" : "Format"}
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
                </Chip>
              ))}
            </div>
            {variant?.details && <p className="t-small mt-3 text-brun/65">{variant.details}</p>}
          </fieldset>
        )
      )}

      {(product.options ?? []).map((o) => (
        <fieldset key={o.id}>
          <legend className="t-eyebrow text-brun/60">{o.label}</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {o.values.map((v) => (
              <Chip
                key={v.id}
                name={`option-${o.id}`}
                checked={options[o.id] === v.id}
                onChange={() => setOption(o.id, v.id)}
              >
                {v.label}
              </Chip>
            ))}
          </div>
        </fieldset>
      ))}

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
        {available ? (
          <button
            type="button"
            className={buttonClass("solid", "flex-1")}
            onClick={() => {
              add({
                productId: product.id,
                variantId: variant?.id ?? null,
                quantity: qty,
                ...(product.options?.length ? { options } : {}),
              });
              setAdded(true);
            }}
          >
            Ajouter au panier
          </button>
        ) : (
          // Pièce non commandable en ligne : action utile plutôt qu'un bouton grisé. L'objet du
          // message reprend la pièce, la version, les options et la quantité choisies.
          <Link
            href={`/contact?objet=${encodeURIComponent(requestSubject(product, variant, options, qty))}`}
            className={buttonClass("solid", "flex-1 text-center")}
          >
            Demander cette pièce
          </Link>
        )}
      </div>
      {!available && (
        <p className="t-small text-brun/70">
          Cette pièce est disponible sur demande : écrivez-nous, nous vous répondons personnellement
          avec un conseil, un délai et un devis.
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
            </Chip>
          ))}
        </div>
        {current.details && <p className="t-small mt-3 text-brun/65">{current.details}</p>}
      </fieldset>
    </div>
  );
}
