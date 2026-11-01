import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CatalogView, parseQuery } from "@/components/catalog/CatalogView";
import { PageHeader } from "@/components/ui/PageHeader";
import { CATEGORY_SEO } from "@/lib/content/categories";
import { getCategories, getCategory, getProducts } from "@/lib/services/catalog";
import { pageMetadata } from "@/lib/seo/metadata";

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};
  const seo = CATEGORY_SEO[slug];
  return pageMetadata({
    title: seo?.title ?? category.name,
    description: seo?.description ?? category.description ?? "",
    path: `/collections/${slug}`,
    noindex: Object.keys(await searchParams).length > 0,
  });
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const [category, categories, products, sp] = await Promise.all([
    getCategory(slug),
    getCategories(),
    getProducts(),
    searchParams,
  ]);
  if (!category) notFound();
  const seo = CATEGORY_SEO[slug];
  return (
    <>
      <PageHeader
        crumbs={[
          { name: "Accueil", path: "/" },
          { name: "Collections", path: "/collections" },
          { name: category.name, path: `/collections/${slug}` },
        ]}
        eyebrow="Collection"
        title={seo?.h1 ?? category.name}
        intro={category.description}
      />
      <CatalogView
        products={products}
        categories={categories}
        activeCategory={slug}
        query={parseQuery(sp)}
        basePath={`/collections/${slug}`}
      />
      {seo && (
        <section className="bg-creme py-24">
          <div className="container-luxe grid gap-10 md:grid-cols-12">
            <h2 className="t-h3 md:col-span-4">Bien choisir</h2>
            <div className="space-y-5 text-brun/80 md:col-span-7 md:col-start-6">
              {seo.body.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
