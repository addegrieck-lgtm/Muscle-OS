# Paiement — préparé, désactivé en V1

État : **aucun paiement possible**. Panier fonctionnel ; bouton « Commande en ligne bientôt disponible » désactivé ; aucune donnée bancaire collectée ; webhook `/api/payments/webhook/[provider]` → 503.

## Ce qui est prêt
- `lib/payments/types.ts` : interface `PaymentProvider` (session, vérification de webhook, remboursement).
- Tables `payment_transactions` (idempotency_key unique, provider + référence unique) et `payment_webhook_events` (provider + event_id unique).
- Garde en base : `payment_status` ne passe à `paid` / `refunded` que si les transactions réussies couvrent les montants.
- Paramètres serveur `PAYMENTS_ENABLED` + `PAYMENT_PROVIDER` (insuffisants seuls : `getPaymentProvider()` refuse tant qu’aucun prestataire n’est codé).
- Paiement manuel (virement reçu) enregistrable par un administrateur, journalisé.

## Intégration Stripe (à faire)
1. `lib/payments/stripe.ts` implémentant `PaymentProvider` (Checkout Session, `idempotencyKey`).
2. Page `/commande` : adresses → création de la commande `pending_payment` avec montants recalculés (`priceCart`) → redirection Checkout.
3. Webhook : corps brut + vérification de signature → insertion idempotente de l’événement → transaction (client service_role) → `payment_status = paid`.
4. Remboursements depuis l’administration via `refund()`.
5. Réactiver `checkoutOpen` dans `app/(store)/panier/page.tsx` ; compléter les CGV.
