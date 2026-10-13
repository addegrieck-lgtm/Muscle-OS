/**
 * Guides éditoriaux (contenu SEO stable, versionné avec le code).
 * Les valeurs de jeu viennent des configs des plugins (voir content/gameplay.ts) : quand une
 * config change, le guide suit automatiquement. Une requête principale par guide (voir docs/SEO.md),
 * pour que deux pages du site ne se concurrencent pas sur la même recherche.
 */
import { COMBAT, FACTIONS, MARKET, VOTE, VOTE_SITES, dailyPot } from "./gameplay";

export interface Guide {
  slug: string;
  /** Titre visible (H1). */
  title: string;
  /** Balise <title>, sans le suffixe « · VÆLORIA » ajouté par le gabarit. */
  seoTitle: string;
  description: string;
  level: "Débutant" | "Intermédiaire" | "Avancé";
  /** Dernière révision du contenu (ISO), reprise dans le sitemap et les données structurées. */
  updatedAt: string;
  /** Pages à lire ensuite, affichées en fin de guide (maillage interne). */
  related: { href: string; label: string }[];
  body: string;
}

const F = FACTIONS;
const fmt = (n: number) => new Intl.NumberFormat("fr-FR").format(n);
const money = (n: number) => `${fmt(n)} $`;
const dec = (n: number) => String(n).replace(".", ",");
/** Minutes de jeu pour regagner `points` de power. */
const regenMinutes = (points: number) => Math.round(points / F.power.regenPerMinute);

export const GUIDES: Guide[] = [
  {
    slug: "comment-commencer",
    title: "Guide du débutant Faction",
    seoTitle: "Guide du débutant Faction Minecraft",
    description: "Le guide du débutant pour un serveur Minecraft Faction : rejoindre, gagner tes premiers dollars, choisir une faction et éviter les erreurs qui coûtent du power.",
    level: "Débutant",
    updatedAt: "2026-10-13",
    related: [
      { href: "/guides/creer-une-faction", label: "Créer une faction" },
      { href: "/guides/power-faction", label: "Comprendre le power" },
      { href: "/guides/gagner-de-l-argent", label: "Gagner de l'argent" },
    ],
    body: `## Avant l'ouverture

VÆLORIA est en développement. En attendant l'ouverture, rejoins le [Discord](/discord) pour connaître la date et trouver une équipe, et [candidate à la bêta](/beta) si tu veux tester les mécaniques avant tout le monde. Il te faudra **Minecraft Java Edition 1.21**, sans mod ni launcher particulier.

## Le Faction en deux minutes

Une faction est une équipe de joueurs (${F.maxMembers} au maximum au départ) qui revendique du territoire, le **claim**, construit une base et s'enrichit. Le territoire tient grâce au **power** : chaque joueur en apporte, chaque mort en retire. Une faction trop affaiblie peut se faire prendre des chunks (le **surclaim**) et une base se pille à la **TNT**. Tout le reste découle de ces règles.

## Tes premières heures

1. Lis le [règlement](/rules) : il est appliqué.
2. **Vote** sur les ${VOTE_SITES.length} sites (\`/vote\`) : ${money(dailyPot())} et de la nourriture pour une journée complète. Voir [Voter](/guides/voter).
3. Achète une **Houe de moisson I** (2 500 $) au \`/shop\` : elle récolte, replante et ramasse toute seule.
4. Vends ta récolte avec \`/vendre tout\`. Un débutant gagne de 1 500 à 3 000 $/h à la main.
5. Garde de quoi fonder ou rejoindre une faction : la création coûte ${money(F.costs.create)}.

## Seul ou en faction ?

Commencer seul est possible, mais le Faction se joue en équipe : une faction de joueurs actifs régénère son power plus vite qu'elle ne le perd. Le salon recrutement du [Discord](/discord) est le moyen le plus rapide d'en trouver une.

## Les erreurs de débutant

- **Mourir pour rien.** Chaque mort retire ${F.power.lossOnDeath} power (×${dec(F.power.warzoneMultiplier)} en WarZone). Ce power manque ensuite à ta faction pour tenir ses claims.
- **Se déconnecter en combat.** Pendant ${F.combatTagSeconds} s après un coup, se déconnecter = mourir.
- **Claim trop large.** Une faction qui claim plus que son power ne peut tenir devient une cible de surclaim.
- **Tout stocker au bord du territoire.** Le surclaim grignote par les bords : le précieux va au centre.

## Et ensuite

Lis [comment créer une faction](/guides/creer-une-faction), [le fonctionnement du power](/guides/power-faction) et la liste des [commandes](/commandes).`,
  },
  {
    slug: "creer-une-faction",
    title: "Comment créer une faction",
    seoTitle: "Créer une faction : commandes, rôles, premiers pas",
    description: "Créer et organiser ta faction : la commande /f creer, les rôles, les invitations, la banque, les missions et le bouclier quotidien.",
    level: "Débutant",
    updatedAt: "2026-10-13",
    related: [
      { href: "/guides/comment-claim", label: "Claim un territoire" },
      { href: "/guides/power-faction", label: "Le power" },
      { href: "/factions", label: "Toutes les règles du Faction" },
    ],
    body: `## Créer la faction

- \`/f creer <nom>\` fonde ta faction pour **${money(F.costs.create)}**. Le nom fait ${F.nameLength[0]} à ${F.nameLength[1]} caractères (lettres, chiffres, - et _).
- Tape \`/f\` : tout est dans le menu (membres, banque, coffre, améliorations, missions).
- Renommer coûte ensuite ${money(F.costs.rename)} : choisis bien.

## Inviter des membres

- \`/f inviter <joueur>\` : l'invitation reste valable 10 minutes.
- ${F.maxMembers} membres maximum, +5 par amélioration « Membres ».
- Les rôles : **Chef**, **Officier**, **Membre**, **Recrue**. Donne les permissions sensibles (claim, banque, coffre) aux seuls officiers de confiance.

## Les relations

Tu peux avoir **${F.relations.maxAllies} alliés** et **${F.relations.maxTruces} trêves** au plus. Pas de PvP entre alliés. \`/f ennemi <faction>\` déclare l'inimitié : c'est elle qui ouvre le [surclaim](/guides/surclaim).

## Bien démarrer

1. \`/f claim\` sur ta zone, puis \`/f sethome\`. Voir [comment claim](/guides/comment-claim).
2. Dépose de l'argent en banque : elle paie les améliorations, les guerres (${money(F.costs.declareWar)}) et reçoit les gains des KOTH, totems et avant-postes.
3. Fais les **${F.missionsPerDay} missions du jour** : de 5 000 à 20 000 $ chacune.
4. Choisis tes **${F.shield.hours} h de bouclier** quotidien sur la plage où personne n'est connecté. Tu ne pourras la changer que tous les ${F.shield.changeCooldownHours / 24} jours.`,
  },
  {
    slug: "comment-claim",
    title: "Comment claim un territoire",
    seoTitle: "Claim en Faction : protéger son territoire",
    description: "Claim un territoire en Faction : commandes /f claim, limite de chunks, règle de contiguïté et placement de ta base pour résister au surclaim.",
    level: "Débutant",
    updatedAt: "2026-10-13",
    related: [
      { href: "/guides/power-faction", label: "Le power" },
      { href: "/guides/surclaim", label: "Le surclaim" },
      { href: "/guides/faire-un-raid", label: "Les raids" },
    ],
    body: `## Le principe

Un claim protège un chunk (16×16 blocs, sur toute la hauteur) pour ta faction. Tu peux tenir **${F.claims.perPower} chunk par point de power**, avec un plafond de **${F.claims.max} chunks** (+10 par amélioration « Claims »).

## Les commandes

- \`/f claim\` : claim le chunk où tu te trouves.
- \`/f claim <rayon>\` : claim un carré autour de toi, jusqu'à un rayon de ${F.claims.maxRadius}.
- Les nouveaux claims doivent **toucher** ton territoire : pas de claims isolés.
- \`/f map\` : les claims autour de toi.

## Combien de chunks claim ?

Le bon nombre n'est pas le maximum. Un claim ne protège que tant que ton power le couvre : si ta faction perd du power (des morts, un membre qui part), elle peut passer sous son nombre de claims et devenir [surclaimable](/guides/surclaim).

Règle simple : garde une marge d'au moins **${F.power.lossOnDeath} power par membre actif**, soit une mort chacun sans tomber sous ta limite.

## Placer sa base

- **Au centre** du territoire, jamais en bordure : le surclaim prend les chunks par les bords.
- Les coffres et [générateurs](/guides/obtenir-des-spawners) derrière plusieurs couches, dont de l'obsidienne si tu en as : elle résiste à la TNT.
- Un \`/f sethome\` à l'abri, loin des accès : la téléportation demande ${F.teleport.warmupSeconds} s sans ennemi à moins de ${F.teleport.enemyRadius} blocs.

## Ce que le claim ne protège pas

La TNT fonctionne dans les claims, même quand tu es hors ligne. Le claim empêche de casser et de poser des blocs à la main, pas de faire exploser ta base. Voir [les raids](/guides/faire-un-raid).`,
  },
  {
    slug: "power-faction",
    title: "Le power en Faction",
    seoTitle: "Power Faction : gagner, perdre, régénérer",
    description: `Comment fonctionne le power sur un serveur Faction : ${F.power.start} au départ, −${F.power.lossOnDeath} par mort, +${dec(F.power.regenPerMinute)} par minute de jeu, et le lien avec les claims et le surclaim.`,
    level: "Débutant",
    updatedAt: "2026-10-13",
    related: [
      { href: "/guides/comment-claim", label: "Claim un territoire" },
      { href: "/guides/surclaim", label: "Le surclaim" },
      { href: "/factions", label: "Toutes les règles du Faction" },
    ],
    body: `## À quoi sert le power

Le power mesure la capacité d'une faction à tenir son territoire : **${F.claims.perPower} point de power = ${F.claims.perPower} chunk claimable**. Le power de la faction cumule celui de ses membres, plus les bonus (améliorations, avant-postes). Tant que ce total couvre le nombre de claims, le territoire ne peut pas être surclaimé.

## Les valeurs

| Règle | Valeur |
| --- | --- |
| Power d'un nouveau joueur | ${F.power.start} |
| Maximum par joueur | ${F.power.max} |
| Minimum par joueur | ${F.power.min} |
| Perte par mort | −${F.power.lossOnDeath} |
| Perte par mort en WarZone | −${dec(F.power.lossOnDeath * F.power.warzoneMultiplier)} (×${dec(F.power.warzoneMultiplier)}) |
| Régénération | +${dec(F.power.regenPerMinute)} par minute de jeu |
| Régénération hors ligne | aucune |

## Ce que ça donne en jeu

- Après une mort, il faut **${regenMinutes(F.power.lossOnDeath)} minutes de jeu** pour regagner les ${F.power.lossOnDeath} power perdus.
- Un joueur au minimum (${F.power.min}) remonte au maximum (${F.power.max}) en **${regenMinutes(F.power.max - F.power.min)} minutes** de jeu.
- Un joueur peut descendre sous zéro : il **retire** alors du power à sa faction. Une série de morts d'un seul membre peut suffire à rendre la faction surclaimable.
- Pas de perte entre deux comptes de la même IP : tuer son double compte ne fait rien gagner.

## Les bonus de faction

- Amélioration « Power » : +5 power par niveau, de ${money(F.upgrades[1]!.costs[0]!)} à ${money(F.upgrades[1]!.costs[F.upgrades[1]!.costs.length - 1]!)}.
- Avant-poste tenu : +${F.outposts.powerBonus} power tant que ta faction le contrôle. Voir [les événements](/evenements).

## Protéger son power

- Évite la WarZone si tu n'as rien à y gagner : chaque mort y coûte ${dec(F.power.lossOnDeath * F.power.warzoneMultiplier)} power.
- Ne te déconnecte jamais en combat : pendant ${F.combatTagSeconds} s après un coup, la déconnexion compte comme une mort.
- Joue régulièrement : le power ne remonte que connecté.
- Garde une marge entre ton power et ton nombre de claims. Voir [le surclaim](/guides/surclaim).`,
  },
  {
    slug: "surclaim",
    title: "Le surclaim en Faction",
    seoTitle: "Surclaim Faction : attaquer et se défendre",
    description: "Le surclaim expliqué : quand une faction devient surclaimable, comment prendre ses chunks par les bords, le rôle de l'inimitié et du bouclier de 6 h.",
    level: "Intermédiaire",
    updatedAt: "2026-10-13",
    related: [
      { href: "/guides/power-faction", label: "Le power" },
      { href: "/guides/faire-un-raid", label: "Les raids" },
      { href: "/factions", label: "Toutes les règles du Faction" },
    ],
    body: `## La règle

Une faction devient **surclaimable** quand son power passe **sous son nombre de claims**. Une faction ennemie peut alors lui prendre des chunks et les claim à son nom.

## Les conditions pour surclaim

1. **Déclarer l'inimitié** : \`/f ennemi <faction>\`. Sans relation d'ennemi, pas de surclaim.
2. La cible doit être **sous son power** : vérifie avec \`/f who <faction>\`.
3. Le chunk visé doit être **en bordure** de son territoire : le surclaim grignote par les bords, jamais au milieu.
4. Le **bouclier** de la cible ne doit pas être actif.
5. Ta faction doit avoir le power pour tenir ce nouveau chunk, et il doit toucher ton territoire.

## Pourquoi le surclaim compte

- C'est **la seule façon de faire tomber l'obsidienne**, indestructible à la TNT. Un chunk surclaimé appartient à ta faction : tu peux y casser les blocs.
- En guerre déclarée, chaque surclaim rapporte **+${F.war.points.overclaim} points**, contre +${F.war.points.raid} pour un raid et +${F.war.points.kill} pour un kill.

## Se défendre

- **Le bouclier** : ${F.shield.hours} h par jour où ta faction ne peut pas être surclaimée. Place-le sur la plage où personne n'est connecté (la nuit, en général). Il ne se change que tous les ${F.shield.changeCooldownHours / 24} jours : choisis-le avec ton équipe.
- **La marge de power** : claim moins que ton power total. Chaque membre actif devrait pouvoir mourir une fois sans faire passer la faction sous la limite.
- **Les bords vides** : laisse des chunks sans valeur en bordure. Un ennemi qui surclaim un champ de blé n'a rien gagné.
- **L'unclaim** : en dehors d'un raid, rendre des chunks inutiles ramène ta faction au-dessus de sa limite. Pendant un raid, l'unclaim est bloqué ${F.raid.lockMinutes} minutes.

## Lire une cible

\`/f who <faction>\` affiche son power et son nombre de claims. Une faction proche de sa limite le sera encore plus après un combat : c'est le bon moment pour attaquer.`,
  },
  {
    slug: "faire-un-raid",
    title: "Guide complet des raids",
    seoTitle: "Raid Faction : TNT, obsidienne, brèche et défense",
    description: "Le guide complet des raids Faction : TNT dans les claims, obsidienne indestructible, alerte des défenseurs, brèche de 15 minutes, raids en guerre et défense de base.",
    level: "Avancé",
    updatedAt: "2026-10-13",
    related: [
      { href: "/guides/surclaim", label: "Le surclaim" },
      { href: "/guides/comment-pvp", label: "PvP 1.8.9" },
      { href: "/factions", label: "Toutes les règles du Faction" },
    ],
    body: `## Ce que permet un raid

Un raid consiste à percer une base ennemie pour en prendre le contenu. Sur VÆLORIA, **la TNT fonctionne dans les claims, même quand les défenseurs sont hors ligne** : aucun territoire n'est intouchable, seulement mieux ou moins bien défendu.

## L'obsidienne

- Elle est **indestructible à la TNT**.
- Elle est **rare** : la lave et l'eau n'en créent plus. On obtient des éclats en minant la deepslate (${F.obsidian.deepslateChancePercent} % de chance), ${F.obsidian.shardsPerObsidian} éclats font une obsidienne. Le marché en vend au rang Négociant, ${MARKET.obsidian.dailyLimit} par jour au plus.
- Elle ne tombe que si le chunk est **surclaimé**. Voir [le surclaim](/guides/surclaim).

Pour un attaquant, un mur d'obsidienne se **contourne** : par-dessous, par le côté, ou en surclaimant le chunk.

## Préparer le raid

- Repère la cible avec \`/f who <faction>\` : membres, power, claims.
- Prévois la TNT : la poudre vient des creepers, et le [générateur de creeper](/guides/obtenir-des-spawners) se débloque au rang Négociant.
- Garde une sortie à pied : ton **tag de combat** (${F.combatTagSeconds} s) bloque /home, /spawn, /tpa, /f home et /f fly.

## Pendant le raid

1. Dès la première explosion, les défenseurs reçoivent une **alerte**.
2. La faction attaquée **ne peut plus unclaim ni se dissoudre pendant ${F.raid.lockMinutes} minutes** : impossible de fuir en rendant ses chunks.
3. Une **brèche de ${F.raid.breachMinutes} minutes** s'ouvre : coffres, portes et générateurs deviennent accessibles aux attaquants.

## En guerre déclarée

Une guerre coûte ${money(F.costs.declareWar)} à la banque de faction et dure ${F.war.durationHours} h après ${F.war.preparationMinutes} minutes de préparation (${F.war.minMembers} membres minimum de chaque côté). Le score : kill +${F.war.points.kill}, raid +${F.war.points.raid}, surclaim +${F.war.points.overclaim}. Les deux mêmes factions doivent ensuite attendre ${F.war.cooldownHours} h.

## Défendre sa base

- Le précieux au **centre** du territoire, derrière plusieurs couches dont de l'obsidienne.
- Des chunks sans valeur en bordure, pour encaisser le surclaim.
- Un **bouclier** (${F.shield.hours} h par jour) sur tes heures creuses : il bloque le surclaim, pas la TNT.
- Des membres connectés aux heures de pointe : une alerte de raid sans personne pour répondre ne sert à rien.

## Les règles

Les exploits de bugs, le dupe et les mods non autorisés sont sanctionnés. Voir le [règlement](/rules).`,
  },
  {
    slug: "comment-pvp",
    title: "Progresser en PvP 1.8.9",
    seoTitle: "PvP 1.8.9 : combos, W-tap, strafe et potions",
    description: "Progresser en PvP façon 1.8.9 : rythme de clic sans cooldown, W-tap, strafe, combos, gestion des potions et du tag de combat sur un serveur Faction.",
    level: "Intermédiaire",
    updatedAt: "2026-10-13",
    related: [
      { href: "/pvp", label: "Le PvP de VÆLORIA" },
      { href: "/guides/participer-koth", label: "Gagner un KOTH" },
      { href: "/guides/faire-un-raid", label: "Les raids" },
    ],
    body: `## Les règles du combat

Le serveur tourne en Minecraft 1.21 mais le combat suit les règles de la 1.8.9 :

| Mécanique | Réglage |
| --- | --- |
| Recharge d'attaque (1.9+) | ${COMBAT.noAttackCooldown ? "supprimée : chaque clic frappe à pleine puissance" : "active"} |
| Coup balayé à l'épée | ${COMBAT.noSweep ? "désactivé" : "actif"} |
| Invulnérabilité après un coup | ${COMBAT.hitDelayTicks} ticks, comme en 1.8 |
| Knockback | valeurs 1.8.9 (horizontal ${dec(COMBAT.knockback.horizontal)}, vertical ${dec(COMBAT.knockback.vertical)}), hauteur plafonnée |
| Résistance au recul (netherite) | ${COMBAT.knockback.ignoreResistance ? "ignorée : même recul pour tous" : "active"} |

Conséquence : l'enchaînement des coups et le placement comptent plus que le timing de l'attaque.

## Garder l'avantage : les combos

- **Reste au contact** : avance après chaque coup pour frapper de nouveau dès la fin de l'invulnérabilité.
- **W-tap** : relâche brièvement la marche avant juste après le coup pour relancer ton sprint. Le coup suivant porte un knockback de sprint et l'adversaire ne peut pas revenir.
- **Strafe** : déplace-toi en arc (gauche/droite) pour sortir de sa ligne de visée tout en gardant la tienne.
- Un adversaire qui recule en sautant prend plus de recul : garde ton rythme au lieu de le poursuivre en ligne droite.

## Les potions

Prépare ta hotbar avant le combat. Lancer une potion de soin en reculant, au bon moment, gagne plus de combats que viser parfaitement. Ne lance jamais ta dernière potion au contact.

## Le tag de combat

Pendant **${F.combatTagSeconds} s** après un coup, /home, /spawn, /tpa, /f home et /f fly sont bloqués, et **se déconnecter = mourir** (−${F.power.lossOnDeath} power). Un combat engagé se termine à pied.

## S'entraîner

- \`/ping\` affiche ton ping et sa stabilité : au-delà de 150 ms ou d'une forte gigue, les combos deviennent aléatoires.
- \`/pvpstatus\` affiche la santé du serveur (TPS, MSPT, ping moyen).

Le détail des réglages du serveur est sur la page [PvP](/pvp).`,
  },
  {
    slug: "gagner-de-l-argent",
    title: "Comment gagner de l'argent",
    seoTitle: "Gagner de l'argent en Faction : farm et générateurs",
    description: "Les sources de revenus fiables sur un serveur Faction en début, milieu et fin de saison : votes, farm, rangs de marchand, générateurs et avant-postes.",
    level: "Intermédiaire",
    updatedAt: "2026-10-13",
    related: [
      { href: "/economie", label: "Tous les prix de l'économie" },
      { href: "/guides/obtenir-des-spawners", label: "Les générateurs" },
      { href: "/guides/voter", label: "Voter" },
    ],
    body: `## Début de saison

- **Vote chaque jour** sur les ${VOTE_SITES.length} sites : ${money(dailyPot())} par journée complète, jusqu'à ${money(dailyPot() * 4)} avec la roue. Voir [Voter](/guides/voter).
- **Houe de moisson I** (2 500 $) + champs : ${MARKET.incomeBenchmarks[0]![1]}.
- \`/prix\` donne la valeur de l'objet en main ; \`/vendre tout\` vide ton inventaire.

## Milieu de saison

- Monte en **rang de marchand** : +2 % à +10 % sur toutes tes ventes, et de nouveaux articles (houe II et III, générateurs, pioche des abysses).
- Champs + houe II/III et fermes automatiques : ${MARKET.incomeBenchmarks[1]![1]}.
- Les **générateurs** donnent un revenu passif : de 220 $/h (zombie) à 9 600 $/h (golem de fer).
- Tenir un **avant-poste** rapporte ${money(F.outposts.incomePerHour)}/h à ta faction.

## Le marché dynamique

Vendre en masse le même produit fait baisser son prix (jusqu'à −${MARKET.maxDropPercent} %), qui remonte de moitié toutes les ${MARKET.halfLifeHours} h. **Varie tes farms** et surveille les **${MARKET.featuredCount} cours du jour** (+${MARKET.featuredBonus} %).

## Commerce entre joueurs

L'hôtel des ventes (\`/hdv\`) et les boutiques de joueurs (\`/pshop\`) : les objets rares (élytres, totems, netherite) ne se vendent qu'en boutique de joueur.

Tous les prix : page [Économie](/economie).`,
  },
  {
    slug: "obtenir-des-spawners",
    title: "Comment obtenir des spawners",
    seoTitle: "Spawners Faction : obtenir, déplacer, rentabiliser",
    description: "Où obtenir des spawners (générateurs) sur un serveur Faction, comment les déplacer, les protéger d'un raid et calculer leur rentabilité.",
    level: "Intermédiaire",
    updatedAt: "2026-10-13",
    related: [
      { href: "/economie", label: "Prix des générateurs" },
      { href: "/guides/faire-un-raid", label: "Défendre sa base" },
      { href: "/guides/gagner-de-l-argent", label: "Gagner de l'argent" },
    ],
    body: `## Les obtenir

- Au marché (\`/shop\` → Générateurs), à partir du rang **Marchand** : zombie 15 000 $, squelette 50 000 $, enderman 140 000 $, golem de fer 1 000 000 $ (rang Baron du négoce).
- Les spawners naturels (donjons) **ne tombent pas** : ils gardent leur valeur.

## Les déplacer

Il faut une pioche **Toucher de soie** (livre à 6 000 $ au rang Marchand) pour récupérer un générateur.

## Les protéger

- Ils résistent aux explosions, mais un raid vise d'abord ce qui est autour : coffres et accès. Pendant la brèche d'un raid (${F.raid.breachMinutes} minutes), ils deviennent accessibles aux attaquants.
- Place-les au cœur de ta base, jamais en bordure de claim : le [surclaim](/guides/surclaim) grignote par les bords.

## Les rentabiliser

Un générateur se rentabilise en 60 à 100 h de chunk chargé. Le **blaze** ne lâche ses bâtons que tué par un joueur ; le **creeper** fournit la poudre de tes TNT.`,
  },
  {
    slug: "participer-koth",
    title: "Comment participer à un KOTH",
    seoTitle: "KOTH Minecraft Faction : règles et stratégie",
    description: "Capturer un KOTH sur un serveur Faction : règles de capture, horaires prévus, récompenses en banque de faction et stratégie d'équipe.",
    level: "Avancé",
    updatedAt: "2026-10-13",
    related: [
      { href: "/evenements", label: "Le programme des événements" },
      { href: "/guides/comment-pvp", label: "PvP 1.8.9" },
      { href: "/guides/power-faction", label: "Le power" },
    ],
    body: `## Le principe

Un **KOTH** (King of the Hill) est une zone à tenir **${F.koth.holdMinutes} minutes** sans être contesté. L'événement dure ${F.koth.durationMinutes} minutes et demande au moins 10 joueurs connectés.

## Les horaires prévus

Ces créneaux sont ceux de la configuration actuelle ; ils s'appliqueront à l'ouverture et seront confirmés sur le [calendrier des événements](/evenements).

- **KOTH** : ${F.koth.schedule.join(", ")} — **${money(F.koth.reward)}** en banque de faction.
- **Totem** : ${F.totem.schedule.join(" et ")} — un pilier d'obsidienne à abattre à l'épée en diamant (${dec(F.totem.breakSeconds)} s par bloc) : **${money(F.totem.reward)}**.

## Stratégie

- Un joueur capture, les autres protègent les accès.
- Ne vous ruez pas tous dans la zone : vous seriez tous exposés.
- Prévoyez potions de soin, pommes dorées et de quoi tenir plusieurs combats.
- Chaque mort coûte du [power](/guides/power-faction) : une faction qui gagne le KOTH mais devient surclaimable a mal calculé.`,
  },
  {
    slug: "voter",
    title: "Voter et la roue du jour",
    seoTitle: "Roue du jour et cagnotte de vote : le guide",
    description: `${VOTE_SITES.length} sites, une cagnotte quotidienne et une roue jusqu'à ×4 : comment fonctionneront les votes et leurs récompenses en jeu.`,
    level: "Débutant",
    updatedAt: "2026-10-13",
    related: [
      { href: "/voter", label: "La page Voter" },
      { href: "/guides/gagner-de-l-argent", label: "Gagner de l'argent" },
      { href: "/guides/comment-commencer", label: "Guide du débutant" },
    ],
    body: `## Voter

Les votes ouvriront avec le serveur. Tu passeras par la page [Voter](/voter) ou par \`/vote\` en jeu : les ${VOTE_SITES.length} liens s'affichent. Utilise ton pseudo Minecraft exact. Si le vote n'arrive pas, \`/vote verifier\`.

## La cagnotte

- Chaque site voté : **${money(VOTE.perVote.money)}**, 8 steaks cuits et 4 fioles d'expérience.
- Au ${VOTE_SITES.length}e site : bonus de **${money(VOTE.allSitesBonus.money)}**, une pomme dorée et 8 carottes dorées.
- Journée complète : **${money(dailyPot())}** avant la roue.

## La roue du jour

Débloquée au ${VOTE.wheel.requiredSites}e vote, \`/roue\` :
- **Classique** : ×1 (50 %), ×2 (35 %), ×3 (15 %). Jamais de perte.
- **Quitte ou double** : ×4 (40 %) ou rien (60 %).

Pas lancée avant minuit ? La cagnotte est versée ×1 : rien n'est perdu.`,
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
