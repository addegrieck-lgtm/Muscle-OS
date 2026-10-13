import Link from "next/link";
import { ButtonLink, Card, Container, EmptyState, EventCard, Section, SectionHeader } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { FACTIONS } from "@/content/gameplay";
import { api, orNull } from "@/lib/api";
import { IS_OPEN } from "@/lib/launch";
import { pageMeta } from "@/lib/seo";

export const revalidate = 30;
export const metadata = pageMeta({
  title: "Événements PvP Faction : KOTH, totems, guerres",
  description: "Les événements PvP de VÆLORIA : KOTH, totems, avant-postes et guerres de factions de 48 h. Horaires prévus, règles de capture et récompenses en banque de faction.",
  path: "/evenements",
});

const F = FACTIONS;
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const money = (n: number) => `${fmt(n)} $`;
const dec = (n: number) => String(n).replace(".", ",");

/** Événements récurrents tels que configurés dans le plugin de factions. */
const RECURRING = [
  { name: "KOTH", when: F.koth.schedule.join(" · "), reward: money(F.koth.reward), body: `Tenir la zone ${F.koth.holdMinutes} minutes sans être contesté. L'événement dure ${F.koth.durationMinutes} minutes.`, href: "/guides/participer-koth" },
  { name: "Totem", when: F.totem.schedule.join(" · "), reward: money(F.totem.reward), body: `Un pilier d'obsidienne à abattre à l'épée en diamant (${dec(F.totem.breakSeconds)} s de frappe par bloc), en ${F.totem.durationMinutes} minutes au plus.`, href: "/guides/participer-koth" },
  { name: "Avant-postes", when: "Permanents", reward: `${money(F.outposts.incomePerHour)}/h`, body: `Capture en ${F.outposts.captureMinutes} minutes, puis un revenu toutes les 10 minutes et +${F.outposts.powerBonus} power tant que ta faction le tient.`, href: "/guides/power-faction" },
  { name: "Guerres de factions", when: "À la déclaration", reward: "Score de guerre", body: `${F.war.durationHours} h de guerre après ${F.war.preparationMinutes} minutes de préparation. Kill +${F.war.points.kill}, raid +${F.war.points.raid}, surclaim +${F.war.points.overclaim}. Déclaration : ${money(F.costs.declareWar)}.`, href: "/guides/faire-un-raid" },
];

export default async function EventsPage() {
  const [upcoming, past] = await Promise.all([orNull(api.events()), orNull(api.pastEvents())]);
  const live = upcoming?.items.filter((e) => e.live) ?? [];
  const next = upcoming?.items.filter((e) => !e.live) ?? [];
  return (
    <>
      <PageHeader
        eyebrow="Ce qui se passe dans le monde"
        title="Événements PvP et guerres de factions"
        description={IS_OPEN ? "KOTH, totems, avant-postes et guerres. Horaires en heure de Paris." : "Le serveur n'est pas encore ouvert : aucun événement n'est en cours. Voici le programme prévu à l'ouverture, tel qu'il est configuré aujourd'hui."}
        crumbs={[{ name: "Événements", path: "/evenements" }]}
      />
      <Section>
        <Container className="space-y-12">
          <div>
            <SectionHeader eyebrow={IS_OPEN ? "Chaque semaine" : "Prévu à l'ouverture"} title="Les événements récurrents" description="Horaires en heure de Paris. Les gains sont versés dans la banque de faction." />
            <div className="grid gap-3 md:grid-cols-2">
              {RECURRING.map((e) => (
                <Card key={e.name}>
                  <h3 className="font-display font-bold uppercase tracking-[0.05em]">{e.name}</h3>
                  <p className="mt-1 text-sm text-accent">{e.when}</p>
                  <p className="mt-2 text-sm text-muted">{e.body}</p>
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="font-semibold tabular-nums">{e.reward}</p>
                    <Link href={e.href} className="text-sm font-semibold text-accent hover:underline">Le guide →</Link>
                  </div>
                </Card>
              ))}
            </div>
            {!IS_OPEN && <p className="mt-4 text-sm text-muted">Les horaires peuvent encore évoluer pendant la bêta. Les changements sont annoncés sur le <Link href="/discord" className="text-accent">Discord</Link>.</p>}
          </div>
          {IS_OPEN && !upcoming && <EmptyState title="Événements momentanément indisponibles" />}
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
                  <div className="mt-4"><ButtonLink href="/discord" variant="secondary" data-track="cta_click" data-track-id="evenements-discord">Rejoindre le Discord</ButtonLink></div>
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
