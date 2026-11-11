# CAP 52

Application mobile (iOS et Android) d'épargne sur 52 semaines : chaque semaine, l'utilisateur met un montant de côté, le déclare dans l'application et voit sa grille se remplir.

L'application **ne détient pas d'argent, ne fait aucun virement et ne se connecte à aucune banque**. Elle enregistre des montants déclarés.

- **Stack** : Expo SDK 58 · React Native 0.88 · TypeScript strict · Expo Router · SQLite (expo-sqlite) · Reanimated · Supabase (facultatif) · RevenueCat (facultatif)
- **Version web de démonstration** : https://addegrieck-lgtm.github.io/Muscle-OS/cap52/ (publiée à chaque push sur `main` ; données stockées dans le navigateur, sans rappels ni achats).
- **Fonctionne sans compte et hors ligne.** Les services externes sont facultatifs : s'ils ne sont pas configurés, les écrans concernés le disent explicitement.

## Démarrer

Prérequis : Node 22+, npm 10+. Pour tester sur téléphone : un **build de développement** (RevenueCat, SQLite, notifications et partage d'image utilisent du code natif ; Expo Go ne suffit pas).

```sh
cd cap52
npm ci
cp .env.example .env.local        # facultatif : clés Supabase / RevenueCat publiques
npx expo start                    # serveur de développement
```

Build de développement à installer sur un appareil :

```sh
npx eas-cli@latest build --profile development --platform android   # ou ios
# ou en local, avec Android Studio / Xcode installés :
npx expo run:android
npx expo run:ios
```

## Commandes

| Commande | Effet |
|---|---|
| `npm run typecheck` | TypeScript strict (`tsc --noEmit`) |
| `npm run lint` | ESLint (configuration Expo) |
| `npm test` | Tests Jest : logique métier, base SQLite réelle (node:sqlite), synchronisation |
| `npm run test:rls` | Applique les migrations Supabase sur un Postgres 16 jetable et teste l'isolation RLS (nécessite les binaires PostgreSQL) |
| `npm run check` | typecheck + lint + tests |
| `npm run web` | Version web en développement (navigateur) |
| `npm run build:web` | Export web statique dans `dist-web/` (`EXPO_BASE_URL` pour un sous-dossier) |
| `npx expo-doctor` | Cohérence des dépendances avec le SDK Expo |
| `npx expo export --platform android --platform ios` | Vérifie que Metro empaquette toute l'application |

## Structure

```
cap52/
├── src/
│   ├── app/                  écrans (Expo Router) : (tabs)/, onboarding, week/[index], share, premium,
│   │                         challenges/, account, friends, coach, privacy
│   ├── components/           composants d'interface (boutons, cartes, grille, graphiques, icônes SVG)
│   ├── config/               nom de l'app, limites, variables publiques
│   ├── database/             migrations SQLite versionnées, dépôts typés, préférences
│   ├── domain/               logique métier pure (montants en centimes, dates, plans, progression,
│   │                         badges, validation Zod, fusion de synchronisation)
│   ├── features/             fournisseurs et services : données, rappels, abonnements, compte/sync,
│   │                         défis, coach, export
│   ├── i18n/                 textes centralisés (français)
│   ├── services/             clients externes (Supabase, indicateurs)
│   ├── theme/                système de design (5 thèmes, typographie, espacements)
│   └── utils/                retours haptiques
├── supabase/
│   ├── migrations/           schéma, RLS, fonctions sécurisées
│   ├── functions/            Edge Functions : coach, revenuecat-webhook, delete-account
│   └── tests/                tests RLS (Postgres jetable)
├── tests/                    tests Jest
└── docs/                     audit, architecture, configuration, publication, bilan
```

## Documentation

- [Audit initial et choix techniques](docs/AUDIT.md)
- [Architecture, modèle de données, sécurité](docs/ARCHITECTURE.md)
- [Configuration : variables, Supabase, RevenueCat, builds](docs/SETUP.md)
- [Publication : checklists stores, confidentialité, abonnements, fiches](docs/RELEASE.md)
- **[Bilan : fait, partiel, non testé, prochaine tâche](docs/STATUS.md)**
