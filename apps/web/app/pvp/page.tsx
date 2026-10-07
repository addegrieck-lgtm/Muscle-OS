import { BRAND } from "@vaeloria/config";
import { ButtonLink, Card, Container, Section, SectionHeader } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "PvP inspiré du 1.8 en Minecraft 1.21",
  description: "Le PvP de VÆLORIA : Minecraft 1.21 avec un combat réglé comme en 1.8 — combos, knockback, potions et PvP compétitif sur un serveur Faction français.",
  path: "/pvp",
});

const FEATURES = [
  { title: "Combos", body: "L'enchaînement des coups prime. Garder le contact et enchaîner fait la différence entre deux joueurs de niveau proche." },
  { title: "Knockback", body: "Un recul calibré pour être lisible et exploitable : W-tap, strafe et placement ont de nouveau du sens." },
  { title: "Potions", body: "Soins et buffs au cœur des combats. Gérer sa hotbar et le timing des potions est une compétence à part entière." },
  { title: "PvP compétitif", body: "Classement des kills par saison, K/D public sur chaque profil, combats de faction lors des KOTH et des raids." },
  { title: "Entraînement", body: "Des zones de duel pour se tester sans perdre son stuff de faction." },
  { title: "Practice (à venir)", body: "Un mode Practice dédié est prévu : duels classés, kits fixes et file d'attente." },
];

export default function PvpPage() {
  return (
    <>
      <PageHeader
        eyebrow="PvP"
        title="Le combat 1.8, en 1.21"
        description={`${BRAND.name} tourne en Minecraft ${BRAND.minecraftVersion} pour profiter du contenu moderne, avec un combat réglé pour retrouver les sensations du PvP 1.8.`}
        crumbs={[{ name: "PvP", path: "/pvp" }]}
      />
      <Section>
        <Container>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <p className="font-semibold">{f.title}</p>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
      <Section className="border-t border-line/60">
        <Container className="grid gap-8 md:grid-cols-2">
          <div>
            <SectionHeader title="Pourquoi pas le combat 1.9+ ?" />
            <div className="space-y-3 text-muted">
              <p>Le délai de recharge introduit en 1.9 ralentit les combats et réduit l&apos;écart entre joueurs. En Faction compétitif, la communauté préfère un combat rapide où la technique paie.</p>
              <p>Rester en {BRAND.minecraftVersion} garde les blocs, items et améliorations récentes, et la compatibilité avec les clients actuels.</p>
            </div>
          </div>
          <Card className="self-start">
            <p className="font-semibold">Progresser</p>
            <p className="mt-2 text-sm text-muted">Les bases du W-tap, du strafe et de la gestion des potions sont expliquées dans le guide PvP.</p>
            <ButtonLink href="/guides/comment-pvp" variant="secondary" className="mt-4">Lire le guide PvP</ButtonLink>
          </Card>
        </Container>
      </Section>
    </>
  );
}
