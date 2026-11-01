"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LuminaireArt } from "@/components/art/LuminaireArt";
import { useSelectedVariant } from "@/components/product/VariantContext";
import type { Product } from "@/types/catalog";

/** Galerie produit : photographies réelles si disponibles, sinon deux ambiances d'illustration. */
export function ProductGallery({ product }: { product: Product }) {
  const selection = useSelectedVariant();
  const selected = product.variants.find((v) => v.id === selection?.variantId) ?? null;
  const base =
    product.images.length > 0
      ? product.images.map((img) => ({ key: img.id, kind: "image" as const, img }))
      : [
          { key: "nuit", kind: "art" as const, mood: "nuit" as const, label: "Ambiance du soir" },
          { key: "jour", kind: "art" as const, mood: "jour" as const, label: "Ambiance de jour" },
        ];
  // Visuel de la version choisie, ajouté en dernière vue et affiché dès qu'on change de version.
  // Clé des visuels : valeurs des options dans l'ordre du produit, ex. « or-rose-chaud ».
  const optionValue = (product.options ?? []).map((o) => selection?.options[o.id] ?? "").join("-");
  const versionImage = (optionValue && selected?.imageUrls?.[optionValue]) || selected?.imageUrl;
  const existing = base.findIndex((b) => b.kind === "image" && b.img.url === versionImage);
  const slides =
    versionImage && existing === -1
      ? [
          ...base,
          {
            key: "version",
            kind: "image" as const,
            img: {
              id: "version",
              url: versionImage,
              alt: `Visualisation 3D de ${product.name}, ${selected!.name}, ${(selected!.finish ?? "").toLowerCase()}`,
              caption: "Visualisation 3D — non contractuelle",
              isPrimary: false,
              position: 99,
            },
          },
        ]
      : base;
  const [active, setActive] = useState(0);
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    if (versionImage) setActive(existing >= 0 ? existing : base.length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection?.variantId, optionValue]);
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
              <>
                <Image
                  src={s.img.url}
                  alt={s.img.alt}
                  fill
                  priority={i === 0}
                  unoptimized={s.img.url.startsWith("/")}
                  sizes="(min-width: 1024px) 55vw, 100vw"
                  className="object-cover"
                />
                {s.img.caption && (
                  <p className="absolute bottom-4 left-4 bg-noir/45 px-2 py-1 text-[0.6rem] uppercase tracking-[0.25em] text-ivoire/85 backdrop-blur-sm">
                    {s.img.caption}
                  </p>
                )}
              </>
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
                <Image
                  src={s.img.url}
                  alt=""
                  fill
                  sizes="80px"
                  unoptimized={s.img.url.startsWith("/")}
                  className="object-cover"
                />
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
