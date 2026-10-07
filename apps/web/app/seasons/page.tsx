import { Badge, ButtonLink, Card, Container, EmptyState, LeaderboardTable, Section, SectionHeader, StatCard, formatDate, formatNumber } from "@vaeloria/ui";
import { Countdown } from "@/components/Countdown";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 60;
export const metadata = pageMeta({
  title: "Saison I — saison compétitive Faction",
  description: "La saison en cours sur VÆLORIA : date de début, temps restant, joueurs, factions, classements, objectifs et récompenses.",
  path: "/seasons",
});

export default async function SeasonsPage() {
  const [seasons, boards] = await Promise.all([orNull(api.season()), orNull(api.leaderboards(5))]);
  const season = seasons?.current ?? seasons?.upcoming ?? null;
  const factions = boards?.boards.find((b) => b.category === "factions") ?? null;

  if (!season) {
    return (
      <>
        <PageHeader eyebrow="Saisons" title="Saison I" crumbs={[{ name: "Saisons", path: "/seasons" }]} />
        <Section><Container><EmptyState title="Informations de saison indisponibles">La date d&apos;ouverture est annoncée sur Discord.</EmptyState></Container></Section>
      </>
    );
  }
  const active = season.status === "active";
  return (
    <>
      <PageHeader eyebrow={`Saison ${season.number}`} title={season.name} description={season.description} crumbs={[{ name: "Saisons", path: "/seasons" }]}>
        <div className="flex flex-col gap-4">
          <Badge tone={active ? "success" : "accent"}>{active ? "En cours" : "Bientôt"}</Badge>
          {(!active || season.endsAt) && <Countdown target={active ? season.endsAt! : season.startsAt} label={active ? "Avant la fin de saison" : "Avant l'ouverture"} />}
        </div>
      </PageHeader>
      <Section>
        <Container className="space-y-10">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard label="Début" value={formatDate(season.startsAt, { day: "numeric", month: "short" })} />
            <StatCard label="Fin" value={season.endsAt ? formatDate(season.endsAt, { day: "numeric", month: "short" }) : "À annoncer"} />
            <StatCard label="Joueurs" value={active ? formatNumber(season.stats.players) : "—"} />
            <StatCard label="Factions" value={active ? formatNumber(season.stats.factions) : "—"} />
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <h2 className="font-semibold">Objectifs</h2>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                {season.objectives.map((o) => <li key={o} className="flex gap-2"><span aria-hidden className="text-accent">◆</span>{o}</li>)}
              </ul>
            </Card>
            <Card>
              <h2 className="font-semibold">Récompenses de fin de saison</h2>
              <ul className="mt-3 divide-y divide-line text-sm">
                {season.rewards.map((r) => (
                  <li key={r.rank} className="flex justify-between py-2"><span className="font-semibold">{r.rank}</span><span className="text-muted">{r.reward}</span></li>
                ))}
              </ul>
            </Card>
          </div>
          <div>
            <SectionHeader title="Classement des factions" action={<ButtonLink href="/leaderboards" variant="secondary">Tous les classements</ButtonLink>} />
            <LeaderboardTable board={factions} unit="Points" hrefFor={(_i, n) => `/faction/${encodeURIComponent(n)}`} />
          </div>
        </Container>
      </Section>
    </>
  );
}
