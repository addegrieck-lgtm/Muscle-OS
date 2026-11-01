# Sécurité

## Défense en profondeur
1. **Middleware** : toute route `/admin/*` sans session Supabase valide → `/admin/login`.
2. **Serveur** : chaque page et action d’administration appelle `requireAdmin(roles)` (jeton vérifié par `getUser()`, ligne `admin_users` active).
3. **Base** : RLS sur toutes les tables ; fonctions `is_admin()`, `is_catalog_admin()`, `is_super_admin()` (security definer, `search_path` figé).

## Rôles
| Rôle | Droits |
|---|---|
| `super_admin` | Tout, dont la gestion des administrateurs |
| `admin` | Catalogue, contenus, médias, paramètres, commandes, clients, exports |
| `order_manager` | Commandes et clients (lecture/traitement), pas de catalogue ni d’export clients |

Aucune inscription publique. Impossible de s’auto-promouvoir (testé). Le dernier super administrateur actif ne peut être retiré.

## Premier administrateur
```sh
SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run admin:init -- vous@domaine.fr
```
Refuse d’agir si un super administrateur existe. Mot de passe provisoire affiché une seule fois. Les suivants sont invités depuis `/admin/settings`.

## Règles clés
- Clé `service_role` : variable serveur sans préfixe `NEXT_PUBLIC_`, importée seulement dans des modules `server-only`.
- Aucune lecture anonyme des clients, commandes, paiements, messages, abonnés (testé).
- « Payée » refusée par la base sans transactions confirmées couvrant le total ; création d’une commande déjà payée impossible.
- Journal d’activité alimenté par déclencheurs, aucune politique d’écriture ni de suppression.
- Imports : type réel lu dans les octets (JPEG, PNG, WebP, AVIF), 10 Mo, nom de fichier généré, bucket limité.
- Formulaires publics : Zod, pot de miel, limitation de débit à deux niveaux (mémoire de l’instance sur 10–15 min + limiteurs partagés Cloudflare `FORMS_LIMITER` / `LOGIN_LIMITER` sur 1 min, déclarés dans `wrangler.jsonc`) ; adresse IP lue dans `cf-connecting-ip` (non falsifiable), jamais dans le premier élément de `x-forwarded-for` ; CSV protégés contre l’injection de formules.
- En-têtes : HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy, Content-Security-Policy (production ; à étendre si un service tiers est ajouté : Stripe, mesure d’audience) ; `/admin` en noindex.

## Sauvegardes
Supabase gratuit : pas de restauration à un instant donné. Prévoir un `pg_dump` planifié (ex. GitHub Action hebdomadaire chiffrée) ou l’offre payante avant l’ouverture.

## Tests
`npm run test:db` (RLS et règles) · `npm test` (validation, imports, CSV, prix).
