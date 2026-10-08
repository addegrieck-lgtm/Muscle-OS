import Link from "next/link";
import { LEADERBOARD_CATEGORIES } from "@vaeloria/config";
import { RANKING_CATEGORIES } from "@vaeloria/types";
import { Container, Section, buttonClass } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { RankingTable } from "@/components/world/RankingTable";
import { TrackView } from "@/components/world/TrackView";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 60;
export const metadata = pageMeta({
  title: "Classements de VÆLORIA",
  description: "Qui domine VÆLORIA ? Classements des empires, guerriers, richesse, territoires, guerres, saison et recruteurs.",
  path: "/classements",
});

export default async function RankingsPage() {
  const boards = await Promise.all(RANKING_CATEGORIES.map((c) => orNull(api.ranking(c.id))));
  return (
    <>
      <TrackView name="ranking_view" id="all" />
      <PageHeader eyebrow="Classements" title="Qui domine VÆLORIA ?" description="Calculés à partir des données réelles du serveur et du site." crumbs={[{ name: "Classements", path: "/classements" }]} />
      <Section>
        <Container className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          {RANKING_CATEGORIES.map((c, i) => (
            <section key={c.id} aria-labelledby={`rk-${c.id}`}>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 id={`rk-${c.id}`} className="font-display text-xl font-bold uppercase tracking-[0.05em]">{c.label}</h2>
                  <p className="text-sm text-muted">{c.description}</p>
                </div>
                <Link href={`/classements/${c.id}`} className="shrink-0 text-sm font-semibold text-accent hover:underline">Voir tout</Link>
              </div>
              <RankingTable entries={boards[i]?.entries ?? null} unit={c.unit} limit={5} />
            </section>
          ))}
        </Container>
      </Section>
      <Section className="border-t border-line/60">
        <Container>
          <h2 className="font-display text-xl font-bold uppercase tracking-[0.05em]">Classements détaillés de la saison</h2>
          <p className="mt-1 text-sm text-muted">Toutes les statistiques du serveur, page par page.</p>
          <nav aria-label="Classements détaillés" className="mt-4 flex flex-wrap gap-2">
            {LEADERBOARD_CATEGORIES.map((c) => <Link key={c.id} href={`/leaderboards/${c.id}`} className={buttonClass("secondary", "sm")}>{c.label}</Link>)}
          </nav>
        </Container>
      </Section>
    </>
  );
}
