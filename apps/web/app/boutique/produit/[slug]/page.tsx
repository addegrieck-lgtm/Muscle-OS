import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Container, Section } from "@vaeloria/ui";
import { AddToCartButton } from "@/components/shop/AddToCart";
import { PointsBadge, Price } from "@/components/shop/ProductCard";
import { ProductVisual } from "@/components/shop/ProductVisual";
import { ShopView } from "@/components/shop/ShopView";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { PREVIEW } from "@/lib/preview";
import { JsonLd, SITE_URL, pageMeta } from "@/lib/seo";

export const revalidate = 30;

export async function generateStaticParams() {
  const catalog = await orNull(api.shopCatalog());
  const slugs = catalog?.products.map((p) => p.slug) ?? [];
  // L'export statique exige au moins une page ; sans API au build, une page « introuvable » suffit.
  return (slugs.length ? slugs : PREVIEW ? ["indisponible"] : []).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const p = await orNull(api.shopProduct((await params).slug));
  if (!p) return pageMeta({ title: "Produit introuvable", description: "Ce produit n'est plus disponible.", path: "/boutique", noindex: true });
  return pageMeta({ title: `${p.name} — Boutique`, description: `${p.shortDescription}. ${p.price.points} points boutique. Livraison automatique en jeu.`, path: `/boutique/produit/${p.slug}` });
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, catalog] = await Promise.all([orNull(api.shopProduct(slug)), orNull(api.shopCatalog())]);
  if (!product) notFound();
  const category = catalog?.categories.find((c) => c.slug === product.categorySlug);
  const rank = catalog?.ranks.find((r) => r.key === product.rankKey) ?? null;
  return (
    <>
      <ShopView event="product_view" product={product.slug} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name,
          description: product.description || product.shortDescription,
          category: category?.name,
          brand: { "@type": "Brand", name: "VÆLORIA" },
          offers: { "@type": "Offer", price: (product.price.priceCents / 100).toFixed(2), priceCurrency: "EUR", availability: product.stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock", url: `${SITE_URL}/boutique/produit/${product.slug}` },
        }}
      />
      <PageHeader title={product.name} eyebrow={category?.name ?? "Boutique"} crumbs={[{ name: "Boutique", path: "/boutique" }, ...(category ? [{ name: category.name, path: `/boutique/${category.slug}` }] : []), { name: product.name, path: `/boutique/produit/${product.slug}` }]} />
      <Section className="py-10">
        <Container className="grid gap-8 md:grid-cols-2">
          <ProductVisual category={product.categorySlug} imageUrl={product.imageUrl} name={product.name} accent={rank?.color} />
          <div className="flex flex-col">
            <div className="flex flex-wrap gap-2">
              {category && <Badge>{category.name}</Badge>}
              {product.price.promotion && <Badge tone="accent">{product.price.promotion.label}</Badge>}
            </div>
            <p className="mt-4 text-lg text-muted">{product.shortDescription}</p>
            {product.description && product.description !== product.shortDescription && <p className="mt-3 text-muted">{product.description}</p>}
            {rank && (
              <p className="mt-4 rounded-md border border-line bg-surface-2/60 p-3 text-sm text-muted">
                Grade <strong className="text-fg">{rank.name}</strong> — également débloqué automatiquement à <strong className="text-fg">{rank.minPoints} points</strong> boutique.
              </p>
            )}
            <div className="mt-6 flex items-end justify-between gap-3 border-t border-line pt-6">
              <Price price={product.price} large />
              <PointsBadge points={product.price.points} className="text-sm" />
            </div>
            {product.price.promotion && product.price.basePoints !== product.price.points && (
              <p className="mt-1 text-right text-xs text-subtle">au lieu de +{product.price.basePoints} points</p>
            )}
            <AddToCartButton productId={product.id} name={product.name} disabled={product.stock === 0} size="lg" className="mt-5" />
            {product.stock !== null && product.stock > 0 && product.stock <= 10 && <p className="mt-2 text-sm text-warning">Plus que {product.stock} en stock.</p>}
            <p className="mt-4 text-sm text-subtle">Livré automatiquement en jeu après confirmation du paiement. <Link href="/cgv" className="underline">CGV</Link></p>
          </div>
        </Container>
      </Section>
    </>
  );
}
