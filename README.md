# MUSCLEOS — coach sportif & nutrition personnel

Application de coaching (musculation maison, cardio, gainage, nutrition) **100 % locale, 0 €** :
aucun serveur, aucune API payante, aucun compte. Installable sur iPhone comme une app (PWA).

> Cette application fournit des recommandations générales et ne remplace pas un professionnel de santé.

## Démarrer

```bash
npm install
npm run dev        # http://localhost:5173 (et sur le réseau local grâce à --host)
npm test           # 52 tests des moteurs
npm run build      # build de production dans dist/
npm run icons      # régénère icônes + écrans de démarrage iOS (sans dépendance)
```

## Installer sur iPhone

Le mode hors-ligne (service worker) exige **HTTPS**. Deux options gratuites :

1. **GitHub Pages (recommandé)** : pousser ce dossier sur un dépôt GitHub, puis
   *Settings → Pages → Source : GitHub Actions*. Le workflow `.github/workflows/deploy.yml`
   teste, construit et publie. Ouvrir l'URL dans **Safari** → Partager → **Sur l'écran d'accueil**.
   (Netlify / Cloudflare Pages fonctionnent aussi : dossier `dist/`.)
2. **Réseau local (test rapide)** : `npm run dev`, puis sur l'iPhone ouvrir
   `http://<IP-du-PC>:5173`. Tout fonctionne et les données sont conservées, mais sans cache
   hors-ligne (HTTP).

Les données restent sur l'appareil (localStorage + IndexedDB pour les photos).
**Profil → Exporter** crée une sauvegarde JSON (avec ou sans photos) ; **Importer** la restaure.

## Architecture

```
src/
  types/models.ts          Modèles : User, Exercise, Workout, WorkoutSession, Set, CardioSession,
                           Meal, Food, NutritionPlan, Measurement, WeightEntry, ProgressPhoto,
                           RecoveryEntry, ShoppingList, Source… (IDs stables)
  data/                    Données locales : 119 exercices, 56 aliments (Ciqual), 34 recettes,
                           32 sources scientifiques, référentiels (muscles, objectifs, matériel)
  engines/                 Moteurs purs, séparés et testables (aucune dépendance UI)
    config.ts              Tous les paramètres (multiplicateurs de priorité, volumes, RIR, cardio…)
    musclePriorityEngine   Priorités → séries hebdomadaires par muscle (réduction proportionnelle)
    workoutGenerator       Split, répartition, choix d'exercices selon matériel/niveau, ordre, durée
    progressionEngine      Double progression, variantes, décharge, douleur → régression
    cardioPlanner          Volume OMS, +10 %/sem max, semaine allégée, placement loin des jambes
    recoveryAdjuster       Check-in → score de forme → séance allégée / cardio facile
    nutritionCalculator    Mifflin-St Jeor, facteur d'activité, protéines 1,6-2,2 g/kg, eau EFSA
    mealGenerator          Recettes recalculées pour viser kcal + protéines, mode « j'ai ces aliments »
    shoppingListGenerator  Agrégation, unités d'achat, rayons, coût estimé
    coach.ts / safety.ts   Coach local à règles + fournisseur Ollama optionnel ; détection des signaux d'alerte
    programService.ts      Orchestrateur : profil + historique → programme de la semaine
  store/                   État applicatif (useSyncExternalStore), adaptateur de stockage, actions
  components/              Corps anatomique SVG (BodyMap), graphiques SVG, UI
  pages/                   Onboarding, Accueil, Entraînement, Séance, Nutrition, Corps,
                           Progression, Coach, Sources & méthode, Profil
public/                    manifest, service worker, icônes, écrans de démarrage iOS
tests/                     Tests Vitest des moteurs (profils débutant, intermédiaire, sans matériel,
                           haltères, priorités pecs/abdos/jambes/multiples…)
```

Aucune bibliothèque en dehors de React : graphiques, corps anatomique, icônes et PNG sont faits maison.

## Vers une version commerciale

L'architecture est prête à évoluer sans réécriture :

| Besoin | Point d'extension |
| --- | --- |
| Comptes + synchro cloud | Implémenter `StorageAdapter` (`src/store/storage.ts`) ; les IDs sont déjà stables |
| IA générative | Implémenter `CoachProvider` (`src/engines/coach.ts`) ; la couche sécurité reste appliquée avant |
| IA gratuite dès maintenant | Profil → Coach IA → Ollama (modèle local sur ton ordinateur) |
| App Store / Android | Empaqueter la PWA avec Capacitor (mêmes sources) |
| Abonnement | Ajouter un contrôle d'accès autour des pages ; les moteurs restent inchangés |
| Base d'aliments étendue | Remplacer/compléter `src/data/foods.ts` (ex. import Ciqual complet) |

## Méthode scientifique

Voir l'écran **Sources & méthode** dans l'application (ACSM, OMS, CDC, BJSM, méta-analyses
Schoenfeld, Morton, Refalo…). Les paramètres des moteurs sont des choix de programmation
raisonnables dérivés de ces travaux, centralisés dans `src/engines/config.ts` — pas des valeurs
médicales définitives.
