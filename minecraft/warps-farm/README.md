# Warps farm par grade

Chaque grade payant a son propre warp farm : une salle fermée avec des cellules à spawner de chaque côté d'une allée centrale. Plus le grade est élevé, plus la salle est grande et plus elle a de spawners. Le mob le plus fort d'un warp est celui de son grade. Un warp peut aussi contenir des mobs plus faibles, jamais un mob plus fort.

| Grade | Warp | Mob du grade | Spawners | Taille (L × l × h) |
|---|---|---|---|---|
| Guerrier | `farm-guerrier` | Squelette | 2 Squelette, 2 Zombie | 27 × 36 × 13 |
| Seigneur | `farm-seigneur` | Pigman | 4 Pigman, 1 Squelette, 1 Zombie | 29 × 49 × 14 |
| Roi | `farm-roi` | Creeper | 4 Creeper, 2 Pigman, 2 Squelette | 33 × 62 × 17 |
| VÆLORIAN | `farm-vaelorian` | Enderman | 4 Enderman, 4 Creeper, 2 Pigman | 37 × 75 × 19 |

Joueur est le grade gratuit : il n'a pas de warp farm.

Aperçus : `previews/farm-*.png` (plan) et `previews/coupe-cellule.png` (coupe d'une cellule).

## Identité visuelle

Les salles reprennent l'identité visuelle du spawn, la même que l'[Île Marchande](../ile-commerciale/README.md) :

| Élément | Dans les warps farm |
|---|---|
| Murs | briques de blackstone polie, piliers et toits en deepslate tiles |
| Chemin | allée centrale en deepslate tiles bordée de polished deepslate, comme les chemins du spawn, avec un losange rouge devant chaque cellule |
| Arrivée | plateforme ronde du spawn : tuff, anneau de red nether bricks, polished deepslate, et un bloc de redstone au centre |
| Blason | grand V noir sur calcite, cerclé de rouge, sur le mur de l'abside |
| Rouge | bannières rouges, red nether bricks, blocs de redstone |
| Bois, lumière | panneaux en pale oak, lanternes suspendues, end rods |

Le filet de grade change de matière selon le grade : fer pour Guerrier et Seigneur, or pour Roi (sa couleur sur le site) et redstone pour VÆLORIAN. On le retrouve sur la façade des cellules, au faîte du toit et de part et d'autre de la plateforme d'arrivée.

Le joueur arrive au sud, au centre de la plateforme, face au nord. L'allée centrale mène à l'abside, où le blason domine une estrade. Les cellules les plus fortes sont au fond, près de l'abside.

## Fonctionnement d'une cellule

Chaque spawner est dans une cellule fermée et sombre de 9 × 8 blocs. L'eau pousse les mobs vers l'avant de la cellule. Ils tombent de 3 blocs dans une fosse, sans dégâts. Le joueur se place dans la fente de 2 blocs de haut, au pied du mur, et frappe les jambes des mobs :

- **Les mobs ne peuvent pas atteindre le joueur.** Le linteau au-dessus de la fente coupe leur ligne de vue. Les squelettes ne tirent donc pas et les creepers ne gonflent pas. Les endermen ne voient pas le regard du joueur et restent calmes.
- **Les mobs ne peuvent pas sortir.** Ils font plus de 1,5 bloc de haut et la fente est trop basse pour eux. Les zombies et les pigmen sont générés sans bébés : leur SpawnData contient `IsBaby:0b`.
- **Le joueur ramasse le butin directement.** Les objets tombent dans la fosse, à portée de ramassage.
- **Cellules enderman : pas d'eau**, car l'eau blesse les endermen et les fait se téléporter. Le spawner est avancé pour qu'une partie des endermen apparaisse directement au-dessus de la fosse.

Réglages des spawners : vanilla, avec 4 mobs par cycle, 6 mobs proches au maximum et un joueur dans un rayon de 16 blocs. Un plugin de spawners ou de stack (WildStacker, RoseStacker…) peut les remplacer sans toucher à la salle.

## Installation sur le serveur

Il faut WorldEdit (ou FAWE) et EssentialsX (ou tout autre plugin de warps), plus LuckPerms et WorldGuard pour les réglages ci-dessous. Le mieux est de poser les warps dans un monde dédié (monde vide), hors des zones de claim.

1. Copier `schematics/*.schem` dans `plugins/WorldEdit/schematics/` (`plugins/FastAsyncWorldEdit/schematics/` avec FAWE).
2. Pour chaque warp, se placer à l'endroit voulu en regardant vers le nord, puis :
   ```
   //schem load farm-roi
   //paste
   /setwarp farm-roi
   ```
   L'origine de la schématique est le point d'arrivée : après `//paste`, le joueur est déjà debout sur le losange, face à l'allée. `/setwarp` enregistre donc la bonne position et la bonne orientation. Laisser une bonne distance entre deux warps : plus de 32 blocs, la portée des spawners.
3. Accès par grade avec EssentialsX (`per-warp-permission: true` dans `config.yml`). Chaque grade a son warp et ceux des grades inférieurs :
   ```
   lp group guerrier permission set essentials.warp true
   lp group guerrier permission set essentials.warps.farm-guerrier true
   lp group seigneur permission set essentials.warps.farm-seigneur true
   lp group roi permission set essentials.warps.farm-roi true
   lp group vaelorian permission set essentials.warps.farm-vaelorian true
   ```
   Si les groupes n'héritent pas les uns des autres (`lp group seigneur parent add guerrier`…), donner aussi à chaque groupe les permissions des warps inférieurs.
4. Protection WorldGuard, une région par salle (sélection `//pos1` / `//pos2` sur toute la salle) :
   ```
   /rg define warp-farm-roi
   /rg flag warp-farm-roi creeper-explosion deny
   /rg flag warp-farm-roi other-explosion deny
   /rg flag warp-farm-roi pvp deny
   ```
   Ne pas mettre `mob-spawning deny`, qui bloquerait aussi les spawners.

## Modifier les warps

Toute la salle est générée par `build.py` : nombre et ordre des spawners, matières, tailles. Après une modification :

```sh
python3 minecraft/warps-farm/build.py   # régénère schematics/ et previews/ (Pillow requis pour les aperçus)
```

Les schématiques sont au format Sponge v2 (`.schem`), en Minecraft 1.21.4 comme le gabarit du spawn, à cause des panneaux en pale oak.

**À valider sur un serveur de test** avant l'ouverture : les cellules suivent les règles vanilla 1.21, mais aucune n'a encore été posée en jeu.
