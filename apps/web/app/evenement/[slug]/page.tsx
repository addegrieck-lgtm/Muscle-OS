import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Container, Section, StatCard, eventTypeLabel, formatDateTime, formatNumber } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { Clock } from "@/components/world/Clock";
import { TrackView } from "@/components/world/TrackView";
import { api, orNull } from "@/lib/api";
import { PREVIEW } from "@/lib/preview";
import { JsonLd, SITE_URL, pageMeta } from "@/lib/seo";

export const revalidate = 30;

export async function generateStaticParams() {
  const [a, b] = await Promise.all([orNull(api.events()), orNull(api.pastEvents())]);
  const slugs = [...(a?.items ?? []), ...(b?.items ?? [])].map((e) => e.slug);
  return (slugs.length ? slugs : PREVIEW ? ["indisponible"] : []).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const e = await orNull(api.event((await params).slug));
  if (!e) return {};
  return pageMeta({ title: `${e.title} — ${eventTypeLabel(e.type)}`, description: e.description || `${eventTypeLabel(e.type)} sur VÆLORIA, le ${formatDateTime(e.startsAt)}.`, path: `/evenement/${e.slug}` });
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const e = await orNull(api.event((await params).slug));
  if (!e) notFound();
  const ended = e.endsAt ? Date.parse(e.endsAt) < Date.now() : false;
  return (
    <>
      <TrackView name="event_view" id={e.slug} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "Event", name: e.title, description: e.description, startDate: e.startsAt, ...(e.endsAt && { endDate: e.endsAt }), eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode", location: { "@type": "VirtualLocation", url: `${SITE_URL}/evenement/${e.slug}` }, organizer: { "@type": "Organization", name: "VÆLORIA", url: SITE_URL } }} />
      <PageHeader eyebrow={eventTypeLabel(e.type)} title={e.title} description={e.description || undefined} crumbs={[{ name: "Événements", path: "/evenements" }, { name: e.title, path: `/evenement/${e.slug}` }]}>
        <div className="flex flex-wrap items-center gap-2">
          {e.live ? <Badge tone="danger">En direct</Badge> : ended ? <Badge>Terminé</Badge> : <Badge tone="accent">À venir</Badge>}
          {e.live && e.endsAt && <span className="font-display text-sm text-muted">Fin dans <Clock until={e.endsAt} /></span>}
          {!e.live && !ended && <span className="font-display text-sm text-muted">Début dans <Clock until={e.startsAt} /></span>}
        </div>
      </PageHeader>
      <Section>
        <Container className="max-w-4xl space-y-8">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Début" value={<span className="text-base">{formatDateTime(e.startsAt)}</span>} />
            <StatCard label="Fin" value={<span className="text-base">{e.endsAt ? formatDateTime(e.endsAt) : "—"}</span>} />
            <StatCard label="Participants" value={e.participants !== null ? formatNumber(e.participants) : "—"} hint={e.participants === null ? "Synchronisé depuis le serveur" : undefined} />
            <StatCard label="Empires" value={e.empiresCount !== null ? formatNumber(e.empiresCount) : "—"} />
          </div>
          {(e.location || e.rewards) && (
            <dl className="space-y-2 text-sm">
              {e.location && <div><dt className="inline text-muted">Lieu : </dt><dd className="inline">{e.location}</dd></div>}
              {e.rewards && <div><dt className="inline text-muted">Récompenses : </dt><dd className="inline">{e.rewards}</dd></div>}
            </dl>
          )}
          {e.zoneKey && <Link href="/monde" className="inline-block text-sm font-semibold text-accent">Voir la zone sur la carte →</Link>}
        </Container>
      </Section>
    </>
  );
}
