import { Container, EmptyState, Section, SectionHeader, ButtonLink } from "@vaeloria/ui";
import { ProductCard } from "@/components/shop/ProductCard";
import { ShopShell } from "@/components/shop/ShopShell";
import { ShopView } from "@/components/shop/ShopView";
import { api, orNull } from "@/lib/api";
import { JsonLd, SITE_URL, pageMeta } from "@/lib/seo";

export const revalidate = 30;
export const metadata = pageMeta({
  title: "Boutique — grades, spawners, kits et packs",
  description: "La boutique officielle du serveur Minecraft VÆLORIA : grades, spawners, items, kits et packs. 1 € = 1 point, grades débloqués automatiquement, livraison en jeu.",
  path: "/boutique",
});

export default async function ShopPage() {
  const catalog = await orNull(api.shopCatalog());
  const rankColor = (key: string | null) => catalog?.ranks.find((r) => r.key === key)?.color ?? null;
  return (
    <ShopShell catalog={catalog} active={null}>
      <ShopView event="shop_view" />
      {catalog && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: "Boutique VÆLORIA",
            itemListElement: catalog.products.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/boutique/produit/${p.slug}`, name: p.name })),
          }}
        />
      )}
      {!catalog || catalog.products.length === 0 ? (
        <Section>
          <Container>
            <EmptyState title="La boutique ouvre bientôt">
              Les produits seront disponibles avec l&apos;ouverture du serveur.
              <div className="mt-4"><ButtonLink href="/discord" variant="secondary">Suivre l&apos;ouverture sur Discord</ButtonLink></div>
            </EmptyState>
          </Container>
        </Section>
      ) : (
        catalog.categories.map((c) => {
          const products = catalog.products.filter((p) => p.categorySlug === c.slug);
          if (products.length === 0) return null;
          return (
            <Section key={c.slug} className="py-10 sm:py-14">
              <Container>
                <SectionHeader title={c.name} description={c.description} action={<ButtonLink href={`/boutique/${c.slug}`} variant="ghost" size="sm">Voir tout</ButtonLink>} />
                <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                  {products.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} rankColor={rankColor(p.rankKey)} />)}
                </div>
              </Container>
            </Section>
          );
        })
      )}
    </ShopShell>
  );
}
