import { LINKS } from "@vaeloria/config";
import { ButtonLink, Container, EmptyState, EventCard, Section, SectionHeader } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 30;
export const metadata = pageMeta({
  title: "Événements — en direct et à venir",
  description: "Les événements de VÆLORIA : KOTH, boss, sièges, ruées vers l'or, tournois et guerres. En direct et à venir, heure de Paris.",
  path: "/evenements",
});

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([orNull(api.events()), orNull(api.pastEvents())]);
  const live = upcoming?.items.filter((e) => e.live) ?? [];
  const next = upcoming?.items.filter((e) => !e.live) ?? [];
  return (
    <>
      <PageHeader eyebrow="Événements" title="Ce qui se passe dans le monde" description="KOTH, boss, sièges, ruées vers l'or, tournois. Horaires en heure de Paris." crumbs={[{ name: "Événements", path: "/evenements" }]} />
      <Section>
        <Container className="space-y-12">
          {!upcoming && <EmptyState title="Événements momentanément indisponibles" />}
          {live.length > 0 && (
            <div>
              <SectionHeader eyebrow="En direct" title="En ce moment" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{live.map((e) => <EventCard key={e.id} event={e} />)}</div>
            </div>
          )}
          {upcoming && (
            <div>
              <SectionHeader eyebrow="À venir" title="Prochains événements" />
              {next.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{next.map((e) => <EventCard key={e.id} event={e} />)}</div>
              ) : (
                <EmptyState title="Aucun événement programmé pour l'instant">
                  Les prochains événements sont annoncés sur Discord, avec un rappel avant chaque KOTH.
                  <div className="mt-4"><ButtonLink href={LINKS.discord} external variant="secondary" data-track="click_discord">Rejoindre le Discord</ButtonLink></div>
                </EmptyState>
              )}
            </div>
          )}
          {past && past.items.length > 0 && (
            <div>
              <SectionHeader eyebrow="Archives" title="Événements passés" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{past.items.map((e) => <EventCard key={e.id} event={e} />)}</div>
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
