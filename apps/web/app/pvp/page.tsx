import Link from "next/link";
import { BRAND } from "@vaeloria/config";
import { ButtonLink, Card, Container, Section, SectionHeader, Table } from "@vaeloria/ui";
import { PageHeader } from "@/components/PageHeader";
import { COMBAT, FACTIONS } from "@/content/gameplay";
import { pageMeta } from "@/lib/seo";

export const metadata = pageMeta({
  title: "Serveur PvP 1.8 Minecraft : combat 1.8.9 en 1.21",
  description: "Serveur Minecraft PvP Faction en 1.21 avec le combat de la 1.8.9 : pas de cooldown, pas de coup balayé, knockback 1.8.9, 20 ticks d'invulnérabilité. Détail des réglages.",
  path: "/pvp",
});

const dec = (n: number) => String(n).replace(".", ",");

/** Comparatif : ce que la 1.9+ a changé, et ce que le serveur rétablit. */
const COMPARE: [string, string, string][] = [
  ["Recharge d'attaque", "Oui : un coup chargé fait mal, un clic rapide presque rien", COMBAT.noAttackCooldown ? "Supprimée, comme en 1.8" : "Active"],
  ["Coup balayé à l'épée", "Oui : dégâts de zone", COMBAT.noSweep ? "Désactivé, comme en 1.8" : "Actif"],
  ["Invulnérabilité après un coup", "20 ticks aussi, mais la recharge ralentit les échanges", `${COMBAT.hitDelayTicks} ticks, comme en 1.8`],
  ["Knockback", "Recul des versions récentes", `Valeurs 1.8.9 (${dec(COMBAT.knockback.horizontal)} / ${dec(COMBAT.knockback.vertical)}), hauteur plafonnée`],
  ["Résistance au recul (netherite)", "Réduit le recul", COMBAT.knockback.ignoreResistance ? "Ignorée : même recul pour tous" : "Active"],
];

const FEATURES = [
  { title: "Pas de recharge", body: "Le délai d'attaque de la 1.9 est supprimé : chaque clic frappe à pleine puissance. Pas de coup balayé à l'épée." },
  { title: "Rythme 1.8", body: "Invulnérabilité de 20 ticks après un coup, comme en 1.8.9 : l'enchaînement et le placement font la différence." },
  { title: "Knockback 1.8.9", body: "Valeurs de recul vanilla 1.8.9, hauteur plafonnée contre les combos aériens. La netherite ne réduit pas le recul : même recul pour tous." },
  { title: "Tag de combat", body: "15 s « en combat » après un coup : /home, /spawn, /tpa, /f home et /f fly bloqués. Se déconnecter en combat = mourir." },
  { title: "Serveur surveillé", body: "Le MSPT est mesuré en continu : en cas de surcharge, la distance de simulation baisse automatiquement pour garder des coups nets." },
  { title: "Ton ping", body: "/ping affiche ton ping et sa stabilité, /pvpstatus la santé du serveur (TPS, MSPT, ping moyen)." },
];

export default function PvpPage() {
  return (
    <>
      <PageHeader
        eyebrow="Le combat 1.8, en 1.21"
        title="PvP 1.8 sur Minecraft 1.21"
        description={`${BRAND.name} tourne en Minecraft ${BRAND.minecraftVersion} pour profiter du contenu moderne, avec un combat réglé pour retrouver les sensations du PvP 1.8.9 sur un serveur Faction.`}
        crumbs={[{ name: "PvP", path: "/pvp" }]}
      />
      <Section>
        <Container>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card key={f.title}>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted">{f.body}</p>
              </Card>
            ))}
          </div>
        </Container>
      </Section>
      <Section className="border-t border-line/60">
        <Container>
          <SectionHeader eyebrow="Comparatif" title="Combat 1.9+ ou combat 1.8.9 ?" description="Ce que la 1.9 a changé, et ce que le serveur rétablit." />
          <Table head={["Mécanique", "Minecraft 1.9 et plus", BRAND.name]}>
            {COMPARE.map(([m, modern, here]) => (
              <tr key={m}>
                <td className="font-semibold">{m}</td>
                <td className="text-muted">{modern}</td>
                <td>{here}</td>
              </tr>
            ))}
          </Table>
        </Container>
      </Section>
      <Section className="border-t border-line/60">
        <Container className="grid gap-8 md:grid-cols-2">
          <div>
            <SectionHeader title="Pourquoi pas le combat 1.9+ ?" />
            <div className="space-y-3 text-muted">
              <p>Le délai de recharge introduit en 1.9 ralentit les combats et réduit l&apos;écart entre joueurs. En Faction compétitif, la communauté préfère un combat rapide où la technique paie.</p>
              <p>Rester en {BRAND.minecraftVersion} garde les blocs, items et améliorations récentes, et la compatibilité avec les clients actuels.</p>
            </div>
            <h2 className="mt-8 font-display text-2xl font-bold uppercase tracking-[0.04em]">Faut-il un client 1.8.9 ?</h2>
            <div className="mt-3 space-y-3 text-muted">
              <p>Non : on se connecte avec Minecraft Java Edition {BRAND.minecraftVersion}, sans mod. C&apos;est le combat du serveur qui reproduit la 1.8.9, pas la version du jeu.</p>
              <p>Le tag de combat dure {FACTIONS.combatTagSeconds} s : se déconnecter pendant un combat compte comme une mort. Le PvP s&apos;inscrit dans le <Link href="/factions" className="text-accent">Faction</Link> : chaque mort coûte du power à ta faction.</p>
            </div>
          </div>
          <Card className="self-start">
            <h2 className="font-semibold">Progresser en PvP 1.8.9</h2>
            <p className="mt-2 text-sm text-muted">Les bases du W-tap, du strafe, des combos et de la gestion des potions sont expliquées dans le guide PvP.</p>
            <ButtonLink href="/guides/comment-pvp" variant="secondary" className="mt-4">Lire le guide PvP 1.8.9</ButtonLink>
          </Card>
        </Container>
      </Section>
    </>
  );
}
