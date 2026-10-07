/**
 * Guides éditoriaux (contenu SEO stable, versionné avec le code).
 * Les valeurs propres au serveur encore non arrêtées sont marquées [À CONFIRMER].
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
- Récupère le kit de départ avec \`/kit\` [À CONFIRMER].
- Quitte le spawn par un portail ou \`/rtp\` pour trouver une zone libre.

## Seul ou en faction ?

Commencer seul est possible, mais le Faction se joue en équipe. Le salon recrutement du [Discord](/discord) est le moyen le plus rapide de trouver une faction qui te correspond.

## Et ensuite

Lis [comment créer une faction](/guides/creer-une-faction) et [comment gagner de l'argent](/guides/gagner-de-l-argent).`,
  },
  {
    slug: "creer-une-faction",
    title: "Comment créer une faction",
    description: "Créer, nommer et organiser ta faction : rôles, invitations et premières règles internes.",
    level: "Débutant",
    body: `## Créer la faction

- \`/f create <nom>\` crée ta faction. Le nom est public et apparaît dans les [classements](/leaderboards).
- \`/f desc <texte>\` ajoute une description visible sur ta page faction du site.

## Inviter des membres

- \`/f invite <joueur>\` envoie une invitation.
- Les rôles : **Leader**, **Officier**, **Membre**, **Recrue**. Donne les permissions sensibles (claim, coffre commun) aux seuls officiers de confiance.

## Bien démarrer

- Choisis une zone éloignée du spawn mais pas isolée de tout.
- Fixe une règle simple pour les ressources communes.
- Désigne qui gère les claims et qui gère l'économie.`,
  },
  {
    slug: "comment-claim",
    title: "Comment claim un territoire",
    description: "Le fonctionnement des claims et du Power, et comment protéger ta base sans te mettre en danger.",
    level: "Débutant",
    body: `## Le principe

Un claim protège un chunk (16×16 blocs) pour ta faction. Le nombre de chunks que tu peux tenir dépend du **Power** de ta faction.

## Commandes

- \`/f claim\` : claim le chunk où tu te trouves.
- \`/f map\` : affiche les claims autour de toi.
- \`/f unclaim\` : libère un chunk.

## Le Power

Chaque membre apporte du Power, qui baisse à chaque mort. **Si le Power de ta faction passe sous son nombre de claims, ses territoires deviennent raidables.** Ne claim pas plus que nécessaire.

Valeurs exactes (Power par joueur, perte par mort, régénération) : [À CONFIRMER].`,
  },
  {
    slug: "gagner-de-l-argent",
    title: "Comment gagner de l'argent",
    description: "Les sources de revenus fiables en début, milieu et fin de saison.",
    level: "Intermédiaire",
    body: `## Début de saison

- Vends tes ressources de base au shop du serveur.
- Les fermes simples (cultures, cannes) rapportent peu mais en continu.

## Milieu de saison

- Les **spawners** sont la principale source de revenus passifs.
- Les KOTH et Outposts donnent des récompenses importantes.

## Bonnes pratiques

- Ne garde pas tout ton argent sur toi : une mort coûte cher.
- Réinvestis tôt dans ce qui produit (spawners, fermes) plutôt que dans du stuff.

Prix de vente et économie détaillée : [À CONFIRMER].`,
  },
  {
    slug: "obtenir-des-spawners",
    title: "Comment obtenir des spawners",
    description: "Où trouver des spawners, comment les protéger et les rentabiliser.",
    level: "Intermédiaire",
    body: `## Les obtenir

Les spawners peuvent s'obtenir en jeu, lors d'événements et en récompense de KOTH. Les méthodes exactes de la Saison I : [À CONFIRMER].

## Les protéger

- Place-les au cœur de ta base, jamais en bordure de claim.
- Entoure-les de couches de blocs résistants : un raid vise d'abord les spawners.

## Les rentabiliser

Empile les spawners du même type et automatise la collecte : c'est le volume qui fait le revenu.`,
  },
  {
    slug: "comment-pvp",
    title: "Comment progresser en PvP",
    description: "Les bases du combat inspiré du 1.8 : rythme de clic, combos, knockback et potions.",
    level: "Intermédiaire",
    body: `## Le rythme

Le combat de VÆLORIA est réglé pour retrouver le rythme du 1.8 : l'enchaînement des coups compte plus que l'attente du chargement.

## Les combos

- Garde le contact : avance après chaque coup pour enchaîner.
- **W-tap** : relâche brièvement la marche avant pour réinitialiser ton sprint et donner plus de knockback.
- Strafe (gauche/droite) pour rendre tes déplacements difficiles à suivre.

## Les potions

Prépare ta hotbar à l'avance. Lancer une potion de soin en reculant, au bon moment, gagne plus de combats que viser parfaitement.

## S'entraîner

Un mode Practice est prévu pour s'entraîner sans risque. Voir la page [PvP](/pvp).`,
  },
  {
    slug: "participer-koth",
    title: "Comment participer à un KOTH",
    description: "Capturer un KOTH : règles, préparation et stratégie de faction.",
    level: "Avancé",
    body: `## Le principe

Un **KOTH** (King of the Hill) est une zone à tenir seul ou avec ta faction pendant une durée donnée. Si un adversaire entre dans la zone, le compteur est contesté.

## Se préparer

- Consulte le [calendrier des événements](/events).
- Venez en groupe, avec de quoi tenir plusieurs combats.

## Stratégie

- Un joueur capture, les autres protègent les accès.
- Ne vous ruez pas tous dans la zone : vous seriez tous exposés.

Les captures comptent dans le [classement KOTH](/leaderboards/koth).`,
  },
  {
    slug: "faire-un-raid",
    title: "Comment faire un raid",
    description: "Quand et comment attaquer une base ennemie, dans le respect des règles.",
    level: "Avancé",
    body: `## Quand une base est raidable

Une faction devient raidable lorsque son Power passe sous son nombre de claims. Repère-les avec \`/f who <faction>\`.

## Préparer le raid

- Explosifs, blocs, équipement de rechange.
- Un éclaireur repère les défenses et les spawners.

## Pendant le raid

- Vise d'abord les spawners et les coffres.
- Garde une sortie : une contre-attaque arrive souvent vite.

## Les règles

Les exploits de bugs, le dupe et l'usage de mods non autorisés sont sanctionnés. Voir le [règlement](/rules).`,
  },
];

export const guideBySlug = (slug: string) => GUIDES.find((g) => g.slug === slug);
