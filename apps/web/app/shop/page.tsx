import Link from "next/link";
import { LINKS } from "@vaeloria/config";
import type { Product } from "@vaeloria/types";
import { Badge, ButtonLink, Card, Container, EmptyState, Section, formatPrice } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 300;
export const metadata = pageMeta({ title: "Boutique — cosmétiques et soutien", description: "Soutiens VÆLORIA avec des cosmétiques, tags, effets et grades. Aucun avantage de combat achetable.", path: "/shop" });

const CATEGORY: Record<Product["category"], string> = { cosmetics: "Cosmétiques", ranks: "Grades", effects: "Effets", tags: "Tags", pets: "Pets", bundles: "Packs" };

export default async function ShopPage() {
  const products = await orNull(api.products());
  const groups = Object.entries(CATEGORY)
    .map(([id, label]) => ({ id, label, items: products?.items.filter((p) => p.category === id) ?? [] }))
    .filter((g) => g.items.length > 0);
  return (
    <>
      <PageHeader
        eyebrow="Boutique"
        title="Soutenir VÆLORIA"
        description="Les achats financent l'hébergement et le développement du serveur. Ils restent cosmétiques ou de confort : aucun avantage de combat n'est vendu."
        crumbs={[{ name: "Boutique", path: "/shop" }]}
      />
      <Section>
        <Container className="space-y-10">
          {groups.length === 0 ? (
            <EmptyState title="La boutique ouvre bientôt">
              Elle sera disponible avec la Saison I. Les annonces passent par Discord.
              <div className="mt-4"><ButtonLink href={LINKS.discord} external variant="secondary" data-track="click_discord">Rejoindre le Discord</ButtonLink></div>
            </EmptyState>
          ) : (
            groups.map((g) => (
              <section key={g.id} aria-labelledby={`cat-${g.id}`}>
                <h2 id={`cat-${g.id}`} className="mb-3 font-display text-xl font-bold">{g.label}</h2>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {g.items.map((p) => (
                    <Card key={p.id} className="flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold">{p.name}</p>
                        <Badge tone="accent">{formatPrice(p.priceCents, p.currency)}</Badge>
                      </div>
                      <p className="mt-2 flex-1 text-sm text-muted">{p.description}</p>
                      {/* Paiement : Phase 14 (prestataire + webhooks). Bouton volontairement inactif. */}
                      <button type="button" disabled className="mt-4 h-10 rounded-lg border border-line text-sm font-semibold text-subtle">Paiement bientôt disponible</button>
                    </Card>
                  ))}
                </div>
              </section>
            ))
          )}
          <p className="text-xs text-subtle">Prix TTC. Voir les <Link href="/cgv" className="underline">conditions générales de vente</Link>.</p>
        </Container>
      </Section>
    </>
  );
}
