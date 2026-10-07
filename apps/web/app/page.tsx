import Link from "next/link";
import { BRAND, LINKS } from "@vaeloria/config";
import { ButtonLink, Card, Container, EmptyState, EventCard, Ornament, Section, SectionHeader, ServerStatusLine, Table } from "@vaeloria/ui";
import { CopyIp } from "@/components/CopyIp";
import { FaqList } from "@/components/Faq";
import { JoinSteps } from "@/components/JoinSteps";
import { HeroLockup } from "@/components/Logo";
import { EmpireCard } from "@/components/world/EmpireCard";
import { FounderCounter, MilestoneTrack } from "@/components/world/Founders";
import { PollTeaser } from "@/components/world/PollPreview";
import { WarCard } from "@/components/world/WarCard";
import { WorldMap } from "@/components/world/WorldMap";
import { FALLBACK_FAQ } from "@/content/faq";
import { api, orNull } from "@/lib/api";
import { JsonLd, faqLd, pageMeta } from "@/lib/seo";

export const revalidate = 20;

export const metadata = pageMeta({
  title: `${BRAND.name} — Le retour de la vraie guerre | Serveur Minecraft Faction & PvP`,
  description: "VÆLORIA, serveur Minecraft français Faction & PvP en 1.21 : construis ton empire, conquiers le monde, marque l'histoire. Deviens l'un des 3 000 fondateurs.",
  path: "/",
});

export default async function HomePage() {
  const [status, home, map, faq] = await Promise.all([
    orNull(api.serverStatus()),
    orNull(api.worldHome()),
    orNull(api.worldMap()),
    orNull(api.get<{ items: { question: string; answer: string }[] }>("/api/v1/faq", { revalidate: 300 })),
  ]);
  const faqItems = faq?.items.length ? faq.items : FALLBACK_FAQ;

  return (
    <>
      <JsonLd data={faqLd(faqItems.slice(0, 5))} />

      {/* Hero — identité inchangée, nouveau récit */}
      <div className="hero-backdrop border-b border-line/60">
        <Container className="flex flex-col items-center py-14 text-center sm:py-24">
          <ServerStatusLine status={status} className="mb-10 justify-center" />
          <h1>
            <span className="sr-only">VÆLORIA — Le retour de la vraie guerre</span>
            <HeroLockup />
          </h1>
          <p className="mt-8 font-display text-sm font-semibold uppercase tracking-[0.3em] text-muted sm:text-lg sm:tracking-[0.35em]">
            Le retour de la <span className="text-accent">vraie guerre.</span>
          </p>
          <Ornament className="mt-6" />
          <p className="mt-6 max-w-xl text-base text-fg sm:text-lg">Construis ton empire. Conquiers le monde. Marque l&apos;histoire.</p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="/rejoindre" size="lg" data-track="cta_click" data-track-id="hero-rejoindre">Rejoindre VÆLORIA</ButtonLink>
            <ButtonLink href="/monde" size="lg" variant="secondary" data-track="cta_click" data-track-id="hero-monde">Explorer le monde</ButtonLink>
          </div>
        </Container>
      </div>

      {/* Le monde */}
      <Section>
        <Container className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <div>
            <SectionHeader eyebrow="Le monde" title="Le monde de VÆLORIA" />
            <div className="space-y-2 text-lg text-muted">
              <p>Un monde où chaque territoire compte.</p>
              <p>Chaque faction peut devenir un empire.</p>
              <p>Chaque guerre peut changer la carte.</p>
            </div>
            <ButtonLink href="/monde" variant="secondary" className="mt-6" data-track="cta_click" data-track-id="carte">Explorer la carte</ButtonLink>
          </div>
          {map ? <WorldMap data={map} compact /> : <EmptyState title="Carte momentanément indisponible" />}
        </Container>
      </Section>

      {/* Les empires */}
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader
            eyebrow="Empires"
            title="Les empires de VÆLORIA"
            description={home?.empireCount ? `${home.empireCount} empire${home.empireCount > 1 ? "s" : ""} déjà fondé${home.empireCount > 1 ? "s" : ""}.` : undefined}
            action={<ButtonLink href="/empires" variant="secondary">Tous les empires</ButtonLink>}
          />
          {home?.empires.length ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{home.empires.slice(0, 3).map((e) => <EmpireCard key={e.slug} empire={e} />)}</div>
          ) : (
            <EmptyState title="Aucun empire n'a encore été fondé">
              Le premier nom gravé dans l&apos;histoire de VÆLORIA peut être le tien.
              <div className="mt-4"><ButtonLink href="/empires/creer">Fonder mon empire</ButtonLink></div>
            </EmptyState>
          )}
          {Boolean(home?.empires.length) && <p className="mt-4 text-sm text-muted">Tu veux le tien ? <Link href="/empires/creer" className="font-semibold text-accent">Fonde ton empire →</Link></p>}
        </Container>
      </Section>

      {/* Fondateurs */}
      {home && (
        <Section className="hero-backdrop border-t border-line/60">
          <Container>
            <SectionHeader eyebrow="Fondateurs" title={`Les ${new Intl.NumberFormat("fr-FR").format(home.founders.cap)} fondateurs`} description="Les premiers joueurs ne seront pas de simples joueurs. Ils seront les premiers habitants de VÆLORIA." />
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-[360px_1fr] lg:items-center">
              <div>
                <FounderCounter stats={home.founders} />
                <ButtonLink href="/rejoindre" size="lg" className="mt-6 w-full sm:w-auto" data-track="cta_click" data-track-id="fondateurs">
                  {home.founders.open && home.founders.count < home.founders.cap ? "Devenir fondateur" : "Rejoindre VÆLORIA"}
                </ButtonLink>
              </div>
              <MilestoneTrack stats={home.founders} />
            </div>
          </Container>
        </Section>
      )}

      {/* Guerres */}
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Guerres" title="Guerres de VÆLORIA" action={<ButtonLink href="/guerres" variant="secondary">Toutes les guerres</ButtonLink>} />
          {home?.wars.length ? (
            <div className="grid gap-3 lg:grid-cols-2">{home.wars.slice(0, 2).map((w) => <WarCard key={w.slug} war={w} />)}</div>
          ) : (
            <EmptyState title="Les premières guerres éclateront au lancement">Chaque guerre sera suivie ici en direct : territoires, score, participants.</EmptyState>
          )}
        </Container>
      </Section>

      {/* Classements + Conseil */}
      <Section className="border-t border-line/60">
        <Container className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div>
            <SectionHeader eyebrow="Classements" title="Qui domine VÆLORIA ?" action={<ButtonLink href="/classements" variant="ghost" size="sm">Classements</ButtonLink>} />
            {home?.empires.length ? (
              <Table head={["#", "Empire", "Influence"]}>
                {home.empires.slice(0, 5).map((e) => (
                  <tr key={e.slug}>
                    <td className="w-10 font-bold tabular-nums text-accent">{e.rank}</td>
                    <td><Link href={`/empire/${e.slug}`} className="font-semibold hover:text-accent">{e.name}</Link> <span className="text-xs text-subtle">[{e.tag}]</span></td>
                    <td className="text-right font-semibold tabular-nums">{new Intl.NumberFormat("fr-FR").format(e.influence)}</td>
                  </tr>
                ))}
              </Table>
            ) : (
              <EmptyState title="Classement vide pour l'instant" />
            )}
          </div>
          <div>
            <SectionHeader eyebrow="Conseil" title="La communauté décide" action={<ButtonLink href="/conseil" variant="ghost" size="sm">Le Conseil</ButtonLink>} />
            {home?.poll ? <PollTeaser poll={home.poll} /> : <EmptyState title="Aucun vote en cours">Les prochaines décisions seront soumises au Conseil.</EmptyState>}
          </div>
        </Container>
      </Section>

      {/* Événements */}
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Événements" title="Ce qui se passe dans le monde" action={<ButtonLink href="/evenements" variant="secondary">Calendrier</ButtonLink>} />
          {home?.events.length ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">{home.events.map((e) => <EventCard key={e.id} event={e} />)}</div>
          ) : (
            <EmptyState title="Aucun événement programmé">KOTH, boss, tournois, sièges : tout sera annoncé ici et sur Discord.</EmptyState>
          )}
        </Container>
      </Section>

      {/* Journal */}
      {home && home.journal.length > 0 && (
        <Section className="border-t border-line/60">
          <Container>
            <SectionHeader eyebrow="Journal" title="VÆLORIA se construit en public" action={<ButtonLink href="/journal" variant="ghost" size="sm">Le journal</ButtonLink>} />
            <div className="grid gap-3 md:grid-cols-3">
              {home.journal.map((j) => (
                <Link key={j.slug} href="/journal" className="group block">
                  <Card className="h-full transition-colors group-hover:bg-surface-2">
                    <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent">{j.episode ? `Épisode ${String(j.episode).padStart(2, "0")}` : j.kind}</p>
                    <p className="mt-2 font-semibold group-hover:text-accent">{j.title}</p>
                    <p className="mt-1 text-sm text-muted">{j.publishedAt ? j.summary : "Bientôt"}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </Container>
        </Section>
      )}

      {/* Jouer */}
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Jouer" title="Prêt en 30 secondes" description={`Minecraft Java ${BRAND.minecraftVersion}, combat inspiré du 1.8, Faction compétitif.`} action={<ButtonLink href="/jouer" variant="ghost" size="sm">Comment jouer</ButtonLink>} />
          <JoinSteps />
        </Container>
      </Section>

      {/* FAQ */}
      <Section className="border-t border-line/60">
        <Container className="max-w-3xl">
          <SectionHeader eyebrow="FAQ" title="Questions fréquentes" action={<ButtonLink href="/faq" variant="ghost">Toute la FAQ</ButtonLink>} />
          <FaqList items={faqItems.slice(0, 5)} />
        </Container>
      </Section>

      {/* CTA final */}
      <Section className="hero-backdrop border-t border-line/60">
        <Container className="flex flex-col items-center text-center">
          <Ornament className="mb-6" />
          <p className="metal-text font-display text-3xl font-bold uppercase tracking-[0.08em] sm:text-5xl">Ta place dans ce monde t&apos;attend.</p>
          <p className="mt-4 text-muted">Construis ton empire. Conquiers le monde. Marque l&apos;histoire.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
            <ButtonLink href="/rejoindre" size="lg" data-track="cta_click" data-track-id="final">Rejoindre VÆLORIA</ButtonLink>
            <ButtonLink href={LINKS.discord} external variant="secondary" size="lg" data-track="click_discord">Discord</ButtonLink>
          </div>
          <div className="mt-4 hidden sm:block"><CopyIp /></div>
        </Container>
      </Section>
    </>
  );
}
