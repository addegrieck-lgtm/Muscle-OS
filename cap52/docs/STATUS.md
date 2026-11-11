# Bilan — 28 octobre 2026

## Vérifications réellement exécutées

| Vérification | Résultat |
|---|---|
| `npm run typecheck` (TypeScript strict) | ✅ 0 erreur |
| `npm run lint` (ESLint Expo) | ✅ 0 erreur (4 règles `set-state-in-effect` désactivées localement, avec justification, pour des chargements asynchrones au montage) |
| `npm test` (Jest) | ✅ 68 tests, 5 suites : calculs (1 378 € en mode classique et inversé, montants et cumuls semaine par semaine, arrondis, mode libre, objectifs sur mesure, dates et heure d'été), progression et statuts, statistiques, badges, base SQLite réelle (migrations, transactions, versements, annulations, persistance après fermeture et réouverture, export, effacement), synchronisation sur deux appareils simulés |
| `npm run test:rls` (Postgres 16 jetable) | ✅ Isolation des données, droits premium, quotas, défis entre amis, suppression en cascade. Vérifié aussi qu'une assertion volontairement fausse fait échouer le script. |
| `npx expo-doctor` | ✅ 20/20 |
| `npx expo export --platform android --platform ios` | ✅ Les deux bundles Hermes se compilent (tous les écrans et toutes les dépendances se résolvent) |
| `npm ci` depuis le lockfile | ✅ |
| Types de l'appel au SDK Anthropic (coach) | ✅ Vérifiés avec `tsc` contre `@anthropic-ai/sdk@1.3.0` |
| Aperçu web (29 oct., copie jetable avec `react-native-web`, Chromium 390×844) | ✅ Parcours complet sans erreur : onboarding, versements, grille, détail, statistiques, profil, partage, Premium. A permis de corriger la barre d'onglets (libellés coupés), des titres en double et des avertissements d'accessibilité des icônes. **Ce n'est pas un test sur iOS ou Android.** |

## Version web

Publiée sur GitHub Pages (https://addegrieck-lgtm.github.io/Muscle-OS/cap52/) par `.github/workflows/preview-pages.yml`, dans le même site que l'aperçu VÆLORIA. Vérifié localement : export statique sous `/Muscle-OS/cap52`, servi **sans** en-têtes d'isolation (comme GitHub Pages), parcours complet sans erreur, rechargement direct des sous-routes. Limites : données dans le navigateur uniquement, pas de rappels ni d'achats ; si la construction de CAP 52 échoue, la publication de l'aperçu VÆLORIA échoue aussi (même artefact).

## Non vérifié (aucun appareil, simulateur, Deno ni projet distant dans cet environnement)

- **Aucun lancement de l'application** sur iOS ou Android : rendu, animations, navigation, haptique, clavier et accessibilité n'ont **jamais été vus à l'écran**.
- Notifications locales, partage d'image (capture de la carte), export de fichier : code écrit selon les API du SDK 58, **non exécuté**.
- Edge Functions (`coach`, `revenuecat-webhook`, `delete-account`) : **jamais exécutées**.
- RevenueCat : achats, restauration et expiration **non testés** (aucun produit ni compte sandbox).
- Supabase réel : connexion OTP, synchronisation et défis **non testés** de bout en bout (la logique SQL et la fusion sont testées localement, pas le réseau).
- Pas de tests de rendu (`@testing-library/react-native` non installé : il exige `react-dom`, dont l'ajout a été refusé pendant la session).

## Fonctionnalités

| Fonctionnalité | État |
|---|---|
| Onboarding en 5 étapes, étapes facultatives passables | Terminé, non testé sur appareil |
| Modes classique, inversé, libre | Terminé, logique testée |
| Grille adaptative des 52 semaines, 6 états, légende | Terminé, non testé sur appareil |
| Détail d'une semaine : valider, compléter, saisir, modifier, retirer, annuler, ignorer, montant prévu (libre) | Terminé, logique testée |
| Tableau de bord (anneau animé, semaine en cours, rattrapage, prochain rappel) | Terminé, non testé sur appareil |
| Statistiques gratuites (total, %, semaines, moyenne, historique) | Terminé |
| Rappel hebdomadaire local configurable, gestion du refus | Terminé, non exécuté |
| Carte de partage (montant masquable) | Terminé, non exécuté |
| Persistance SQLite, migrations, export JSON, effacement | Terminé, testé (sous Node) |
| Thèmes (5), typographie, accessibilité (libellés, rôles, tailles, réduction des animations) | Terminé, non audité sur appareil |
| Premium : plusieurs challenges, objectif sur mesure, thèmes, statistiques avancées, badges | Terminé (contrôle des droits côté app) |
| Abonnements RevenueCat (offres, achat, restauration, expiration via droits) | Intégré, **non testé** ; état « non configuré » explicite |
| Comptes (OTP e-mail), synchronisation manuelle, suppression de compte | Intégré, fusion testée, réseau **non testé** |
| Défis entre amis (créer, inviter, rejoindre, classement, quitter) | Serveur testé (RLS) ; écran **non testé** |
| Coach IA (Edge Function, quotas, garde-fous) | Écrit, **non exécuté** |
| Indicateurs | Architecture seulement, aucun fournisseur actif (volontaire) |
| Icône, écran de démarrage | **Non fait** : visuels du template Expo |
| Identifiants de publication | **Non fait** : décision du propriétaire |

## Limites connues

- Synchronisation manuelle uniquement (bouton) ; la version la plus récente d'une ligne l'emporte.
- La progression partagée dans un défi est publiée manuellement (bouton dans l'écran Défis).
- Les plafonds du coach et des challenges sont des valeurs de départ (`COACH_DAILY_LIMIT`, `src/config/app.ts`).
- Les dates de versement proposées sont : aujourd'hui, hier et le début de la semaine (pas de sélecteur de date libre).
- Français uniquement (architecture prête pour d'autres langues).

## Actions qui nécessitent le propriétaire

1. Choisir les identifiants de publication et créer les comptes Apple, Google, Expo, Supabase et RevenueCat (voir `docs/SETUP.md`).
2. Fournir l'icône et les visuels de la marque.
3. Vérifier la disponibilité de la marque « CAP 52 ».
4. Faire rédiger ou valider la politique de confidentialité, les conditions et les mentions légales.
5. Décider si CAP 52 doit quitter le dépôt `Muscle-OS` pour un dépôt dédié (recommandé).

## Prochaine tâche exacte

Produire un build de développement (`npx eas-cli@latest build --profile development`) après avoir défini les identifiants, l'installer sur un iPhone et un Android, et dérouler le plan de test de `docs/RELEASE.md`. Corriger les défauts visuels et d'exécution trouvés, puis ajouter les tests de rendu (onboarding, validation d'une semaine) dès que `@testing-library/react-native` peut être installé.
