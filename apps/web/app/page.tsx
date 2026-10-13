import Link from "next/link";
import { BRAND, LINKS } from "@vaeloria/config";
import { ButtonLink, Card, Container, EmptyState, EventCard, Ornament, Section, SectionHeader, ServerStatusLine, StatusIndicator, Table } from "@vaeloria/ui";
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
import { FACTIONS, dailyPot } from "@/content/gameplay";
import { GUIDES } from "@/content/guides";
import { api, orNull } from "@/lib/api";
import { IS_OPEN, STAGE, STAGE_CTA, STAGE_LABEL, STAGE_SENTENCE } from "@/lib/launch";
import { JsonLd, pageMeta, websiteLd } from "@/lib/seo";

export const revalidate = 20;

export const metadata = pageMeta({
  title: `${BRAND.name} — Serveur Minecraft Faction PvP français`,
  description: "VÆLORIA, serveur Minecraft Faction français : PvP 1.8 en 1.21, power et surclaim, raids TNT, guerres de 48 h et économie de marché. Suis le développement avant l'ouverture.",
  path: "/",
  absoluteTitle: true,
});

const F = FACTIONS;

/** Les mécaniques qui font le serveur, chacune reliée à la page qui l'explique en détail. */
const PILLARS = [
  { href: "/pvp", title: "PvP 1.8 en 1.21", body: "Pas de recharge d'attaque, pas de coup balayé, knockback 1.8.9 : le combat se gagne aux combos, pas au timing du cooldown." },
  { href: "/guides/power-faction", title: "Power et claims", body: `${F.power.start} power au départ, ${F.power.max} au maximum, −${F.power.lossOnDeath} par mort. Un chunk par point de power, ${F.claims.max} chunks au plafond.` },
  { href: "/guides/surclaim", title: "Surclaim", body: "Une faction affaiblie (power sous son nombre de claims) se fait grignoter par les bords. Le bouclier de 6 h protège tes heures creuses." },
  { href: "/guides/faire-un-raid", title: "Raids à la TNT", body: `La TNT fonctionne dans les claims, même hors ligne. L'obsidienne y résiste : rare, elle ne tombe que par surclaim.` },
  { href: "/evenements", title: "Guerres et événements", body: `Guerres déclarées de ${F.war.durationHours} h avec score, KOTH, totems et avant-postes qui financent la banque de faction.` },
  { href: "/economie", title: "Économie de marché", body: "Prix de rachat qui baissent quand tout le monde farme la même chose, rangs de marchand, générateurs et hôtel des ventes." },
];

const FEATURED_GUIDES = ["comment-commencer", "power-faction", "surclaim", "faire-un-raid"];

export default async function HomePage() {
  const [status, home, map, faq, votes] = await Promise.all([
    orNull(api.serverStatus()),
    orNull(api.worldHome()),
    orNull(api.worldMap()),
    orNull(api.get<{ items: { question: string; answer: string }[] }>("/api/v1/faq", { revalidate: 300 })),
    orNull(api.votes()),
  ]);
  const faqItems = faq?.items.length ? faq.items : FALLBACK_FAQ;

  return (
    <>
      <JsonLd data={websiteLd()} />

      {/* Hero — identité inchangée, nouveau récit */}
      <div className="hero-backdrop border-b border-line/60">
        <Container className="flex flex-col items-center py-14 text-center sm:py-24">
          {IS_OPEN ? <ServerStatusLine status={status} className="mb-10 justify-center" /> : <StatusIndicator tone="warn" label={STAGE_LABEL[STAGE]} className="mb-10" />}
          <h1>
            <span className="sr-only">VÆLORIA, </span>
            <HeroLockup />
            <span className="mt-8 block font-display text-base font-semibold uppercase tracking-[0.18em] text-fg sm:text-xl">serveur Minecraft Faction &amp; PvP français</span>
          </h1>
          <p className="mt-4 font-display text-sm font-semibold uppercase tracking-[0.3em] text-muted sm:text-lg sm:tracking-[0.35em]">
            Le retour de la <span className="text-accent">vraie guerre.</span>
          </p>
          <Ornament className="mt-6" />
          <p className="mt-6 max-w-xl text-base text-fg sm:text-lg">Construis ton empire. Conquiers le monde. Marque l&apos;histoire.</p>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            {IS_OPEN ? (
              <>
                <ButtonLink href="/rejoindre" size="lg" data-track="cta_click" data-track-id="hero-rejoindre">Rejoindre VÆLORIA</ButtonLink>
                <ButtonLink href="/monde" size="lg" variant="secondary" data-track="cta_click" data-track-id="hero-monde">Explorer le monde</ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink href={STAGE_CTA.primary.href} size="lg" data-track="cta_click" data-track-id={`hero-${STAGE_CTA.primary.id}`}>{STAGE_CTA.primary.label}</ButtonLink>
                <ButtonLink href={STAGE_CTA.secondary.href} size="lg" variant="secondary" data-track="cta_click" data-track-id={`hero-${STAGE_CTA.secondary.id}`}>{STAGE_CTA.secondary.label}</ButtonLink>
              </>
            )}
          </div>
        </Container>
      </div>

      {/* Le serveur : contenu de fond, toujours visible (et lisible par les moteurs) */}
      <Section>
        <Container>
          <SectionHeader eyebrow="Le serveur" title="Un serveur Minecraft Faction pensé pour la guerre" />
          <div className="max-w-3xl space-y-3 text-muted">
            <p>
              {BRAND.name} est un serveur Minecraft Faction français en Java {BRAND.minecraftVersion}. Le combat est réglé comme en PvP 1.8 et le territoire
              se gagne au power : chaque mort coûte cher, une faction affaiblie peut être surclaimée et une base mal protégée tombe à la TNT, même quand ses
              défenseurs dorment.
            </p>
            <p>
              Les règles ci-dessous sont celles des plugins du serveur, pas des promesses : chaque valeur affichée sur le site est reprise de leur configuration.
            </p>
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((p) => (
              <li key={p.href}>
                <Link href={p.href} className="group block h-full">
                  <Card className="h-full transition-colors group-hover:bg-surface-2">
                    <h3 className="font-display font-bold uppercase tracking-[0.05em] group-hover:text-accent">{p.title}</h3>
                    <p className="mt-2 text-sm text-muted">{p.body}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm text-muted">
            Toutes les mécaniques sur une page : <Link href="/fonctionnalites" className="font-semibold text-accent">les fonctionnalités de {BRAND.name} →</Link>
          </p>
        </Container>
      </Section>

      {/* Le monde */}
      {(IS_OPEN || map) && (
      <Section className="border-t border-line/60">
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
      )}

      {/* Les empires */}
      {(IS_OPEN || Boolean(home?.empires.length)) && (
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
      )}

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
      {(IS_OPEN || Boolean(home?.wars.length)) && (
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
      )}

      {/* Classements + Conseil */}
      {(IS_OPEN || Boolean(home?.empires.length) || Boolean(home?.poll)) && (
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
      )}

      {/* Votes */}
      {(IS_OPEN) && (
      <Section className="border-t border-line/60">
        <Container className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto]">
          <div>
            <SectionHeader
              eyebrow="Voter"
              title="3 votes par jour, la roue en bonus"
              description={`${new Intl.NumberFormat("fr-FR").format(dailyPot())} $ et des objets pour une journée complète, jusqu'à ×4 avec la roue du jour. Chaque vote fait grandir VÆLORIA.`}
            />
            {votes && votes.total > 0 && (
              <p className="-mt-4 text-sm text-muted">
                {new Intl.NumberFormat("fr-FR").format(votes.total)} votes ce mois-ci{votes.top[0] ? <> · en tête : <Link href="/voter" className="font-semibold text-fg hover:text-accent">{votes.top[0].username}</Link></> : null}
              </p>
            )}
          </div>
          <ButtonLink href="/voter" size="lg" data-track="cta_click" data-track-id="home-voter">Voter maintenant</ButtonLink>
        </Container>
      </Section>
      )}

      {/* Événements */}
      {(IS_OPEN || Boolean(home?.events.length)) && (
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
      )}

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

      {/* Guides */}
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Guides" title="Apprendre le Faction avant l'ouverture" description="Des guides écrits à partir des règles réelles du serveur : power, claims, surclaim, raids, PvP et économie." action={<ButtonLink href="/guides" variant="secondary">Tous les guides</ButtonLink>} />
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURED_GUIDES.map((slug) => GUIDES.find((g) => g.slug === slug)).filter((g) => g !== undefined).map((g) => (
              <li key={g.slug}>
                <Link href={`/guides/${g.slug}`} className="group block h-full">
                  <Card className="h-full transition-colors group-hover:bg-surface-2">
                    <h3 className="font-semibold group-hover:text-accent">{g.title}</h3>
                    <p className="mt-2 text-sm text-muted">{g.description}</p>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </Section>

      {/* Jouer */}
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader
            eyebrow={IS_OPEN ? "Jouer" : "Avant l'ouverture"}
            title={IS_OPEN ? "Prêt en 30 secondes" : "Comment rejoindre l'aventure"}
            description={IS_OPEN ? `Minecraft Java ${BRAND.minecraftVersion}, combat inspiré du 1.8, Faction compétitif.` : STAGE_SENTENCE[STAGE]}
            action={<ButtonLink href="/jouer" variant="ghost" size="sm">Comment jouer</ButtonLink>}
          />
          <JoinSteps />
        </Container>
      </Section>

      {/* FAQ */}
      <Section className="border-t border-line/60">
        <Container className="max-w-3xl">
          <SectionHeader eyebrow="FAQ" title="Questions fréquentes sur le serveur" action={<ButtonLink href="/faq" variant="ghost">Toute la FAQ</ButtonLink>} />
          <FaqList items={faqItems.slice(0, 5)} />
        </Container>
      </Section>

      {/* CTA final */}
      <Section className="hero-backdrop border-t border-line/60">
        <Container className="flex flex-col items-center text-center">
          <Ornament className="mb-6" />
          <p className="metal-text font-display text-3xl font-bold uppercase tracking-[0.08em] sm:text-5xl">Ta place dans ce monde t&apos;attend.</p>
          <p className="mt-4 text-muted">{IS_OPEN ? "Construis ton empire. Conquiers le monde. Marque l'histoire." : "Rejoins le Discord pour connaître la date d'ouverture et former ta faction avant les autres."}</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
            {IS_OPEN ? (
              <>
                <ButtonLink href="/rejoindre" size="lg" data-track="cta_click" data-track-id="final">Rejoindre VÆLORIA</ButtonLink>
                <ButtonLink href={LINKS.discord} external variant="secondary" size="lg" data-track="click_discord">Discord</ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink href={STAGE_CTA.primary.href} size="lg" data-track="cta_click" data-track-id={`final-${STAGE_CTA.primary.id}`}>{STAGE_CTA.primary.label}</ButtonLink>
                <ButtonLink href={STAGE_CTA.secondary.href} variant="secondary" size="lg" data-track="cta_click" data-track-id={`final-${STAGE_CTA.secondary.id}`}>{STAGE_CTA.secondary.label}</ButtonLink>
              </>
            )}
          </div>
          {IS_OPEN && <div className="mt-4 hidden sm:block"><CopyIp /></div>}
        </Container>
      </Section>
    </>
  );
}
