import Link from "next/link";
import { Badge, Card, Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { GUIDES } from "@/content/guides";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Guides Minecraft Faction et PvP 1.8",
  description: "Guides Faction écrits à partir des règles du serveur : débuter, créer une faction, claim, power, surclaim, raids TNT, PvP 1.8.9, KOTH et économie.",
  path: "/guides",
});

export default function GuidesPage() {
  return (
    <>
      <PageHeader eyebrow="Guides" title="Guides Faction et PvP" description="Du premier pas au premier raid. Chaque valeur citée vient de la configuration des plugins du serveur." crumbs={[{ name: "Guides", path: "/guides" }]} />
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
