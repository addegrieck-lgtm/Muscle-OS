import { ButtonLink, Card, Container, Section, SectionHeader, cn } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Faction Minecraft français : claims, raids, KOTH",
  description: "Le Faction sur VÆLORIA : crée ta faction, claim ton territoire, gère ton Power, développe ton économie avec les spawners, raid tes ennemis et capture KOTH et Outposts.",
  path: "/factions",
});

const SYSTEMS = [
  { title: "Créer une faction", body: "Fonde ta faction, invite tes alliés et organise les rôles (leader, officiers, membres, recrues)." },
  { title: "Claims", body: "Protège tes chunks. Ton territoire apparaît dans le classement Territoire." },
  { title: "Power", body: "Le Power baisse à chaque mort. Sous le nombre de claims, ta base devient raidable." },
  { title: "Bases", body: "Construis pour résister : couches de défense, pièges, salles de spawners cachées." },
  { title: "Spawners", body: "La principale source de revenus passifs. Et la première cible d'un raid." },
  { title: "Économie", body: "Shop du serveur, échanges entre joueurs, récompenses d'événements." },
  { title: "Raids", body: "Explosifs, coordination et timing. Un raid réussi peut renverser le classement." },
  { title: "Guerres", body: "Alliances, trêves et rivalités se jouent sur toute la saison." },
  { title: "KOTH & Outposts", body: "Des zones à capturer et à tenir pour des récompenses et des points de classement." },
];

const ROADMAP = [
  { phase: "Lancement", items: ["Factions, claims, Power", "Économie et spawners", "KOTH programmés", "Classements en direct sur le site"], state: "next" },
  { phase: "Pendant la saison", items: ["Outposts", "Supply drops", "Tournois de faction", "Profils de faction enrichis"], state: "planned" },
  { phase: "Plus tard", items: ["Practice classé", "Événements saisonniers", "Historique de saison par faction"], state: "planned" },
] as const;

export default function FactionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Factions"
        title="Claim. Construis. Raid."
        description="Un Faction compétitif où chaque décision compte jusqu'à la fin de la saison."
        crumbs={[{ name: "Factions", path: "/factions" }]}
      >
        <ButtonLink href="/guides/creer-une-faction">Créer ma faction</ButtonLink>
      </PageHeader>
      <Section>
        <Container>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SYSTEMS.map((s) => (
              <Card key={s.title}>
                <p className="font-semibold">{s.title}</p>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Roadmap" title="Ce qui arrive" description="Les fonctionnalités sont livrées progressivement et annoncées sur Discord." />
          <ol className="grid gap-3 md:grid-cols-3">
            {ROADMAP.map((r, i) => (
              <li key={r.phase}>
                <Card className={cn("h-full", i === 0 && "border-accent/40")}>
                  <p className="font-display text-sm font-bold text-accent">Étape {i + 1}</p>
                  <p className="mt-1 font-semibold">{r.phase}</p>
                  <ul className="mt-3 space-y-1.5 text-sm text-muted">
                    {r.items.map((it) => (
                      <li key={it} className="flex gap-2"><span aria-hidden className="text-accent">·</span>{it}</li>
                    ))}
                  </ul>
                </Card>
              </li>
            ))}
          </ol>
        </Container>
      </Section>
    </>
  );
}
