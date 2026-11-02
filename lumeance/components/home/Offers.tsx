import Link from "next/link";
import { promotionLabel } from "@/lib/catalog/promotion";
import type { Product } from "@/types/catalog";

/** Accueil : bandeau des offres en cours (offres par lot des pièces). */
export function Offers({ products }: { products: Product[] }) {
  const list = products.filter((p) => p.promotion);
  if (!list.length) return null;
  return (
    <section aria-label="Offres en cours" className="bg-brun text-ivoire">
      <div className="container-luxe flex flex-wrap items-center gap-x-10 gap-y-3 py-4">
        <p className="t-eyebrow text-champagne-clair">Offres en cours</p>
        {list.map((p) => (
          <Link
            key={p.slug}
            href={`/produit/${p.slug}`}
            className="text-sm text-ivoire/85 underline-offset-4 hover:underline"
          >
            <span className="font-serif text-base">{p.name}</span> — {promotionLabel(p.promotion!)}
          </Link>
        ))}
      </div>
    </section>
  );
}
