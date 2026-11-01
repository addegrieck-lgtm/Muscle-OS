import Image from "next/image";
import { LuminaireArt } from "@/components/art/LuminaireArt";
import type { Product } from "@/types/catalog";

/** Photographie principale du produit, ou illustration clairement signalée à défaut. */
export function ProductVisual({
  product,
  mood = "nuit",
  sizes = "(min-width: 1024px) 33vw, 90vw",
  priority = false,
  className = "",
  showLabel = true,
}: {
  product: Pick<Product, "name" | "slug" | "art" | "images">;
  mood?: "nuit" | "jour";
  sizes?: string;
  priority?: boolean;
  className?: string;
  showLabel?: boolean;
}) {
  const img = product.images[0];
  return (
    <div className={`relative overflow-hidden ${className}`}>
      {img ? (
        <Image
          src={img.url}
          alt={img.alt}
          fill
          sizes={sizes}
          priority={priority}
          unoptimized={img.url.startsWith("/")}
          className="object-cover"
        />
      ) : (
        <>
          <LuminaireArt
            form={product.art}
            seed={product.slug}
            mood={mood}
            className="absolute inset-0 h-full w-full"
            label={`Illustration évoquant ${product.name}`}
          />
          {showLabel && (
            <span
              className={`absolute bottom-3 left-3 text-[0.6rem] uppercase tracking-[0.25em] ${mood === "nuit" ? "text-ivoire/40" : "text-brun/40"}`}
            >
              Illustration
            </span>
          )}
        </>
      )}
    </div>
  );
}
