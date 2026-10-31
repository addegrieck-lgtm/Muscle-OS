import Link from "next/link";
import { LuminaireArt } from "@/components/art/LuminaireArt";
import { Eyebrow } from "@/components/ui/Button";
import type { ArtForm, Category } from "@/types/catalog";

const ART: Record<string, ArtForm> = {
  lustres: "tiers",
  suspensions: "globes",
  appliques: "sconce",
  lampadaires: "floor",
};

/** Quatre univers en accordéon : le panneau survolé s'élargit (CSS pur, sans JS). */
export function Collections({ categories }: { categories: Category[] }) {
  return (
    <section className="bg-creme py-28 md:py-40" aria-labelledby="collections-title">
      <div className="container-luxe">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <div>
            <Eyebrow number="02">Collections</Eyebrow>
            <h2 id="collections-title" data-reveal className="t-h2 mt-6 max-w-2xl">
              Quatre univers de lumière
            </h2>
          </div>
          <p data-reveal className="max-w-sm text-brun/75">
            Du lustre monumental à l’applique sculpturale, chaque collection répond à une manière
            d’habiter la lumière.
          </p>
        </div>
      </div>

      <div className="mt-16 md:container-luxe">
        <ul className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-4 [scrollbar-width:none] md:h-[72vh] md:min-h-[560px] md:gap-2 md:overflow-visible md:px-0 md:pb-0">
          {categories.slice(0, 4).map((c, i) => (
            <li
              key={c.slug}
              data-reveal="mask"
              data-reveal-delay={String(i * 0.12)}
              className="group relative w-[78vw] shrink-0 snap-center overflow-hidden bg-noir sm:w-[46vw] md:w-auto md:flex-1 md:transition-[flex-grow] md:duration-[1100ms] md:ease-[var(--ease-luxe)] md:hover:flex-[2.4] md:focus-within:flex-[2.4]"
            >
              <Link
                href={`/collections/${c.slug}`}
                className="flex aspect-[3/4] h-full flex-col justify-end text-ivoire md:aspect-auto"
              >
                <LuminaireArt
                  form={ART[c.slug] ?? "globes"}
                  seed={`col-${c.slug}`}
                  className="absolute inset-0 h-full w-full transition-transform duration-[1800ms] ease-[var(--ease-luxe)] group-hover:scale-105"
                  label={`Illustration — ${c.name}`}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/55 to-transparent md:from-noir/85 md:via-noir/10" />
                <div className="relative p-6 md:p-8">
                  <span className="font-serif text-sm italic text-champagne">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-2 font-serif text-4xl font-light md:text-5xl">{c.name}</h3>
                  <p className="t-small mt-4 max-w-sm text-ivoire/75 transition-all duration-700 md:max-h-0 md:translate-y-4 md:overflow-hidden md:opacity-0 md:group-hover:max-h-40 md:group-hover:translate-y-0 md:group-hover:opacity-100">
                    {c.description}
                  </p>
                  <span className="t-eyebrow mt-6 inline-block text-champagne">Explorer</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
