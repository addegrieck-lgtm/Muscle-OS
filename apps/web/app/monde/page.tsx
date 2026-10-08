import { Container, EmptyState, Section } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { TrackView } from "@/components/world/TrackView";
import { WorldMap } from "@/components/world/WorldMap";
import { api, orNull } from "@/lib/api";
import { pageMeta } from "@/lib/seo";

export const revalidate = 60;
export const metadata = pageMeta({
  title: "Carte du monde de VÆLORIA",
  description: "La carte de VÆLORIA : zones KOTH, zones de guerre, événements en direct et surface de chaque empire. Les bases restent secrètes.",
  path: "/monde",
});

export default async function WorldPage() {
  const map = await orNull(api.worldMap());
  return (
    <>
      <TrackView name="map_view" />
      <PageHeader eyebrow="Le monde" title="La carte de VÆLORIA" description="Zones publiques, événements en direct et surface de chaque empire. Les bases, elles, se trouvent en jeu." crumbs={[{ name: "Monde", path: "/monde" }]} />
      <Section className="py-8 sm:py-12">
        <Container>{map ? <WorldMap data={map} /> : <EmptyState title="Carte momentanément indisponible" />}</Container>
      </Section>
    </>
  );
}
