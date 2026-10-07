import { notFound } from "next/navigation";
import { Container, EmptyState, Section } from "@vaeloria/ui";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopShell } from "@/components/shop/ShopShell";
import { api, orNull } from "@/lib/api";
import { JsonLd, breadcrumbLd, pageMeta } from "@/lib/seo";

export const revalidate = 30;

/** Catégories par défaut, utilisées seulement si l'API est injoignable au moment du build. */
const DEFAULT_SLUGS = ["grades", "spawners", "items", "kits", "packs", "cosmetiques"];

export async function generateStaticParams() {
  const catalog = await orNull(api.shopCatalog());
  return (catalog?.categories.map((c) => c.slug) ?? DEFAULT_SLUGS).map((categorie) => ({ categorie }));
}

export async function generateMetadata({ params }: { params: Promise<{ categorie: string }> }) {
  const { categorie } = await params;
  const c = (await orNull(api.shopCatalog()))?.categories.find((x) => x.slug === categorie);
  const name = c?.name ?? categorie;
  return pageMeta({
    title: c?.seoTitle ?? `${name} — Boutique`,
    description: c?.seoDescription ?? `${name} de la boutique VÆLORIA, serveur Minecraft Faction & PvP. ${c?.description ?? ""}`.trim(),
    path: `/boutique/${categorie}`,
  });
}

export default async function CategoryPage({ params }: { params: Promise<{ categorie: string }> }) {
  const { categorie } = await params;
  const catalog = await orNull(api.shopCatalog());
  const category = catalog?.categories.find((c) => c.slug === categorie);
  if (catalog && !category) notFound();
  const products = catalog?.products.filter((p) => p.categorySlug === categorie) ?? [];
  const rankColor = (key: string | null) => catalog?.ranks.find((r) => r.key === key)?.color ?? null;
  return (
    <ShopShell catalog={catalog} active={categorie}>
      <JsonLd data={breadcrumbLd([{ name: "Accueil", path: "/" }, { name: "Boutique", path: "/boutique" }, { name: category?.name ?? categorie, path: `/boutique/${categorie}` }])} />
      <Section className="py-10">
        <Container>
          {category && <p className="mb-6 max-w-2xl text-muted">{category.description}</p>}
          {products.length === 0 ? (
            <EmptyState title="Aucun produit dans cette catégorie pour le moment" />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {products.map((p) => <ProductCard key={p.id} product={p} rankColor={rankColor(p.rankKey)} />)}
            </div>
          )}
        </Container>
      </Section>
    </ShopShell>
  );
}
