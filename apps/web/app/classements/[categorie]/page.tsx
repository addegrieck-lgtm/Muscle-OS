import Link from "next/link";
import { notFound } from "next/navigation";
import { RANKING_CATEGORIES } from "@vaeloria/types";
import { Container, Section, buttonClass } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { RankingTable } from "@/components/world/RankingTable";
import { TrackView } from "@/components/world/TrackView";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 60;
export const dynamicParams = false;
const find = (id: string) => RANKING_CATEGORIES.find((c) => c.id === id);

export function generateStaticParams() {
  return RANKING_CATEGORIES.map((c) => ({ categorie: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ categorie: string }> }) {
  const c = find((await params).categorie);
  if (!c) return {};
  return pageMeta({ title: `Classement ${c.label}`, description: `${c.description} — classement ${c.label} de VÆLORIA.`, path: `/classements/${c.id}` });
}

export default async function RankingPage({ params }: { params: Promise<{ categorie: string }> }) {
  const c = find((await params).categorie);
  if (!c) notFound();
  const board = await orNull(api.ranking(c.id));
  return (
    <>
      <TrackView name="ranking_view" id={c.id} />
      <PageHeader eyebrow="Classement" title={c.label} description={c.description} crumbs={[{ name: "Classements", path: "/classements" }, { name: c.label, path: `/classements/${c.id}` }]} />
      <Section>
        <Container className="max-w-3xl">
          <nav aria-label="Catégories" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
            {RANKING_CATEGORIES.map((x) => (
              <Link key={x.id} href={`/classements/${x.id}`} aria-current={x.id === c.id ? "page" : undefined} className={buttonClass(x.id === c.id ? "primary" : "secondary", "sm", "shrink-0")}>{x.label}</Link>
            ))}
          </nav>
          <RankingTable entries={board?.entries ?? null} unit={c.unit} />
        </Container>
      </Section>
    </>
  );
}
