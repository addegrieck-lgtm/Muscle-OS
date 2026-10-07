# Boutique — paiement et webhooks

## Principe

```
Navigateur ─► Site (serveur) ─► API  POST /api/v1/shop/checkout  (session obligatoire)
                                 ├ recalcule prix/points, crée la commande « pending » (clé d'idempotence)
                                 └ PaymentProvider.createCheckout() → URL de paiement
Navigateur ─► page de paiement du PRESTATAIRE (VÆLORIA ne voit jamais la carte)
Prestataire ─► API  POST /webhooks/payments/<prestataire>   ← seule confirmation reconnue
Navigateur ─► /checkout/confirmation : lit l'état, attend le webhook (rafraîchi toutes les 2,5 s)
```

## Webhook : contrôles, dans l'ordre

1. Signature HMAC du prestataire vérifiée sur le **corps brut** (comparaison à temps constant) → sinon 400 + `audit_logs`.
2. Fraîcheur : événement de plus de 5 min refusé (anti-rejeu).
3. Dédoublonnage : `(provider, provider_event_id)` dans `payment_events` → un doublon répond 200 « duplicate » sans effet.
4. Montant **et** devise comparés à la commande → sinon `amount_mismatch`, rien n'est livré, alerte dans `audit_logs`.
5. Paiement + transaction + statut `paid`, puis livraison (points → droits → grades → ordres Minecraft).

Une commande expirée mais réellement payée est honorée (l'argent est encaissé).

## Prestataires

Interface `apps/api/src/services/payments/provider.ts` :

```ts
createCheckout(req) → { checkoutId, url }
parseWebhook(rawBody, headers) → payment.succeeded | payment.failed | refund.succeeded | ignored
```

| Valeur `PAYMENT_PROVIDER` | Usage |
|---|---|
| `none` (défaut) | Boutique consultable, paiement fermé (503 explicite) |
| `sandbox` | Prestataire de **test** : page de paiement hors site + vrais webhooks signés. **Refusé au démarrage en production.** |
| `stripe` | Checkout Session (API REST, sans SDK) + `Stripe-Signature`. Événements : `checkout.session.completed` / `async_payment_succeeded` → paiement ; `async_payment_failed` / `expired` → échec ; `charge.refunded` → remboursement(s). |

### Brancher Stripe

1. `PAYMENT_PROVIDER=stripe`, `STRIPE_SECRET_KEY`, `PUBLIC_API_URL`, `SITE_URL`.
2. Dashboard Stripe → Webhooks → endpoint `<PUBLIC_API_URL>/webhooks/payments/stripe`, événements ci-dessus → copier le secret dans `STRIPE_WEBHOOK_SECRET`.
3. Tester en mode test Stripe (`sk_test_…`) avant toute clé live.

### Ajouter un autre prestataire (PayPal, Tebex…)

Créer `services/payments/<nom>.ts` qui implémente l'interface (vérification de signature incluse), l'ajouter dans `services/payments/index.ts` et dans l'enum `PAYMENT_PROVIDER` de `env.ts`. Rien d'autre ne change.

> **Choix du prestataire : décision du propriétaire.** Tebex gère la conformité aux règles Mojang pour les ventes en jeu ; Stripe/PayPal coûtent moins cher mais la conformité (EULA Minecraft, TVA) est à la charge de VÆLORIA.

## Remboursements

Webhook `refund.succeeded` (ou saisie admin pour un prestataire sans notification) → `refunds` (unique par `provider_refund_id`) + transaction négative + points retirés au prorata + (si total) livraisons non effectuées annulées et droits révoqués + grades passés « à examiner ». Rien n'est retiré en jeu automatiquement. Historique jamais supprimé.

## Données bancaires

Aucune. VÆLORIA ne stocke que l'identifiant de paiement du prestataire et les montants.
