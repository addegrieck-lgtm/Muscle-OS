import Image from "next/image";
import Link from "next/link";
import { Eyebrow } from "@/components/ui/Button";
import { heroImage, ROOMS } from "@/lib/content/home";
import type { Product } from "@/types/catalog";

/** Accueil : entrer par la pièce de la maison à éclairer. */
export function Rooms({ products }: { products: Product[] }) {
  const bySlug = new Map(products.map((p) => [p.slug, p]));
  const rooms = ROOMS.map((r) => {
    const items = r.slugs.map((s) => bySlug.get(s)).filter((p): p is Product => !!p);
    return { ...r, count: items.length, image: items.map(heroImage).find(Boolean) ?? null };
  }).filter((r) => r.count > 0);
  if (!rooms.length) return null;
  return (
    <section className="bg-ivoire py-24 md:py-36" aria-labelledby="rooms-title">
      <div className="container-luxe">
        <Eyebrow>Par pièce de la maison</Eyebrow>
        <h2 id="rooms-title" data-reveal className="t-h2 mt-6 max-w-2xl">
          Quelle pièce voulez-vous éclairer ?
        </h2>
        <ul className="mt-14 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {rooms.map((r, k) => (
            <li key={r.id} data-reveal data-reveal-delay={String((k % 5) * 0.08)}>
              <Link href={`/collections?piece=${r.id}`} className="group block">
                <div className="relative aspect-[3/4] overflow-hidden bg-noir">
                  {r.image && (
                    <Image
                      src={r.image}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 20vw, 50vw"
                      className="object-cover transition-transform duration-[1800ms] ease-[var(--ease-luxe)] group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-noir via-noir/55 to-noir/0" />
                  <div className="absolute inset-x-3 bottom-4 text-ivoire sm:inset-x-5 sm:bottom-5">
                    <h3 className="font-serif text-xl leading-tight sm:text-2xl">{r.label}</h3>
                    <p className="t-small mt-2 hidden text-ivoire/70 sm:block">{r.text}</p>
                    <p className="t-eyebrow mt-3 text-champagne-clair">
                      {r.count} pièce{r.count > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
