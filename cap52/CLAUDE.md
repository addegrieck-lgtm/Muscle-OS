# CAP 52 — instructions pour Claude Code

@AGENTS.md

Application Expo (SDK 58) d'épargne sur 52 semaines. Lire `docs/STATUS.md` avant de commencer : il donne l'état réel et la prochaine tâche.

## Commandes (depuis `cap52/`)

- `npm ci` — installation (le `.npmrc` active `legacy-peer-deps` à cause d'un conflit du template Expo ; ne pas le retirer sans vérifier `npm ci`)
- `npx expo install <paquet>` — toujours pour ajouter une dépendance (versions compatibles SDK)
- `npm run check` — typecheck + lint + tests ; **doit passer avant tout commit**
- `npm run test:rls` — après toute modification de `supabase/migrations`
- `npx expo export --platform android --platform ios --output-dir <dossier temporaire>` — vérifie l'empaquetage

## Conventions

- **Montants en centimes entiers** (`Cents`) dans tout le code métier ; jamais de calcul en flottant. Saisie via `parseAmountInput`, affichage via `useFormat().money`.
- **Dates civiles** `AAAA-MM-JJ` (`LocalDate`) pour les semaines et versements ; horodatages ISO UTC pour `created_at`/`updated_at`.
- **Logique métier dans `src/domain/`**, pure et testée sous Node. Les écrans ne calculent rien eux-mêmes.
- **Accès aux données via `src/database/repositories.ts`** et l'interface `Db` : les mêmes requêtes tournent sur expo-sqlite et sur node:sqlite (tests).
- **Migrations** : ajouter une entrée à `MIGRATIONS` (SQLite) ou un nouveau fichier horodaté (Supabase) ; ne jamais modifier une migration publiée.
- **Suppressions logiques** : challenges (`deleted_at`) et versements (`status = 'cancelled'`), indispensables à la synchronisation.
- **Textes** : tous dans `src/i18n/fr.ts` ; aucune chaîne en dur dans les composants. Tutoiement, ton positif, jamais culpabilisant.
- **Couleurs et polices** : uniquement via `useTheme()` et `src/theme/themes.ts`.
- **Routes** dans `src/app/` seulement ; le reste hors de ce dossier.
- Chaque écran gère : chargement, vide, erreur, service non configuré, limite gratuite.

## Règles de sécurité et d'honnêteté

- Jamais de secret dans l'application : seules les variables `EXPO_PUBLIC_*` publiques (clé anon Supabase, clés SDK RevenueCat). Les secrets vont dans `supabase secrets set`.
- Toute table Supabase exposée a RLS activée et des tests dans `supabase/tests/rls_test.sql`.
- Les droits premium ne viennent que du store (RevenueCat) ou du serveur ; la simulation « demoPremium » n'existe que si `__DEV__`.
- Ne jamais simuler un achat, une connexion, une réponse IA ou des données sociales. Service absent → état « non configuré » explicite.
- Ne jamais annoncer un test réussi sans l'avoir exécuté ; mettre `docs/STATUS.md` à jour à la fin de chaque session.
- Ne pas modifier les identifiants de publication (bundle iOS, package Android) sans accord du propriétaire.
