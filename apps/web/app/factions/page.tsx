import Link from "next/link";
import { ButtonLink, Card, Container, Section, SectionHeader, Table } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { FACTIONS } from "@/content/gameplay";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Serveur Minecraft Faction : power, surclaim, raids",
  description: "Serveur Minecraft Faction français : power et claims, surclaim, raids à la TNT même hors ligne, obsidienne rare, bouclier de 6 h, guerres de 48 h, KOTH et avant-postes.",
  path: "/factions",
});

const F = FACTIONS;
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const money = (n: number) => `${fmt(n)} $`;
const dec = (n: number) => String(n).replace(".", ",");

const SYSTEMS: { title: string; href?: string; body: string }[] = [
  { title: "Fonder", href: "/guides/creer-une-faction", body: `/f creer ‹nom› pour ${money(F.costs.create)}. ${F.maxMembers} membres maximum, rôles Chef, Officier, Membre, Recrue.` },
  { title: "Power", href: "/guides/power-faction", body: `Chaque joueur démarre à ${F.power.start} power (max ${F.power.max}, min ${F.power.min}). −${F.power.lossOnDeath} par mort (×${dec(F.power.warzoneMultiplier)} en WarZone), +${dec(F.power.regenPerMinute)} par minute de jeu.` },
  { title: "Claims", href: "/guides/comment-claim", body: `1 chunk par point de power, ${F.claims.max} au maximum. Les claims doivent se toucher ; /f claim ‹rayon› jusqu'à ${F.claims.maxRadius}.` },
  { title: "Surclaim", href: "/guides/surclaim", body: "Si ton power passe sous ton nombre de claims, une faction ennemie (/f ennemi) peut grignoter ton territoire par les bords." },
  { title: "Pillage à la TNT", href: "/guides/faire-un-raid", body: `Les explosions fonctionnent dans les claims, même hors ligne. Sous le feu : pas d'unclaim ni de dissolution pendant ${F.raid.lockMinutes} min, alerte aux défenseurs.` },
  { title: "Obsidienne", body: `Indestructible à la TNT et rare : la lave et l'eau n'en créent plus, éclats en minant la deepslate (${F.obsidian.deepslateChancePercent} %), ${F.obsidian.shardsPerObsidian} éclats = 1 obsidienne. Elle ne tombe que par surclaim.` },
  { title: "Bouclier", body: `${F.shield.hours} h de protection par jour contre le surclaim, à placer sur ta plage horaire. Modifiable tous les ${F.shield.changeCooldownHours / 24} jours.` },
  { title: "Relations", body: `${F.relations.maxAllies} alliés et ${F.relations.maxTruces} trêves au plus. Pas de PvP entre alliés. Tags de faction colorés dans le chat et au-dessus des têtes.` },
  { title: "Combat", href: "/guides/comment-pvp", body: `Tag de combat ${F.combatTagSeconds} s : se déconnecter = mourir. /f home (${F.teleport.warmupSeconds} s, pas d'ennemi à ${F.teleport.enemyRadius} blocs), /f fly coupé à ${F.flyEnemyRadius} blocs d'un ennemi.` },
];

export default function FactionsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Claim. Pille. Domine."
        title="Le serveur Faction"
        description="Un Faction français où le territoire se gagne au power et se perd à la TNT. Toutes les valeurs ci-dessous sont celles de la configuration du serveur."
        crumbs={[{ name: "Factions", path: "/factions" }]}
      >
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/guides/creer-une-faction">Créer ma faction</ButtonLink>
          <ButtonLink href="/guides/comment-commencer" variant="secondary">Guide du débutant</ButtonLink>
          <ButtonLink href="/commandes" variant="ghost">Commandes /f</ButtonLink>
        </div>
      </PageHeader>

      <Section>
        <Container>
          <SectionHeader eyebrow="Les règles" title="Comment fonctionne le Faction sur VÆLORIA" />
          <div className="mb-8 max-w-3xl space-y-3 text-muted">
            <p>
              Le principe ne change pas : tu fondes une faction, tu claim du territoire, tu t&apos;enrichis et tu attaques les autres. Ce qui fait la différence,
              ce sont les réglages. Ici, aucune base n&apos;est intouchable : la TNT fonctionne dans les claims même quand les défenseurs sont hors ligne, et une
              faction qui perd trop de power se fait surclaimer par les bords.
            </p>
            <p>
              En contrepartie, l&apos;obsidienne est rare et résiste à la TNT, et chaque faction choisit un bouclier quotidien de {F.shield.hours} h contre le
              surclaim. Le combat reste celui du <Link href="/pvp" className="text-accent">PvP 1.8</Link>, et l&apos;<Link href="/economie" className="text-accent">économie</Link> finance la guerre.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SYSTEMS.map((s) => (
              <Card key={s.title}>
                <h3 className="font-semibold">{s.href ? <Link href={s.href} className="hover:text-accent">{s.title}</Link> : s.title}</h3>
                <p className="mt-2 text-sm text-muted">{s.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Événements de faction" title="Totems, KOTH, avant-postes" description="Horaires prévus à l'ouverture, gains versés dans la banque de faction. Le programme est confirmé sur la page Événements." />
          <div className="grid gap-3 md:grid-cols-3">
            <Card>
              <h3 className="font-display font-bold uppercase tracking-[0.05em]">Totem</h3>
              <p className="mt-1 text-sm text-accent">{F.totem.schedule.join(" · ")}</p>
              <p className="mt-2 text-sm text-muted">Un pilier d&apos;obsidienne à abattre à l&apos;épée en diamant ({dec(F.totem.breakSeconds)} s de frappe par bloc). {F.totem.durationMinutes} min pour le faire tomber.</p>
              <p className="mt-3 font-semibold tabular-nums">{money(F.totem.reward)}</p>
            </Card>
            <Card>
              <h3 className="font-display font-bold uppercase tracking-[0.05em]">KOTH</h3>
              <p className="mt-1 text-sm text-accent">{F.koth.schedule.join(" · ")}</p>
              <p className="mt-2 text-sm text-muted">Tenir la zone {F.koth.holdMinutes} min sans être contesté. L&apos;événement dure {F.koth.durationMinutes} min.</p>
              <p className="mt-3 font-semibold tabular-nums">{money(F.koth.reward)}</p>
            </Card>
            <Card>
              <h3 className="font-display font-bold uppercase tracking-[0.05em]">Avant-postes</h3>
              <p className="mt-1 text-sm text-accent">Permanents</p>
              <p className="mt-2 text-sm text-muted">Capture en {F.outposts.captureMinutes} min, puis un revenu toutes les 10 min et +{F.outposts.powerBonus} power tant que vous le tenez.</p>
              <p className="mt-3 font-semibold tabular-nums">{money(F.outposts.incomePerHour)}/h</p>
            </Card>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line/60">
        <Container className="grid gap-10 lg:grid-cols-2 [&>*]:min-w-0">
          <div>
            <SectionHeader eyebrow="Guerres" title="Guerres déclarées" />
            <ul className="space-y-2 text-muted">
              <li>Déclarer une guerre coûte {money(F.costs.declareWar)} (banque de faction), {F.war.minMembers} membres minimum de chaque côté.</li>
              <li>{F.war.preparationMinutes} min de préparation, puis {F.war.durationHours} h de guerre.</li>
              <li>Points : kill +{F.war.points.kill}, raid +{F.war.points.raid}, surclaim +{F.war.points.overclaim}.</li>
              <li>{F.war.cooldownHours} h avant une nouvelle guerre entre les deux mêmes factions.</li>
              <li>Le détail des raids en guerre : <Link href="/guides/faire-un-raid" className="text-accent">guide complet des raids</Link>.</li>
            </ul>
          </div>
          <div>
            <SectionHeader eyebrow="Missions" title={`${F.missionsPerDay} missions par jour`} />
            <Table head={["Mission", "Récompense"]}>
              {F.missions.map(([label, reward]) => (
                <tr key={label}>
                  <td>{label}</td>
                  <td className="text-right font-semibold tabular-nums">{money(reward)}</td>
                </tr>
              ))}
            </Table>
          </div>
        </Container>
      </Section>

      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Améliorations" title="Faire grandir sa faction" description="Achetées avec la banque de faction, niveau par niveau." />
          <Table head={["Amélioration", "Par niveau", "Coût des niveaux"]}>
            {F.upgrades.map((u) => (
              <tr key={u.name}>
                <td className="font-semibold">{u.name}</td>
                <td className="text-muted">{u.effect}</td>
                <td className="tabular-nums">{u.costs.map((c) => money(c)).join(" → ")}</td>
              </tr>
            ))}
          </Table>
          <p className="mt-4 text-sm text-muted">Renommer la faction : {money(F.costs.rename)}. Ces dépenses retirent de l&apos;argent du jeu et freinent l&apos;inflation.</p>
        </Container>
      </Section>
    </>
  );
}
