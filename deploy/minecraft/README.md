# Serveur Minecraft VÆLORIA — kit de configuration

Tout ce qu'il faut pour remettre le serveur Faction (Paper 1.21.4, hébergé chez BoxToPlay) dans l'état voulu :
configs des plugins, régions, warps, permissions et connexion au site.

| Élément | Rôle |
|---|---|
| `kit/plugins/` | configs pré-remplies de chaque plugin, à la même place que dans `plugins/` du serveur |
| `install.sh` | sauvegarde les configs actuelles puis copie le kit (`--dry-run` pour voir sans rien écrire) |
| `commands.txt` | ce qui ne passe pas par un fichier : règles de jeu, régions WorldGuard, LuckPerms, KOTH, réglages en jeu |
| `rcon.py` | envoie la partie console de `commands.txt` par RCON (Python 3, sans dépendance) |
| `start.sh`, `server.properties`, `spigot.yml`, `bukkit.yml`, `config/` | réglages de performance de Paper (à fusionner, voir plus bas) |

Constructions concernées et leurs coordonnées (toutes dans le monde `spawn`, sauf indication) :

| Construction | Collage | Ce que le kit règle |
|---|---|---|
| Spawn agrandi de Noël (`vaeloria-spawn-fusionne-noel.schem`) | `/tp 0 100 0`, `//paste` **sans** `-a` | région `spawn` (X −240 → 303, Z −222 → 169), arrivée 0,4 101 62,35, PNJ et pancartes (VaeloriaStaff), Autel, Hall des Légendes, duels, crypte (VaeloriaPlace), cadeaux et parcours (VaeloriaNoel) |
| Zone d'investissement (dans le spawn) | — | zone VaeloriaShop + région `invest` : 22 101 54 → 39 108 71 |
| KOTH « Gouffre de Vælor » (`minecraft/koth-volcan`) | pieds en 1000 120 0, `//paste -a` | régions `koth-volcan` (prio 10) et `koth-capture` (prio 20), zone `/f koth gouffre` rayon 5, warps `koth-no/ne/so/se` |
| Île Marchande (`minecraft/ile-commerciale`) | dans la schematic du spawn (x +140) | 16 parcelles `/pshop` prêtes à louer (voir « Boutiques de joueurs ») |
| Warps farm (`minecraft/warps-farm`) | monde `Warp` (warps `guerrier`, `seigneur`, `roi`, `vaelorian`) | un warp par grade, réservé par permission |
| Warzone | monde `vaeloria`, région `warzone` (−192 → 207) | flags PvP / protection |

Le Hall des Portes a disparu avec le spawn agrandi : les entrées du KOTH passent par le menu `/warp`.

## Installation pas à pas

Il faut Git Bash (Windows) ou un terminal Linux/macOS, et Python 3 pour RCON.

### 1. Récupérer le dossier `plugins/`

Arrête le serveur depuis le panel BoxToPlay (les plugins réécrivent leurs fichiers à l'arrêt : un fichier
modifié pendant que le serveur tourne serait écrasé). Avec FileZilla, télécharge `plugins/` dans un dossier
fixe, par exemple `C:\Users\<toi>\VAELORIA\serveur\plugins`.

### 2. Voir ce qui va changer

```bash
cd deploy/minecraft
./install.sh --dry-run /c/Users/<toi>/VAELORIA/serveur
```

Le script liste les fichiers nouveaux (`+`) et modifiés (`~`) avec leurs différences, et signale les plugins
installés en double (par exemple deux WorldGuard) : retire à la main la version la plus ancienne.

### 3. Installer

```bash
./install.sh /c/Users/<toi>/VAELORIA/serveur
```

> **Ne copie jamais `kit/plugins/` sur le serveur à la main** (FileZilla, glisser-déposer) : le script remplit
> le secret du Bridge et ne remplace que le bloc `zones:` de `invest.yml`. La config du Bridge est d'ailleurs
> livrée en `config.yml.modele` pour qu'une copie à la main ne puisse pas écraser la vraie. Si le Bridge écrit
> au démarrage « api.secret non configuré », son secret a été perdu : relance `install.sh` (il le redemande).
> Une boutique qui tombe en même temps (« zip file closed ») vient de là ; VaeloriaShop 1.0.1+ ne tombe plus.

- Le script demande de confirmer que le serveur est arrêté.
- **Secret du Bridge** : s'il en existe déjà un sur le serveur, il est gardé. Sinon (ou avec `--new-secret`),
  il est demandé deux fois, saisie masquée. C'est la même valeur que dans `BRIDGE_KEYS` côté API :
  - API actuelle (Worker `vaeloria-api` sur workers.dev) : `npx wrangler secret put BRIDGE_KEYS` avec
    `{"factions-1":"<secret>"}` ;
  - API du monorepo (`apps/api`) : `BRIDGE_KEYS=factions-1:<secret>` dans `deploy/.env` (jamais commité).

  Pour en créer un : `openssl rand -hex 32`.
- Les fichiers remplacés sont d'abord archivés dans `kit-backups/configs-AAAAMMJJ-HHMMSS.tar.gz`
  (restauration : `tar -xzf <archive> -C <dossier>/plugins`).
- La liste des fichiers à renvoyer est écrite dans `kit-backups/fichiers-modifies-*.txt` : renvoie-les avec
  FileZilla au même endroit sur le serveur.
- Relancer le script ne change rien : un fichier identique n'est ni sauvegardé ni recopié.

Le script ne touche **pas** à : `WorldGuard/worlds/*/regions.yml` (les régions se règlent par commandes, pour
ne jamais écraser une région créée à la main), `Votifier/` (jeton et clés des sites de vote), données des
joueurs (seul le bloc `zones:` de `VaeloriaShop/data/invest.yml` est remplacé, les comptes restent).

### 4. Démarrer et passer `commands.txt`

Démarre le serveur, puis :

- **Partie CONSOLE**, par RCON (activé dans `server.properties`, port 26688) :
  ```bash
  python3 rcon.py commands.txt
  ```
  L'hôte, le port et le mot de passe RCON sont demandés (ou `RCON_HOST`, `RCON_PORT`, `RCON_PASSWORD`).
  Le mot de passe n'est jamais écrit. `python3 rcon.py --dry-run` affiche les commandes sans rien envoyer.
  Sans RCON : colle les lignes des sections `## CONSOLE` dans la console du panel, une par une.
- **Partie EN JEU** : connecte-toi en opérateur et tape les lignes des sections `## EN JEU` (elles ont besoin
  d'une position ou d'une sélection : redimensionner les régions `spawn` et `invest`, créer le KOTH, coffres,
  mines, arène, parcelles).

### 5. Vérifier

| Quoi | Commande | Attendu |
|---|---|---|
| Bridge | `/vbridge` | file vide, pas d'erreur API |
| Régions | `/rg info -w spawn koth-capture` | parent `koth-volcan`, priorité 20, greeting et farewell |
| KOTH | `/f koth liste` | `gouffre` en 1000 120 0, rayon 5 |
| Warps | `/warp` | 4 entrées « Gouffre de Vælor », warps farm verrouillés sans grade |
| Invest | `/invest` dans la cage aux dalles rouges | dépôt accepté |
| PNJ | `/staff` → PNJ | Banquier en 21 101 62, plus de PNJ des portes |

### 6. Boutique du site et votes

**Boutique du site (déjà reliée par le kit).** Le site vend des points : après un paiement Stripe, l'API met
en file `points give <uuid> <points> site-<commande>`, que VaeloriaBridge récupère toutes les 10 s et exécute
en console (livraison même si le joueur est hors ligne, rejouée si le serveur plante avant l'accusé).
Dans l'autre sens, le kit active `bridge.enabled: true` dans `VaeloriaShop/config.yml` : le serveur envoie
`POINTS` (solde, total dépensé, débans), ce qui affiche la progression et le grade du joueur sur `/boutique`,
ainsi que `SHOP_PURCHASE` et `MERCHANT_RANK`. Le Worker actuel accepte tous ces types.
Vérification : un achat test (Stripe en mode test) doit apparaître dans `plugins/VaeloriaShop/data/points.log`,
et `/vbridge` ne doit montrer aucune erreur.

**Votes.** `VaeloriaVote/config.yml` → `bridge.enabled: true` puis `votes reload` quand le site affiche les
votes. Attention : l'API du monorepo (`apps/api`) rejette tout le lot si elle ne connaît pas un type
d'événement ; avant de basculer le Bridge vers elle, vérifier qu'elle connaît `VOTE`, `POINTS`,
`SHOP_PURCHASE`, `AUCTION_SALE` et `MERCHANT_RANK`.
Sites de vote : mêmes noms et liens dans `VaeloriaVote/config.yml` (`sites:`) et dans `VOTE_SITES`
(`apps/web/content/gameplay.ts`). Les sites 2 et 3 sont encore des exemples.

### Versions des plugins maison

| Plugin | Version à installer | Pourquoi |
|---|---|---|
| VaeloriaShop | **1.0.2** (projet `vaeloria-shop`) | événement `POINTS` et déban en points (boutique du site), ne tombe plus si le Bridge est désactivé, démarre après Multiverse-Core (sinon les arrivées des parcelles du monde `spawn` sont perdues : « unknown world »). La 1.0.0 envoyée le 10 novembre est une ancienne version sans `POINTS` ni déban. |
| VaeloriaFactions | **1.3.1** | voir ci-dessous |
| VaeloriaBridge | 0.1.0, **un seul** jar (`VaeloriaBridge-0.1.0.jar`) | deux jars du même plugin : Paper en charge un au hasard (« Ambiguous plugin name ») |

Le kit suit les configs de VaeloriaShop 1.0.1 et 1.0.2 : section `deban:`, clés de caisse en points (seule la clé Vote,
sur le coffre `coffre_vote` ; Rare et Légendaire attendent leurs coffres dans VaeloriaCrates).

### Plugin Factions

VaeloriaFactions n'est pas dans ce dépôt (projet Gradle séparé `vaeloria-factions`). La 1.3.1 envoie
`koth = "gouffre"` au site ; la 1.3.0 envoyait `"KOTH gouffre"`, que l'API sait aussi relier à la zone
(`apps/api/src/services/kothKey.ts`). Installer la 1.3.1 en retirant la 1.3.0 de `plugins/`.

## Boutiques de joueurs (île marchande)

Les 16 boutiques de l'île marchande sont livrées prêtes à louer dans `kit/plugins/VaeloriaShop/data/` :
`plots.yml` (zone, gamme, comptoir, point d'arrivée) et `plots/<n>.yml` (modèle : l'état des blocs remis en fin de
bail). Ils sont produits depuis la schematic du spawn par `outils/parcelles.mjs`, qui vérifie que chaque porte porte
bien son panneau « Boutique NN » :

```bash
node deploy/minecraft/outils/parcelles.mjs /c/Users/addeg/vaeloria-spawn/out/vaeloria-spawn-fusionne-noel.schem
```

| Boutiques | Panneau | Gamme (`player-shops.tiers`) | Loyer / semaine | Comptoir |
|---|---|---|---|---|
| 02, 04, 05, 07, 10, 11, 12, 16 | Échoppe | `standard` — rang Marchand | 15 000 $ | pot décoré sur le tonneau |
| 03, 06, 13, 14, 15 | Boutique | `premium` — rang Négociant | 35 000 $ | milieu du comptoir |
| 01, 08 | Grande boutique | `prestige` — rang Maître marchand | 75 000 $ | milieu du comptoir |
| 09 | Enseigne | `prestige` | 75 000 $ | milieu du comptoir |

Rangée nord (01 à 08) : portes en Z −5, intérieurs de Z −13 à −6 ; rangée sud (09 à 16) : portes en Z 5,
intérieurs de Z 6 à 13 ; toutes de Y 101 à 105, de X 201 à 273 (monde `spawn`). L'arrivée est juste derrière la porte,
tournée vers le comptoir. La spécialité de chaque parcelle est attribuée par le plugin (la n-ième de la liste),
modifiable dans `/pshop admin`.

`install.sh` ne pose ces fichiers que si le serveur n'a **encore aucune parcelle** (`plots:` absent de `plots.yml`) :
une fois des boutiques louées, `plots.yml` contient les locataires et leurs vitrines, et il n'est plus jamais
remplacé. Un modèle déjà présent sur le serveur est gardé.

## Mettre à jour le kit

Le kit est une copie des vraies configs du serveur. Après un changement fait en jeu, retélécharge le fichier
et recopie-le dans `kit/plugins/` (en remettant `__BRIDGE_SECRET__` à la place du secret du Bridge). Les
valeurs affichées sur le site (prix, power, récompenses, KOTH, votes) sont dans `apps/web/content/gameplay.ts` :
mets-les à jour en même temps.

Les configs du nouveau spawn viennent du projet `vaeloria-spawn` (`out/configs/`, `out/points.json`) :
`VaeloriaPlace/config.yml`, `VaeloriaStaff/import/*.yml` et `VaeloriaNoel/config.yml`.

## Réglages de performance de Paper

Extraits à **fusionner** dans les fichiers générés par Paper 1.21 (une clé absente garde sa valeur par défaut).
Explications, plugins recommandés et liste de contrôle : [docs/MINECRAFT_PERFORMANCE.md](../../docs/MINECRAFT_PERFORMANCE.md).

| Fichier | Destination sur le serveur Minecraft |
|---|---|
| `start.sh` | racine du serveur (`MEM=12G ./start.sh`) |
| `server.properties` | `server.properties` |
| `spigot.yml`, `bukkit.yml` | racine du serveur |
| `config/paper-global.yml`, `config/paper-world-defaults.yml` | dossier `config/` |
