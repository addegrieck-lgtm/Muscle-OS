# LuckPerms — grades et permissions de VÆLORIA

`setup.txt` crée tous les groupes, préfixes, permissions et tracks (une ligne = une commande console, sans `/`).
`vaeloria.json.gz` contient la même chose, à charger en une seule commande.

## Plugins du serveur

| Plugin | Rôle |
|---|---|
| LuckPerms | Groupes, permissions, préfixes |
| Vault + EssentialsX | Monnaie unique (utilisée par VæloriaShop et VæloriaFactions), homes, tpa, kits |
| VæloriaFactions | `/f` : factions, claims, power, raids, events |
| VæloriaShop | `/shop`, `/vendre`, `/hdv`, rangs de marchand |
| VæloriaStaff | `/staff`, `/sc` : modération, annonces, pancartes, PNJ, images |
| WorldGuard / WorldEdit | Protection du spawn, construction |
| EssentialsX Chat (**à ajouter**) | Sans lui, les préfixes de grade ne s'affichent pas dans le chat |

## Installation

1. Démarrer le serveur une fois avec tous les plugins.
2. Charger les grades, au choix :
   - **en une commande** : déposer `vaeloria.json.gz` dans `plugins/LuckPerms/`, puis en console `lp import vaeloria.json.gz`. L'import remplace le contenu des groupes du même nom ;
   - **ligne par ligne** : coller `setup.txt` dans la console.
3. Se donner le grade fondateur : `lp user <pseudo> parent add fondateur`.
4. Kits : copier `../essentials/kits.yml` dans `plugins/Essentials/kits.yml`.
5. Compléter les configs (plus bas), puis redémarrer.

Après une modification de `setup.txt` : `python3 build-import.py setup.txt vaeloria.json.gz`.

## Grades joueurs

Chaque grade hérite du précédent. À la connexion, tout joueur est dans `default` ; la règle `default-assignments` (plus bas) lui ajoute le grade **Joueur**. Même sans cette règle, il a toutes les permissions de base.

| Grade | Obtention | Avantages |
|---|---|---|
| Joueur | gratuit, à la connexion | `/f`, `/shop`, `/vendre`, `/hdv`, `/f fly` dans son territoire, spawn, 1 home, tpa, msg, mail, warps, `/pay`, `/kit joueur` (24 h) |
| Guerrier | 15 points | 2 homes, `/workbench`, `/kit guerrier` : full diamant, épée et outils en diamant |
| Seigneur | 35 points | 3 homes, `/hat`, `/kit seigneur` : full diamant Protection II, épée Tranchant II, arc, 4 pommes d'or |
| Roi | 65 points | 4 homes, `/nick`, couleurs dans le chat, `/kit roi` : full diamant Protection III, épée Tranchant III, arc Puissance III, 8 pommes d'or, 8 perles |
| VÆLORIAN | 100 points | 5 homes, pseudo coloré, formats et RGB dans le chat, `/kit vaelorian` : full diamant Protection IV, épée Tranchant IV, arc Puissance IV, outils Efficacité V, 16 pommes d'or, 16 perles |

Kit de départ (`depart`, ≈ 3 500 $) : donné une seule fois à la première connexion. Outils en pierre, Houe de moisson I, graines, nourriture, bois, torches, établi, four, coffres.
Kit `joueur` (≈ 300 $ + outils en pierre) : toutes les 24 h.

Kits des grades payants : une fois par semaine chacun ; un grade garde l'accès aux kits des grades inférieurs.
Argent de départ : 1 000 $ (`starting-balance`).

> Les kits payants donnent un équipement de combat. Les règles commerciales de Mojang interdisent de vendre un avantage de jeu : risque à assumer par le serveur.

## Staff

```
helper ── moderateur ──┐
builder ───────────────┴── admin ── fondateur
```

| Grade | VæloriaStaff | Autres |
|---|---|---|
| Helper | `/staff`, chat staff, warn, mute, kick, freeze | reçoit `/helpop`, `/seen` |
| Builder | annonces, pancartes, PNJ, images, chat staff | construire en SafeZone/WarZone, WorldEdit, `/fly` |
| Modérateur | tout le pack modérateur (mode staff, vanish, invsee, tp, gestion du chat) + **ban** | lire les chats de faction (`/f` spy), socialspy, whois |
| Admin | tout (`vaeloria.staff.admin`) | `/f admin`, `/shop admin`, `/vbridge`, tout EssentialsX, WorldEdit, WorldGuard, vanilla ; LuckPerms en **lecture seule** |
| Fondateur | `*` | seul à pouvoir modifier les grades |

Admin et fondateur ont explicitement **refusés** les contournements de jeu (pas de tag de combat, pas de perte de power, tp instantanées, vol près des ennemis, achats sans rang de marchand) : un staff qui joue joue comme tout le monde. Le mode staff de VæloriaStaff donne déjà vol et invulnérabilité pendant la modération.

Ne pas mettre le staff **OP** : les permissions `default: op` des plugins passeraient au-dessus de cette config.

## `plugins/LuckPerms/config.yml`

```yaml
server: vaeloria
primary-group-calculation: parents-by-weight

# Ajoute le grade Joueur à chaque connexion s'il ne l'a pas
default-assignments:
  grade-joueur:
    if:
      lacks: <group.joueur>
    give:
      - group.joueur
```

## `plugins/Essentials/config.yml`

```yaml
sethome-multiple:
  default: 1
  guerrier: 2
  seigneur: 3
  roi: 4
  vaelorian: 5

newbies:
  kit: depart

starting-balance: 1000
```

## `plugins/EssentialsChat` (ou section `chat:` d'Essentials)

```yaml
chat:
  format: '{PREFIX}{DISPLAYNAME}&7: &f{MESSAGE}'
```

## Commandes utiles

| Action | Commande |
|---|---|
| Donner un grade staff | `lp user <pseudo> parent add moderateur` |
| Retirer un grade | `lp user <pseudo> parent remove moderateur` |
| Promouvoir sur un track | `lp user <pseudo> promote staff` |
| Voir les groupes d'un joueur | `lp user <pseudo> info` |
| Vérifier une permission | `lp user <pseudo> permission check vaeloria.staff.ban` |
| Éditeur web | `lp editor` |
