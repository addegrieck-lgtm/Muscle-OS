# Île Marchande — hall commercial de 16 boutiques + ponton

![Aperçu](apercu-isometrique.png)

Une île séparée du spawn, reliée par un ponton en bois. Seuls le ponton et l'île sont fournis : le spawn n'est pas touché.

## Contenu de l'île

- **Hall commercial** (75 × 29 blocs) : une galerie couverte d'une verrière, avec une rotonde centrale à coupole et une fontaine.
- **16 boutiques** de 4 tailles différentes, avec vitrine, store de couleur, panneau numéroté « À louer », étagères (tonneaux), comptoir et éclairage :

  | Type | Intérieur (L × P × H) | Nombre | Boutiques |
  |---|---|---|---|
  | Échoppe | 5 × 8 × 5 | 8 | 02, 04, 05, 07, 10, 11, 12, 16 |
  | Boutique | 7 × 8 × 5 | 5 | 03, 06, 13, 14, 15 |
  | Grande boutique | 9 × 8 × 5 | 2 | 01, 08 |
  | Enseigne | 11 × 8 × 5 | 1 | 09 |

- **Esplanade d'arrivée** avec une arche d'accueil, des cerisiers en bac, des bancs et des lampadaires.
- **Place de restauration** au sud : 3 kiosques et des tables.
- **Belvédère** au nord : un kiosque couvert avec des bancs, qui donne sur la mer.
- **Phare** à l'est, avec une échelle intérieure, une galerie et une lanterne.
- Des jardins, une quarantaine d'arbres, des fleurs et des lampadaires tout autour.
- **Ponton** de 7 de large avec garde-corps, pieux jusqu'au fond, lanternes et une plateforme de repos avec des bancs à mi-chemin.

![Plan des boutiques](plan-boutiques.png)

## Fichiers

| Fichier | Contenu | Point de collage (là où tu te tiens) |
|---|---|---|
| `ile-commerciale-complete.schem` | Ponton (55 blocs) + île | sur le premier bloc du ponton, côté spawn |
| `ile-commerciale-seule.schem` | Île + embarcadère sur la plage | à l'endroit où le ponton touche l'île |
| `ponton-module-8.schem` | Tronçon de ponton de 8 blocs | au début du tronçon |
| `shops.json` | Coordonnées des 16 boutiques (intérieur min/max, porte), relatives au point de collage | — |
| `generate.py` | Générateur (Python 3, sans dépendance) | — |

Format Sponge v2 (WorldEdit 7 / FastAsyncWorldEdit), Minecraft 1.21. Taille du schematic complet : 183 × 48 × 109.

## Collage en jeu

Le ponton part **vers l'est (+X)** et l'île se trouve au bout. Les hauteurs sont calculées pour une mer au niveau 62 : le plancher du ponton est en y 63, le sol de l'île en y 64, et la base de l'île descend jusqu'en y 42.

1. Copier les `.schem` dans `plugins/WorldEdit/schematics/` (ou `plugins/FastAsyncWorldEdit/schematics/`).
2. Se placer au bord du spawn, **les pieds en y 64** (le niveau du dessus du plancher), face à la mer.
3. Lancer `//schem load ile-commerciale-complete`.
4. Si l'île doit partir dans une autre direction : `//rotate 90` (vers le sud), `//rotate 180` (vers l'ouest) ou `//rotate 270` (vers le nord).
5. Lancer **`//paste -a`**. Le `-a` est indispensable : sans lui, l'air du schematic creuse un trou dans l'océan.

Pour un ponton plus long, il y a deux possibilités :
- Regénérer le schematic avec la bonne longueur : `python3 generate.py --ponton 120`.
- Coller l'île seule (`ile-commerciale-seule`), puis prolonger le ponton avec le module : se placer sur le premier bloc, `//schem load ponton-module-8`, `//paste -a`, puis `//stack <n> <direction>`.

## Boutiques à louer

`shops.json` donne pour chaque boutique les coins de son intérieur, relatifs au point de collage. Pour créer une région WorldGuard (par exemple `boutique-01`), il faut ajouter le point de collage aux coordonnées `min` et `max` de la boutique, puis lancer `//pos1`, `//pos2` et `/rg define boutique-01`. Si le schematic a été tourné, les axes X et Z tournent avec lui.

Les panneaux des boutiques sont cirés : seul un admin peut les modifier, par exemple pour remplacer « À louer » par le nom du locataire.
