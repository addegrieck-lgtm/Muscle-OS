# Staff — VaeloriaStaff

Plugin Paper 1.21 (`plugins/vaeloria-staff`), indépendant des autres plugins. **Tout passe par `/staff`** : un menu qui n'affiche que les boutons autorisés par les permissions de chacun. Aucune édition de fichier n'est nécessaire.

```sh
cd plugins/vaeloria-staff && gradle build      # → build/libs/vaeloria-staff-0.1.0.jar
```

Copier le jar dans `plugins/` du serveur et redémarrer. Données dans `plugins/VaeloriaStaff/` :

| Fichier | Contenu |
|---|---|
| `config.yml` | Préfixe, mode staff, freeze, écrans de sanction, limites des images |
| `broadcasts.yml` · `holograms.yml` · `npcs.yml` · `images.yml` | Contenu créé en jeu (réécrit à chaque modification) |
| `images/` | **Déposer ici** ses images (PNG, JPEG, GIF, BMP) pour les afficher sans lien Internet |
| `walls/` | Pixels déjà convertis des images posées (ne pas toucher) |
| `mutes.yml` · `sanctions.log` · `staffmode.yml` | Mutes en cours · journal de toutes les sanctions · inventaires mis de côté en mode staff |

## Contenu du serveur

### Annonces (`/staff` → Annonces)

Créer autant d'annonces que voulu, chacune avec :

- **Type** : chat (toutes les lignes), titre (ligne 1 = titre, ligne 2 = sous-titre), barre d'action, barre de boss (avec compte à rebours et couleur au choix) ;
- **Texte** sur plusieurs lignes : couleurs `&a`, `&l`…, hexadécimal `&#ff8800`, liens `https://…` cliquables, variables `{player}`, `{online}`, `{max}` ;
- **Son** (liste, ou n'importe quelle clé de son, y compris d'un pack de ressources), **durée d'affichage**, **public** (une permission, ex. `vaeloria.staff.use` pour le staff seulement) ;
- **Rotation automatique** : les annonces cochées passent à tour de rôle (ou au hasard) toutes les N secondes, seulement s'il y a assez de joueurs connectés.

Clic droit sur une annonce dans la liste = envoi immédiat. **Aperçu** = envoi à soi seul.

- Envoyer une annonce enregistrée depuis la console, un bloc de commande, un autre plugin : `/staff annonce <id>`.
- Annonce ponctuelle sans l'enregistrer : `/staff dire titre &6Événement|&fDans 5 minutes` (`chat`, `titre`, `action`, `boss` ; `|` sépare les lignes), ou le bouton **Annonce rapide**.

### Pancartes flottantes (`/staff` → Pancartes)

Textes multilignes qui flottent dans le monde (entités *TextDisplay* : aucun support d'armure, aucun impact sur le PvP). **Nouvelle pancarte ici** la pose à hauteur des yeux, puis : lignes, taille (×0,25 à ×10), fond (sombre, aucun, Minecraft), orientation (suit le joueur, ou **fixe comme un panneau**), ombre, déplacer / monter / descendre. `{online}` se met à jour tout seul.

### PNJ (`/staff` → PNJ)

Personnages immobiles et invulnérables (villageois, piglin, golem, renard, support d'armure… 23 apparences). Au clic, un PNJ :

- envoie des **messages** (explications d'un jeu, règles, lore) ;
- lance des **commandes** par le joueur (`warp arene`) ou par la console si la ligne commence par `[console]` (`[console] give {player} bread 1`).

Options : nom visible, contour lumineux, déplacer ici. **Accroupi + clic** sur un PNJ ouvre directement sa configuration (admins). Les villageois ne proposent pas d'échange, les zombies ne brûlent pas au soleil, les mobs n'attaquent pas.

> Les monstres hostiles disparaissent en difficulté *peaceful* : utiliser un villageois, un golem ou un support d'armure sur un monde peaceful.

### Images HD (`/staff` → Images HD)

Affiche une image (affiche d'événement, règles illustrées, carte d'arène, explication d'un jeu…) sur un **mur de cadres**, une carte de 128×128 pixels par cadre.

1. **Nouvelle image** → coller un lien `https://…` **ou** le nom d'un fichier déposé dans `images/`.
2. Taille en cadres : `4` (hauteur calculée d'après les proportions), `4x3`, ou `6x4 brut` pour un logo à aplats (sans tramage).
3. **Clic droit sur le bloc du mur en bas à gauche** (vu de face). Le mur doit être plein et dégagé devant. Accroupi + clic gauche pour annuler.

Raccourci : `/staff image <lien|fichier> [4x3]`.

Qualité : l'image est réduite par paliers (net), puis convertie vers les ~240 couleurs des cartes avec **tramage Floyd-Steinberg** calculé sur l'image entière (dégradés fidèles, aucun raccord visible entre cadres). Les cadres sont **lumineux** (lisibles dans le noir), invisibles, fixes et incassables. Conversion et téléchargement se font hors du thread principal : aucun lag.

Limites (`config.yml`) : 64 cadres par image, 15 Mo, 8192 px de côté (une image plus grande est refusée avant d'être décodée). Retirer une image (shift-clic droit dans la liste) enlève aussi ses cadres.

## Modération

| Outil | Où | Détail |
|---|---|---|
| **Mode staff** | `/staff mode`, menu | Inventaire mis de côté (sauvegardé sur disque : rendu même après un plantage), vol, invulnérable, invisible. Outils : téléportation aléatoire, inspecter, immobiliser, inventaire, invisibilité, joueurs, menu. Ni pose/casse de blocs, ni ramassage, ni lâcher d'objets. |
| **Invisibilité** | `/staff vanish`, menu | Caché aux joueurs sans `vaeloria.staff.vanish.see`, pas de message de connexion/déconnexion, conservée à la reconnexion, ne fait pas apparaître de mobs. |
| **Joueurs connectés** | `/staff joueurs`, `/staff joueur <j>` | Fiche : vie, ping, position, première connexion, état (muet, immobilisé…) ; se téléporter / le téléporter, immobiliser, inventaire, coffre de l'Ender, soigner, sanctions. |
| **Immobiliser** | `/staff freeze <j>` | Bloque déplacements, commandes (sauf `msg`…), combat, blocs. Titre à l'écran. Alerte staff s'il se déconnecte. |
| **Inventaires** | `/staff invsee|endersee <j>` | Modifiable avec `vaeloria.staff.invsee.edit` (hors mode staff), sinon lecture seule. |
| **Sanctions** | `/staff warn|kick <j> <raison>` · `/staff mute|ban <j> <durée> [raison]` · `/staff unmute <j>` | Durées : `30s`, `10m`, `2h`, `7d`, `1w`, `1d12h`, `perm`. Mute/ban aussi hors ligne. Bans dans la liste de bans du serveur (levée : `/pardon`). Tout est notifié au staff et écrit dans `sanctions.log`. |
| **Chat staff** | `/sc <message>`, `/sc` seul pour basculer | Visible par `vaeloria.staff.chat` et la console. |
| **Chat public** | `/staff chat lock|unlock|clear` | Verrouiller (seul `vaeloria.staff.chat.bypass` parle) ; nettoyer l'écran de tous les joueurs. |

## Permissions

| Groupe | Contient |
|---|---|
| `vaeloria.staff.admin` | Tout (contenu + modération + `ban` + `invsee.edit` + `reload`) |
| `vaeloria.staff.content` | `use`, `broadcast`, `hologram`, `npc`, `image` — pour les builders / animateurs |
| `vaeloria.staff.moderator` | `use`, `mode`, `vanish`, `vanish.see`, `freeze`, `invsee`, `teleport`, `warn`, `kick`, `mute`, `chat`, `chatmanage`, `chat.bypass` |

Toutes sont réservées aux opérateurs par défaut. Exemple LuckPerms : `lp group modo permission set vaeloria.staff.moderator true`.

## Fiabilité

- Pancartes et PNJ ne sont **pas enregistrés dans le monde** : ils sont recréés quand leur chunk se charge. Impossible d'avoir des doublons après un redémarrage, un plantage ou un `/staff reload`.
- Les cadres d'image sont de vraies entités du monde ; les pixels sont ré-attachés aux cartes à chaque démarrage depuis `walls/`.
- Tous les fichiers sont écrits dans un fichier temporaire puis renommés (jamais de fichier à moitié écrit).
- Les menus annulent tout clic : rien ne peut en être retiré.

## Pour la suite

Idées non incluses dans cette première version : PNJ à apparence de joueur (skin) via Citizens ou paquets, images animées (GIF), pancartes cliquables, historique des sanctions dans le panel admin du site via VæloriaBridge.

## Tests

`gradle test` : durées de sanction, identifiants, conversion de couleurs et tramage, découpe et mise à l'échelle des images.
