import Link from "next/link";
import { LEADERBOARD_CATEGORIES } from "@vaeloria/config";
import { Container, LeaderboardTable, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 60;
export const metadata = pageMeta({
  title: "Classements — factions, kills, richesse, KOTH",
  description: "Classements en direct de la saison VÆLORIA : factions, kills, richesse, power, territoire, KOTH et activité.",
  path: "/leaderboards",
});

const PLAYER_BOARDS = new Set(["kills", "activity"]);

export default async function LeaderboardsPage() {
  const data = await orNull(api.leaderboards(10));
  return (
    <>
      <PageHeader eyebrow="Classements" title="Classements de la saison" description="Mis à jour en continu à partir des données du serveur." crumbs={[{ name: "Classements", path: "/leaderboards" }]} />
      <Section>
        <Container className="grid gap-10 lg:grid-cols-2">
          {LEADERBOARD_CATEGORIES.map((c) => {
            const board = data?.boards.find((b) => b.category === c.id) ?? null;
            return (
              <section key={c.id} aria-labelledby={`lb-${c.id}`}>
                <div className="mb-3 flex items-center justify-between">
                  <h2 id={`lb-${c.id}`} className="font-display text-xl font-bold">{c.label}</h2>
                  <Link href={`/leaderboards/${c.id}`} className="text-sm font-semibold text-accent hover:underline">Voir tout</Link>
                </div>
                <LeaderboardTable board={board} unit={c.unit} hrefFor={(_i, n) => (PLAYER_BOARDS.has(c.id) ? `/player/${encodeURIComponent(n)}` : `/faction/${encodeURIComponent(n)}`)} />
              </section>
            );
          })}
        </Container>
      </Section>
    </>
  );
}
