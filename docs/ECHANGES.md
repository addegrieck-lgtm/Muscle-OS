# Échanges PNJ — VaeloriaEchanges

Plugin Paper 1.21 (`plugins/vaeloria-echanges`), indépendant des autres plugins (aucune dépendance à Vault). **Toute l'économie du plugin est en émeraudes.**

```sh
cd plugins/vaeloria-echanges && gradle build      # → build/libs/vaeloria-echanges-0.1.0.jar
```

Le jar se copie dans `plugins/` du serveur. Les réglages et la table des livres sont dans `plugins/VaeloriaEchanges/config.yml`, rechargés avec `/echanges reload`.

## Ce que fait le plugin

| Mécanique | En jeu |
|---|---|
| **Livres à la chance** | Les bibliothécaires tirent leurs livres dans une table pondérée (commun, rare, épique, légendaire) au lieu de la table vanilla. Protection IV, Tranchant V, Raccommodage… sont rares, payés en émeraudes, sans les remises vanilla (réputation, Héros du village). |
| **Boost à l'émeraude** | **Accroupi + clic droit** sur un bibliothécaire, émeraudes en main : le joueur paie, la **chance** du villageois monte de 1 et son livre est relancé. Plus il est boosté, plus les bons livres sortent. Le coût augmente à chaque boost, jusqu'à un plafond. |
| **Capture à l'œuf** | Un **Œuf de capture** lancé sur un villageois le transforme en objet. Clic droit sur un bloc pour le relâcher **dans ses claims** (ou en zone libre) : partout où le joueur peut construire, jamais dans le claim d'une autre faction. |
| **Pas de livre recyclé** | Un villageois relâché repart au **niveau 1, sans livre**, et ne proposera **plus jamais** les livres qu'il avait : il faut le booster pour qu'il en propose un nouveau. |
| **Livre à durée limitée** | Un livre **disparaît** après ses ventes (Protection IV : 3, légendaire : 1, commun : 12) ou au bout de **48 h** réelles, selon ce qui arrive en premier. Il n'y a pas de réapprovisionnement. Le villageois est alors **épuisé** : plus de livre ni de boost. Le joueur doit le **capturer à l'œuf, le relâcher, puis le booster**. Le livre disparu lui est interdit à vie. Dès qu'un livre a été acheté une fois, on ne peut plus booster le villageois : impossible de relancer son compteur. |
| **Pupitre verrouillé** | Un bibliothécaire qui propose un livre garde son métier : casser son pupitre ne relance plus le livre gratuitement. Pour changer de livre, il faut payer un boost. |

## Commandes

| Commande | Permission | Effet |
|---|---|---|
| `/echanges` | — | Aide |
| `/echanges oeuf [1-16]` | `vaeloria.echanges.use` | Acheter des œufs de capture (24 émeraudes pièce) |
| `/echanges chances` | — | Chances des livres. En visant un bibliothécaire : sa chance, le prix de son prochain boost et ses livres interdits |
| `/echanges give <joueur> [n]` | `vaeloria.echanges.admin` | Donner des œufs de capture (crates, events, boutique via VæloriaBridge) |
| `/echanges reload` | `vaeloria.echanges.admin` | Recharger `config.yml` |

Alias : `/echange`, `/villageois`, `/pnj`. `use` est accordée à tous, `admin` aux opérateurs.

## Calcul de la chance

Poids effectif d'un livre = poids × (1 + chance × facteur de sa rareté). Facteurs par défaut : commun 0, rare 0,1, épique 0,6, légendaire 0,5. La chance va de 0 à 15. Elle retombe à 0 quand un livre légendaire sort.

| Chance | Commun | Rare | Épique | Légendaire | Protection IV |
|---|---|---|---|---|---|
| 0 (villageois neuf) | 73,6 % | 23,6 % | 2,5 % | 0,3 % | 0,7 % |
| 15 (maximum) | 46 % | 36,9 % | 15,4 % | 1,6 % | 4,5 % |

Coût d'un boost : 2 émeraudes, puis +1 par boost, plafonné à 6.

## Économie : combien d'émeraudes ?

### Valeur de l'émeraude

Le marché du serveur (`VaeloriaShop`) compte en dollars. Repère pris dans la boutique : le livre **Toucher de soie y coûte 6 000 $** (rang Marchand). Pour que les deux marchés restent cohérents :

> **1 émeraude ≈ 250 $**. Toucher de soie : 22 à 26 émeraudes au villageois, soit environ 6 000 $.

Réglages recommandés dans `VaeloriaShop` (le plugin n'est pas dans ce dépôt) :

| Réglage du /shop | Valeur conseillée | Pourquoi |
|---|---|---|
| Vente d'émeraudes par le shop | **250 $** l'unité, à partir du rang Colporteur | Permet de convertir des $ en émeraudes. C'est le prix de référence. |
| Rachat d'émeraudes par le shop | **100 $** (40 %) | En dessous du prix d'achat : pas d'aller-retour rentable. Les émeraudes restent une monnaie qu'on dépense chez les villageois, pas un moyen de blanchir des $. |
| Bloc d'émeraude | 9 × ces prix | Même valeur que les émeraudes |

Vérifier aussi les échanges vanilla qui **créent** des émeraudes (fermier : blé → émeraude, etc.). Si 1 émeraude obtenue par ces échanges coûte en récoltes moins de 100 $ au prix de `/vendre`, les joueurs gagneront de l'argent en revendant ces émeraudes au shop. Dans ce cas, baisser le rachat des émeraudes ou ne pas les racheter du tout.

### Coût réel d'un livre (simulation de 20 000 joueurs)

On boost un villageois neuf jusqu'à obtenir le livre voulu, puis on l'achète :

| Objectif | Boosts en moyenne | Émeraudes de boost (moyenne / médiane / 9 joueurs sur 10) | + prix du livre | Total ≈ en $ |
|---|---|---|---|---|
| Un livre rare ou mieux | 3 | 11 / 5 / 26 | 14–26 | ~8 000 $ |
| Un livre épique ou mieux | 10 | 48 / 38 / 98 | 30–52 | ~22 000 $ |
| **Protection IV** | 28 | 156 / 116 / 337 | 36–44 | **~49 000 $** |
| Tranchant V | 47 | 265 / 194 / 586 | 40–48 | ~77 000 $ |
| Raccommodage | 99 | 579 / 404 / 1 292 | 56–64 | ~160 000 $ |

Avec les revenus indiqués sur le site (6 000 à 12 000 $/h en milieu de partie), **un Protection IV représente 4 à 8 h de jeu**. Une armure complète en Protection IV demande 4 livres, soit l'équivalent d'un générateur de vache ou de blaze (180 000 à 200 000 $). Un bibliothécaire Protection IV ne vend que **3 exemplaires en 48 h au plus**, puis son livre disparaît. Il faut alors le capturer (œuf : 24 émeraudes), le relâcher et le booster de nouveau, et il ne reproposera plus jamais Protection IV. Pour en vendre d'autres, il faut un autre villageois. Compter environ **100 émeraudes par livre Protection IV** (~25 000 $) : boosts et œuf partagés sur 3 exemplaires, plus ~40 émeraudes d'achat. La capture à l'œuf ne permet pas non plus de déplacer un villageois sans perdre son livre.

Pour rendre les livres plus ou moins accessibles, il suffit de modifier `config.yml` : `weight` (rareté), `price` (prix d'achat), `luck-factor` (effet du boost), `boost.cost-*` (prix du boost).

## Sécurité et fiabilité

- Œufs de capture et villageois capturés sont reconnus par un marqueur invisible (`PersistentDataContainer`), jamais par leur nom. Renommer un œuf à l'enclume ne crée rien.
- Seules les émeraudes **ordinaires** sont prises en paiement : une émeraude renommée ou marquée par un autre plugin (clé de coffre…) ne l'est jamais. Si le joueur n'a pas assez d'émeraudes, rien n'est retiré.
- Capture refusée sur un bébé, sur un villageois en plein échange, et (par défaut) là où un plugin de protection interdit de frapper ce villageois (claims de faction, régions WorldGuard). Le plugin envoie un coup « fictif » de 0 dégât et regarde s'il est annulé. Après un refus, l'œuf de capture est rendu.
- Relâche permise seulement là où le joueur peut construire : le plugin soumet un placement de bloc « fictif » aux plugins de protection. Dans ses propres claims ça passe ; dans le claim d'une autre faction c'est refusé. Si un plugin bloque l'apparition des mobs à cet endroit, le villageois capturé est rendu au joueur.
- Le villageois capturé est retiré **avant** que l'objet ne soit donné, et l'objet est retiré de la main **avant** que le villageois relâché n'apparaisse : pas de duplication possible. L'objet ne peut servir ni d'œuf d'apparition vanilla (bébé, spawner) ni dans un distributeur.
- Un œuf de capture ne fait jamais éclore de poussin.
- Captures, boosts et dons d'œufs sont journalisés dans la console.

## Tests

`gradle test` : tirage pondéré et effet de la chance (200 000 tirages), livres interdits, fourchettes de prix, validation de la table, coût des boosts, mémoire des livres interdits, disparition des livres (délai, ventes, temps restant).
