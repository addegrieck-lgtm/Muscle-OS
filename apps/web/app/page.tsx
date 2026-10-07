import Link from "next/link";
import { BRAND, LINKS } from "@vaeloria/config";
import { Badge, ButtonLink, Card, Container, EmptyState, EventCard, LeaderboardTable, NewsCard, Ornament, Section, SectionHeader, ServerStatusLine, formatDate, formatNumber } from "@vaeloria/ui";
import { HeroLockup } from "@/components/Logo";
import { CopyIp } from "@/components/CopyIp";
import { Countdown } from "@/components/Countdown";
import { FaqList } from "@/components/Faq";
import { JoinSteps } from "@/components/JoinSteps";
import { FALLBACK_FAQ } from "@/content/faq";
import { api, orNull } from "@/lib/api";
import { JsonLd, faqLd, pageMeta } from "@/lib/seo";

export const revalidate = 30;

export const metadata = pageMeta({
  title: `${BRAND.name} — Serveur Minecraft Faction & PvP français 1.21`,
  description: "Serveur Minecraft français Faction compétitif : Minecraft 1.21, PvP inspiré du 1.8, saisons classées, KOTH, Outposts et raids. Rejoins play.vaeloria.fr.",
  path: "/",
});

const PILLARS = [
  { title: "Un PvP qui récompense le skill", body: "Combat réglé pour retrouver le rythme du 1.8 : combos, knockback maîtrisé, potions. Le meilleur joueur gagne, pas le plus gros stuff." },
  { title: "Du Faction qui a du sens", body: "Claims, Power, bases, spawners, raids. Chaque décision de ta faction compte jusqu'à la fin de la saison." },
  { title: "Des saisons équitables", body: "Tout le monde repart de zéro. Classements publics, récompenses de fin de saison, aucune avance achetable." },
  { title: "Un serveur suivi", body: "Équilibrage régulier, staff présent, anticheat et règles appliquées. Les retours de la communauté sont lus." },
];

export default async function HomePage() {
  const [status, seasons, boards, events, news, faq] = await Promise.all([
    orNull(api.serverStatus()),
    orNull(api.season()),
    orNull(api.leaderboards(5)),
    orNull(api.events()),
    orNull(api.news(1)),
    orNull(api.get<{ items: { question: string; answer: string }[] }>("/api/v1/faq", { revalidate: 300 })),
  ]);
  const season = seasons?.current ?? seasons?.upcoming ?? null;
  const board = (id: string) => boards?.boards.find((b) => b.category === id) ?? null;
  const faqItems = faq?.items.length ? faq.items : FALLBACK_FAQ;

  return (
    <>
      <JsonLd data={faqLd(faqItems.slice(0, 5))} />

      {/* 1–3 · Hero, statut, joueurs */}
      <div className="hero-backdrop border-b border-line/60">
        <Container className="flex flex-col items-center py-14 text-center sm:py-24">
          <ServerStatusLine status={status} className="mb-10 justify-center" />
          <h1>
            <span className="sr-only">VÆLORIA</span>
            <HeroLockup />
          </h1>
          <p className="mt-8 font-display text-sm font-semibold uppercase tracking-[0.3em] text-muted sm:text-lg sm:tracking-[0.35em]">
            Le retour de la <span className="text-accent">vraie guerre.</span>
          </p>
          <Ornament className="mt-6" />
          <ul className="mt-6 flex flex-wrap justify-center gap-2" aria-label="Caractéristiques">
            <li><Badge>Minecraft {BRAND.minecraftVersion}</Badge></li>
            <li><Badge>PvP inspiré du 1.8</Badge></li>
            <li><Badge tone="accent">Faction compétitif</Badge></li>
          </ul>
          <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <ButtonLink href="#jouer" size="lg" data-track="click_play">Jouer</ButtonLink>
            <ButtonLink href={LINKS.discord} external size="lg" variant="secondary" data-track="click_discord">Discord</ButtonLink>
            <ButtonLink href="/leaderboards" size="lg" variant="ghost" data-track="click_leaderboard">Voir le classement</ButtonLink>
          </div>
          <div className="mt-6 hidden sm:block">
            <CopyIp />
          </div>
        </Container>
      </div>

      <Section>
        <Container>
          <SectionHeader eyebrow="Rejoindre" title="Prêt en 30 secondes" />
          <JoinSteps />
        </Container>
      </Section>

      {/* 4 · Pourquoi */}
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Pourquoi VÆLORIA" title="Un serveur pensé pour la compétition" />
          <div className="grid gap-3 sm:grid-cols-2">
            {PILLARS.map((p) => (
              <Card key={p.title}>
                <p className="font-semibold">{p.title}</p>
                <p className="mt-2 text-sm text-muted">{p.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      {/* 5–7 · PvP, Factions, KOTH/Outposts */}
      <Section className="border-t border-line/60">
        <Container className="grid gap-3 md:grid-cols-3">
          {[
            { href: "/pvp", eyebrow: "PvP", title: "Le combat 1.8, en 1.21", body: "Combos, knockback, potions et un vrai écart de niveau entre les joueurs." },
            { href: "/factions", eyebrow: "Factions", title: "Claim. Construis. Raid.", body: "Power, territoires, spawners, économie et guerres entre factions." },
            { href: "/events", eyebrow: "KOTH · Outposts", title: "Des objectifs à tenir", body: "Captures de zones, Outposts à contrôler et événements programmés." },
          ].map((b) => (
            <Link key={b.href} href={b.href} className="group">
              <Card className="h-full transition-colors group-hover:bg-surface-2">
                <p className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-accent">{b.eyebrow}</p>
                <p className="mt-2 font-display text-xl font-bold uppercase tracking-[0.04em]">{b.title}</p>
                <p className="mt-2 text-sm text-muted">{b.body}</p>
                <p className="mt-4 text-sm font-semibold text-fg group-hover:text-accent">Découvrir →</p>
              </Card>
            </Link>
          ))}
        </Container>
      </Section>

      {/* 8 · Saison */}
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Saison" title={season?.name ?? "Saison I"} action={<ButtonLink href="/seasons" variant="secondary">Détails de la saison</ButtonLink>} />
          {season ? (
            <Card className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div>
                <Badge tone={season.status === "active" ? "success" : "accent"}>{season.status === "active" ? "En cours" : "Bientôt"}</Badge>
                <p className="mt-3 text-sm text-muted">
                  {season.status === "active" ? `Lancée le ${formatDate(season.startsAt)}` : `Ouverture prévue le ${formatDate(season.startsAt)}`}
                </p>
                {season.status === "active" && (
                  <p className="mt-1 text-sm text-muted">
                    <strong className="text-fg">{formatNumber(season.stats.players)}</strong> joueurs · <strong className="text-fg">{formatNumber(season.stats.factions)}</strong> factions
                  </p>
                )}
              </div>
              {(season.status === "upcoming" || season.endsAt) && (
                <Countdown target={season.status === "upcoming" ? season.startsAt : season.endsAt!} label={season.status === "upcoming" ? "Avant l'ouverture" : "Avant la fin de saison"} />
              )}
            </Card>
          ) : (
            <EmptyState title="La Saison I se prépare">Rejoins le Discord pour connaître la date d'ouverture.</EmptyState>
          )}
        </Container>
      </Section>

      {/* 9 · Classements */}
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Classements" title="Qui domine VÆLORIA ?" action={<ButtonLink href="/leaderboards" variant="secondary" data-track="click_leaderboard">Voir tout</ButtonLink>} />
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-3 font-semibold">Top factions</h3>
              <LeaderboardTable board={board("factions")} unit="Points" hrefFor={(_id, name) => `/faction/${encodeURIComponent(name)}`} />
            </div>
            <div>
              <h3 className="mb-3 font-semibold">Top kills</h3>
              <LeaderboardTable board={board("kills")} unit="Kills" hrefFor={(_id, name) => `/player/${encodeURIComponent(name)}`} />
            </div>
          </div>
        </Container>
      </Section>

      {/* 10 · Événements */}
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Événements" title="Prochains rendez-vous" action={<ButtonLink href="/events" variant="secondary">Calendrier</ButtonLink>} />
          {events?.items.length ? (
            <div className="grid gap-3 md:grid-cols-3">{events.items.slice(0, 3).map((e) => <EventCard key={e.id} event={e} />)}</div>
          ) : (
            <EmptyState title="Aucun événement programmé">Les KOTH, tournois et supply drops sont annoncés ici et sur Discord.</EmptyState>
          )}
        </Container>
      </Section>

      {/* 11 · Communauté / news */}
      {news && news.items.length > 0 && (
        <Section className="border-t border-line/60">
          <Container>
            <SectionHeader eyebrow="Communauté" title="Dernières nouvelles" action={<ButtonLink href="/news" variant="secondary">Toutes les news</ButtonLink>} />
            <div className="grid gap-3 md:grid-cols-3">{news.items.slice(0, 3).map((a) => <NewsCard key={a.id} article={a} />)}</div>
          </Container>
        </Section>
      )}

      {/* 12 · Discord */}
      <Section className="border-t border-line/60">
        <Container>
          <Card className="flex flex-col items-start gap-5 p-8 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="font-display text-2xl font-bold uppercase tracking-[0.04em]">La guerre se prépare sur Discord</p>
              <p className="mt-2 max-w-xl text-muted">Annonces, recrutement de factions, événements, support et patch notes : tout passe par le Discord.</p>
            </div>
            <ButtonLink href={LINKS.discord} external size="lg" data-track="click_discord">Rejoindre le Discord</ButtonLink>
          </Card>
        </Container>
      </Section>

      {/* 13 · FAQ */}
      <Section className="border-t border-line/60">
        <Container className="max-w-3xl">
          <SectionHeader eyebrow="FAQ" title="Questions fréquentes" action={<ButtonLink href="/faq" variant="ghost">Toute la FAQ</ButtonLink>} />
          <FaqList items={faqItems.slice(0, 5)} />
        </Container>
      </Section>

      {/* 14 · CTA final */}
      <Section className="hero-backdrop border-t border-line/60">
        <Container className="flex flex-col items-center text-center">
          <Ornament className="mb-6" />
          <p className="metal-text font-display text-3xl font-bold uppercase tracking-[0.08em] sm:text-5xl">{BRAND.tagline}</p>
          <p className="mt-4 text-muted">Rejoins {BRAND.serverIp} en Minecraft {BRAND.minecraftVersion}.</p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row">
            <CopyIp />
            <ButtonLink href={LINKS.discord} external variant="secondary" size="lg" data-track="click_discord">Discord</ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
