/**
 * Guides éditoriaux (contenu SEO stable, versionné avec le code).
 * Les valeurs de jeu viennent des configs des plugins (voir content/gameplay.ts).
 */
export interface Guide {
  slug: string;
  title: string;
  description: string;
  level: "Débutant" | "Intermédiaire" | "Avancé";
  body: string;
}

export const GUIDES: Guide[] = [
  {
    slug: "voter",
    title: "Voter et la roue du jour",
    description: "3 sites, une cagnotte quotidienne et une roue jusqu'à ×4 : comment tirer le maximum des votes.",
    level: "Débutant",
    body: `## Voter

Ouvre la page [Voter](/voter) ou tape \`/vote\` en jeu : les 3 liens s'affichent. Utilise ton pseudo Minecraft exact. Si le vote n'arrive pas, \`/vote verifier\`.

## La cagnotte

- Chaque site voté : **300 $**, 8 steaks cuits et 4 fioles d'expérience.
- Au 3e site : bonus de **500 $**, une pomme dorée et 8 carottes dorées.
- Journée complète : **1 400 $** avant la roue.

## La roue du jour

Débloquée au 3e vote, \`/roue\` :
- **Classique** : ×1 (50 %), ×2 (35 %), ×3 (15 %). Jamais de perte.
- **Quitte ou double** : ×4 (40 %) ou rien (60 %).

Pas lancée avant minuit ? La cagnotte est versée ×1 : rien n'est perdu.`,
  },
  {
    slug: "comment-commencer",
    title: "Comment commencer sur VÆLORIA",
    description: "Tes 30 premières minutes : rejoindre le serveur, choisir une faction et sécuriser tes premières ressources.",
    level: "Débutant",
    body: `## Rejoindre le serveur

1. Lance Minecraft **Java Edition 1.21**.
2. Multijoueur → Ajouter un serveur → adresse \`play.vaeloria.fr\`.
3. Rejoins et lis les panneaux du spawn.

## Tes premières minutes

- Lis le [règlement](/rules) : il est appliqué.
- **Vote** sur les 3 sites (\`/vote\`) : environ 1 400 $ et de la nourriture dès le premier jour. Voir [Voter](/voter).
- Achète une **Houe de moisson I** (2 500 $) au \`/shop\` : elle récolte, replante et ramasse toute seule.
- Vends ta récolte avec \`/vendre tout\`. Un débutant gagne 1 500 à 3 000 $/h.

## Seul ou en faction ?

Commencer seul est possible, mais le Faction se joue en équipe. Le salon recrutement du [Discord](/discord) est le moyen le plus rapide de trouver une faction qui te correspond. Fonder la tienne coûte 10 000 $.

## Et ensuite

Lis [comment créer une faction](/guides/creer-une-faction), [comment gagner de l'argent](/guides/gagner-de-l-argent) et la liste des [commandes](/commandes).`,
  },
  {
    slug: "creer-une-faction",
    title: "Comment créer une faction",
    description: "Créer, nommer et organiser ta faction : rôles, invitations et premières règles internes.",
    level: "Débutant",
    body: `## Créer la faction

- \`/f creer <nom>\` fonde ta faction pour **10 000 $**. Le nom fait 3 à 16 caractères (lettres, chiffres, - et _).
- Tape \`/f\` : tout est dans le menu (membres, banque, coffre, améliorations, missions).

## Inviter des membres

- \`/f inviter <joueur>\` : l'invitation reste valable 10 minutes.
- 20 membres maximum (+5 par amélioration, jusqu'à 30).
- Les rôles : **Chef**, **Officier**, **Membre**, **Recrue**. Donne les permissions sensibles (claim, banque, coffre) aux seuls officiers de confiance.

## Bien démarrer

1. \`/f claim\` sur ta zone, puis \`/f sethome\`.
2. Dépose de l'argent en banque : elle paie les améliorations, les guerres (50 000 $) et reçoit les gains de KOTH, totems et avant-postes.
3. Fais les **3 missions du jour** : de 5 000 à 20 000 $ chacune.
4. Choisis tes **6 h de bouclier** quotidien sur la plage où personne n'est connecté.`,
  },
  {
    slug: "comment-claim",
    title: "Comment claim un territoire",
    description: "Le fonctionnement des claims et du Power, et comment protéger ta base sans te mettre en danger.",
    level: "Débutant",
    body: `## Le principe

Un claim protège un chunk (16×16 blocs) pour ta faction. Tu peux tenir **1 chunk par point de power**, avec un plafond de **120 chunks** (+10 par amélioration).

## Commandes

- \`/f claim\` : claim le chunk où tu te trouves ; \`/f claim <rayon>\` jusqu'à un rayon de 5.
- Les nouveaux claims doivent **toucher** ton territoire.
- \`/f map\` : les claims autour de toi.

## Le power

- Chaque joueur démarre à **5 power**, maximum **10**, minimum **−10**.
- **−4 power par mort** (×1,5 en WarZone). Pas de perte entre comptes de la même IP.
- **+0,2 power par minute** de jeu (10 power en 50 minutes), pas de régénération hors ligne.

## Le surclaim

Si le power de ta faction passe **sous son nombre de claims**, une faction en inimitié (\`/f ennemi\`) peut te prendre des chunks **par les bords** de ton territoire. Ton **bouclier** (6 h par jour) bloque le surclaim : place-le quand ta faction dort.

Ne claim pas plus que ce que ton power peut tenir après quelques morts.`,
  },
  {
    slug: "gagner-de-l-argent",
    title: "Comment gagner de l'argent",
    description: "Les sources de revenus fiables en début, milieu et fin de saison.",
    level: "Intermédiaire",
    body: `## Début de saison

- **Vote chaque jour** sur les 3 sites : 1 400 $ par journée complète, jusqu'à 5 600 $ avec la roue. Voir [Voter](/voter).
- **Houe de moisson I** (2 500 $) + champs : 1 500 à 3 000 $/h.
- \`/prix\` donne la valeur de l'objet en main ; \`/vendre tout\` vide ton inventaire.

## Milieu de saison

- Monte en **rang de marchand** : +2 % à +10 % sur toutes tes ventes, et de nouveaux articles (houe II et III, générateurs, pioche des abysses).
- Champs + houe II/III et fermes automatiques : 6 000 à 12 000 $/h.
- Les **générateurs** donnent un revenu passif : de 220 $/h (zombie) à 9 600 $/h (golem de fer).
- Tenir un **avant-poste** rapporte 9 000 $/h à ta faction.

## Le marché dynamique

Vendre en masse le même produit fait baisser son prix (jusqu'à −50 %), qui remonte de moitié toutes les 8 h. **Varie tes farms** et surveille les **3 cours du jour** (+25 %).

## Commerce entre joueurs

L'[hôtel des ventes](/economie) (\`/hdv\`) et les [boutiques de joueurs](/economie) (\`/pshop\`) : les objets rares (élytres, totems, netherite) ne se vendent qu'en boutique de joueur.

Tous les prix : page [Économie](/economie).`,
  },
  {
    slug: "obtenir-des-spawners",
    title: "Comment obtenir des spawners",
    description: "Où trouver des spawners, comment les protéger et les rentabiliser.",
    level: "Intermédiaire",
    body: `## Les obtenir

- Au marché (\`/shop\` → Générateurs), à partir du rang **Marchand** : zombie 15 000 $, squelette 50 000 $, enderman 140 000 $, golem de fer 1 000 000 $ (rang Baron du négoce).
- Les spawners naturels (donjons) **ne tombent pas** : ils gardent leur valeur.

## Les déplacer

Il faut une pioche **Toucher de soie** (livre à 6 000 $ au rang Marchand) pour récupérer un générateur.

## Les protéger

- Ils résistent aux explosions, mais un raid vise d'abord ce qui est autour : coffres et accès.
- Place-les au cœur de ta base, jamais en bordure de claim : le surclaim grignote par les bords.

## Les rentabiliser

Un générateur se rentabilise en 60 à 100 h de chunk chargé. Le **blaze** ne lâche ses bâtons que tué par un joueur ; le **creeper** fournit la poudre de tes TNT.`,
  },
  {
    slug: "comment-pvp",
    title: "Comment progresser en PvP",
    description: "Les bases du combat inspiré du 1.8 : rythme de clic, combos, knockback et potions.",
    level: "Intermédiaire",
    body: `## Le rythme

Pas de recharge d'attaque, pas de coup balayé, invulnérabilité de 20 ticks et knockback 1.8.9 : l'enchaînement des coups compte plus que l'attente du chargement.

## Les combos

- Garde le contact : avance après chaque coup pour enchaîner.
- **W-tap** : relâche brièvement la marche avant pour réinitialiser ton sprint et donner plus de knockback.
- Strafe (gauche/droite) pour rendre tes déplacements difficiles à suivre.

## Les potions

Prépare ta hotbar à l'avance. Lancer une potion de soin en reculant, au bon moment, gagne plus de combats que viser parfaitement.

## S'entraîner

Vérifie ton ping avec \`/ping\` et la santé du serveur avec \`/pvpstatus\`. Tout le détail sur la page [PvP](/pvp).`,
  },
  {
    slug: "participer-koth",
    title: "Comment participer à un KOTH",
    description: "Capturer un KOTH : règles, préparation et stratégie de faction.",
    level: "Avancé",
    body: `## Le principe

Un **KOTH** (King of the Hill) est une zone à tenir **5 minutes** sans être contesté. L'événement dure 30 minutes et demande au moins 10 joueurs connectés.

## Quand ?

- **KOTH** : dimanche 18 h — **60 000 $** en banque de faction.
- **Totem** : mercredi 20 h 30 et samedi 21 h — un pilier d'obsidienne à abattre à l'épée en diamant (7,5 s par bloc) : **75 000 $**.
- Consulte le [calendrier des événements](/evenements).

## Stratégie

- Un joueur capture, les autres protègent les accès.
- Ne vous ruez pas tous dans la zone : vous seriez tous exposés.
- Prévoyez potions de soin, pommes dorées et de quoi tenir plusieurs combats.

Les captures comptent dans le [classement KOTH](/classements).`,
  },
  {
    slug: "faire-un-raid",
    title: "Comment faire un raid",
    description: "Quand et comment attaquer une base ennemie, dans le respect des règles.",
    level: "Avancé",
    body: `## Quand attaquer

- La TNT fonctionne **dans les claims**, même quand les défenseurs sont hors ligne.
- Une faction dont le power est sous son nombre de claims peut être **surclaimée** : déclare d'abord l'inimitié avec \`/f ennemi <faction>\`. Le surclaim se fait par les bords et est bloqué par le bouclier (6 h par jour).
- Repère les cibles avec \`/f who <faction>\`.

## L'obsidienne

Elle est **indestructible à la TNT** : contourne les murs d'obsidienne ou surclaim le chunk — c'est la seule façon de la faire tomber.

## Pendant le raid

- Les défenseurs reçoivent une alerte ; ils ne peuvent plus unclaim ni dissoudre pendant 10 minutes.
- Une brèche de 15 minutes s'ouvre : coffres, portes et générateurs deviennent accessibles.
- Ton tag de combat (15 s) bloque les téléportations : garde une sortie à pied.

## En guerre

Une guerre déclarée (50 000 $, 48 h) compte les points : kill +1, raid +5, surclaim +10.

## Les règles

Les exploits de bugs, le dupe et l'usage de mods non autorisés sont sanctionnés. Voir le [règlement](/rules).`,
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
