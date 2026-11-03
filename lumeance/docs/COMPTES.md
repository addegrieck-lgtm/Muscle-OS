# Comptes clients, entreprises, Cercle et parrainage

## Ce que font les comptes
- **Particulier** : Cercle Luméance (remise à vie selon le cumul des commandes payées) et
  parrainage. Règles : `lib/catalog/loyalty.ts`.
- **Entreprise** : raison sociale, SIRET (clé contrôlée), TVA facultative. Après **validation
  dans l'administration** (Clients → fiche → Valider), prix affichés HT et remise par paliers
  automatique : −5 % dès 500 € HT, −10 % dès 1 500 € HT, −20 % dès 3 000 € HT
  (`lib/catalog/pro.ts`).
- Les remises en pourcentage ne portent jamais sur les pièces déjà en promotion ; la livraison
  n'est pas remisée. Tout est recalculé par le serveur (`quoteCart`, `priceCart`).
- Avoir du parrain : créé par la base (déclencheur `grant_referral_credit`) à la 1re commande
  payée (≥ 300 € de pièces) du filleul ; utilisé par la commande manuelle (case « Avantages du
  compte client »), et plus tard par le paiement en ligne.

## Mise en service (une fois)
1. **Base** : Supabase → SQL Editor → coller
   `supabase/migrations/20261106000100_customer_accounts.sql` → Run. À faire **avant** de
   déployer le site (l'administration lit les nouvelles tables).
2. **Authentification** (Supabase → Authentication) :
   - *Sign In / Providers → Email* : activé, « Confirm email » activé.
   - *URL Configuration* : Site URL `https://maisonlumeance.fr` ; Redirect URLs :
     `https://maisonlumeance.fr/compte/confirmation` (et `https://maisonlumeance.fr/**`).
   - *Emails → SMTP* : brancher un service d'envoi (Brevo, Resend, OVH…) : l'envoi intégré de
     Supabase est limité à quelques e-mails par heure et réservé aux tests.
   - *Emails → Templates* : traduire « Confirm signup » et « Reset password » en français
     (le lien `{{ .ConfirmationURL }}` reste inchangé).
   - *Policies → Password* : longueur minimale 10 (le site l'exige déjà).
3. Déployer le site.

## Vérifications
- `npm run check` (dont `tests/loyalty.test.ts`, `tests/pricing.test.ts`).
- `npm run test:db` (dont `supabase/tests/zx_accounts.test.sql` : isolement des comptes,
  statut pro non modifiable par le client, avoirs de parrainage).
