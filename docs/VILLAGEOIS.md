# Villageois : livres chanceux, boosts et œuf de capture (VæloriaVillageois)

Plugin `plugins/vaeloria-villageois` (Paper 1.21.4, Java 21). Il donne aux bibliothécaires des livres tirés dans une table propre au serveur, avec des **boosts payés en émeraudes** qui rendent les livres rares (Protection IV, Tranchant V…) de plus en plus fréquents. Il ajoute aussi un **œuf de capture** pour déplacer les villageois, et un **change d'émeraudes** qui fait de l'émeraude la monnaie des villageois.

## Pour les joueurs

1. **Trouver ou poser un bibliothécaire** : un villageois avec un lutrin. Ses livres viennent de la table du serveur. Sans boost, un Protection IV sort dans moins de 1 % des cas.
2. **Le booster** : accroupi + clic droit sur le bibliothécaire. Un boost coûte **6 émeraudes**. Il relance tous les livres que personne n'a encore achetés et donne au villageois +1 de **chance** (jusqu'à 10). Plus la chance monte, plus les livres rares sortent.
3. **Acheter le livre** en émeraudes, comme un échange normal. Les réductions (zombie soigné, Héros du village) ne s'appliquent pas aux livres. Un livre acheté au moins une fois est **verrouillé** : les boosts suivants ne le relancent plus.
4. **L'œuf de capture** (`/villageois oeuf`, 24 émeraudes), lancé sur un villageois, le transforme en objet. Clic droit sur un bloc pour le relâcher. **Il oublie ses échanges et sa chance** : il reprend un métier près d'un poste de travail, avec de nouveaux livres, et il faut le rebooster.

Si un boost fait sortir un livre marqué `announce`, tout le serveur est prévenu.

| Commande | Effet |
|---|---|
| `/villageois` (`/pnj`) | Aide |
| `/villageois chances [boosts]` | Probabilité de chaque livre pour un nombre de boosts |
| `/villageois oeuf` | Acheter un œuf de capture en émeraudes |
| `/emeraudes` | Acheter ou revendre des émeraudes (Vault) |
| `/villageois give <joueur> [n]` | Admin, console, boutique : donner des œufs de capture |
| `/villageois reload` | Admin : recharger `config.yml` |

## Économie en émeraudes

Les repères viennent de VaeloriaShop (voir `apps/web/content/gameplay.ts`). Un débutant gagne environ 1 500 à 3 000 $/h, un joueur équipé 6 000 à 12 000 $/h. Le livre Toucher de soie du shop coûte 6 000 $ et une pomme dorée 350 $.

| | Valeur | Équivalent |
|---|---|---|
| **1 émeraude, achat** | **250 $** | |
| **1 émeraude, revente** | **100 $** | Bien plus bas que l'achat : un aller-retour fait perdre de l'argent |
| Boost | 6 émeraudes | 1 500 $ |
| Œuf de capture | 24 émeraudes | 6 000 $, le prix du livre Toucher de soie |
| Livres courants (Protection II, Tranchant II…) | 10 à 14 émeraudes | 2 500 à 3 500 $ |
| Livres intermédiaires (Protection III, Toucher de soie…) | 20 à 28 émeraudes | 5 000 à 7 000 $ |
| Protection IV | 56 émeraudes | 14 000 $ |
| Tranchant V | 60 émeraudes | 15 000 $ |
| Raccommodage | 64 émeraudes | 16 000 $ |
| Journée de votes complète (×1) | ~5,6 émeraudes | 1 400 $ |

**Viser un Protection IV précis** coûte en moyenne ~12 boosts, soit ~70 émeraudes. La moitié des joueurs l'obtiennent en 60 émeraudes ou moins, et 1 sur 10 dépasse 130. Avec l'achat du livre, il faut compter **~126 émeraudes, environ 31 500 $**. C'est 3 à 5 h de farm pour un joueur équipé : un vrai objectif, mais pas un achat impulsif. N'importe quel livre rare sort bien plus vite : environ 25 % de chances par livre relancé dès 5 boosts. Le test `ShippedConfigTest` vérifie ces chiffres sur le `config.yml` livré.

Pourquoi ces prix :
- **Le boost est un puits à émeraudes, donc un puits à argent.** Chaque émeraude achetée retire 250 $ de l'économie. Cela compense l'argent qu'injectent les votes, les générateurs et les avant-postes.
- **`max-uses` bas sur les livres rares** (2 ventes avant réapprovisionnement, 1 pour Raccommodage). Un villageois chanceux ne devient pas une imprimerie à Protection IV.
- **Les halls de villageois sont un robinet d'émeraudes gratuit** (blé, papier ou charbon contre des émeraudes). Le plugin multiplie par 1,5 la quantité que les villageois demandent avant de payer une émeraude (`trades.emerald-income-multiplier`). Avec la revente à 100 $, ce robinet reste moins rentable que le farm normal.
- **La chance est perdue au changement de métier.** Sans cette règle, il suffirait de booster un villageois puis de casser son lutrin pour obtenir des relances boostées gratuites.

### Dans VaeloriaShop

Le code de VaeloriaShop n'est pas dans ce dépôt. Deux options :
- **Garder `/emeraudes`** (`exchange.enabled: true`, par défaut), qui passe par Vault, comme le shop.
- **Vendre l'émeraude dans `shop.yml`** au même prix (achat 250 $, revente 100 $), puis passer `exchange.enabled: false`. `/emeraudes` renvoie alors vers `/shop`. L'œuf de capture peut aussi y être vendu avec la commande `villageois give {player} 1` et `capture.egg-price-emeralds: 0`.

Il ne faut pas proposer l'émeraude à deux prix différents : les joueurs achèteraient au moins cher et revendraient au plus cher.

## Protections

- **Capture et boost** ne marchent que là où le joueur pourrait frapper le villageois. Le plugin pose la question à tous les plugins de protection (claims de faction, spawn) avec un événement de dégâts sans effet. Un joueur ne peut donc ni voler ni relancer les villageois d'une base ennemie.
- **Les PNJ d'autres plugins** (Citizens, villageois sans IA ou invulnérables) ne peuvent pas être capturés ni boostés.
- **L'œuf de capture ne fait jamais naître de poussin.** Il est rendu s'il rate sa cible ou si la capture est refusée.
- **Le villageois capturé est un œuf d'apparition bloqué** : il ne sert ni sur un spawner, ni sur un villageois, ni dans un distributeur. Il ne s'empile pas.
- **Un seul joueur à la fois** : impossible de booster un villageois pendant que quelqu'un commerce avec lui.

## Installation

```sh
cd plugins/vaeloria-villageois && gradle build   # build/libs/vaeloria-villageois-1.0.0.jar
```

1. Copier le jar dans `plugins/` du serveur. Vault est conseillé, sinon `/emeraudes` est désactivé.
2. Redémarrer, puis ajuster `plugins/VaeloriaVillageois/config.yml` et lancer `/villageois reload`.
3. Les villageois déjà présents gardent leurs échanges. La table du plugin s'applique aux nouveaux livres : nouveau métier, montée de niveau ou boost.
