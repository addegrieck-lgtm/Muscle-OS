import Link from "next/link";
import { Badge, Card, Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { GUIDES } from "@/content/guides";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Guides Faction & PvP Minecraft",
  description: "Guides pour bien débuter et progresser sur un serveur Minecraft Faction : créer une faction, claim, argent, spawners, PvP, KOTH et raids.",
  path: "/guides",
});

export default function GuidesPage() {
  return (
    <>
      <PageHeader eyebrow="Guides" title="Apprendre à jouer" description="Du premier pas au premier raid." crumbs={[{ name: "Guides", path: "/guides" }]} />
      <Section>
        <Container>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="group block h-full">
                  <Card className="h-full transition-colors group-hover:bg-surface-2">
                    <Badge tone={g.level === "Débutant" ? "success" : g.level === "Avancé" ? "danger" : "warning"}>{g.level}</Badge>
                    <h2 className="mt-3 font-semibold group-hover:text-accent">{g.title}</h2>
                    <p className="mt-2 text-sm text-muted">{g.description}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>
    </>
  );
}
