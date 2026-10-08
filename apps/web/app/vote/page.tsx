import { Card, Container, EmptyState, Section, SectionHeader, Table, formatDate, formatNumber } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";
import { VoteSites } from "./VoteSites";

export const revalidate = 30;
export const metadata = pageMeta({
  title: "Voter pour VÆLORIA — récompenses en jeu",
  description: "Vote pour VÆLORIA sur les sites de classement Minecraft et reçois tes récompenses en jeu. Classement mensuel des meilleurs voteurs.",
  path: "/vote",
});

export default async function VotePage() {
  const data = await orNull(api.vote());
  const month = data ? formatDate(data.month.start, { month: "long", year: "numeric" }) : "";
  return (
    <>
      <PageHeader eyebrow="Voter" title="Fais monter VÆLORIA" description="Chaque vote fait connaître le serveur à de nouveaux joueurs. Vote sur chaque site, puis reviens confirmer : tes récompenses t'attendent en jeu." crumbs={[{ name: "Voter", path: "/vote" }]} />
      <Section>
        <Container className="max-w-4xl space-y-14">
          {!data && <EmptyState title="Les votes sont momentanément indisponibles" />}
          {data && data.sites.length === 0 && <EmptyState title="Les votes ouvriront bientôt">VÆLORIA arrive sur les sites de classement : reviens au lancement.</EmptyState>}
          {data && data.sites.length > 0 && (
            <div className="space-y-6">
              <ol className="grid gap-3 text-sm text-muted sm:grid-cols-3">
                {["Clique sur « Voter » : le site s'ouvre dans un nouvel onglet.", "Vote avec ton pseudo Minecraft exact.", "Reviens ici et clique sur « J'ai voté » pour être récompensé."].map((t, i) => (
                  <li key={t} className="flex gap-3 rounded-md border border-line bg-surface/60 p-3">
                    <span className="font-display text-lg font-bold text-accent">{i + 1}</span>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
              <VoteSites sites={data.sites} />
            </div>
          )}
          {data && data.sites.length > 0 && (
            <div>
              <SectionHeader eyebrow={`Classement · ${month}`} title="Meilleurs voteurs du mois" />
              {data.month.top.length === 0 ? (
                <EmptyState title="Aucun vote ce mois-ci">Le premier vote du mois ouvre le classement.</EmptyState>
              ) : (
                <Card className="p-0">
                  <Table head={["#", "Joueur", "Votes"]}>
                    {data.month.top.map((r, i) => (
                      <tr key={r.username}>
                        <td className="w-12 font-display font-bold text-accent">{i + 1}</td>
                        <td className="font-semibold">{r.username}</td>
                        <td className="tabular-nums">{formatNumber(r.votes)}</td>
                      </tr>
                    ))}
                  </Table>
                </Card>
              )}
              <p className="mt-3 text-sm text-subtle">{formatNumber(data.month.total)} vote(s) ce mois-ci. Le classement repart à zéro le 1er de chaque mois.</p>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
