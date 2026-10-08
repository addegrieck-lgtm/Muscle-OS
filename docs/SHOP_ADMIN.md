# Boutique — administration (`/admin/shop`)

| Écran | Usage |
|---|---|
| Tableau de bord | CA (total, mois, jour), commandes du jour / du mois, points générés, paiements en attente, taux d'échec de livraison, remboursements, grades à examiner, grades débloqués par palier, funnel boutique, produits les plus vendus |
| Produits | Liste, création, modification, désactivation |
| Catégories | Nom, description, ordre, visibilité, titre et description SEO |
| Promotions | % / montant fixe / bonus de points, cible, dates, badge affiché |
| Grades & points | Points par euro, seuils des grades, produit livré par grade, recalcul, grades à examiner, ajustement manuel de points |
| Commandes | Filtre par statut ; détail : articles, paiements, webhooks reçus, livraisons et leur journal, points, remboursements ; relancer la livraison ; remboursement manuel |
| Livraisons | Filtre par statut, dernier message, relance des échecs |

## Ajouter un produit

1. Produits → « Créer un produit ».
2. Nom (le slug se remplit tout seul), catégorie, type de livraison, prix en euros.
3. Points : **Automatique** (= prix × points par euro) ou **Personnalisé** (ex. 20 € → 15 points, ou 15 € → 20 points).
4. Description courte (carte), description, image (facultative : sinon visuel de catégorie), stock (vide = illimité), ordre d'affichage.
5. **Livraison en jeu** : ajouter une ligne par action, choisir l'action, écrire la commande avec `{username}` / `{uuid}` / `{quantity}`, cocher « joueur en ligne » pour tout ce qui va dans l'inventaire.
6. Cocher « Actif » puis Enregistrer. Visible en boutique en moins de 30 secondes.

Renommer « Pack 3 Spawners » en « Pack 3 Spawners Zombie » ou passer de 15 € à 12,99 € : modifier le produit, rien d'autre. Les commandes passées gardent le nom et le prix de l'époque.

## Modifier un grade

Grades & points → modifier le seuil / le nom / le produit livré → Enregistrer. Voir `SHOP_POINTS.md` pour les effets d'un seuil relevé ou abaissé.

## Accès

Phase actuelle : Basic Auth sur tout `/admin` + jeton serveur-à-serveur vers l'API. Toutes les écritures sont journalisées dans `audit_logs`. Évolution prévue : comptes staff avec rôles via la connexion Discord.
