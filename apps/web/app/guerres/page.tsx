import { Container, EmptyState, Section, SectionHeader } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { WarCard } from "@/components/world/WarCard";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 15;
export const metadata = pageMeta({
  title: "Guerres de VÆLORIA",
  description: "Les guerres entre empires de VÆLORIA : en cours, déclarées et terminées. Territoires, scores, participants, en direct.",
  path: "/guerres",
});

export default async function WarsPage() {
  const data = await orNull(api.wars());
  const wars = data?.items ?? [];
  const active = wars.filter((w) => w.status === "active");
  const planned = wars.filter((w) => w.status === "planned");
  const ended = wars.filter((w) => w.status === "ended");
  return (
    <>
      <PageHeader eyebrow="Guerres" title="Guerres de VÆLORIA" description="Chaque guerre peut changer la carte. Suis-les en direct." crumbs={[{ name: "Guerres", path: "/guerres" }]} />
      <Section>
        <Container className="space-y-12">
          {!data && <EmptyState title="Guerres momentanément indisponibles" />}
          {data && wars.length === 0 && <EmptyState title="Aucune guerre pour l'instant">Les premières guerres éclateront au lancement. Elles apparaîtront ici en direct.</EmptyState>}
          {active.length > 0 && (
            <div>
              <SectionHeader eyebrow="En direct" title="Guerres en cours" />
              <div className="grid gap-3 lg:grid-cols-2">{active.map((w) => <WarCard key={w.slug} war={w} large />)}</div>
            </div>
          )}
          {planned.length > 0 && (
            <div>
              <SectionHeader eyebrow="Déclarées" title="Guerres à venir" />
              <div className="grid gap-3 lg:grid-cols-2">{planned.map((w) => <WarCard key={w.slug} war={w} />)}</div>
            </div>
          )}
          {ended.length > 0 && (
            <div>
              <SectionHeader eyebrow="Histoire" title="Guerres terminées" />
              <div className="grid gap-3 lg:grid-cols-2">{ended.map((w) => <WarCard key={w.slug} war={w} />)}</div>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
