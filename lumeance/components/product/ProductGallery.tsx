"use client";

import Image from "next/image";
import { useState } from "react";
import { LuminaireArt } from "@/components/art/LuminaireArt";
import type { Product } from "@/types/catalog";

/** Galerie produit : photographies réelles si disponibles, sinon deux ambiances d'illustration. */
export function ProductGallery({ product }: { product: Product }) {
  const slides =
    product.images.length > 0
      ? product.images.map((img) => ({ key: img.id, kind: "image" as const, img }))
      : [
          { key: "nuit", kind: "art" as const, mood: "nuit" as const, label: "Ambiance du soir" },
          { key: "jour", kind: "art" as const, mood: "jour" as const, label: "Ambiance de jour" },
        ];
  const [active, setActive] = useState(0);
  const current = slides[active] ?? slides[0]!;

  return (
    <div className="lg:sticky lg:top-24">
      <div className="relative aspect-[4/5] overflow-hidden bg-noir">
        {slides.map((s, i) => (
          <div
            key={s.key}
            className={`absolute inset-0 transition-opacity duration-1000 ease-[var(--ease-silk)] ${i === active ? "opacity-100" : "opacity-0"}`}
            aria-hidden={i !== active}
          >
            {s.kind === "image" ? (
              <Image
                src={s.img.url}
                alt={s.img.alt}
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover"
              />
            ) : (
              <LuminaireArt
                form={product.art}
                seed={product.slug}
                mood={s.mood}
                className="h-full w-full"
                label={`Illustration évoquant ${product.name} — ${s.label}`}
              />
            )}
          </div>
        ))}
        {current.kind === "art" && (
          <p
            className={`absolute bottom-4 left-4 text-[0.6rem] uppercase tracking-[0.25em] ${current.mood === "nuit" ? "text-ivoire/50" : "text-brun/50"}`}
          >
            Illustration — photographies de la pièce à venir
          </p>
        )}
      </div>
      {slides.length > 1 && (
        <div className="mt-3 flex gap-3" role="tablist" aria-label="Vues">
          {slides.map((s, i) => (
            <button
              key={s.key}
              type="button"
              role="tab"
              aria-selected={i === active}
              aria-label={s.kind === "image" ? s.img.alt : s.label}
              onClick={() => setActive(i)}
              className={`relative aspect-square w-20 overflow-hidden bg-noir transition-opacity ${i === active ? "opacity-100 outline outline-1 outline-offset-2 outline-champagne" : "opacity-55 hover:opacity-90"}`}
            >
              {s.kind === "image" ? (
                <Image src={s.img.url} alt="" fill sizes="80px" className="object-cover" />
              ) : (
                <LuminaireArt
                  form={product.art}
                  seed={product.slug}
                  mood={s.mood}
                  className="h-full w-full"
                  label=""
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
