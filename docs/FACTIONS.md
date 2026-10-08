# VæloriaFactions — le plugin Faction de VÆLORIA

Plugin Paper 1.21 (`plugins/vaeloria-factions`, Java 21). Build : `gradle build` → `build/libs/vaeloria-factions-1.0.0.jar`.
Dépendances facultatives : **Vault** + un plugin d'économie (banque de faction), **VæloriaBridge** (synchronisation avec le site).

L'esprit : le Faction des années 2012-2016 (power, `/f map`, surclaim, guerre à la TNT), avec les outils actuels (menus, bouclier, alertes de raid, tableau latéral, chat coloré par relation, site web synchronisé).

## Le cœur : deux façons de piller

### 1. Le surclaim (pillage historique)
- Chaque joueur a un **power** (défaut : −10 à 10, départ 5, +0,2/min en jeu, −4 par mort, ×1,5 en warzone).
- Le power d'une faction, c'est la somme de ses membres. Il fixe le nombre de chunks qu'elle peut tenir (1 chunk par point).
- Quand une faction tient **plus de chunks que son power**, elle devient **surclaimable** (affiché en jeu : « ⚠ Surclaimable »).
- Une faction **en guerre** avec elle (`/f ennemi`) fait `/f claim` sur un chunk **de bordure** et le lui prend. Le surclaim coûte du power à l'attaquant, comme un claim normal.
- Le chunk surclaim appartient alors à l'attaquant, avec **tout ce qu'il contient**. L'obsidienne s'y casse normalement et rend un bloc entier : c'est le butin.
- Les home et warps du défenseur dans ce chunk disparaissent. Titre et son pour les deux camps, annonce à tout le serveur.

### 2. Le pillage basique (TNT, creepers, canons)
- La TNT détruit les blocs ordinaires dans les claims ennemis.
- **L'obsidienne est indestructible** (`obsidian.durability.OBSIDIAN: 0`). Un mur d'obsidienne ne tombe que par surclaim. Mettre un nombre N > 0 pour qu'elle cède au bout de N explosions (usure sauvegardée, visible en faisant un clic droit avec une horloge).
- **Alerte** aux défenseurs : titre « ⚠ PILLAGE ⚠ », cor de raid, coordonnées, barre de boss pendant 10 minutes, annonce « X pille Y ! ».
- **Verrou anti-fuite** pendant le raid : pas d'unclaim, de dissolution ni de changement de bouclier.
- **Brèche** : un chunk soufflé par un ennemi identifié laisse les ennemis ouvrir **coffres et portes** pendant 15 minutes. La construction reste interdite.
- L'attaquant est identifié par le joueur qui a allumé la TNT, ou sinon par la faction du chunk d'où elle part (canons). Les creepers errants ne déclenchent pas d'alerte.

### Garde-fous
- **Période de grâce** (`/f admin grace 72`) : ni explosions ni surclaim, pour l'ouverture d'une saison.
- **Bouclier quotidien** (`/f bouclier 3` → 03h-09h, heure de Paris) : une plage de 6 h sans explosions ni surclaim. Il se change au plus tous les 3 jours, jamais pendant un raid ni pendant qu'il est actif.
- **Protection hors-ligne** : désactivée par défaut (`explosions.offline-protection`).

## Anti-abus
- **Tag de combat** (15 s après un coup PvP). Pendant ce temps :
  - pas de `/f home`, de warp, de vol, ni des commandes de `combat.blocked-commands` (`/spawn`, `/tpa`, `/home`…) ;
  - **se déconnecter tue le joueur** : inventaire au sol, power perdu, kill attribué à son dernier agresseur, annonce publique.
- **Anti-farm de power** :
  - un même tueur ne fait perdre du power à une même victime qu'une fois toutes les 15 minutes ;
  - aucune perte entre deux joueurs de même IP (doubles comptes) ;
  - les kills farmés ne comptent ni dans les statistiques ni dans les points de guerre.
- **Journal `/f logs`** (Officier+ par défaut, permission `LOGS`) :
  - dépôts et retraits du coffre, objet par objet, et de la banque ;
  - arrivées, départs, expulsions et rangs ;
  - claims, unclaims et surclaims ;
  - home, warps, relations, bouclier et permissions ;
  - pillages, guerres et déconnexions en combat.
  - Les 300 dernières lignes sont gardées.

## Alertes Discord
- Le chef relie le salon de sa faction : `/f discord <lien du webhook>`, avec un message de test automatique. Les autres réglages :
  - `/f discord ping` : mentionner @everyone sur les pillages ;
  - `/f discord test` : renvoyer un message de test ;
  - `/f discord off` : délier le salon.
- Événements envoyés :
  - pillage en cours, avec coordonnées ;
  - chunk perdu ou gagné par surclaim ;
  - guerre ;
  - arrivées et départs ;
  - déconnexion en combat.
- `discord.global-webhook` : salon d'annonces du staff, qui reçoit les guerres.
- Sécurité :
  - seuls les liens de webhook Discord officiels sont acceptés ;
  - le lien n'est jamais affiché en entier ;
  - les noms des joueurs ne peuvent mentionner personne.
- Envoi : une file par webhook, sans perte et sans bloquer le serveur, qui respecte les limites de débit de Discord.

## Guerres officielles
- `/f guerre declarer <faction>` (chef) : 15 min de préparation, puis 48 h de combat.
- Points : **kill = 1**, **pillage = 5**, **surclaim = 10**.
- Pendant la guerre, pas de paix (`/f neutre`, `allie`, `treve`) ni de renommage.
- Fin de la guerre :
  - à l'échéance, la faction qui a le plus de points gagne (ou match nul) ;
  - `/f guerre abandonner` donne la victoire à l'adversaire ;
  - la dissolution d'une faction aussi.
- Ensuite, 72 h d'attente avant une nouvelle guerre entre les deux mêmes factions.
- Affichage :
  - score dans le tableau latéral et le menu ;
  - titres et cor de guerre ;
  - annonces en jeu et sur Discord ;
  - **publication sur le site** (`WAR_START` / `WAR_END` : scores, chunks surclaim, nombre de combattants).
- Statistiques : guerres gagnées et perdues par faction.

## Obsidienne rare
- Le générateur eau + lave produit de la **pierre**, plus d'obsidienne.
- L'obsidienne de la nature (portails en ruine, End) ne donne que **1 à 3 éclats** quand on la mine.
- Coffres de structures et troc piglin : l'obsidienne y est remplacée par des éclats.
- 3 % de chance d'un éclat en minant un minerai de deepslate (sans Toucher de soie : impossible à farmer).
- **9 éclats = 1 obsidienne** sur l'établi. Les éclats ne servent à aucune autre recette.
- Le wither ne peut pas grignoter l'obsidienne.

## Commandes (`/f`, alias `/faction`, `/fac`)

`/f` seul ouvre le **menu**. Les noms sont en français, et les alias anglais historiques (`create`, `claim`, `map`, `who`, `ally`…) marchent aussi.

| Thème | Commandes |
|---|---|
| Gestion | `creer`, `dissoudre`, `renommer`, `desc`, `ouvrir`, `info`, `liste`, `top [power\|claims\|kills\|pillages\|surclaims\|banque]`, `power`, `menu` |
| Membres | `inviter`, `desinviter`, `rejoindre`, `quitter`, `expulser`, `promouvoir`, `retrograder`, `chef` |
| Territoire | `claim [rayon]`, `unclaim [tout]`, `autoclaim`, `carte [on\|off]`, `voir` (bordures en particules) |
| Déplacement | `home`, `sethome`, `warp`, `setwarp`, `delwarp`, `fly` (préparation de 5 s, bloqué si un ennemi est à moins de 16 blocs) |
| Diplomatie | `allie`, `treve`, `neutre`, `ennemi`, `relations` (l'alliance et la trêve se signent à deux, la guerre se déclare seul) |
| Faction | `chat [f\|a\|p]`, `banque [deposer\|retirer]`, `coffre`, `perm`, `bouclier`, `scoreboard`, `logs`, `discord` |
| Guerre | `guerre`, `guerre declarer <faction>`, `guerre abandonner` |
| Admin | `admin bypass\|safezone\|warzone\|unclaim [rayon]\|dissoudre\|setpower\|powerboost\|grace\|eclats\|reload\|save` |

Rangs : Recrue (`-`), Membre (`+`), Officier (`*`), Chef (`**`). Seize actions ont un rang minimum, réglable dans `/f perm`, par commande ou dans le menu : construire, coffres, portes, inviter, expulser, claim, unclaim, home, sethome, warps, coffre de faction, retrait banque, relations, vol, bouclier.

## Permissions
`vaeloria.factions.use` et `vaeloria.factions.fly` sont accordées à tous. `vaeloria.factions.admin` est réservée aux op et inclut `zones.build` et `spy` (lecture des chats de faction). Il existe aussi `vaeloria.factions.bypass.warmup`, `bypass.fly` et `bypass.powerloss`.

## Fichiers
- `config.yml` : tous les réglages, commentés.
- `messages.yml` : tous les textes, en MiniMessage. Les noms et descriptions saisis par les joueurs sont insérés en texte brut, sans aucune injection de balises possible.
- `data/*.json` : factions, joueurs, claims, état (grâce, usure). Écriture atomique avec copie `.bak`. Si un fichier est illisible, le plugin refuse de démarrer plutôt que d'écraser les sauvegardes.

## Site
Avec VæloriaBridge installé, le plugin envoie `FACTION_CREATE/DISBAND/JOIN/LEAVE/CLAIM/UNCLAIM`, et `FACTION_SNAPSHOT` toutes les 5 minutes (power, power max, banque, claims). Un renommage recrée la faction sous son nouveau nom côté site.

## Ce qui a été vérifié (lot anti-abus, Discord, guerres)
- 25 tests unitaires, dont l'anti-farm, la différence de coffre, les règles de guerre et la validation des webhooks.
- Essai sur Paper 1.21.4 avec deux bots et un faux webhook Discord local :
  - tag de combat ;
  - `/spawn` et `/f home` bloqués en combat ;
  - mort en cas de déconnexion en combat ;
  - second kill rapproché sans perte de power ;
  - journal du coffre (« a déposé 20× diamond », « a retiré 5× diamond ») ;
  - guerre déclarée, score 1-5 (kill + pillage), reddition ;
  - tous les messages Discord reçus dans l'ordre, dont @everyone sur le pillage.

## Ce qui a été vérifié (première version)
- 21 tests unitaires : règles de claim et surclaim, power, noms, bouclier qui passe minuit, relations, permissions, sauvegarde aller-retour, rendu de tous les messages.
- Essai sur un vrai **Paper 1.21.4** avec deux joueurs (bots) :
  - création, claim et claim en rayon, guerre ;
  - surclaim refusé contre une faction forte, puis réussi contre une faction en sous-power ;
  - TNT ennemie : mur soufflé, obsidienne intacte, alerte et annonce ;
  - brèche : coffre refusé avant l'explosion, ouvrable après ;
  - verrou de raid sur unclaim et dissolution ;
  - générateur d'obsidienne bloqué, période de grâce ;
  - chat de faction privé, tag coloré selon le lecteur, sauvegarde et arrêt propre.

Les menus, la banque Vault et le vol n'ont pas été cliqués par un vrai joueur. Ils sont à vérifier sur le serveur de test.
