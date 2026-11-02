import { ProductCard } from "@/components/catalog/ProductCard";
import { ButtonLink, Eyebrow } from "@/components/ui/Button";
import type { Product } from "@/types/catalog";

/** Accueil : dernières pièces entrées au catalogue (défilement horizontal). */
export function Newest({ products }: { products: Product[] }) {
  if (!products.length) return null;
  return (
    <section className="bg-ivoire py-24 md:py-36" aria-labelledby="new-title">
      <div className="container-luxe flex flex-wrap items-end justify-between gap-6">
        <div>
          <Eyebrow>Nouveautés</Eyebrow>
          <h2 id="new-title" data-reveal className="t-h2 mt-6">
            Entrées récemment dans la maison.
          </h2>
        </div>
        <ButtonLink href="/collections" variant="outline">
          Toute la collection
        </ButtonLink>
      </div>
      <ul className="container-luxe mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto pb-4 [scrollbar-width:thin]">
        {products.map((p, i) => (
          <li key={p.slug} className="w-[78vw] shrink-0 snap-start sm:w-[42vw] lg:w-[26vw]">
            <ProductCard product={p} index={i} />
          </li>
        ))}
      </ul>
    </section>
  );
}
