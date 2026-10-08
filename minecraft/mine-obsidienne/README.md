# Mine d'obsidienne

La mine reste celle déjà validée, sans changement :

- un bloc d'obsidienne de 21 × 15 × 8 au centre exact de l'enceinte ;
- un couloir vide d'un bloc tout autour, du sol à la voûte ;
- un mur fermé, sans sortie, coiffé d'une voûte en ogive en verre rubis sur nervures de pierre noire : on ne peut pas sortir par le haut ;
- l'arrivée se fait sur une plateforme 5 × 5 suspendue au centre, au-dessus de l'obsidienne, avec 3 blocs de chute ;
- le blason VÆLORIA est dans les deux pignons.

## Dans la grotte du spawn

`vaeloria-mine-obsidienne-grotte.schem` pose cette mine dans une grotte creusée dans la roche de l'île du spawn, sous la porte de guerre (nord). C'est l'endroit où l'île est la plus épaisse.

| | Repère du spawn (centre de l'arbre, niveau de marche) |
|---|---|
| Sol de l'enceinte | y = -40 |
| Centre de l'obsidienne | x = 0, z = -53 |
| Arrivée (pieds du joueur) | **x = 0, y = -28, z = -53** |
| Plafond de la grotte | y = -6 au plus haut, soit au moins 5 blocs de roche sous la surface |
| Emprise du module | x -18 → 19, y -47 → -6, z -71 → -35 |

La grotte n'a aucune ouverture : on y arrive uniquement par le warp, comme avant. Elle est entièrement éclairée par des shroomlights dans la roche, donc aucun mob n'y apparaît. Le sol est en tuff, et la roche porte les mêmes veines rubis et argent que le reste de l'île. Des stalactites pendent au-dessus de la voûte, visibles à travers le verre rubis. Là où l'île est trop mince sous la grotte, une bosse de roche est ajoutée sous l'île, avec des pointes de dripstone.

Aperçus : `apercu-grotte-coupe-nord-sud.png` (coupe x = 0) et `apercu-grotte-coupe-est-ouest.png` (coupe z = -53).

### Pose sur le serveur

1. Copier `vaeloria-mine-obsidienne-grotte.schem` dans `plugins/WorldEdit/schematics/` (ou `plugins/FastAsyncWorldEdit/schematics/`).
2. Se placer au **centre de l'arbre, au niveau de marche**, comme pour les autres modules du spawn. L'orientation n'a pas d'importance, mais il ne faut pas tourner le presse-papiers.
   ```
   //schem load vaeloria-mine-obsidienne-grotte
   //paste
   ```
   Il ne faut pas utiliser `-a` : l'air du module creuse la grotte. Le module s'arrête 6 blocs sous la surface, donc rien de ce qui est au-dessus n'est touché, ni la porte de guerre ni l'allée.
3. Se téléporter au point d'arrivée, à 0 / -28 / -53 par rapport au centre de l'arbre (sur la pierre de magnétite), puis :
   ```
   /setwarp mine-obsidienne
   ```
4. Recommandé : protéger le mur, la voûte et la plateforme avec WorldGuard, en ne laissant cassable que l'obsidienne, et confier la régénération du bloc à un plugin de mine.

Si le spawn a été retouché à la main sous la porte de guerre, à l'intérieur de l'emprise ci-dessus, ces retouches seront écrasées par la roche du gabarit.

### Seule, sans grotte

`vaeloria-mine-obsidienne.schem` contient la mine seule. Son point de collage est le point d'arrivée : `//paste` à l'endroit du warp, puis `/setwarp`.

## Régénérer

```sh
python3 minecraft/mine-obsidienne/generate.py   # mine seule
python3 minecraft/mine-obsidienne/grotte.py     # mine dans la grotte du spawn (vérifie aussi : grotte fermée et éclairée)
```

Les deux scripts réutilisent `minecraft/spawn/generate.py`, ce qui garantit le même format (Sponge v2, Minecraft 1.21.4) et la même île.
