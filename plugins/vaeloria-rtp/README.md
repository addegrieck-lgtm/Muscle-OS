# VæloriaRTP

Téléportation aléatoire **multi-mondes** pour VÆLORIA (Paper 1.21.4+, Java 21).
Le joueur tape `/rtp`, choisit son monde dans un menu, et atterrit sur un endroit sûr.
Toute la configuration se fait **en jeu** avec `/rtpadmin`.

```sh
cd plugins/vaeloria-rtp && gradle build      # → build/libs/vaeloria-rtp-1.0.0.jar (+ tests)
```

Déposer le jar dans `plugins/` du serveur puis redémarrer. Au premier lancement, `world`, `world_nether`
et `world_the_end` sont préconfigurés (l'End désactivé). Les autres mondes (Multiverse…) s'ajoutent
depuis `/rtpadmin` → **Ajouter un monde**.

## Joueurs

| Commande | Effet |
|---|---|
| `/rtp` (`/wild`) | Menu de choix du monde (icône, description, délai restant, accès) |
| `/rtp <monde>` | RTP direct dans un monde |

Déroulé : compte à rebours (bouger ou prendre des dégâts annule) → recherche d'un endroit sûr →
téléportation → titre à l'écran et **protection contre les chutes** pendant quelques secondes.

## Administration

`/rtpadmin` ouvre l'interface :

- **Liste des mondes** : état, rayon, centre, délais, permission. Clic → éditeur.
- **Éditeur d'un monde** (chaque modification est enregistrée tout de suite dans `worlds.yml`) :
  activer/désactiver, nom affiché et description (MiniMessage), icône (objet en main), position dans le menu,
  permission requise, forme carrée/circulaire, rayons min/max, centre (ma position, 0,0 ou centre de la bordure),
  délai entre deux RTP, compte à rebours, hauteur max de recherche, **Tester** (se téléporter tout de suite),
  retirer du RTP.
  Valeurs numériques : clic gauche `+`, clic droit `−`, `Q` / `Ctrl+Q` grand pas, **Maj+clic = saisir la valeur
  dans le chat** (`annuler` pour revenir).
- **Ajouter un monde**, **Aperçu joueur**, **Recharger**.

Commandes équivalentes (console comprise) :

| Commande | Effet |
|---|---|
| `/rtpadmin list` | Liste des mondes |
| `/rtpadmin add\|remove\|edit <monde>` | Ajouter / retirer / ouvrir l'éditeur |
| `/rtpadmin set <monde> <réglage> <valeur>` | `enabled`, `display-name`, `icon`, `description` (lignes séparées par `\|`), `slot`, `shape`, `center-x`, `center-z`, `min-radius`, `max-radius`, `cooldown`, `warmup`, `permission`, `max-y` |
| `/rtpadmin resetcooldown <joueur>` | Remet ses délais à zéro |
| `/rtpadmin reload` | Relit `config.yml` et `worlds.yml` |
| `/rtpadmin wand` | Hache de sélection des portails |
| `/rtpadmin portal [list\|create\|remove\|edit\|dest\|style\|zone\|enable\|disable] <nom>` | Gestion des portails (sans argument : menu) |
| `/rtp <monde> <joueur>` | RTP forcé, sans délai (console, PNJ Citizens, portails, menus) |

## Portails

Une zone qui téléporte le joueur dès qu'il y entre, animée par des particules colorées.

1. `/rtpadmin wand` (ou menu **Portails** → hache) : **clic gauche** sur un bloc = coin 1, **clic droit** = coin 2.
   Le contour de la sélection s'affiche en jaune tant que la hache est en main. Seule cette hache marquée
   sert d'outil : les haches normales ne sont pas touchées.
2. `/rtpadmin portal create <nom>` (ou menu → **Créer un portail**).
3. Destination :
   - `/rtpadmin portal dest <nom>` : **ta position actuelle** (direction du regard comprise) ;
   - `/rtpadmin portal dest <nom> rtp <monde>` : un **RTP** dans ce monde (délai et permission du monde respectés,
     sans compte à rebours).
4. Style : `/rtpadmin portal style <nom> <style>` ou clic dans le menu.

Le portail se déclenche à l'entrée (rester dedans ne relance rien). Un joueur refusé (permission
`vaeloria.rtp.portal.<nom>`, délai RTP…) est repoussé hors de la zone. Gerbe de particules au départ et à l'arrivée,
protection anti-chute, bourdonnement discret. Les particules ne tournent que si un joueur est à moins de
48 blocs (`portals.view-distance`).

Conseil de construction : un **cadre en blocs** (blackstone poli, deepslate, bloc de netherite, verre teinté rouge…)
et l'**intérieur vide** : les particules le remplissent. Pas de vrais blocs de portail du Nether (violets, non
recolorables sans pack de ressources, et ils déclenchent le passage vers le Nether).

Styles fournis (`portals.styles` de `config.yml`, entièrement modifiables) :

| Style | Rendu |
|---|---|
| `vaeloria` (défaut) | Rouge Væloria `#D21F2F` qui fond vers le bordeaux `#5E0710`, étincelles blanches, spores pourpres |
| `sang` | Rouge sombre, flammes et gouttes de lave |
| `ame` | Bleu âme, flammes d'âme, âmes de sculk |
| `neant` | Violet vers noir, portail inversé, bâtons de l'End |
| `royal` | Or, éclats de cire, bâtons de l'End |
| `nature` | Vert émeraude, particules villageois, pétales de cerisier |
| `ombre` | Noir rougeâtre, fumée, cendres |

Créer son style : couches `DUST` (`color`), `DUST_COLOR_TRANSITION` (`from` → `to`) avec n'importe quelle couleur
hexadécimale et une taille, plus n'importe quelle particule du jeu sans paramètre ; `weight` règle la proportion.

## Permissions

| Permission | Défaut | Rôle |
|---|---|---|
| `vaeloria.rtp.use` | tous | `/rtp` |
| `vaeloria.rtp.world.<monde>` | — | Accès à un monde marqué « permission requise » (ex. monde VIP) |
| `vaeloria.rtp.portal.<nom>` | — | Accès à un portail marqué « permission requise » |
| `vaeloria.rtp.bypass.cooldown` | op | Pas de délai |
| `vaeloria.rtp.bypass.warmup` | op | Pas de compte à rebours |
| `vaeloria.rtp.others` | op | `/rtp <monde> <joueur>` |
| `vaeloria.rtp.admin` | op | `/rtpadmin` |

## Recherche d'un endroit sûr

- Point tiré uniformément dans l'anneau `min-radius` → `max-radius` autour du centre, dans la bordure du monde.
- Les biomes interdits (`search.blocked-biomes` : océans, rivières par défaut) sont écartés **avant** de charger
  le chunk ; les chunks sont ensuite chargés en asynchrone (pas de lag).
- Sol solide, 2 blocs d'air, rien de dangereux (`search.unsafe-blocks`), pas de lave ni de feu autour.
- Nether (ou `max-y` fixé) : recherche d'une poche d'air sous le plafond, jamais sur le toit de bedrock.
- End : seulement sur les îles (le vide est rejeté).

Conseil : **pré-générer la carte** (par ex. avec Chunky) jusqu'au rayon max. Sans ça, chaque RTP génère
du terrain neuf et peut prendre plusieurs secondes.

Les textes (`messages:` de `config.yml`) utilisent le format
[MiniMessage](https://docs.advntr.dev/minimessage/format.html). Les délais sont gardés en mémoire
(remis à zéro au redémarrage).
