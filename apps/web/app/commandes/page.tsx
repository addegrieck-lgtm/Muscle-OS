import { BRAND } from "@vaeloria/config";
import { Card, Container, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { COMMANDS } from "@/content/gameplay";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Commandes du serveur",
  description: `Toutes les commandes joueur de ${BRAND.name} : votes et roue, faction, marché, hôtel des ventes, boutiques de joueurs et PvP.`,
  path: "/commandes",
});

export default function CommandsPage() {
  return (
    <>
      <PageHeader eyebrow="Aide" title="Commandes" description="Tout ce qu'il faut taper en jeu. La plupart ouvrent un menu : pas besoin de tout retenir." crumbs={[{ name: "Commandes", path: "/commandes" }]} />
      <Section>
        <Container className="grid gap-4 md:grid-cols-2">
          {COMMANDS.map((g) => (
            <Card key={g.group}>
              <h2 className="font-display text-lg font-bold uppercase tracking-[0.05em] text-accent">{g.group}</h2>
              <dl className="mt-3 divide-y divide-line/60">
                {g.items.map(([cmd, desc]) => (
                  <div key={cmd} className="grid gap-1 py-2.5 sm:grid-cols-[minmax(0,13rem)_1fr] sm:gap-4">
                    <dt><code className="text-sm font-semibold text-fg">{cmd}</code></dt>
                    <dd className="text-sm text-muted">{desc}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </Container>
      </Section>
    </>
  );
}
