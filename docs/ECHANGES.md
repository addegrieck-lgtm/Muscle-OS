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
| **Capture à l'œuf** | Un **Œuf de capture** lancé sur un villageois le transforme en objet. Clic droit sur un bloc pour le relâcher ailleurs. |
| **Pas de livre recyclé** | Un villageois relâché repart au **niveau 1, sans livre**, et ne proposera **plus jamais** les livres qu'il avait : il faut le booster pour qu'il en propose un nouveau. |
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

Poids effectif d'un livre = poids × (1 + chance × facteur de sa rareté). Facteurs par défaut : commun 0, rare 0,15, épique 1, légendaire 1. La chance va de 0 à 15. Elle retombe à 0 quand un livre légendaire sort.

| Chance | Commun | Rare | Épique | Légendaire | Protection IV |
|---|---|---|---|---|---|
| 0 (villageois neuf) | 71,6 % | 23 % | 4,9 % | 0,5 % | 1,4 % |
| 15 (maximum) | 30,8 % | 32,1 % | 33,7 % | 3,4 % | 9,6 % |

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
| Un livre rare ou mieux | 2,5 | 8 / 5 / 20 | 14–26 | ~7 000 $ |
| Un livre épique ou mieux | 5 | 23 / 20 / 50 | 30–52 | ~16 000 $ |
| **Protection IV** | 15 | 77 / 61 / 166 | 36–44 | **~29 000 $** |
| Tranchant V | 27 | 146 / 106 / 322 | 40–48 | ~47 000 $ |
| Raccommodage | 55 | 314 / 224 / 700 | 56–64 | ~94 000 $ |

Avec les revenus indiqués sur le site (6 000 à 12 000 $/h en milieu de partie), **un Protection IV représente 3 à 5 h de jeu**. Une armure complète en Protection IV demande 4 livres, soit l'équivalent d'un générateur de blaze (180 000 $) en comptant large. Une fois un bibliothécaire Protection IV obtenu, il revend son livre (3 par réapprovisionnement, comme en vanilla) au seul prix du livre. Ce villageois devient donc un bien précieux à protéger des raids, et la capture à l'œuf ne permet pas de le déplacer sans perdre son livre.

Pour rendre les livres plus ou moins accessibles, il suffit de modifier `config.yml` : `weight` (rareté), `price` (prix d'achat), `luck-factor` (effet du boost), `boost.cost-*` (prix du boost).

## Sécurité et fiabilité

- Œufs de capture et villageois capturés sont reconnus par un marqueur invisible (`PersistentDataContainer`), jamais par leur nom. Renommer un œuf à l'enclume ne crée rien.
- Seules les émeraudes **ordinaires** sont prises en paiement : une émeraude renommée ou marquée par un autre plugin (clé de coffre…) ne l'est jamais. Si le joueur n'a pas assez d'émeraudes, rien n'est retiré.
- Capture refusée sur un bébé, sur un villageois en plein échange, et (par défaut) là où un plugin de protection interdit de frapper ce villageois (claims de faction, régions WorldGuard). Le plugin envoie un coup « fictif » de 0 dégât et regarde s'il est annulé. Après un refus, l'œuf de capture est rendu.
- Le villageois capturé est retiré **avant** que l'objet ne soit donné, et l'objet est retiré de la main **avant** que le villageois relâché n'apparaisse : pas de duplication possible. L'objet ne peut servir ni d'œuf d'apparition vanilla (bébé, spawner) ni dans un distributeur.
- Un œuf de capture ne fait jamais éclore de poussin.
- Captures, boosts et dons d'œufs sont journalisés dans la console.

## Tests

`gradle test` : tirage pondéré et effet de la chance (200 000 tirages), livres interdits, fourchettes de prix, validation de la table, coût des boosts, mémoire des livres interdits.
