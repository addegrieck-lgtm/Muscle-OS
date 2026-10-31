import Link from "next/link";
import { ProductVisual } from "@/components/product/ProductVisual";
import { Arrow, ButtonLink, Eyebrow } from "@/components/ui/Button";
import { formatPrice } from "@/lib/money";
import { categoryLabel } from "@/lib/navigation";
import type { Product } from "@/types/catalog";

/** Mise en scène éditoriale des pièces signature : compositions asymétriques alternées. */
export function Signature({ products }: { products: Product[] }) {
  if (products.length === 0) return null;
  return (
    <section className="bg-ivoire py-28 md:py-44" aria-labelledby="signature-title">
      <div className="container-luxe">
        <div className="max-w-3xl">
          <Eyebrow number="03">Sélection signature</Eyebrow>
          <h2 id="signature-title" data-reveal className="t-h2 mt-6">
            Des pièces maîtresses, pensées pour être regardées.
          </h2>
        </div>

        <div className="mt-20 space-y-28 md:mt-32 md:space-y-48">
          {products.slice(0, 3).map((p, i) => {
            const flip = i % 2 === 1;
            return (
              <article key={p.id} className="grid items-center gap-10 md:grid-cols-12 md:gap-16">
                <Link
                  href={`/produit/${p.slug}`}
                  className={`group relative block md:col-span-7 ${flip ? "md:order-2 md:col-start-6" : ""}`}
                  aria-label={p.name}
                >
                  <div
                    data-reveal="mask"
                    className="relative aspect-[4/5] overflow-hidden bg-noir md:aspect-[5/6]"
                  >
                    <div className="absolute inset-0 transition-transform duration-[2000ms] ease-[var(--ease-luxe)] group-hover:scale-105">
                      <ProductVisual
                        product={p}
                        mood={i === 1 ? "jour" : "nuit"}
                        sizes="(min-width: 768px) 55vw, 100vw"
                        className="h-full w-full"
                      />
                    </div>
                  </div>
                </Link>
                <div
                  className={`md:col-span-4 ${flip ? "md:order-1 md:col-start-1" : "md:col-start-9"}`}
                >
                  <p data-reveal className="font-serif text-7xl font-light text-sable md:text-8xl">
                    {String(i + 1).padStart(2, "0")}
                  </p>
                  <p data-reveal className="t-eyebrow mt-6 text-champagne">
                    {categoryLabel(p.categorySlug)}
                  </p>
                  <h3 data-reveal className="t-h2 mt-3">
                    {p.name}
                  </h3>
                  <p data-reveal className="mt-6 text-brun/75">
                    {p.shortDescription}
                  </p>
                  {p.materials.length > 0 && (
                    <p data-reveal className="t-small mt-4 text-brun/55">
                      {p.materials.join(" · ")}
                    </p>
                  )}
                  <div data-reveal className="mt-10 flex items-center gap-8">
                    <span className="font-serif text-2xl">{formatPrice(p.price)}</span>
                    <Link
                      href={`/produit/${p.slug}`}
                      className="t-eyebrow group inline-flex items-center gap-3 text-brun"
                    >
                      Découvrir la pièce <Arrow />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-28 flex justify-center">
          <ButtonLink href="/collections" variant="outline">
            Voir toute la collection
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
