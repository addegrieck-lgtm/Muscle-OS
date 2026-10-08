# Boutique — points et grades

## Règle de base

**1 € dépensé = 1 point**, sur le prix réellement payé, arrondi à l'inférieur (`12,99 €` → 12 points). Le ratio est un réglage (`/admin/shop/ranks` → « Points par euro »).

Les points sont crédités **uniquement** quand le webhook signé du prestataire confirme le paiement (`handlePaymentSucceeded` → `fulfillOrder`). La page « paiement réussi » du navigateur ne crédite rien.

## Calcul (`apps/api/src/services/shop/pricing.ts`)

1. Prix : prix catalogue, moins la **meilleure** réduction applicable (% ou fixe ; pas de cumul ; jamais sous 0).
2. Points de base : `products.points` s'il est renseigné (points indépendants du prix), sinon `floor(prix payé × points par euro)`.
3. Bonus : le **plus grand** bonus de points applicable s'ajoute (exemple : Pack 3 Spawners 15 € → 15 + 3 = **18 points** pendant « WEEK-END VÆLORIA »).
4. Le résultat est figé dans `order_items.points_per_unit` au moment de la commande.

## Grand livre

Chaque mouvement est une ligne de `point_transactions` :

```
PLAYER  : 55555555-…  (UUID Minecraft, jamais le pseudo)
DELTA   : +15
LABEL   : Pack 3 Spawners
SOURCE  : order VAL-2026-000042 (order_item …)
SOLDE   : 73
DATE    : …
```

Motifs : `purchase`, `refund` (négatif), `promotion_bonus`, `admin_adjustment` (avec motif saisi, visible par le joueur). La page `/compte/points` affiche ce grand livre tel quel : le joueur sait exactement pourquoi il a ce solde.

## Grades

Configuration initiale (exemple, en base dans `rank_thresholds`) :

| Grade | Seuil | Contenu livré (produit associé) |
|---|---|---|
| Joueur | 0 | — |
| Guerrier | 15 | Grade Guerrier + Kit Guerrier |
| Seigneur | 35 | Grade Seigneur + Kit Seigneur |
| Roi | 65 | Grade Roi + Kit Roi |
| VÆLORIAN | 100 | Grade VÆLORIAN + Kit VÆLORIAN |

- Le site lit les seuils via l'API : **aucun seuil n'est écrit dans le front**.
- Quand le solde atteint un ou plusieurs seuils, chaque grade atteint est enregistré (`player_ranks`) et livré **dans l'ordre croissant** (contenu = actions du produit associé au grade).
- Acheter un produit de la catégorie Grades passe par le même mécanisme : un grade n'est jamais livré deux fois (clé `rank:<uuid>:<grade>`).
- Avantages supplémentaires : champ `perks` prêt, vide par défaut (rien n'est inventé).

### Modifier un grade

`/admin/shop/ranks` : nom, seuil, ordre, produit livré, actif.
- **Relever** un seuil (15 → 20) : personne ne perd son grade ; les nouveaux joueurs devront atteindre 20.
- **Abaisser** un seuil : rien n'est attribué tout seul → bouton « Recalculer les grades de tous les joueurs » (n'attribue que, ne retire jamais).
- Ajouter un grade : formulaire « Ajouter un grade » (clé unique, seuil, ordre).

## Remboursement et points

Points retirés **au prorata** du cumul remboursé (remboursement total = tous les points de la commande). Si le solde repasse sous le seuil d'un grade détenu, ce grade passe en **« à examiner »** : décision humaine dans l'admin (conserver / retirer), retrait en jeu manuel. Aucune rétrogradation automatique.
