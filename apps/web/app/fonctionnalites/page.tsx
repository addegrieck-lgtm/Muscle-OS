import Link from "next/link";
import { BRAND } from "@vaeloria/config";
import { ButtonLink, Card, Container, Section, SectionHeader } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { COMBAT, FACTIONS, MARKET, MERCHANT_RANKS, VOTE_SITES, dailyPot } from "@/content/gameplay";
import { IS_OPEN, STAGE, STAGE_CTA, STAGE_SENTENCE } from "@/lib/launch";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Fonctionnalités du serveur Faction PvP",
  description: `Toutes les fonctionnalités de ${BRAND.name} sur une page : Faction (power, claims, surclaim, raids TNT), PvP 1.8 en 1.21, économie de marché, événements, votes et site relié au jeu.`,
  path: "/fonctionnalites",
});

const F = FACTIONS;
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const money = (n: number) => `${fmt(n)} $`;
const dec = (n: number) => String(n).replace(".", ",");

/** Une fiche par système, chacune résumée en faits vérifiables et reliée à sa page de détail. */
const GROUPS: { id: string; title: string; intro: string; href: string; cta: string; facts: string[] }[] = [
  {
    id: "faction",
    title: "Faction",
    intro: "Le cœur du serveur : territoire, power et pillage.",
    href: "/factions",
    cta: "Les règles du Faction",
    facts: [
      `Création ${money(F.costs.create)}, ${F.maxMembers} membres (jusqu'à 30 avec les améliorations), rôles Chef, Officier, Membre, Recrue.`,
      `Power : ${F.power.start} au départ, ${F.power.max} au maximum, −${F.power.lossOnDeath} par mort, +${dec(F.power.regenPerMinute)} par minute de jeu.`,
      `Claims : 1 chunk par point de power, ${F.claims.max} au maximum, contigus.`,
      `Surclaim par les bords quand le power passe sous le nombre de claims, après déclaration d'inimitié.`,
      `TNT active dans les claims, même hors ligne ; obsidienne indestructible à la TNT et rare.`,
      `Bouclier quotidien de ${F.shield.hours} h contre le surclaim, ${F.relations.maxAllies} alliés et ${F.relations.maxTruces} trêves au plus.`,
      `${F.missionsPerDay} missions par jour et 6 améliorations achetées avec la banque de faction.`,
    ],
  },
  {
    id: "pvp",
    title: "PvP 1.8 en 1.21",
    intro: "Le contenu de la 1.21, le combat de la 1.8.9.",
    href: "/pvp",
    cta: "Le détail du combat",
    facts: [
      COMBAT.noAttackCooldown ? "Pas de recharge d'attaque : chaque clic frappe à pleine puissance." : "Recharge d'attaque active.",
      COMBAT.noSweep ? "Pas de coup balayé à l'épée." : "Coup balayé actif.",
      `Invulnérabilité de ${COMBAT.hitDelayTicks} ticks après un coup et knockback 1.8.9, identique pour tous (netherite comprise).`,
      `Tag de combat de ${F.combatTagSeconds} s : téléportations bloquées, déconnexion = mort.`,
      "Surveillance du MSPT : en cas de surcharge, la distance de simulation baisse pour garder des coups nets. /ping et /pvpstatus pour les joueurs.",
    ],
  },
  {
    id: "economie",
    title: "Économie",
    intro: "L'argent se farme, et il finance la guerre.",
    href: "/economie",
    cta: "Tous les prix",
    facts: [
      `Marché dynamique : le prix d'un produit vendu en masse baisse jusqu'à −${MARKET.maxDropPercent} %, ${MARKET.featuredCount} cours du jour à +${MARKET.featuredBonus} %.`,
      `${MERCHANT_RANKS.length} rangs de marchand, de +0 % à +${MERCHANT_RANKS[MERCHANT_RANKS.length - 1]!.bonus} % sur les ventes, qui débloquent outils et générateurs.`,
      "Générateurs de mobs, du zombie au golem de fer, pour un revenu passif.",
      `Hôtel des ventes (/hdv) et ${MARKET.playerShops.plots} boutiques de joueurs à louer au spawn.`,
    ],
  },
  {
    id: "evenements",
    title: "Événements et guerres",
    intro: "Des rendez-vous fixes pour se battre et remplir la banque.",
    href: "/evenements",
    cta: "Le programme",
    facts: [
      `KOTH (${F.koth.schedule.join(", ")}) : ${money(F.koth.reward)} en banque de faction.`,
      `Totems (${F.totem.schedule.join(", ")}) : ${money(F.totem.reward)}.`,
      `Avant-postes permanents : ${money(F.outposts.incomePerHour)}/h et +${F.outposts.powerBonus} power.`,
      `Guerres déclarées de ${F.war.durationHours} h avec score : kill, raid et surclaim.`,
    ],
  },
  {
    id: "votes",
    title: "Votes",
    intro: "Soutenir le serveur rapporte chaque jour.",
    href: "/voter",
    cta: "Les récompenses",
    facts: [
      `${VOTE_SITES.length} sites de vote, ${money(dailyPot())} et des objets pour une journée complète.`,
      "Roue du jour au dernier vote : classique (×1 à ×3, sans perte) ou quitte ou double (×4 ou rien).",
    ],
  },
  {
    id: "site",
    title: "Site relié au jeu",
    intro: "Le site lit les données du serveur.",
    href: "/guides",
    cta: "Les guides",
    facts: [
      "Classements, empires, guerres et carte du monde alimentés par le serveur (disponibles à l'ouverture).",
      "Compte joueur relié au pseudo Minecraft.",
      "Guides écrits à partir de la configuration réelle des plugins.",
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Fonctionnalités"
        title={`Toutes les fonctionnalités de ${BRAND.name}`}
        description={`Serveur Minecraft Faction français en Java ${BRAND.minecraftVersion}. Chaque valeur ci-dessous vient de la configuration des plugins du serveur.`}
        crumbs={[{ name: "Fonctionnalités", path: "/fonctionnalites" }]}
      >
        <nav aria-label="Sommaire" className="flex flex-wrap gap-2 text-sm">
          {GROUPS.map((g) => (
            <a key={g.id} href={`#${g.id}`} className="rounded border border-line bg-surface-2 px-2 py-1 hover:text-accent">{g.title}</a>
          ))}
        </nav>
      </PageHeader>
      <Section>
        <Container className="space-y-12">
          {GROUPS.map((g) => (
            <section key={g.id} id={g.id} aria-labelledby={`h-${g.id}`} className="scroll-mt-24">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 id={`h-${g.id}`} className="font-display text-2xl font-bold uppercase tracking-[0.04em] sm:text-3xl">{g.title}</h2>
                  <p className="mt-1 text-muted">{g.intro}</p>
                </div>
                <Link href={g.href} className="text-sm font-semibold text-accent hover:underline">{g.cta} →</Link>
              </div>
              <Card>
                <ul className="space-y-2 text-sm text-muted">
                  {g.facts.map((f) => (
                    <li key={f} className="flex gap-2"><span aria-hidden className="text-accent">◆</span>{f}</li>
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </Container>
      </Section>
      {!IS_OPEN && (
        <Section className="border-t border-line/60">
          <Container>
            <SectionHeader eyebrow="Avant l'ouverture" title="Où en est le serveur ?" description={STAGE_SENTENCE[STAGE]} />
            <div className="flex flex-col gap-3 sm:flex-row">
              <ButtonLink href={STAGE_CTA.primary.href} size="lg" data-track="cta_click" data-track-id={`fonctionnalites-${STAGE_CTA.primary.id}`}>{STAGE_CTA.primary.label}</ButtonLink>
              <ButtonLink href={STAGE_CTA.secondary.href} variant="secondary" size="lg" data-track="cta_click" data-track-id={`fonctionnalites-${STAGE_CTA.secondary.id}`}>{STAGE_CTA.secondary.label}</ButtonLink>
            </div>
          </Container>
        </Section>
      )}
    </>
  );
}
