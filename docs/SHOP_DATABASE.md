# Boutique — base de données

Migration : `apps/api/migrations/002_shop.sql` (s'applique automatiquement au démarrage de l'API, après `001_init.sql`). Elle **migre les données existantes** : anciennes catégories texte → `product_categories`, `delivery_commands` → `product_deliveries`, `promo_percent` → `promotions`, `payment_webhook_events` renommée `payment_events`.

## Tables

| Table | Rôle | Clé d'idempotence / contrainte clé |
|---|---|---|
| `users` | Compte VÆLORIA (créé à la 1re connexion Discord) | — |
| `discord_accounts` | Lien compte ↔ Discord | `discord_id` |
| `sessions` | Sessions web (seul le SHA-256 du jeton est stocké) | `token_hash` |
| `minecraft_accounts` | Lien compte ↔ UUID Minecraft (preuve par `/link`) | `player_uuid` |
| `link_codes` | Codes `/link` à usage unique, 10 min | `code` |
| `product_categories` | Grades, Spawners, Items, Kits, Packs, Cosmétiques (+ SEO) | `slug` |
| `products` | Prix (centimes), points facultatifs, type de livraison, stock, ordre, actif | `slug` |
| `product_deliveries` | Actions de livraison d'un produit (action + commande + « joueur en ligne ») | — |
| `promotions` | % / fixe / bonus de points, cible tout / catégorie / produit, dates | — |
| `coupons` | Fondation (non branchée sur le checkout) | `code` |
| `orders` | Commande `VAL-AAAA-NNNNNN`, destinataire (UUID figé), totaux, points, prestataire, expiration | `idempotency_key`, `public_id` |
| `order_items` | Ligne figée au moment de l'achat : nom, prix payé, prix d'origine, points/unité, promotion | — |
| `payments` | Paiement confirmé par le prestataire | `(provider, provider_payment_id)` |
| `payment_events` | Journal de **tous** les webhooks reçus, résultat du traitement | `(provider, provider_event_id)` |
| `transactions` | Grand livre € (charge +, remboursement −) | — |
| `refunds` | Remboursements (prestataire ou admin) | `provider_refund_id` |
| `entitlements` | Droit acquis, un par unité achetée | `(order_item_id, unit_index)` |
| `shop_points` | Solde de points par UUID (cache du grand livre) | `player_uuid` |
| `point_transactions` | **Grand livre des points** : delta, solde après, motif, source | `idempotency_key` |
| `rank_thresholds` | Grades : clé, nom, seuil, ordre, produit livré, avantages | `key`, `position` |
| `player_ranks` | Grades obtenus : source (points / achat / admin), statut (active / review / revoked) | `(player_uuid, rank_key)` |
| `deliveries` | Livraison métier : PENDING / PROCESSING / DELIVERED / FAILED / CANCELLED | `idempotency_key` |
| `delivery_logs` | Historique de chaque changement d'état | — |
| `minecraft_commands` | Transport vers le plugin (bail, réessais, DEFERRED), lié à `deliveries` + `action` | `idempotency_key` |
| `audit_logs` | Toutes les actions sensibles (commande, paiement, remboursement, admin, grade) | — |
| `site_settings` | `shop.points_per_euro` (1 par défaut) | `key` |

## Clés d'idempotence utilisées

| Opération | Clé |
|---|---|
| Points d'un article | `order_item:<id>:points` |
| Retrait de points d'un remboursement | `refund:<id>:points` |
| Livraison d'une unité | `entitlement:<id>` |
| Livraison d'un grade | `rank:<uuid>:<rank_key>` (un grade n'est livré qu'une fois par joueur) |
| Ordre Minecraft | `delivery:<id>:<n>` |

## Invariants (vérifiés par les tests)

- `shop_points.balance` = somme de `point_transactions.delta` du joueur.
- Une ligne de `point_transactions` n'est jamais modifiée ni supprimée.
- Un produit déjà vendu n'est jamais supprimé (il est désactivé), une promotion déjà utilisée non plus.
- Modifier un produit ne modifie pas les livraisons déjà créées (les commandes sont copiées à la création de la livraison).
