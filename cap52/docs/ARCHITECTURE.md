# Architecture

## Couches

```
Écrans (src/app)  →  fournisseurs React (src/features)  →  dépôts (src/database)  →  SQLite
        ↘                    ↘
   composants (src/components)   logique pure (src/domain)  ←  testée sous Node
```

- **`AppDataProvider`** charge préférences, challenges, semaines et versements, puis calcule la progression avec `computeProgress`. Chaque modification passe par un dépôt, puis recharge l'état.
- **`SubscriptionProvider`** expose `isPremium` à partir des droits RevenueCat (ou d'une simulation, uniquement si `__DEV__`).
- **`AccountProvider`** gère la session Supabase (connexion par code e-mail) et associe RevenueCat à l'utilisateur.
- La logique métier (`src/domain`) n'importe ni React ni React Native.

## Modèle de données

### Local (SQLite, `src/database/migrations.ts`)

| Table | Rôle | Colonnes clés |
|---|---|---|
| `challenges` | Un objectif d'épargne | `id`, `owner_id` (null hors compte), `type` (classic/reverse/free/custom), `currency`, `target_cents`, `unit_cents`, `week_count`, `start_date`, `strategy`, `icon`, `color`, `status`, `created_at`, `updated_at`, `deleted_at` |
| `challenge_weeks` | État explicite de chaque semaine | `challenge_id`, `week_index`, `planned_cents` (null en mode libre), `skipped`, `updated_at` |
| `deposits` | Versements déclarés | `id`, `challenge_id`, `week_index`, `amount_cents` (> 0), `deposited_on`, `status` (active/cancelled), horodatages |
| `preferences` | Réglages clé → JSON validé par Zod | onboarding, challenge actif, thème, rappel, partage |

**Semaine cochée ≠ versement** : l'état d'une semaine est **dérivé** des versements actifs et du drapeau `skipped`.

| État | Règle |
|---|---|
| `completed` | versé ≥ prévu (ou au moins un versement si aucun montant prévu) |
| `partial` | 0 < versé < prévu |
| `skipped` | ignorée explicitement (un versement la réactive) |
| `late` | semaine passée, ni complète ni ignorée |
| `current` / `upcoming` | semaine en cours / à venir |

Le total est la somme des versements actifs : chaque versement est compté **une seule fois**. Les badges sont recalculés à partir des données, jamais stockés.

### Calculs (src/domain)

- Classique : semaine *n* = *n* × unité ; inversé : (53 − *n*) × unité ; total 52 semaines = 1 378 × unité.
- Sur mesure : `distributeTarget` répartit la cible (constante, progressive ou dégressive) avec une somme **exactement** égale à la cible, arrondie à l'euro quand c'est possible.
- Progression en points de base (0–10 000) ; projection indicative au rythme moyen observé ; régularité = semaines passées réalisées ÷ semaines passées non ignorées.

### Serveur (Supabase, `supabase/migrations`)

Mêmes colonnes que le local pour `challenges`, `challenge_weeks` et `deposits`, avec `owner_id` obligatoire, plus :

- `subscription_entitlements` : droit premium, écrit **uniquement** par le webhook RevenueCat (service_role).
- `ai_usage` : compteur quotidien du coach, incrément atomique (`consume_ai_quota`), purge après 30 jours.
- `friend_challenges` et `friend_challenge_members` : défis entre amis, accessibles uniquement via des fonctions `SECURITY DEFINER`.

## Synchronisation (`src/features/account/syncEngine.ts`)

- Bouton « Synchroniser maintenant » (Profil → Compte), pas de synchronisation automatique en arrière-plan pour le moment.
- Pour chaque table, dans l'ordre des clés étrangères : lecture locale et distante, puis fusion ligne à ligne avec `mergeRows`. **La version modifiée le plus récemment l'emporte.** Les gagnants locaux sont envoyés, les gagnants distants sont appliqués localement.
- Aucune suppression physique : un versement annulé sur un appareil reste annulé partout, et rien ne disparaît en silence.
- Limite connue : deux modifications du même versement sur deux appareils hors ligne → la plus récente gagne (l'autre est perdue). C'est documenté ; une fusion champ par champ n'est pas nécessaire pour ce modèle.

## Sécurité

- **RLS sur toutes les tables exposées**, testée par `npm run test:rls`. Les tests vérifient : lecture et modification croisées impossibles, usurpation de `owner_id`, versement sur le challenge d'un autre, droits premium non modifiables, fonctions internes non appelables, codes d'invitation invalides ou expirés, montants masqués sans consentement, accès anonyme, suppression en cascade.
- **Défis entre amis** : les autres membres voient le pseudo et le pourcentage ; le montant uniquement si `share_amount` est activé. Créer un défi exige Premium (vérifié côté serveur) ; le rejoindre exige seulement un compte, pour ne pas bloquer les invités.
- **Coach IA** : identité vérifiée, droit premium vérifié côté serveur, quota quotidien, entrées bornées, aucune donnée identifiante transmise au modèle, garde-fous dans le prompt (pas de conseil en placement, pas de solde réel). Repli automatique côté serveur en cas de refus du modèle.
- **Secrets** : uniquement dans les secrets Supabase. L'application ne contient que des clés publiques.

## Décisions secondaires

- Le mode « sur mesure » est Premium ; classique, inversé et libre restent gratuits. Offre gratuite : 1 challenge actif ; Premium : 20 (voir `src/config/app.ts`). Résilier ne supprime jamais rien : seule la création est bloquée.
- Rappel : un seul rappel hebdomadaire local, en heure locale (suit le fuseau et l'heure d'été). L'application annule tous ses rappels programmés avant d'en reprogrammer un, ce qui évite les doublons.
- Carte de partage aux couleurs fixes de la marque, sans nom ni e-mail ; le montant peut être masqué.
