"use client";

import { useEffect, useState } from "react";
import { useSelectedVariant } from "@/components/product/VariantContext";
import { buttonClass } from "@/components/ui/Button";
import { formatPrice } from "@/lib/money";
import type { Product } from "@/types/catalog";

/**
 * Barre d'achat fixe en bas d'écran, sur mobile et tablette uniquement : rappelle le prix de la
 * version choisie et ramène au sélecteur (#achat). Masquée tant que le sélecteur est visible,
 * et au-dessus du pied de page, pour ne jamais doubler ni recouvrir l'action principale.
 */
export function StickyBuyBar({ product, targetId }: { product: Product; targetId: string }) {
  const selected = useSelectedVariant();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    const footer = document.querySelector("footer");
    if (!target) return;
    let targetSeen = true;
    let footerSeen = false;
    const update = () => setShow(!targetSeen && !footerSeen);
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.target === target) {
          // Sélecteur hors écran, au-dessus (déjà dépassé) ou en dessous (image en tête sur
          // mobile) : la barre est utile dans les deux cas.
          targetSeen = e.isIntersecting;
        } else footerSeen = e.isIntersecting;
      }
      update();
    });
    io.observe(target);
    if (footer) io.observe(footer);
    return () => io.disconnect();
  }, [targetId]);

  const variant = product.variants.find((v) => v.id === selected?.variantId) ?? null;
  const price = product.price + (variant?.priceAdjustment ?? 0);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-brun/10 bg-ivoire/95 px-5 py-3 backdrop-blur-md transition-transform duration-500 ease-[var(--ease-luxe)] lg:hidden ${show ? "translate-y-0" : "pointer-events-none translate-y-full"}`}
      aria-hidden={!show}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg leading-tight">{product.name}</p>
          <p className="t-small text-brun/70">
            {formatPrice(price)} <span className="text-brun/45">TTC</span>
            {variant && <span className="text-brun/45"> · {variant.name}</span>}
          </p>
        </div>
        <a
          href={`#${targetId}`}
          tabIndex={show ? 0 : -1}
          className={buttonClass("solid", "shrink-0 px-5 py-3")}
        >
          Choisir
        </a>
      </div>
    </div>
  );
}
