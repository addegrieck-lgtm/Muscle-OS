# VæloriaFactions — le plugin Faction de VÆLORIA

Plugin Paper 1.21 (`plugins/vaeloria-factions`, Java 21). Build : `gradle build` → `build/libs/vaeloria-factions-1.0.0.jar`.
Dépendances facultatives : **Vault** + un plugin d'économie (banque de faction), **VæloriaBridge** (synchronisation avec le site).

L'esprit : le Faction des années 2012-2016 (power, `/f map`, surclaim, guerre à la TNT), avec les outils actuels (menus, bouclier, alertes de raid, tableau latéral, chat coloré par relation, site web synchronisé).

## Économie : une seule monnaie, celle de VæloriaShop
Le plugin Faction et le marché (VæloriaShop) partagent **la même monnaie** : l'économie Vault fournie par EssentialsX. Avec le shop installé, chaque montant du plugin Faction s'affiche exactement comme dans le marché (« 25 000 $ »). Les valeurs par défaut sont calibrées sur le catalogue du shop :

| Repère du shop | Prix |
|---|---|
| TNT | 180 $ |
| Obsidienne (rang Négociant, 8 par jour) | 2 500 $ |
| Générateur zombie / enderman / golem | 15 000 $ / 140 000 $ / 1 000 000 $ |
| Rangs de marchand (total vendu) | 20 000 $ → 7 500 000 $ |

**D'où vient l'argent des factions** (versé dans la banque de faction) :

| Source | Montant par défaut |
|---|---|
| Missions quotidiennes (3 par jour) | 5 000 à 20 000 $ chacune |
| Avant-poste tenu | 1 500 $ toutes les 10 min (9 000 $/h, le revenu d'un golem, mais à défendre) |
| KOTH gagné | 60 000 $ |
| Totem abattu | 75 000 $ |
| Convoi rapporté | 25 000 $ |
| Forteresse remportée (hebdomadaire) | 150 000 $ |
| Dépôts des membres | `/f banque deposer`, avec l'argent gagné au marché |

**Où il repart** (dépenses qui détruisent la monnaie, contre l'inflation) :

| Dépense | Montant par défaut |
|---|---|
| Fonder une faction | 10 000 $ (payés par le fondateur) |
| Renommer la faction | 25 000 $ (banque de faction) |
| Déclarer une guerre officielle | 50 000 $ (banque de faction) |
| Améliorations | de 15 000 $ à 1 000 000 $ par niveau (voir plus bas) |
| Au marché | obsidienne, TNT, générateurs, outils… (prix du shop) |

**Règles communes aux deux plugins :**
- **Pas de découvert.** EssentialsX autorise par défaut un solde jusqu'à −10 000 $. Le plugin Faction exige le solde réel avant tout prélèvement : impossible de déposer en banque de l'argent qu'on n'a pas, ou de fonder une faction à crédit.
- **Générateurs.** C'est le shop qui les gère : on les récupère au Toucher de soie et ils vont dans l'inventaire. Le plugin Faction décide seulement *qui* a le droit de les casser (le détenteur du chunk, ou un ennemi pendant une brèche) et note les vols dans le bilan de pillage. Aucun doublon possible.
- **Outils du shop** (houe, pioche 3×3, hache, baguette de vente). Ils respectent les claims, le totem et les zones protégées. Leurs blocs cassés « en plus » ne comptent ni dans les missions ni pour les éclats d'obsidienne, ce qui évite les abus.
- **Obsidienne.** Le marché la vend cher et en quantité limitée (2 500 $, 8 par jour, rang Négociant). Sinon, on la reconstitue avec des éclats (9 éclats = 1 bloc). Dans les deux cas, elle reste indestructible à la TNT.

Tous les montants se règlent dans `config.yml` : sections `economy`, `upgrades`, `missions`, `outposts`, `koth`, `totem`.

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

### Bilan de pillage
À la fin d'un raid (verrou expiré), les défenseurs reçoivent un rapport :
- attaquants et durée ;
- blocs détruits, au total et par faction ;
- coffres ouverts par l'ennemi pendant la brèche, et **objets volés** objet par objet ;
- chunks perdus par surclaim ;
- membres tués et ennemis abattus.

Le rapport est aussi écrit dans `/f logs` (ligne « BILAN », plus une ligne « VOL » à chaque coffre pillé) et envoyé sur le Discord de la faction. Chaque faction attaquante reçoit son propre résumé : blocs détruits et butin rapporté. Un surclaim subi ouvre lui aussi une période de raid, et donc un bilan.

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

## Événement Totem
- Une colonne de **5 blocs d'obsidienne** (hauteur et matériau réglables) apparaît, idéalement en warzone.
- **La faction qui casse tous les blocs d'affilée gagne.** Si une autre faction casse un bloc, le totem se **reconstruit** et c'est elle qui prend la main, avec ce premier bloc déjà compté.
- **Uniquement à l'épée en diamant** (`totem.required-item`), et **7,5 s de frappe continue par bloc** (`totem.break-seconds`). Il faut être dans une faction pour frapper.
- Le serveur chronomètre lui-même la casse : les fissures sont visibles par tous, et un pourcentage s'affiche dans la barre d'action. Lâcher le clic, changer d'objet, détourner le regard ou s'éloigner remet le bloc à zéro. Si deux joueurs frappent le même bloc, le premier à finir le casse. En dehors de l'événement, la colonne est intouchable : ni casse, ni pose, ni explosion, ni piston.
- Affichage :
  - hologramme au-dessus du totem (faction en tête, progression, temps restant) ;
  - barre de boss pour tout le serveur ;
  - titres et sons ;
  - annonces à chaque reprise ;
  - annonce sur le webhook Discord global ;
  - **publication sur le site** comme un KOTH (`KOTH_START` / `KOTH_CAPTURE`).
- Récompenses :
  - argent en banque de faction (5000 par défaut) ;
  - bonus de power de faction ;
  - commandes console (`{player}`, `{faction}`, `{totem}`), par exemple une clé de caisse ;
  - le compteur « Totems » dans `/f info` et le classement `/f top totems`.
- Programmation automatique : `totem.schedule` (ex. `"SAMEDI 21:00"`, `"TOUS 20:30 citadelle"`). Le lancement automatique ne se fait qu'avec au moins `min-online` joueurs connectés.
- Sans vainqueur au bout de `duration-minutes` (30), le totem s'effondre.
- **Interface admin `/f totem admin`** (sans toucher aux fichiers) :
  - **Totems** : lancer, se téléporter, supprimer, créer ici (nom saisi dans le chat) ;
  - **Horaires** : ajouter (jour, puis heure saisie dans le chat, avec ou sans nom de totem), supprimer, joueurs minimum ;
  - **Gains** : argent en banque (±1000 ou montant exact), power de faction, commandes console (ajout, suppression) ;
  - **Réglages** : activation, temps de casse, arme requise, durée, hauteur, hologramme ;
  - lancement et arrêt du totem en cours.
  Chaque changement est écrit dans `config.yml`, commentaires conservés, et appliqué immédiatement.
- Staff, en commandes :
  - `/f totem creer <nom>` : à faire debout sur la case de base ;
  - `/f totem supprimer <nom>` ;
  - `/f totem lancer [nom] [minutes]` ;
  - `/f totem arreter`.
- Joueurs : `/f totem` (état ou prochains horaires) et `/f totem liste`.

## Spawners pillables
- Dans un claim, un spawner **résiste aux explosions**.
- Il ne se récupère qu'à la main, par :
  - la faction qui tient le chunk (donc l'attaquant après un surclaim) ;
  - un ennemi pendant une **brèche** (`raid.breach.allow` contient `SPAWNER`).
- Il tombe alors **en objet avec sa créature**, et se repose tel quel.
- Un vol pendant une brèche apparaît dans le bilan de pillage et dans le journal (« a arraché un spawner zombie »).
- Permission de faction `SPAWNER` (Officier par défaut).
- Les spawners naturels (donjons) ne tombent pas (`spawners.wilderness-drop: false`), pour garder la valeur de la boutique.

## Améliorations de faction (`/f ameliorations`)
Elles sont payées avec la banque de faction et réservées au chef par défaut (permission `UPGRADE`). Le niveau de faction est la somme des niveaux achetés.

| Amélioration | Bonus par niveau | Coûts par niveau |
|---|---|---|
| Territoire | +10 chunks de plafond | 25 k, 60 k, 125 k, 250 k, 500 k $ |
| Puissance | +5 power de faction | 50 k, 120 k, 250 k, 500 k, 1 M $ |
| Coffre | +1 rangée (6 maximum) | 20 k, 60 k, 150 k $ |
| Bouclier | +1 h de bouclier | 150 k, 400 k $ |
| Warps | +1 warp | 15 k, 40 k, 90 k $ |
| Effectif | +5 places de membre | 75 k, 200 k $ |

Coûts et bonus se règlent dans `config.yml → upgrades`. Pour le staff : `/f admin banque <faction> <montant>`.

## Avant-postes (`/f avantposte`)
- Ce sont des zones permanentes.
- Une faction **seule** dans la zone pendant 120 s la capture.
- Tant qu'elle la tient, elle touche **1000 en banque toutes les 10 min** et **+2 power de faction**.
- La capture se fige si la zone est disputée, et recule si la zone est désertée.
- Affichage :
  - barre de boss près de la zone ;
  - cercle de particules coloré (blanc libre, vert tenu, jaune en capture, rouge disputé) ;
  - annonces en jeu et sur Discord ;
  - journal.
- Staff : `/f avantposte creer <nom> [rayon]`, `supprimer`. Joueurs : `/f avantposte liste`.

## KOTH (`/f koth`)
- C'est un événement : la faction qui tient la zone **seule et sans interruption** pendant 5 min gagne.
- Zone disputée : le chrono se fige. Zone désertée : il repart de zéro.
- Récompenses : argent, power et commandes (`{player}`, `{faction}`, `{koth}`).
- Programmation : par défaut le dimanche à 18h00.
- Affichage : barre de boss pour tout le serveur, titres, Discord, et publication sur le site (`KOTH_START` / `KOTH_CAPTURE`).
- Staff : `/f koth creer <nom> [rayon]`, `lancer [nom] [minutes]`, `arreter`, `supprimer`.

### Interface admin : `/f koth admin` (ou `/f avantposte admin`)
Sans toucher aux fichiers :
- **Points de capture.** Zones de KOTH et avant-postes, chacun avec sa fiche :
  - **déplacer ici** : le centre devient ta position, la capture en cours repart de zéro ;
  - **rayon** de 2 à 30 blocs (±1, ou ±5 avec Maj), la zone couvrant ±5 blocs en hauteur ;
  - se téléporter ;
  - lancer (KOTH) ou libérer (avant-poste) ;
  - supprimer, après confirmation tapée dans le chat ;
  - **créer ici**, avec le nom tapé dans le chat.
- **Horaires du KOTH.** On choisit le jour, puis on tape l'heure dans le chat (avec ou sans nom de zone). Maj + clic supprime un horaire. Le nombre minimum de joueurs se règle au même endroit.
- **Gains :**
  - KOTH : argent en banque (±5 000 ou montant exact), power, commandes ;
  - avant-postes : revenu (±500 ou montant exact), fréquence, bonus de power.
- **Réglages :**
  - activation du KOTH et des avant-postes ;
  - temps à tenir pour gagner un KOTH (±30 s) et durée de l'événement ;
  - temps de capture d'un avant-poste (±10 s).

Chaque changement est écrit dans `config.yml`, commentaires conservés, et appliqué immédiatement.

## Convoi (`/f convoi`)
- **Toutes les 25 minutes**, une caisse tombe du ciel en warzone, sur un point d'atterrissage défini par le staff ou, à défaut, dans un chunk de warzone au hasard. Annonce, titre et barre de boss pour tout le serveur.
- Clic droit sur la caisse, puis rester **5 secondes** à côté pour l'ouvrir. Un coup reçu ou un pas de côté interrompt l'ouverture.
- Le joueur reçoit la **Clé du convoi**. Le porteur brille, et sa position est annoncée toutes les 30 secondes.
- **Pour gagner**, le porteur rapporte la clé :
  - à **un avant-poste tenu par sa faction** ;
  - ou, si sa faction n'en tient **aucun**, en **sortant de la warzone**.
  Avec un avant-poste, sortir de la warzone ne suffit pas : il faut l'atteindre.
- La clé ne se range nulle part (coffre, coffre de l'Ender, entonnoir), ne disparaît pas et ne brûle pas. Tué, le porteur la laisse tomber ; déconnecté, il la laisse sur place. Qui la ramasse devient le nouveau porteur.
- Sans vainqueur au bout de 15 minutes, le convoi s'arrête et la clé disparaît.
- Récompense : 25 000 $ dans la banque de la faction du porteur (ou pour le joueur s'il n'a pas de faction), plus des commandes console (ex. `crate key give {player} convoi 1`).

### Interface admin : `/f convoi admin`
- **Lancer** un convoi ou **arrêter** le convoi en cours.
- **Points d'atterrissage** : ajouter à sa position, se téléporter, supprimer.
- **Warzone** : choisir quels chunks forment la warzone (ce chunk, un carré de rayon N, retirer, tout vider) et voir les bordures. Au-delà de la warzone se trouvent les avant-postes.
- **Avant-postes** : créer, déplacer, rayon, et **attribuer à une faction** ou libérer.
- **Gains** : argent (±5 000 ou montant exact) et commandes.
- **Réglages** : activation, fréquence, temps d'ouverture, durée, joueurs minimum, fréquence d'annonce de la position du porteur.

## Primes (`/f prime`, `/f primes`)
- Un joueur en **série de kills** a la tête mise à prix, en pourcentage de **sa propre fortune** :
  - **5 % dès 5 kills** ;
  - **10 % dès 15 kills**.
- **Annonce** à tout le serveur, avec le nom, la série, le pourcentage et le montant. Elle part à chaque palier, puis tous les 5 kills (« Alice est en série de 5 kills ! Sa tête vaut 5 % de sa fortune : 4 500 $ »).
- Celui qui l'abat **empoche la prime**, prélevée sur l'argent réel de la victime, et l'annonce est publique. La série s'arrête à toute mort.
- Les kills farmés (même victime trop souvent, même IP) ne comptent ni pour la série ni pour la prime.
- `/f prime [joueur]` affiche une prime ; `/f primes` liste les têtes mises à prix.
- Placeholders : `%vfactions_streak%`, `%vfactions_bounty_percent%`, `%vfactions_bounty%`.
- Paliers, plafond et fréquence d'annonce : `config.yml → bounty`.

## La Forteresse (`/f war`)
Un mode de guerre à plusieurs factions : l'assaut du **Temple-Tour**, au cœur d'une forêt. Le schéma et la carte sont livrés avec le plugin.

**La carte** (241 × 241 blocs, `forteresse.schem`) :
- **une forêt dense** : chênes, bouleaux, sapins, chênes noirs, vieux chênes géants, troncs couchés, rochers moussus, fougères, champignons ; des collines boisées en bordure ; 4 sentiers sinueux qui mènent au temple ;
- au centre, une clairière parsemée de colonnes brisées, et le **Temple-Tour**, aux couleurs de VÆLORIA (pierre noire, cramoisi et or) :
  - un podium de 57 × 57 et 4 **grands escaliers** gardés par des braseros ;
  - une colonnade et une **grande salle** aux vitraux rouges, avec **4 portes à herse** de 7 × 9 ;
  - une **tour** de 23 blocs de diamètre qui monte à **82 blocs** au-dessus de la forêt. À l'intérieur, un **escalier en colimaçon** de 4 blocs de large tourne autour d'un pilier central jusqu'au sommet, en demi-marches (pas besoin de sauter) ;
  - au **sommet** : une plateforme de 27 blocs de diamètre, des créneaux, une couronne en encorbellement, 8 obélisques dorés et l'étendard cramoisi.
- Le générateur vérifie qu'on monte bien à pied de la porte sud jusqu'au sommet (287 pas).

**Déroulement** :
1. **Inscriptions** (5 min) : annonce cliquable, puis `/f war rejoindre`. Il faut une faction, 2 inscrits minimum par faction et 2 factions minimum.
2. **Seul dans la forêt** (45 s) : chaque combattant apparaît **seul, au hasard**, sur l'un des 260 points de la forêt, loin des autres. Il doit **retrouver son équipe**. Pendant ce temps, pas de PvP et les portes du temple restent fermées.
3. **Assaut** (5 min) : les herses se lèvent. On se bat dans la forêt et sur les marches du temple.
4. **Fermeture** : les herses retombent :
   - tout combattant **resté dehors est éliminé** ;
   - ceux de l'intérieur ont **90 s pour monter l'escalier en colimaçon jusqu'au sommet** ;
   - ensuite, quiconque n'est pas au sommet est éliminé.
5. **Bataille au sommet** (10 min max) :
   - une mort = éliminé ;
   - **la dernière faction en vie gagne** ;
   - au bout du temps, la faction la plus nombreuse au sommet gagne (égalité = pas de vainqueur).

**Règles pendant la bataille** :
- Alliés et trêves ne protègent pas : seuls les membres d'une même faction ne se blessent pas.
- Les combattants ne peuvent ni se téléporter (commandes, plugins, portails) ni planer en élytres.
- `/f war quitter` permet d'abandonner.
- Quitter le serveur = éliminé. Chacun est ramené à sa position d'origine : à son élimination, ou 15 s après la victoire.
- Les non-combattants trouvés dans le temple sont renvoyés à la sortie.
- Par défaut, le butin des morts tombe au sol et mourir ne coûte pas de power.
- La carte est **indestructible** : ni construction, ni explosion, ni seau, ni feu, ni monstres.

**Récompense** :
- 150 000 $ dans la banque de la faction gagnante (le plus gros gain des événements : KOTH 60 000 $, Totem 75 000 $, convoi 25 000 $) ;
- des commandes pour chaque participant gagnant (ex. `crate key give {player} forteresse 1`).
- Les victoires sont comptées par faction, notées dans `/f logs`, annoncées sur Discord et envoyées au site (VæloriaBridge, événement « siege »).

**Lancement** : par le staff, ou automatiquement aux horaires (dimanche 21h par défaut, avec 10 joueurs connectés minimum).

**Commandes** : `/f war` (alias `/f forteresse`). Les guerres officielles entre deux factions restent sur `/f guerre`.

### Installer la forteresse
Deux façons de faire :
- **Sans WorldEdit** :
  1. Va à l'endroit voulu, debout au sol, de préférence dans un monde plat ou une zone vide.
    2. Tape `/f war construire confirmer`, ou utilise le bouton « Construire ici » de `/f war admin`.
  3. La carte est collée par lots, sans figer le serveur, puis **configurée toute seule** : portes, sommet, enceinte, carte protégée, points d'apparition et sortie.
- **Avec WorldEdit** :
  1. Copie `plugins/VaeloriaFactions/forteresse/forteresse.schem`, créé au premier usage, dans `plugins/WorldEdit/schematics/`.
  2. Tape `//schem load forteresse` puis `//paste` : l'origine est le centre de la forteresse, au sol.
  3. **Sans bouger**, clique sur « Configurer depuis le schéma » dans `/f war admin`, ou tape `/f war configurer`.

La carte mesure 241 × 241 blocs sur 110 de haut. L'origine se trouve 9 blocs au-dessus du bas du schéma : prévois de la place en dessous. En monde plat, les couches sous le bedrock sont simplement ignorées.

### Interface admin : `/f war admin`
- **Partie** : ouvrir les inscriptions, arrêter (sans vainqueur, chacun rentre), ouvrir et fermer les portes pour tester.
- **Lieux** : se téléporter au centre, montrer les zones en particules (sommet, enceinte, portes, points d'apparition).
- **Construction** : construire ici, ou configurer depuis le schéma.
- **Positions personnalisées**, pour utiliser ta propre forteresse :
  - choisis deux coins, puis fais-en le sommet, l'enceinte, la carte protégée ou une nouvelle porte. Une porte retient le bloc du coin 1, par exemple des barreaux ;
  - ajoute des points d'apparition à ta position (sans aucun point : au hasard au sol dans la carte protégée) ;
  - place la sortie et le centre.
- **Horaires** : jour et heure d'ouverture des inscriptions, joueurs minimum.
- **Gains** : argent (±10 000 ou montant exact) et commandes.
- **Réglages** :
  - durées : inscriptions, préparation, assaut, délai pour le sommet, bataille ;
  - effectifs : factions minimum, joueurs minimum et maximum par faction ;
  - options : garder l'inventaire, perte de power, élytres.

Le générateur de la carte est dans `tools/forteresse/generer_forteresse.py`. Il produit le schéma, son plan (`layout.json`) et un aperçu vu du dessus.

## Missions quotidiennes (`/f missions`)
- Chaque jour à minuit, 3 missions sont tirées du catalogue, **les mêmes pour toutes les factions**.
- Chaque faction progresse de son côté et touche la récompense en banque, avec annonce, journal et Discord.
- Types :
  - `KILL_PLAYERS` (joueurs d'autres factions, sans les kills farmés) ;
  - `KILL_MOBS` ;
  - `MINE_ORES`, `MINE_DEEPSLATE_ORES` (sans Toucher de soie) ;
  - `RAID_BLOCKS` (blocs ennemis détruits à la TNT) ;
  - `PLAYTIME_MINUTES` ;
  - `CAPTURE_OUTPOST`.
- Catalogue modifiable dans `config.yml → missions.pool`.

## Confort
- **Pseudos colorés** au-dessus des têtes et dans la liste des joueurs, selon la relation avec chaque joueur (vert, violet, aqua, rouge, blanc), précédés de `[Faction]`.
- **`/f acces <joueur|faction>`** : donne ou retire l'accès au chunk où l'on se trouve (construire, coffres, portes). `/f acces liste` affiche les accès. Permission `ACCESS` (Officier). Les accès disparaissent quand le chunk change de mains.
- **PlaceholderAPI** (facultatif) :
  - faction et membres : `%vfactions_name%`, `name_or_none`, `tag`, `role`, `role_prefix`, `online`, `members` ;
  - power : `power`, `maxpower`, `faction_power`, `faction_maxpower`, `claims` ;
  - progression : `level`, `bank`, `kills`, `deaths`, `war`, `totems`, `raid`.
- `/f top` accepte en plus `niveau`, `missions` et `avantpostes`.

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
| Guerre officielle | `guerre`, `guerre declarer <faction>`, `guerre abandonner` |
| Totem | `totem`, `totem liste` ; staff : `totem admin\|creer\|supprimer\|lancer\|arreter` |
| Progression | `ameliorations`, `missions`, `avantposte [liste]`, `koth [liste]` ; staff : `avantposte creer\|supprimer`, `koth creer\|supprimer\|lancer\|arreter` |
| Territoire partagé | `acces <joueur\|faction>`, `acces liste` |
| Convoi et primes | `convoi`, `prime [joueur]`, `primes` ; staff : `convoi admin\|lancer\|arreter` |
| Forteresse | `war`, `war rejoindre\|quitter` (alias `forteresse`) ; staff : `war admin\|lancer\|arreter\|ouvrir\|fermer\|construire confirmer [x y z [monde]]\|configurer [x y z [monde]]` |
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

## Ce qui a été vérifié (Forteresse)
- 43 tests unitaires, dont :
  - le tirage des points d'apparition ;
  - la règle de la dernière faction en vie et la victoire au temps ;
  - la cohérence du plan avec le schéma : herses aux portes, passage libre, sol du sommet, 260 points d'apparition au sol dans la forêt.
- Le générateur vérifie à chaque construction qu'on monte à pied de la porte sud jusqu'au sommet.
- Essai sur Paper 1.21.4 avec deux bots :
  - **construction** sans WorldEdit : 241 × 241 × 110 blocs collés et configurés en 8 secondes ;
  - **montée** : un bot marche des marches sud jusqu'au sommet de la tour (82 blocs) en 68 s, portes ouvertes ;
  - **bataille** :
    - inscriptions puis apparition au hasard dans la forêt (187 blocs d'écart entre les deux joueurs) ;
    - titres « Seul dans la forêt » et compte à rebours ;
    - herses levées à l'heure ;
    - `/tp` de la console refusé pendant la bataille ;
    - carte indestructible ;
    - élimination à la mort, victoire et 150 000 $ versés ;
    - le joueur éliminé réapparaît chez lui, le gagnant rentre 15 s après ;
  - **fermeture des portes** : les joueurs restés dehors sont éliminés, et faute de survivant il n'y a pas de vainqueur ;
  - `/f war admin` s'ouvre.
- Le schéma livré est mis à jour avec le plugin, sauf s'il a été modifié à la main.
- Une vidéo de présentation de 30 s, en motion design, se génère depuis la vraie carte avec `tools/forteresse/video/` : `render_iso.py` fait le rendu isométrique des blocs, `compose.py` le montage, `bande_son.py` la musique de bataille synthétisée (tambours, cuivres, épées). Les combattants y sont mis en scène.

## Ce qui a été vérifié (convoi et primes)
- 37 tests unitaires, dont les paliers et montants des primes, les annonces et la condition de victoire du convoi.
- Essai sur Paper 1.21.4 avec Vault, EssentialsX, VæloriaShop et deux bots :
  - **primes** : série de 5 annoncée (« 5 % de sa fortune : 4 500 $ ») ; le tueur empoche 4 500 $, prélevés sur la victime (90 000 → 85 500 $) ;
  - **convoi n°1** : caisse tombée et ouverte, clé laissée au sol par le porteur déconnecté, ramassée par Bob (Loups, sans avant-poste) qui gagne en sortant de la warzone (+25 000 $) ;
  - **convoi n°2** : Alice (Lions, avec un avant-poste attribué depuis l'interface) ne gagne pas en sortant de la warzone, mais gagne en atteignant son avant-poste (+25 000 $) ;
  - **interface admin** : chunk ajouté à la warzone, point d'atterrissage, fréquence et gains enregistrés.

## Ce qui a été vérifié (interface admin du KOTH)
- Interface cliquée par un bot sur Paper 1.21.4 :
  - zone « roi » créée par le chat, rayon 6 → 7, puis déplacée ;
  - temps à tenir 300 → 330 s ;
  - gain du KOTH 60 000 → 65 000 $, revenu d'avant-poste 1 500 → 2 000 $ ;
  - horaire « Dimanche 20h15 — roi » ajouté ;
  - avant-poste « mine » créé puis libéré ;
  - tout se retrouve dans `config.yml` et `data/state.json`.

## Ce qui a été vérifié (économie commune avec VæloriaShop)
- Essai sur Paper 1.21.4 avec Vault, EssentialsX, VæloriaShop et VæloriaFactions :
  - le shop et la faction utilisent la même économie EssentialsX, et les montants ont le format du shop (« 10 000 $ ») ;
  - fondation refusée à 8 000 $ puis payée à 30 000 $ ;
  - dépôt de 999 999 $ non possédés refusé ;
  - amélioration achetée 25 000 $ ;
  - générateur du shop arraché par l'ennemi pendant une brèche : refusé sans Toucher de soie, puis **un seul** générateur rendu avec, aucun doublon au sol, vol noté ;
  - pioche 3×3 du shop : elle mine autour, mais un seul minerai compte pour les missions.
- Faille corrigée pendant l'essai : avec le découvert d'EssentialsX, on pouvait déposer de l'argent qu'on n'avait pas.

## Ce qui a été vérifié (spawners, améliorations, avant-postes, KOTH, missions, confort)
- 33 tests unitaires, dont les coûts, bonus et plafonds des améliorations, et le tirage identique des missions.
- Essai sur Paper 1.21.4 avec PlaceholderAPI et trois bots :
  - spawner intact après une TNT, puis arraché par l'ennemi pendant la brèche et tombé en objet (ligne VOL dans le journal) ;
  - 2 améliorations achetées par le menu, coffre passé à 4 rangées ;
  - accès refusé puis accordé à Carl sur un chunk des Lions ;
  - avant-poste capturé (+2 power de faction, mission accomplie, +5000) ;
  - KOTH gagné malgré une zone disputée un moment (+5000) ;
  - kill d'un ennemi compté dans les missions ;
  - PlaceholderAPI : `Lions niv=2 power=7.2 role=Chef` ;
  - pseudos : [Lions] en vert, [Loups] en rouge, sans faction en blanc.

## Ce qui a été vérifié (bilan de pillage)
- 31 tests unitaires, dont l'accumulation par attaquant et le classement des objets volés.
- Essai sur Paper 1.21.4 (verrou réduit à 1 min) :
  - TNT ennemie, puis 20 diamants volés dans un coffre par la brèche ;
  - Alice tuée par l'attaquant, puis un chunk surclaim ;
  - bilan reçu à la fin du raid : 21 blocs, 1 coffre, 20× diamond, 1 chunk, 1 membre tué ;
  - résumé de l'attaquant, lignes VOL et BILAN dans le journal, bilan sur Discord.

## Ce qui a été vérifié (casse à l'épée et interface admin)
- 29 tests unitaires, dont le chrono de 7,5 s (150 ticks).
- Essai sur Paper 1.21.4 :
  - à mains nues : refus, le bloc tient ;
  - épée lâchée à 3 s : le bloc tient ;
  - épée tenue jusqu'au bout : le bloc casse, le bloc voisin reste intact.
- Interface cliquée par un bot :
  - gains +1000 ;
  - horaire « Samedi 18h45 — citadelle » ajouté par le chat ;
  - temps de casse -0,5 s, arme suivante ;
  - tout se retrouve dans `config.yml`, commentaires conservés.

## Ce qui a été vérifié (Totem)
- 28 tests unitaires, dont la règle « tous d'affilée » avec reprise et la lecture des horaires.
- Essai sur Paper 1.21.4 avec deux bots :
  - création du totem, colonne construite, hologramme présent ;
  - Lions à 3/5, puis Loups reprend la main et le totem est reconstruit ;
  - Loups à 5/5 : victoire, colonne et hologramme retirés, 5000 en banque ;
  - `/f top totems`, journal, deux annonces Discord ;
  - arrêt par le staff, qui retire le totem.

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
