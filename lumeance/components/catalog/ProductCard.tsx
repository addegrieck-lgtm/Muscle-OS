import Link from "next/link";
import { ProductVisual } from "@/components/product/ProductVisual";
import { formatPrice } from "@/lib/money";
import { categoryLabel } from "@/lib/navigation";
import type { Product } from "@/types/catalog";

export function ProductCard({
  product,
  index = 0,
  mood = "nuit",
}: {
  product: Product;
  index?: number;
  mood?: "nuit" | "jour";
}) {
  return (
    <article data-reveal data-reveal-delay={String((index % 3) * 0.12)} className="group">
      <Link
        href={`/produit/${product.slug}`}
        className="block"
        aria-label={`${product.name} — ${formatPrice(product.price)}`}
      >
        <div className="relative aspect-[4/5] overflow-hidden bg-noir">
          <div className="absolute inset-0 transition-transform duration-[1800ms] ease-[var(--ease-luxe)] group-hover:scale-[1.045]">
            <ProductVisual product={product} mood={mood} className="h-full w-full" />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-noir/40 to-transparent opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
          <span className="t-eyebrow absolute bottom-5 right-5 translate-y-3 text-ivoire opacity-0 transition-all duration-700 ease-[var(--ease-luxe)] group-hover:translate-y-0 group-hover:opacity-100">
            Découvrir
          </span>
        </div>
        <div className="mt-5 flex items-start justify-between gap-4">
          <div>
            {product.categorySlug && (
              <p className="t-eyebrow text-champagne">{categoryLabel(product.categorySlug)}</p>
            )}
            <h3 className="mt-2 font-serif text-2xl leading-tight">{product.name}</h3>
            {product.shortDescription && (
              <p className="t-small mt-2 max-w-sm text-brun/70">{product.shortDescription}</p>
            )}
          </div>
          <p className="shrink-0 pt-6 font-serif text-xl">
            {product.compareAtPrice && (
              <span className="mr-2 text-base text-brun/40 line-through">
                {formatPrice(product.compareAtPrice)}
              </span>
            )}
            {product.variants.some((v) => v.active && v.priceAdjustment > 0) && (
              <span className="mr-1 text-base text-brun/50">dès</span>
            )}
            {formatPrice(product.price)}
          </p>
        </div>
      </Link>
    </article>
  );
}
