import Link from "next/link";
import { ProductCard } from "@/components/catalog/ProductCard";
import { filterProducts, materialFacets, type ProductQuery } from "@/lib/services/catalog";
import type { Category, Product } from "@/types/catalog";

const SORTS: { value: NonNullable<ProductQuery["sort"]>; label: string }[] = [
  { value: "featured", label: "Sélection" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
  { value: "name", label: "Nom" },
];

const PRICE_CAPS = [40000, 60000, 80000, 100000];

export function parseQuery(sp: Record<string, string | string[] | undefined>): ProductQuery {
  const one = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : undefined);
  const max = Number(one("prix"));
  const sort = one("tri") as ProductQuery["sort"];
  return {
    material: one("matiere")?.slice(0, 40),
    maxPrice: Number.isInteger(max) && max > 0 ? max * 100 : undefined,
    sort: SORTS.some((s) => s.value === sort) ? sort : "featured",
  };
}

/** Catalogue filtrable. Les filtres sont de simples liens (fonctionnent sans JavaScript,
 * URLs partageables, pas de contenu dupliqué indexé : pages filtrées en noindex). */
export function CatalogView({
  products,
  categories,
  activeCategory,
  query,
  basePath,
}: {
  products: Product[];
  categories: Category[];
  activeCategory?: string;
  query: ProductQuery;
  basePath: string;
}) {
  const list = filterProducts(products, { ...query, category: activeCategory });
  const materials = materialFacets(
    products.filter((p) => !activeCategory || p.categorySlug === activeCategory),
  );

  const href = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const cur: Record<string, string | undefined> = {
      matiere: query.material,
      prix: query.maxPrice ? String(query.maxPrice / 100) : undefined,
      tri: query.sort && query.sort !== "featured" ? query.sort : undefined,
      ...patch,
    };
    Object.entries(cur).forEach(([k, v]) => v && params.set(k, v));
    const s = params.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const chip = (active: boolean) =>
    `t-eyebrow whitespace-nowrap border px-4 py-2.5 transition-colors ${active ? "border-brun bg-brun text-ivoire" : "border-brun/15 hover:border-brun/50"}`;

  return (
    <div className="container-luxe pb-32">
      <nav aria-label="Univers" className="-mx-5 overflow-x-auto px-5 [scrollbar-width:none]">
        <ul className="flex gap-2 border-b border-brun/10 pb-6">
          <li>
            <Link href="/collections" className={chip(!activeCategory)}>
              Toutes les pièces
            </Link>
          </li>
          {categories.map((c) => (
            <li key={c.slug}>
              <Link
                href={`/collections/${c.slug}`}
                className={chip(activeCategory === c.slug)}
                aria-current={activeCategory === c.slug ? "page" : undefined}
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3 t-small">
          <span className="t-eyebrow text-brun/50">Matière</span>
          <Link
            href={href({ matiere: undefined })}
            className={
              !query.material
                ? "text-brun underline underline-offset-4"
                : "text-brun/60 hover:text-brun"
            }
          >
            Toutes
          </Link>
          {materials.map((m) => (
            <Link
              key={m}
              href={href({ matiere: m.toLowerCase() })}
              className={
                query.material === m.toLowerCase()
                  ? "text-brun underline underline-offset-4"
                  : "text-brun/60 hover:text-brun"
              }
            >
              {m}
            </Link>
          ))}
          <span className="t-eyebrow ml-2 text-brun/50">Budget</span>
          <Link
            href={href({ prix: undefined })}
            className={
              !query.maxPrice
                ? "text-brun underline underline-offset-4"
                : "text-brun/60 hover:text-brun"
            }
          >
            Tous
          </Link>
          {PRICE_CAPS.map((cap) => (
            <Link
              key={cap}
              href={href({ prix: String(cap / 100) })}
              className={
                query.maxPrice === cap
                  ? "text-brun underline underline-offset-4"
                  : "text-brun/60 hover:text-brun"
              }
            >
              ≤ {cap / 100} €
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-4 t-small">
          <span className="t-eyebrow text-brun/50">Trier</span>
          {SORTS.map((s) => (
            <Link
              key={s.value}
              href={href({ tri: s.value === "featured" ? undefined : s.value })}
              className={
                query.sort === s.value
                  ? "text-brun underline underline-offset-4"
                  : "text-brun/60 hover:text-brun"
              }
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      <p className="t-small mt-10 text-brun/50" aria-live="polite">
        {list.length} pièce{list.length > 1 ? "s" : ""}
      </p>

      {list.length === 0 ? (
        <div className="py-32 text-center">
          <p className="t-h3">Aucune pièce ne correspond à cette sélection.</p>
          <Link href={basePath} className="t-eyebrow mt-8 inline-block text-champagne">
            Réinitialiser les filtres
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-x-6 gap-y-16 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-10 lg:gap-y-24">
          {list.map((p, i) => (
            <div key={p.id} className={i % 3 === 1 ? "lg:translate-y-16" : ""}>
              <ProductCard product={p} index={i} mood={i % 4 === 3 ? "jour" : "nuit"} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
