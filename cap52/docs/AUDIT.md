# Audit initial (phase 0) — 28 octobre 2026

## État du dépôt

- Le dépôt `Muscle-OS` contient le projet **VÆLORIA** (monorepo pnpm : site Next.js, API, administration, plugins Minecraft Java), sans rapport avec CAP 52.
- **Aucun code CAP 52 ni projet Expo existant** : rien à reprendre ni à préserver.
- Outils disponibles : Node 22.22, npm 10.9, pnpm 10.28, binaires PostgreSQL 16, accès au registre npm. Pas de simulateur iOS/Android, pas de Deno.

## Décision d'implantation

CAP 52 est créé dans un dossier autonome **`cap52/`** à la racine, avec **npm** (recommandé pour Expo) et son propre lockfile :

- hors des globs du workspace pnpm (`apps/*`, `packages/*`) : la CI et le déploiement de VÆLORIA ne sont pas affectés ;
- extractible plus tard dans un dépôt dédié sans perte d'historique (`git subtree split --prefix cap52`).

**Recommandation** : déplacer CAP 52 dans son propre dépôt avant la publication (CI, secrets EAS et droits d'accès séparés).

## Choix techniques

| Sujet | Choix | Raison |
|---|---|---|
| Base | Expo SDK 58 (dernière stable), template `blank-typescript` | Versions alignées par `expo install`, `expo-doctor` 20/20 |
| Navigation | Expo Router, routes dans `src/app/` | Recommandation officielle SDK 58 |
| Stockage local | expo-sqlite + migrations `PRAGMA user_version` | Vraie base relationnelle, transactions, testable avec node:sqlite |
| Validation | Zod 4 | Saisies, préférences et création de challenge |
| Montants | Entiers en centimes | Aucun arrondi flottant |
| Graphiques | SVG maison (react-native-svg) | Deux courbes et des barres ne justifient pas une bibliothèque |
| Icônes | Jeu SVG maison | `@expo/vector-icons` n'est plus fourni ; aucune dépendance de plus |
| Police | Manrope (licence OFL) via `@expo-google-fonts/manrope` | Moderne, chiffres lisibles |
| Animations | Reanimated 4 + `useReducedMotion` | Respect de la réduction des animations |
| Backend | Supabase (Auth OTP e-mail, Postgres + RLS, Edge Functions) | Facultatif ; RLS testée localement |
| Abonnements | RevenueCat (`react-native-purchases`) | Droits côté store + webhook serveur |
| Coach IA | Edge Function + SDK Anthropic | Clé uniquement côté serveur, quota atomique |

## Points bloquants rencontrés

- Conflit de dépendances pairs dans le template Expo SDK 58 (`react-dom` exigé par `@expo/log-box`) → `.npmrc` avec `legacy-peer-deps=true`, `npm ci` vérifié. L'ajout de `react-dom` (qui aurait permis la version web et `@testing-library/react-native`) a été refusé pendant la session : pas de cible web, pas de tests de rendu.
- Pas de simulateur ni d'appareil : aucune vérification visuelle ou d'exécution native possible dans cet environnement.

## Risques connus

1. **Validation des stores** pour les abonnements (textes légaux, restauration, déclaration de confidentialité).
2. **Disponibilité du nom « CAP 52 »** (marque, stores) non vérifiée.
3. **Aucun test sur appareil réel** à ce stade : priorité de décembre.
4. Fonctions serveur (Edge Functions) non exécutées : pas de Deno ni de projet Supabase disponible ici.
