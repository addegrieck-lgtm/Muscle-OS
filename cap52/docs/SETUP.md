# Configuration

Sans aucune configuration, l'application fonctionne entièrement en local. Chaque service ajoute des fonctions.

## Comptes externes nécessaires

| Service | Pour quoi | Obligatoire pour |
|---|---|---|
| Apple Developer Program (99 $/an) | Builds iOS, TestFlight, App Store, achats intégrés | iOS |
| Google Play Console (25 $ une fois) | Tests internes, Play Store, abonnements | Android |
| Expo / EAS | Builds dans le cloud, soumission | Builds sans Xcode ni Android Studio |
| Supabase | Comptes, synchronisation, défis, coach | Fonctions serveur |
| RevenueCat | Abonnements multiplateformes | Premium |
| Fournisseur d'IA (Anthropic) | Coach | Coach |

## Variables d'environnement

Voir `.env.example`. Copier en `.env.local` pour le développement ; pour EAS, déclarer les mêmes variables dans l'environnement EAS (`npx eas-cli@latest env:create`).

## Supabase

1. Créer un projet (région UE recommandée pour les utilisateurs français ; à confirmer dans la politique de confidentialité).
2. Installer la CLI, puis lier le projet :
   ```sh
   npx supabase login
   npx supabase link --project-ref <ref>
   npx supabase db push                     # applique supabase/migrations
   ```
3. **Authentification** → activer le fournisseur e-mail avec **OTP** (code à 6 chiffres) et modifier le modèle d'e-mail pour afficher `{{ .Token }}`.
4. Déployer les fonctions et leurs secrets :
   ```sh
   npx supabase functions deploy coach
   npx supabase functions deploy delete-account
   npx supabase functions deploy revenuecat-webhook --no-verify-jwt   # appelé par RevenueCat, protégé par secret
   npx supabase secrets set ANTHROPIC_API_KEY=... REVENUECAT_WEBHOOK_SECRET=... COACH_DAILY_LIMIT=20
   ```
5. Planifier la purge des quotas (Database → Cron) : `select public.purge_old_ai_usage();` une fois par jour.
6. Renseigner `EXPO_PUBLIC_SUPABASE_URL` et `EXPO_PUBLIC_SUPABASE_ANON_KEY`.
7. Vérifier : se connecter dans l'app, synchroniser, puis contrôler les lignes dans l'éditeur de tables.

**Si une clé `service_role` ou une clé d'IA a été exposée** (commit, capture, message) : la régénérer immédiatement (Supabase → Settings → API, console Anthropic), puis mettre à jour les secrets.

## RevenueCat

1. Créer les produits dans les stores : abonnement mensuel et annuel dans un même groupe (prix à tester : 2,99 €/mois, 19,99 €/an).
2. Dans RevenueCat : créer le projet, relier App Store Connect (clé API in-app purchase) et Google Play (compte de service).
3. Créer le droit **`premium`** et y rattacher les deux produits.
4. Créer l'offre **courante** avec les packages `$rc_monthly` et `$rc_annual`.
5. Renseigner `EXPO_PUBLIC_REVENUECAT_IOS_KEY` et `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (clés SDK publiques).
6. Webhook : URL `https://<ref>.supabase.co/functions/v1/revenuecat-webhook`, en-tête `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`.
7. Tester : comptes sandbox iOS, testeurs de licence Google Play. Vérifier l'achat, la restauration, l'annulation et l'expiration (les périodes sandbox sont accélérées).

Les prix affichés viennent toujours du store : rien n'est codé en dur.

## Builds

Les identifiants de publication ne sont **pas encore définis** : c'est une décision du propriétaire. Avant le premier build, ajouter dans `app.json` :

```json
"ios": { "bundleIdentifier": "com.<societe>.cap52" },
"android": { "package": "com.<societe>.cap52" }
```

Puis :

```sh
npx eas-cli@latest login
npx eas-cli@latest init                                      # associe le projet EAS
npx eas-cli@latest build --profile development --platform all
npx eas-cli@latest build --profile preview --platform android  # APK interne pour les testeurs
npx eas-cli@latest build --profile production --platform all
npx eas-cli@latest submit --platform ios                     # TestFlight / App Store
npx eas-cli@latest submit --platform android                 # Play Console (test interne)
```

Les icônes et l'écran de démarrage (`assets/`) sont ceux du template Expo : **à remplacer** par les visuels de la marque avant toute bêta publique.
