import Link from "next/link";
import { BRAND, LINKS } from "@vaeloria/config";
import { ButtonLink, Card, Container, Section, SectionHeader } from "@vaeloria/ui";
import { JoinSteps } from "@/components/JoinSteps";
import { PageHeader } from "@/components/PageHeader";
import { IS_OPEN, STAGE, STAGE_CTA, STAGE_SENTENCE } from "@/lib/launch";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Comment jouer : version, IP et premiers pas",
  description: `Comment jouer sur ${BRAND.name}, serveur Minecraft Faction : Minecraft Java ${BRAND.minecraftVersion} sans mod, date d'ouverture, adresse du serveur et premiers pas.`,
  path: "/jouer",
});

const NEXT = IS_OPEN
  ? [
      { href: "/rejoindre", title: "Deviens fondateur", body: "Connecte-toi avec Discord : ton numéro de fondateur t'attend." },
      { href: "/empires", title: "Choisis ton camp", body: "Fonde ton empire ou rejoins-en un qui recrute." },
      { href: "/monde", title: "Découvre la carte", body: "Zones, territoires, KOTH : repère le terrain avant la guerre." },
      { href: "/rules", title: "Lis le règlement", body: "Fair-play, anti-triche, sanctions : les règles sont claires." },
    ]
  : [
      { href: "/guides/comment-commencer", title: "Guide du débutant", body: "Les règles du Faction et les erreurs à éviter dès le premier jour." },
      { href: "/factions", title: "Les règles du Faction", body: "Power, claims, surclaim, raids : toutes les valeurs du serveur." },
      { href: "/pvp", title: "Le combat 1.8", body: "Ce qui change par rapport au PvP 1.9+ et comment s'y préparer." },
      { href: "/rules", title: "Lis le règlement", body: "Fair-play, anti-triche, sanctions : les règles sont claires." },
    ];

export default function PlayPage() {
  return (
    <>
      <PageHeader
        eyebrow={IS_OPEN ? "Prêt en 30 secondes" : "Avant l'ouverture"}
        title="Comment jouer sur VÆLORIA"
        description={IS_OPEN ? `Minecraft Java ${BRAND.minecraftVersion}, combat inspiré du 1.8, Faction compétitif. Aucun mod requis.` : `${STAGE_SENTENCE[STAGE]} Il faudra Minecraft Java ${BRAND.minecraftVersion}, sans mod.`}
        crumbs={[{ name: "Jouer", path: "/jouer" }]}
      />
      <Section>
        <Container className="space-y-14">
          <JoinSteps />
          <div>
            <SectionHeader eyebrow="Ensuite" title={IS_OPEN ? "Ta place dans le monde" : "Te préparer d'ici l'ouverture"} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {NEXT.map((n) => (
                <Link key={n.href} href={n.href} className="group block">
                  <Card className="h-full transition-colors group-hover:bg-surface-2">
                    <h3 className="font-display font-bold uppercase tracking-[0.05em] group-hover:text-accent">{n.title}</h3>
                    <p className="mt-1 text-sm text-muted">{n.body}</p>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            {IS_OPEN ? (
              <>
                <ButtonLink href="/rejoindre" size="lg">Rejoindre VÆLORIA</ButtonLink>
                <ButtonLink href={LINKS.discord} external variant="secondary" size="lg" data-track="click_discord">Discord</ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink href={STAGE_CTA.primary.href} size="lg" data-track="cta_click" data-track-id={`jouer-${STAGE_CTA.primary.id}`}>{STAGE_CTA.primary.label}</ButtonLink>
                <ButtonLink href={STAGE_CTA.secondary.href} variant="secondary" size="lg" data-track="cta_click" data-track-id={`jouer-${STAGE_CTA.secondary.id}`}>{STAGE_CTA.secondary.label}</ButtonLink>
              </>
            )}
            <ButtonLink href="/guides" variant="ghost" size="lg">Guides</ButtonLink>
          </div>
        </Container>
      </Section>
    </>
  );
}
