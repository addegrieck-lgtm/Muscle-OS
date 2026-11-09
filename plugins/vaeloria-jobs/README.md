# VaeloriaJobs

Plugin de métiers de VÆLORIA (Paper 1.21). 4 métiers, et pour chacun un **arbre de protection** : chaque niveau de métier donne 1 point à dépenser dans l'arbre, et chaque nœud accorde un bonus **100 % vanilla**.

## Règle : rien qui ne soit pas vanilla

Un nœud ne peut donner que :

- un **modificateur d'attribut Minecraft** (même effet que `/attribute`) : `armor`, `armor_toughness`, `max_health`, `burning_time`, `explosion_knockback_resistance`, `fall_damage_multiplier`, `safe_fall_distance`, `oxygen_bonus`, `movement_efficiency`, `water_movement_efficiency`… ;
- un **effet de potion vanilla permanent** (ambiant, sans particules).

Pas d'objets custom, pas de double drop, pas de dégâts inventés. Les modificateurs sont **transitoires** : ils ne sont jamais écrits dans le fichier du joueur, donc retirer le plugin retire les bonus.

`knockback_resistance` n'est pas utilisé : VaeloriaCombat l'ignore en PvP (`ignore-knockback-resistance: true`). Les arbres utilisent `explosion_knockback_resistance` (souffle de TNT et de creepers), utile en raid.

## Les métiers

| Métier | Arbre | XP gagnée en… |
|---|---|---|
| **Mineur** | Rempart de pierre | minant la roche naturelle et les minerais |
| **Farmer** | Racines | récoltant les cultures **mûres**, cassant melons/citrouilles/cannes, faisant se reproduire les animaux |
| **Chasseur** | Instinct | tuant des monstres, pêchant |
| **Forgeron** | Alliage | fabriquant armures et outils, fondant au four, enchantant, brassant, améliorant en netherite |

## Les arbres

Même forme pour les 4 : une racine, deux branches de 3 nœuds, un tronc, et un nœud ultime en haut. 9 nœuds, **30 points** = coût total = points du niveau 30. Au niveau maximum, l'arbre est complet ; avant, il faut choisir.

```
        [ultime niv.25 · 8 pts]
   [niv.16 · 4]     │     [niv.16 · 4]
   [niv.10 · 3]  [niv.8 · 3]  [niv.10 · 3]
   [niv.3 · 2]      │     [niv.3 · 2]
             [racine niv.1 · 1]
```

| Arbre | Bonus complets |
|---|---|
| Mineur — Rempart de pierre | +1,5 armure, +1 robustesse, -15 % combustion, -10 % chute, +1 bloc de chute sans dégâts, +2 apnée, +15 % résistance au souffle |
| Farmer — Racines | +2 cœurs, +0,5 armure, +0,5 robustesse, -15 % combustion, -15 % chute, +25 % terrain difficile, +10 % résistance au souffle |
| Chasseur — Instinct | +1 cœur, +1 armure, +0,5 robustesse, -10 % chute, +1 bloc de chute sans dégâts, +1 apnée, nage, terrain difficile, +15 % résistance au souffle |
| Forgeron — Alliage | **Résistance au feu permanente** (ultime), +1 armure, +1 robustesse, +½ cœur, -25 % combustion, +1 apnée, +15 % résistance au souffle |

**Les 4 métiers au maximum** : +4 armure (une armure diamant complète en donne 20), +3 robustesse, +3,5 cœurs, résistance au feu. Tout est réglable dans `config.yml` ; tester en PvP avant d'ouvrir. `effects.worlds` permet de couper les bonus dans certains mondes (arène).

## Progression

XP du niveau n = `20 × n^1,5`. Niveau 10 ≈ 2 900 XP, niveau 20 ≈ 14 600 XP, niveau 30 ≈ 41 000 XP (≈ 75 h de minage pour un métier). Niveaux 10, 20 et 30 annoncés au serveur.

Anti-abus :

- les blocs **posés** par un joueur, **formés** par lave + eau (générateurs) ou **déplacés** par un piston ne donnent pas d'XP (suivi dans les données des chunks, conservé aux redémarrages) ;
- cultures : XP seulement quand elles sont mûres ;
- monstres de **spawner** : XP × 0,25 ;
- fabrication : seulement des objets qu'on ne peut pas « dé-fabriquer » (pas de boucle lingot ↔ bloc) ; en shift-clic, on compte ce qui arrive vraiment dans l'inventaire ;
- action annulée (claim, protection) ou mode créatif : pas d'XP.

## Commandes

| Commande | Effet |
|---|---|
| `/metiers` | Menu des métiers et total des protections actives |
| `/metiers <metier>` | Arbre d'un métier (clic = débloquer) |
| `/metiers info [joueur]` | Niveaux, XP, nœuds |
| `/metiers xp <joueur> <metier> <quantité>` | Donner de l'XP (`vaeloria.jobs.admin`) |
| `/metiers reset <joueur> [metier] [wipe]` | Rendre les points (XP gardée) ; `wipe` efface aussi l'XP (`vaeloria.jobs.admin`) |
| `/metiers reload` | Recharger la config et recalculer les bonus (`vaeloria.jobs.admin`) |

Alias : `/metier`, `/jobs`, `/job`. Un joueur peut réinitialiser lui-même un arbre une fois toutes les 24 h (bouton dans l'arbre, avec confirmation).

## Configurer un arbre

```yaml
jobs:
  mineur:
    nodes:
      peau_de_roc:
        name: "Peau de roc"
        icon: STONE
        slot: 22          # case du menu, 0 à 44
        level: 8          # niveau de métier requis
        cost: 3           # points
        requires: [pied_sur]
        links: [31]       # cases des branches dessinées vers les parents
        effects:
          - { attribute: armor, amount: 1 }
          - { attribute: burning_time, amount: -0.15, operation: add_multiplied_base }
          - { potion: fire_resistance, level: 1 }
```

Au chargement, l'arbre est vérifié (cases en double, prérequis inconnus, boucles, attributs ou potions qui n'existent pas en vanilla). Un arbre invalide est désactivé avec l'erreur dans la console. Si un arbre change, les nœuds d'un joueur qui ne sont plus atteignables lui sont retirés et ses points rendus.

## Technique

- Données : `plugins/VaeloriaJobs/players/<uuid>.yml`, chargées avant la connexion, écrites dans l'ordre par un seul fil et de façon atomique ; sauvegarde toutes les minutes et à la déconnexion.
- Les potions permanentes sont reconnues à « infinie + ambiante » et remises toutes les 5 s si le lait ou la mort les a retirées.

```sh
gradle build   # build/libs/vaeloria-jobs-1.0.0.jar + tests
```
