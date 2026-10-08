# LuckPerms — grades et permissions de VÆLORIA

`setup.txt` crée tous les groupes, préfixes, permissions et tracks. Une ligne = une commande console (sans `/`).

## Prérequis

| Plugin | Rôle |
|---|---|
| LuckPerms (Bukkit/Paper) | Groupes, permissions, préfixes |
| EssentialsX | Commandes joueurs/staff, kits (`/kit`), homes |
| EssentialsX Chat | Affiche les préfixes LuckPerms dans le chat |

Les permissions de **factions** ne sont pas incluses : elles dépendent du plugin choisi. Les donner à `default`.

## Installation

1. Installer les plugins, démarrer le serveur une fois.
2. Charger les grades, au choix :
   - **en une commande** : déposer `vaeloria.json.gz` dans `plugins/LuckPerms/`, puis taper en console `lp import vaeloria.json.gz`. L'import remplace le contenu des groupes du même nom : à faire sur une installation neuve ;
   - **ligne par ligne** : coller le contenu de `setup.txt` dans la console (relancer le script ne casse rien).

   `vaeloria.json.gz` est généré depuis `setup.txt` : après toute modification, `python3 build-import.py setup.txt vaeloria.json.gz`.
3. Se donner le grade fondateur : `lp user <pseudo> parent add fondateur`.
4. Compléter `plugins/Essentials/config.yml` (voir plus bas), puis `/essentials reload`.

## Structure

```
default (tout le monde)
 └ joueur (0 point)
    └ guerrier (15) └ seigneur (35) └ roi (65) └ vaelorian (100)

helper └ moderateur └ admin └ fondateur
```

Chaque grade hérite du précédent. Le préfixe affiché est celui du groupe de plus haute priorité : un modérateur VÆLORIAN s'affiche `[Modo]`. Les clés `joueur`, `guerrier`, `seigneur`, `roi`, `vaelorian` sont celles de `rank_thresholds` : le site les attribue avec `lp user {uuid} parent add <clé>`.

| Groupe | Préfixe | Avantages |
|---|---|---|
| default | — | spawn, 1 home, tpa, msg, mail, warps, économie, `/kit depart` |
| guerrier | `[Guerrier]` | 2 homes, `/kit guerrier`, `/workbench` |
| seigneur | `[Seigneur]` | 3 homes, `/kit seigneur`, `/hat` |
| roi | `[Roi]` | 4 homes, `/kit roi`, `/nick`, couleurs dans le chat |
| vaelorian | `[VÆLORIAN]` | 5 homes, `/kit vaelorian`, pseudo coloré, formats et RGB dans le chat |
| helper | `[Helper]` | reçoit `/helpop`, mute, kick, `/seen` |
| moderateur | `[Modo]` | ban/tempban, jail, vanish, invsee, tp, socialspy, whois, spectateur |
| admin | `[Admin]` | tout EssentialsX et vanilla, `/vbridge`, LuckPerms en **lecture seule** |
| fondateur | `[Fondateur]` | `*` (tout, dont la gestion des grades) |

Les grades payants ne donnent **aucun avantage de combat** (`docs/MONETIZATION.md`) : volontairement absents, `/fly`, `/heal`, `/feed`, `/back`, `/near`, `/enderchest` à distance.

Seul le fondateur peut modifier les grades : un admin ne peut pas se promouvoir lui-même.

## EssentialsX : `plugins/Essentials/config.yml`

```yaml
sethome-multiple:
  default: 1
  guerrier: 2
  seigneur: 3
  roi: 4
  vaelorian: 5
```

Les kits `depart`, `guerrier`, `seigneur`, `roi`, `vaelorian` sont à créer dans `plugins/Essentials/kits.yml` (ou en jeu : `/createkit <nom> <délai>` avec l'inventaire voulu).

## EssentialsX Chat

```yaml
chat:
  format: '{PREFIX}{DISPLAYNAME}&7: &f{MESSAGE}'
```

## LuckPerms : `plugins/LuckPerms/config.yml`

```yaml
server: vaeloria
primary-group-calculation: parents-by-weight
```

Passer `storage-method` à `mysql`/`postgresql` seulement le jour où plusieurs serveurs doivent partager les grades.

## Commandes utiles

| Action | Commande |
|---|---|
| Donner un grade staff | `lp user <pseudo> parent add moderateur` |
| Retirer un grade | `lp user <pseudo> parent remove moderateur` |
| Promouvoir sur un track | `lp user <pseudo> promote staff` |
| Voir les groupes d'un joueur | `lp user <pseudo> info` |
| Éditeur web | `lp editor` |
