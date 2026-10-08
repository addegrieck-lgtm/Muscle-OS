import { BRAND } from "@vaeloria/config";
import { Badge, ButtonLink, Card, Container, Section, SectionHeader, Table } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { GENERATORS, MARKET, MERCHANT_RANKS, TOOLS, rankName } from "@/content/gameplay";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Économie : marché, rangs de marchand, générateurs, HDV",
  description: `L'économie de ${BRAND.name} : marché dynamique, 6 rangs de marchand, générateurs, outils de farm, hôtel des ventes et boutiques de joueurs. Tous les prix.`,
  path: "/economie",
});

const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const money = (n: number) => `${fmt(n)} $`;
const pct = (n: number) => `${String(n).replace(".", ",")} %`;

const MARKET_RULES = [
  { title: "Le marché bouge", body: `Vendre en masse le même produit fait baisser son prix (jusqu'à −${MARKET.maxDropPercent} %), qui remonte de moitié toutes les ${MARKET.halfLifeHours} h. Varier ses farms rapporte plus.` },
  { title: "Cours du jour", body: `Chaque jour, ${MARKET.featuredCount} produits sont rachetés +${MARKET.featuredBonus} %. Regarde /shop avant de vendre.` },
  { title: "L'argent se farme", body: `Revendre rapporte au plus ${MARKET.maxResalePercent} % du prix d'achat, bonus compris : impossible de créer de l'argent en achetant-revendant.` },
  { title: "Obsidienne rare", body: `${money(MARKET.obsidian.price)} pièce, rang ${rankName(MARKET.obsidian.rank)}, ${MARKET.obsidian.dailyLimit} par jour. Indestructible à la TNT : elle ne tombe que par surclaim.` },
];

export default function EconomyPage() {
  const { hdv, playerShops } = MARKET;
  return (
    <>
      <PageHeader
        eyebrow="Économie"
        title="Le farm finance la guerre"
        description="Marché dynamique, rangs de marchand, générateurs et commerce entre joueurs. Tous les prix sont ceux du serveur."
        crumbs={[{ name: "Économie", path: "/economie" }]}
      >
        <div className="flex flex-wrap gap-2 text-sm">
          {["/shop", "/vendre", "/prix", "/marchand", "/hdv", "/pshop"].map((c) => <code key={c} className="rounded border border-line bg-surface-2 px-2 py-1">{c}</code>)}
        </div>
      </PageHeader>

      <Section>
        <Container>
          <SectionHeader eyebrow="Repères" title="Combien on gagne ?" />
          <div className="grid gap-3 sm:grid-cols-3">
            {MARKET.incomeBenchmarks.map(([who, value]) => (
              <Card key={who}>
                <p className="font-display text-2xl font-bold text-accent">{value}</p>
                <p className="mt-1 text-sm text-muted">{who}</p>
              </Card>
            ))}
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {MARKET_RULES.map((r) => (
              <Card key={r.title}>
                <p className="font-semibold">{r.title}</p>
                <p className="mt-2 text-sm text-muted">{r.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="/marchand" title="Rangs de marchand" description="Ton rang monte avec le total vendu au marché. Chaque rang ajoute un bonus sur tes ventes et débloque des articles." />
          <Table head={["Rang", "Total vendu", "Bonus de vente", "Débloque"]}>
            {MERCHANT_RANKS.map((r, i) => (
              <tr key={r.name}>
                <td className="font-semibold"><span className="mr-2 text-accent tabular-nums">{i + 1}</span>{r.name}</td>
                <td className="tabular-nums">{r.threshold ? money(r.threshold) : "Départ"}</td>
                <td className="tabular-nums">{r.bonus ? `+${r.bonus} %` : "—"}</td>
                <td className="text-muted">{r.perks}</td>
              </tr>
            ))}
          </Table>
        </Container>
      </Section>

      <Section className="border-t border-line/60">
        <Container className="grid gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <div>
            <SectionHeader eyebrow="Revenu passif" title="Générateurs" description="Récupérables au Toucher de soie, résistants aux explosions." />
            <Table head={["Créature", "Prix", "Rang", "Revenu"]}>
              {GENERATORS.map((g) => (
                <tr key={g.mob}>
                  <td className="font-semibold">{g.mob}</td>
                  <td className="tabular-nums">{money(g.price)}</td>
                  <td className="text-muted">{rankName(g.rank)}</td>
                  <td className="text-right tabular-nums">~{money(g.income)}/h</td>
                </tr>
              ))}
            </Table>
            <p className="mt-3 text-xs text-subtle">Revenu indicatif, chunk chargé, butin revendu au prix de base. Rentabilisé en 60 à 100 h environ.</p>
          </div>
          <div>
            <SectionHeader eyebrow="Outils" title="Outils de VÆLORIA" description="Farmer plus vite, c'est gagner plus." />
            <ul className="space-y-3">
              {TOOLS.map((t) => (
                <li key={t.name}>
                  <Card className="flex items-start justify-between gap-4 p-4">
                    <div>
                      <p className="font-semibold">{t.name}</p>
                      <p className="mt-1 text-sm text-muted">{t.effect}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-semibold tabular-nums">{money(t.price)}</p>
                      <p className="text-xs text-subtle">{rankName(t.rank)}</p>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line/60">
        <Container className="grid gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <div>
            <SectionHeader eyebrow="/hdv" title="Hôtel des ventes" />
            <ul className="space-y-2 text-muted">
              <li>Annonce visible {hdv.durationHours} h, puis l&apos;objet part dans ton entrepôt (<code className="text-fg">/hdv entrepot</code>).</li>
              <li>Frais de mise en vente : {pct(hdv.listingFeePercent)} (non remboursés).</li>
              <li>Taxe sur la vente : {pct(hdv.saleTaxPercent)}, −{pct(hdv.taxDiscountPerRank)} par rang de marchand (Prince marchand : {pct(hdv.saleTaxPercent - hdv.taxDiscountPerRank * (MERCHANT_RANKS.length - 1))}).</li>
              <li>Annonces simultanées : de {hdv.listingsByRank[0]} (Colporteur) à {hdv.listingsByRank.at(-1)} (Prince marchand).</li>
              <li>Prix conseillé calculé sur les ventes des 7 derniers jours ; confirmation demandée au-delà de 5× ce prix.</li>
              <li>Ventes hors ligne créditées : tu reçois le récapitulatif à la connexion.</li>
            </ul>
          </div>
          <div>
            <SectionHeader eyebrow="/pshop" title="Boutiques de joueurs" description={`${playerShops.plots} parcelles à la spawn, une par joueur. Loyer hebdomadaire, jusqu'à ${playerShops.maxWeeksAhead} semaines d'avance, taxe de ${pct(playerShops.saleTaxPercent)} seulement.`} />
            <div className="grid gap-3 sm:grid-cols-3">
              {playerShops.tiers.map((t) => (
                <Card key={t.name} className="h-full">
                  <p className="font-display font-bold uppercase tracking-[0.05em]">{t.name}</p>
                  <p className="mt-2 font-semibold tabular-nums text-accent">{money(t.rent)}<span className="text-xs text-subtle"> / sem.</span></p>
                  <p className="mt-1 text-sm text-muted">{t.offers} offres · {rankName(t.rank)}</p>
                  <p className="mt-2 text-xs text-subtle">Chiffre estimé : {t.estimate}</p>
                </Card>
              ))}
            </div>
            <p className="mt-4 text-sm text-muted">
              <Badge tone="accent">Exclusif</Badge> Élytres, totems, netherite, têtes, pièces renommées, armures ornées et autres objets uniques ne se vendent qu&apos;en boutique de joueur, jamais à l&apos;HDV.
              Loyer impayé : boutique fermée {playerShops.graceHours} h, puis parcelle libérée.
            </p>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line/60">
        <Container className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink href="/guides/gagner-de-l-argent" size="lg">Guide : gagner de l&apos;argent</ButtonLink>
          <ButtonLink href="/voter" size="lg" variant="secondary">Voter : +argent chaque jour</ButtonLink>
          <ButtonLink href="/commandes" size="lg" variant="ghost">Toutes les commandes</ButtonLink>
        </Container>
      </Section>
    </>
  );
}
