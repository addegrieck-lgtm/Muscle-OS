import Link from "next/link";
import type { ShopProduct } from "@vaeloria/types";
import { Badge, cn, formatPrice } from "@vaeloria/ui";
import { AddToCartButton } from "./AddToCart";
import { ProductVisual } from "./ProductVisual";

export function PointsBadge({ points, className }: { points: number; className?: string }) {
  return <span className={cn("font-display text-xs font-semibold uppercase tracking-[0.14em] text-accent", className)}>+{points} point{points > 1 ? "s" : ""}</span>;
}

export function Price({ price, large }: { price: ShopProduct["price"]; large?: boolean }) {
  const discounted = price.priceCents < price.originalCents;
  return (
    <span className="flex items-baseline gap-2">
      <span className={cn("font-display font-bold tabular-nums text-fg", large ? "text-3xl" : "text-xl")}>{formatPrice(price.priceCents)}</span>
      {discounted && <s className="text-sm text-subtle">{formatPrice(price.originalCents)}</s>}
    </span>
  );
}

export function ProductCard({ product, categoryName, rankColor }: { product: ShopProduct; categoryName?: string; rankColor?: string | null }) {
  const soldOut = product.stock === 0;
  const href = `/boutique/produit/${product.slug}`;
  return (
    <article className="metal-border group flex flex-col rounded-[var(--radius-card)] p-3 transition-colors hover:bg-surface-2 sm:p-4">
      <Link href={href} className="block" tabIndex={-1} aria-hidden>
        <ProductVisual category={product.categorySlug} imageUrl={product.imageUrl} name={product.name} accent={rankColor} />
      </Link>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {categoryName && <Badge>{categoryName}</Badge>}
        {product.price.promotion && <Badge tone="accent">{product.price.promotion.label}</Badge>}
      </div>
      <h3 className="mt-2 font-display text-lg font-bold uppercase leading-tight tracking-[0.04em]">
        <Link href={href} className="hover:text-accent">{product.name}</Link>
      </h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted">{product.shortDescription}</p>
      <div className="mt-auto pt-4">
        <div className="mb-3 flex items-end justify-between gap-2">
          <Price price={product.price} />
          <PointsBadge points={product.price.points} />
        </div>
        <AddToCartButton productId={product.id} name={product.name} disabled={soldOut} size="sm" />
      </div>
    </article>
  );
}
