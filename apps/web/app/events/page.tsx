import { LINKS } from "@vaeloria/config";
import { ButtonLink, Container, EmptyState, EventCard, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 60;
export const metadata = pageMeta({
  title: "Événements — KOTH, boss, tournois, supply drops",
  description: "Le calendrier des événements VÆLORIA : KOTH, boss, tournois, supply drops, guerres et événements saisonniers.",
  path: "/events",
});

export default async function EventsPage() {
  const events = await orNull(api.events());
  return (
    <>
      <PageHeader
        eyebrow="Événements"
        title="Calendrier des événements"
        description="KOTH, boss, tournois, supply drops et guerres. Les horaires sont en heure de Paris."
        crumbs={[{ name: "Événements", path: "/events" }]}
      />
      <Section>
        <Container>
          {events?.items.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{events.items.map((e) => <EventCard key={e.id} event={e} />)}</div>
          ) : (
            <EmptyState title="Aucun événement programmé pour l'instant">
              Les prochains événements sont annoncés sur Discord, avec un rappel avant chaque KOTH.
              <div className="mt-4"><ButtonLink href={LINKS.discord} external variant="secondary" data-track="click_discord">Rejoindre le Discord</ButtonLink></div>
            </EmptyState>
          )}
        </Container>
      </Section>
    </>
  );
}
