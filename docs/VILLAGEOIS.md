# Villageois : farms de bibliothécaires, livres rares, boosts et œuf de capture (VæloriaVillageois)

Plugin `plugins/vaeloria-villageois` (Paper 1.21.4, Java 21). Le but est que les joueurs montent des **farms de bibliothécaires** et finissent, à force, par sortir les bons livres pour leur stuff. Les livres sont nombreux et variés, mais les grands livres (Protection IV, Solidité III, Fortune III…) sont **difficiles à avoir**. Chaque bibliothécaire **s'use** après une quinzaine de livres vendus : il faut alors le **capturer et le relâcher** pour le relancer à zéro. L'émeraude est la monnaie de tout ce système.

## Pour les joueurs

1. **Monter une farm de bibliothécaires** : des villageois avec un lutrin. Leurs livres sont tirés dans trois paliers :
   - **courant** (75 % des livres) : 47 livres variés, de Protection I à Tranchant III, en passant par Châtiment, Appât, Respiration…
   - **intermédiaire** (23,5 %) : 25 livres, par exemple Protection III, Toucher de soie, Tranchant IV, Infinité.
   - **rare** (1,5 % seulement) : Protection IV, Solidité III, Fortune III, Tranchant V, Efficacité V, Puissance V, Butin III, Chute amortie IV, Aura de feu II, Raccommodage.
2. **Relancer** :
   - **gratuitement**, en cassant et reposant le lutrin d'un bibliothécaire novice qui n'a jamais commercé (comme en vanilla) ;
   - **ou en le boostant** : accroupi + clic droit. Un boost coûte **6 émeraudes**. Il relance tous les livres jamais achetés et donne +1 de **chance** au villageois (jusqu'à 10). Plus la chance monte, plus le palier rare sort : jusqu'à 17,5 % des livres. La chance est perdue si le villageois change de métier.
3. **Acheter le livre** en émeraudes. Les réductions (zombie soigné, Héros du village) ne s'appliquent pas. Un livre acheté au moins une fois est **verrouillé** : les boosts suivants ne le relancent plus.
4. **Usure** : un bibliothécaire s'épuise après **12 à 18 livres vendus (15 en moyenne)**. Une fois épuisé, il ne vend plus de livre, ne se réapprovisionne plus en livres et ne peut plus être boosté. Ses autres échanges continuent.
5. **Le relancer avec l'œuf de capture** (`/villageois oeuf`, 24 émeraudes) : on le lance sur le villageois, puis on fait clic droit sur un bloc pour le relâcher. Il **repart à zéro** : sans métier, sans échanges, sans chance, sans usure. Il reprend un métier près d'un poste de travail, avec de nouveaux livres.

Quand un boost fait sortir un livre rare, tout le serveur est prévenu.

| Commande | Effet |
|---|---|
| `/villageois` (`/pnj`) | Aide |
| `/villageois chances [boosts]` | Probabilité de chaque livre pour un nombre de boosts |
| `/villageois oeuf` | Acheter un œuf de capture en émeraudes |
| `/emeraudes` | Acheter ou revendre des émeraudes (Vault) |
| `/villageois give <joueur> [n]` | Admin, console, boutique : donner des œufs de capture |
| `/villageois reload` | Admin : recharger `config.yml` |

## Difficulté

Chiffres vérifiés par `ShippedConfigTest` sur le `config.yml` livré :

| | Sans boost | Chance maximale (10 boosts) |
|---|---|---|
| Palier rare | 1,5 % des livres | 17,5 % |
| Protection IV, Solidité III ou Fortune III, chacun | ~0,19 % | ~2,2 % |
| Tranchant V, Puissance V, Butin III, chacun | ~0,13 % | ~1,5 % |
| Raccommodage | ~0,06 % | ~0,7 % |

Ce que ça donne en pratique :
- **Au lutrin, gratuitement** : environ 1 livre sur 68 est rare. Pour tomber sur un Protection IV précis, il faut en moyenne **~530 livres tirés**. C'est le travail d'une farm, pas d'un après-midi.
- **En boostant**, pour viser un Protection IV précis :

  | Livres relancés par boost | Boosts en moyenne | Émeraudes |
  |---|---|---|
  | 1 (bibliothécaire novice) | ~49 | ~290 |
  | 2 | ~27 | ~165 |
  | 4 (bibliothécaire monté de niveau) | ~15 | ~90 |

  Un bibliothécaire gagne un livre à chacun des 4 premiers niveaux, en commerçant (papier, livres, encre…). Les boosts relancent tous ses livres jamais achetés en même temps : monter ses bibliothécaires de niveau rapporte donc gros.
- **Usure** : avec ~15 livres vendus par cycle, une farm doit régulièrement capturer et relâcher ses bibliothécaires. Chaque cycle coûte un œuf (24 émeraudes) et la remontée de niveau.

Les joueurs peuvent aussi faire naître de nouveaux villageois au lieu de capturer les anciens. C'est plus lent (lits, nourriture, attente), donc l'œuf reste le moyen pratique de relancer une farm.

## Économie en émeraudes

Les repères viennent de VaeloriaShop (voir `apps/web/content/gameplay.ts`). Un débutant gagne environ 1 500 à 3 000 $/h, un joueur équipé 6 000 à 12 000 $/h. Le livre Toucher de soie du shop coûte 6 000 $ et une pomme dorée 350 $.

| | Émeraudes | Équivalent |
|---|---|---|
| **1 émeraude, achat** | | **250 $** |
| **1 émeraude, revente** | | **100 $** (aller-retour toujours perdant) |
| Boost | 6 | 1 500 $ |
| Œuf de capture | 24 | 6 000 $, le prix du livre Toucher de soie |
| Livres courants | 5 à 14 | 1 250 à 3 500 $ |
| Livres intermédiaires | 12 à 28 | 3 000 à 7 000 $ |
| Solidité III, Efficacité V | 40 | 10 000 $ |
| Protection IV | 56 | 14 000 $ |
| Tranchant V | 60 | 15 000 $ |
| Raccommodage | 64 | 16 000 $ |
| Journée de votes complète (×1) | ~5,6 | 1 400 $ |

Pourquoi ces prix :
- **Le boost est un puits à émeraudes, donc un puits à argent.** Chaque émeraude achetée retire 250 $ de l'économie. Cela compense l'argent qu'injectent les votes, les générateurs et les avant-postes.
- **`max-uses` bas sur les livres rares** (2 ventes avant réapprovisionnement), et l'usure par-dessus : un villageois chanceux ne devient pas une imprimerie à Protection IV.
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
- **Usure sans contournement** : un achat sur un villageois épuisé est refusé, même si la fenêtre d'échange était déjà ouverte. Les livres d'un villageois épuisé ne se réapprovisionnent plus, et ses nouveaux livres (montée de niveau) arrivent en rupture de stock.

## Installation

```sh
cd plugins/vaeloria-villageois && gradle build   # build/libs/vaeloria-villageois-1.0.0.jar
```

1. Copier le jar dans `plugins/` du serveur. Vault est conseillé, sinon `/emeraudes` est désactivé.
2. Redémarrer, puis ajuster `plugins/VaeloriaVillageois/config.yml` et lancer `/villageois reload`.
3. Les villageois déjà présents gardent leurs échanges. La table du plugin s'applique aux nouveaux livres : nouveau métier, montée de niveau ou boost. Leur usure compte à partir de l'installation du plugin.
