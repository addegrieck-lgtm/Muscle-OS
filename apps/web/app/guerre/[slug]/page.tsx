import Link from "next/link";
import { notFound } from "next/navigation";
import { Container, Section, StatCard, formatDateTime, formatNumber } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { TrackView } from "@/components/world/TrackView";
import { WarCard } from "@/components/world/WarCard";
import { api, orNull } from "@/lib/api";
import { PREVIEW } from "@/lib/preview";
import { pageMeta } from "@/lib/seo";

export const revalidate = 10;
const KIND: Record<string, string> = { start: "Début", capture: "Capture", battle: "Bataille", note: "Info", end: "Fin" };

export async function generateStaticParams() {
  const slugs = (await orNull(api.wars()))?.items.map((w) => w.slug) ?? [];
  return (slugs.length ? slugs : PREVIEW ? ["indisponible"] : []).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const w = await orNull(api.war((await params).slug));
  if (!w) return {};
  return pageMeta({ title: `${w.attacker.name} vs ${w.defender.name} — ${w.title}`, description: w.summary || `Guerre entre ${w.attacker.name} et ${w.defender.name} sur VÆLORIA.`, path: `/guerre/${w.slug}` });
}

export default async function WarPage({ params }: { params: Promise<{ slug: string }> }) {
  const w = await orNull(api.war((await params).slug));
  if (!w) notFound();
  const winner = w.winner === w.attacker.slug ? w.attacker : w.winner === w.defender.slug ? w.defender : null;
  return (
    <>
      <TrackView name="war_view" id={w.slug} />
      <PageHeader eyebrow="Guerre" title={w.title} description={w.summary || undefined} crumbs={[{ name: "Guerres", path: "/guerres" }, { name: w.title, path: `/guerre/${w.slug}` }]} />
      <Section>
        <Container className="max-w-4xl space-y-10">
          <WarCard war={w} large />
          {winner && <p className="text-center font-display text-xl font-bold uppercase tracking-[0.08em]">Victoire de <Link href={`/empire/${winner.slug}`} className="text-accent">{winner.name}</Link></p>}
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={`Score ${w.attacker.tag}`} value={formatNumber(w.attacker.score)} />
            <StatCard label={`Score ${w.defender.tag}`} value={formatNumber(w.defender.score)} />
            <StatCard label="Participants" value={formatNumber(w.participants)} />
            <StatCard label="Début" value={<span className="text-base">{formatDateTime(w.startsAt)}</span>} />
          </div>
          <div>
            <h2 className="mb-4 font-display text-xl font-bold uppercase tracking-[0.05em]">Chronologie</h2>
            {w.events.length ? (
              <ol className="relative space-y-4 border-l border-line pl-6">
                {w.events.map((ev, i) => (
                  <li key={i} className="relative">
                    <span aria-hidden className="absolute -left-[29px] top-1.5 size-2.5 rotate-45 bg-ruby" />
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-subtle">{KIND[ev.kind] ?? ev.kind} · {formatDateTime(ev.occurredAt)}</p>
                    <p className="mt-0.5">{ev.message}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-muted">Les faits marquants de cette guerre apparaîtront ici.</p>
            )}
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href={`/empire/${w.attacker.slug}`} className="text-accent">Voir {w.attacker.name} →</Link>
            <Link href={`/empire/${w.defender.slug}`} className="text-accent">Voir {w.defender.name} →</Link>
          </div>
        </Container>
      </Section>
    </>
  );
}
