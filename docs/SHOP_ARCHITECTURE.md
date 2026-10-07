# Boutique VÆLORIA — architecture

> Tous les produits, prix, grades, seuils et contenus de kits présents dans le code et la base sont des **exemples**. Seules deux règles sont posées par défaut : **1 € dépensé = 1 point** et **100 points = VÆLORIAN** (configuration initiale, modifiable).

## 1. Audit de l'existant (avant développement)

| Élément | Existant | Décision |
|---|---|---|
| Framework | Monorepo pnpm : Next.js 15 (site, admin), Fastify 5 (API), packages `ui`/`types`/`config`/`api-client` | Conservé. La boutique est une partie du site et de l'API, pas une app séparée. |
| Base | PostgreSQL 16, migrations SQL (`001_init.sql`) : `products`, `orders` (`VAL-AAAA-NNNNNN`, clé d'idempotence), `order_items`, `payments`, `payment_webhook_events`, `refunds`, `transactions` (grand livre €), `entitlements`, `minecraft_commands`, `audit_logs`, `users`, `minecraft_accounts`, `sessions`, `link_codes` | Conservé et étendu par `002_shop.sql`. `payment_webhook_events` devient `payment_events`. `products.category`, `promo_percent` et `delivery_commands` sont migrés vers `product_categories`, `promotions` et `product_deliveries`, sans perte de données. |
| Paiement | `handlePaymentSucceeded()` / `fulfillOrder()` idempotents et testés, aucun prestataire | Conservé comme cœur, enrichi (points, grades, livraisons) et placé derrière une interface de prestataire. |
| Livraison | File `minecraft_commands` éprouvée : bail, réessais, DEFERRED si joueur hors ligne, `FOR UPDATE SKIP LOCKED` | **Conservée comme transport.** Une table métier `deliveries` (statuts PENDING/PROCESSING/DELIVERED/FAILED/CANCELLED + `delivery_logs`) s'appuie dessus : une livraison = un ou plusieurs ordres envoyés au plugin. |
| Authentification | Tables seulement (Phase 7 non faite) | **Implémentée maintenant** (le checkout l'exige) : Discord OAuth, sessions, liaison Minecraft par code `/link` en jeu. |
| VæloriaBridge | Événements, heartbeat, file disque, exécution de commandes | Étendu : type d'action dans chaque ordre (GRANT_RANK, GIVE_KIT, GIVE_ITEM, GIVE_SPAWNER, ADD_POINTS, SYNC_PLAYER), commande `/link`. |
| Design | Charte du pack logo : noir/anthracite, argent, rubis, Chakra Petch, composants `@vaeloria/ui` | Réutilisé tel quel. Seuls de nouveaux composants boutique sont ajoutés (carte produit, progression, panier). |
| Page `/shop` | Liste simple, bouton désactivé | Remplacée par `/boutique`. `/shop` redirige. |

## 2. Flux d'achat

```
Navigateur ──(panier local : ids + quantités uniquement)──► Site (Next, serveur)
   │                                                            │ session (cookie HttpOnly)
   │                                                            ▼
   │                                          API  POST /api/v1/shop/checkout
   │                                            ├ résout le destinataire → UUID Minecraft
   │                                            ├ recalcule prix, promotions et points CÔTÉ SERVEUR
   │                                            ├ crée la commande (pending, clé d'idempotence)
   │                                            └ demande une session de paiement au prestataire
   ▼                                                            │
Prestataire (page de paiement) ◄────────── redirection ─────────┘
   │
   └──(webhook signé)──► API  POST /webhooks/payments/:provider
                            ├ vérifie la signature et la fraîcheur, dédoublonne l'événement (payment_events)
                            ├ vérifie montant et devise
                            ├ commande → paid, grand livre €
                            ├ crédit des points (point_transactions, idempotent par article)
                            ├ grades franchis → player_ranks + livraisons GRANT_RANK / GIVE_KIT
                            └ livraisons des produits → deliveries → minecraft_commands
                                                                     │
                                            VæloriaBridge (claim / ack) ◄┘ → DELIVERED
```

La page de retour du paiement **ne valide rien** : elle lit l'état de la commande et attend le webhook (rafraîchissement automatique).

## 3. Identité

- **Acheteur** : compte VÆLORIA (connexion Discord) obligatoire pour payer.
- **Destinataire** : pseudo Minecraft saisi, **résolu en UUID au moment de la commande** (joueurs déjà vus par le serveur, sinon API Mojang côté serveur). La commande enregistre l'UUID : un changement de pseudo ultérieur ne détourne pas l'achat.
- Les **points et les grades appartiennent à l'UUID Minecraft**, puisqu'ils s'utilisent en jeu. Le compte web les consulte via ses comptes Minecraft liés (code `/link`).

## 4. Points

- `points par défaut = floor(prix payé en € × points_par_euro)` par unité, avec `points_par_euro = 1` (réglage `shop.points_per_euro`).
- Un produit peut fixer ses points indépendamment du prix (`products.points`).
- Les promotions peuvent ajouter un bonus de points.
- Chaque mouvement est une ligne `point_transactions` (delta, solde après, source, clé d'idempotence unique). Le solde `shop_points` est un cache mis à jour dans la même transaction.

## 5. Grades

- `rank_thresholds` : clé, nom, seuil, ordre, produit associé (contenu livré : grade + kit), avantages (structure vide prête).
- Le grade courant est calculé à partir des seuils **lus en base** : le front n'en contient aucun.
- Quand le solde franchit un ou plusieurs seuils, chaque grade franchi est enregistré (`player_ranks`, unique par joueur et grade) et livré dans l'ordre croissant.
- Acheter un produit de la catégorie Grades passe par le même mécanisme, donc pas de double livraison.
- Modifier un seuil n'enlève rien à personne. « Recalculer les grades » (admin) attribue les grades devenus atteignables.

## 6. Catalogue et promotions

- `product_categories` (Grades, Spawners, Items, Kits, Packs, Cosmétiques), `products` (prix en centimes, points facultatifs, type de livraison, ordre, stock, actif), `product_deliveries` (actions + commandes Minecraft par produit).
- `promotions` : réduction %, réduction fixe, bonus de points, ciblant tout / une catégorie / un produit, avec dates de début et de fin. Le moteur de prix (`services/shop/pricing.ts`, fonctions pures testées) choisit la meilleure réduction et cumule les bonus de points.
- `coupons` : table et validation de base seulement (fondation).

## 7. Remboursements

Webhook de remboursement (ou saisie admin) → `refunds` + transaction € négative + **retrait des points correspondants** (ligne négative, historique conservé) + annulation des livraisons pas encore effectuées. Ce qui a déjà été livré en jeu n'est pas retiré automatiquement. Si le solde repasse sous le seuil d'un grade détenu, le grade passe en **« à examiner »** dans l'admin : aucune rétrogradation automatique.

## 8. Prestataire de paiement

Interface `PaymentProvider` (`createCheckout`, `parseWebhook`). Fournis :
- `stripe` : Checkout Session via l'API REST et vérification de la signature `Stripe-Signature`, prêts à brancher ;
- `sandbox` : prestataire de test **côté serveur**, refusé en production, qui envoie de vrais webhooks signés à l'API pour tester le parcours complet.
Ajouter PayPal, Tebex ou autre = un fichier adaptateur. Voir `SHOP_PAYMENT.md`.

## 9. Pages

`/boutique`, `/boutique/[categorie]` (grades, spawners, items, kits, packs, cosmetiques), `/boutique/produit/[slug]`, `/boutique/panier`, `/checkout`, `/checkout/confirmation`, `/compte`, `/compte/points`. Admin : `/admin/shop` (tableau de bord), produits, catégories, promotions, grades, commandes, livraisons. `/checkout`, `/compte` et `/admin` sont en `noindex`.

## 10. Hors périmètre (fondations seulement)

Coupons (table + validation), affiliation, créateurs, parrainage (tables existantes), offres saisonnières (via promotions datées), boutiques par serveur (colonne `server` sur les livraisons), notifications Discord.
