import { CatalogView, parseQuery } from "@/components/catalog/CatalogView";
import { PageHeader } from "@/components/ui/PageHeader";
import { getCategories, getProducts } from "@/lib/services/catalog";
import { pageMetadata } from "@/lib/seo/metadata";
import type { Metadata } from "next";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const filtered = Object.keys(await searchParams).length > 0;
  return pageMetadata({
    title: "Collections — luminaires design",
    description:
      "Toutes les créations LUMÉANCE : lustres monumentaux, suspensions en verre et cristal, appliques murales et lampadaires sculpturaux.",
    path: "/collections",
    noindex: filtered,
  });
}

export default async function CollectionsPage({ searchParams }: Props) {
  const [products, categories, sp] = await Promise.all([
    getProducts(),
    getCategories(),
    searchParams,
  ]);
  return (
    <>
      <PageHeader
        crumbs={[
          { name: "Accueil", path: "/" },
          { name: "Collections", path: "/collections" },
        ]}
        eyebrow="Collections"
        title="Toutes les pièces"
        intro="Une sélection resserrée de luminaires sculpturaux, choisis pour la qualité de leur lumière et la justesse de leur silhouette."
      />
      <CatalogView
        products={products}
        categories={categories}
        query={parseQuery(sp)}
        basePath="/collections"
      />
    </>
  );
}
