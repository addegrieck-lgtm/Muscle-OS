# Paiement en ligne — Stripe Checkout

État : **intégré, fermé par défaut**. Le parcours `/panier` → `/commande` → page de paiement Stripe ne s’ouvre que lorsque les quatre variables ci-dessous sont présentes. Sinon, le bouton « Commande en ligne bientôt disponible » reste affiché et le webhook répond 503.

## Fonctionnement

1. `/commande` (`app/actions/checkout.ts`) : coordonnées et adresse, acceptation des CGV. Les montants sont **recalculés côté serveur** (`priceCart`, avec les avantages du compte connecté). Les pièces d’aperçu, les paniers modifiés et les pays non desservis (Paramètres → livraison) sont refusés.
2. La fonction SQL `create_checkout_order` crée atomiquement le client, la commande « En attente de paiement » et ses lignes, et réserve l’avoir de parrainage éventuel.
3. Le client est redirigé vers **Stripe Checkout** (page hébergée par Stripe ; aucune donnée bancaire sur le site). La page est valable 2 h.
4. Le **webhook signé** `POST /api/payments/webhook/stripe` est la seule source de vérité :
   - `checkout.session.completed` (payé) et `checkout.session.async_payment_succeeded` → `record_provider_payment` : transaction enregistrée (idempotente), commande « Payée » si le total est couvert (garde en base) ;
   - `checkout.session.expired` et `checkout.session.async_payment_failed` → `release_checkout_order` : commande annulée, avoir libéré.
   - Chaque événement est journalisé dans `payment_webhook_events` ; un événement déjà traité n’est jamais rejoué. En cas d’erreur, la réponse 500 fait renvoyer l’événement par Stripe.
5. `/commande/confirmation` relit la session auprès de Stripe pour l’affichage et vide le panier. Ce retour ne confirme rien à lui seul.
6. **Remboursements** : fiche commande de l’administration → « Rembourser via Stripe » (total ou partiel, rôles administrateur et super administrateur). Un remboursement total passe la commande en « Remboursée ». Un remboursement fait directement dans le tableau de bord Stripe n’est **pas** reporté automatiquement : il faut le faire depuis l’administration.

Code : `lib/payments/stripe.ts` (API Stripe en `fetch`, signature vérifiée en WebCrypto, compatible Cloudflare Workers), `lib/payments/index.ts`, migration `20261108000100_stripe_payments.sql`.

## Mise en service

1. **Base** : exécuter `supabase/migrations/20261108000100_stripe_payments.sql` dans Supabase → SQL Editor (déjà inclus dans `setup.sql` pour une installation neuve).
2. **Stripe, mode test d’abord** (interrupteur « Mode test » du tableau de bord) :
   - Développeurs → Clés API : copier la **clé secrète** `sk_test_…` (ou une clé restreinte `rk_test_…` avec les droits Checkout Sessions et Refunds en écriture).
   - Développeurs → Webhooks → Ajouter un endpoint : URL `https://maisonlumeance.fr/api/payments/webhook/stripe`, événements `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`. Copier le **secret de signature** `whsec_…`.
   - Paramètres → Moyens de paiement : choisir les moyens proposés (carte, Apple Pay, Google Pay…). Paramètres → E-mails clients : activer les reçus si vous le souhaitez.
3. **Cloudflare** (Workers → lumeance → Settings → Variables and Secrets) :
   - `PAYMENTS_ENABLED` = `1`
   - `PAYMENT_PROVIDER` = `stripe`
   - `STRIPE_SECRET_KEY` (type **Secret**)
   - `STRIPE_WEBHOOK_SECRET` (type **Secret**)
4. **Test** : commande avec la carte `4242 4242 4242 4242` (date future, CVC quelconque) → la commande doit passer « Payée » dans l’administration ; tester un remboursement ; tester l’abandon (la commande s’annule à l’expiration).
5. **Passage en réel** : refaire l’étape 2 en mode réel (nouvelles clés `sk_live_…` et nouveau `whsec_…`, l’endpoint de webhook est distinct) et remplacer les deux secrets dans Cloudflare. Compléter la section 4 des CGV (moyens de paiement activés).

Pour fermer la boutique à tout moment : `PAYMENTS_ENABLED=0`.
