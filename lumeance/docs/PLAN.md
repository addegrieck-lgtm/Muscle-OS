# Plan d’exécution — analyse initiale

## 1. Analyse de l’existant

Le dépôt Muscle-OS contient déjà deux projets indépendants : **VÆLORIA** (monorepo pnpm : `apps/`, `packages/`, plugins Minecraft) et **CAP 52** (`cap52/`, application Expo autonome avec npm). Aucun fichier LUMÉANCE n’existait.

Décision : créer LUMÉANCE dans un **dossier autonome `lumeance/`** (npm, son propre lockfile, hors workspace pnpm), sur le modèle de `cap52/`. Aucun fichier des autres projets n’est modifié, hormis l’ajout d’un workflow CI dédié filtré sur `lumeance/**`. Le dossier peut être extrait tel quel dans un dépôt dédié (`git subtree split --prefix lumeance`).

## 2. Architecture retenue

- **Next.js 15.5 (App Router)** : version stable mûre, compatible React 19 et React Three Fiber 9 (Next 16 écarté pour limiter les risques de migration).
- **Rendu** : pages publiques statiques/ISR (5 min), administration dynamique, actions serveur pour toutes les écritures.
- **Données** : Supabase (PostgreSQL + RLS, Auth, Storage). Couche `lib/services` qui bascule automatiquement sur le catalogue fictif sans configuration.
- **Motion** : GSAP (révélations, parallaxe), Three.js/R3F (intro et lustre du hero) chargés à la demande ; CSS pour le reste. Framer Motion **non installé** : GSAP + CSS couvrent les besoins et évitent ~40 kB de JS supplémentaire.
- **Sécurité en profondeur** : middleware (session) → `requireAdmin` (rôle, côté serveur) → RLS + déclencheurs en base.

## 3. Dépendances

next, react, react-dom, three, @react-three/fiber, gsap, @supabase/supabase-js, @supabase/ssr, zod, server-only. Dev : typescript 5.9, tailwindcss 4, vitest, eslint (config Next), prettier, opentype.js (génération du lettrage). Polices auto-hébergées (Cormorant Garamond, Manrope).

## 4. Risques identifiés

| Risque | Traitement |
|---|---|
| Aucune photographie produit réelle | Illustrations vectorielles signalées « Illustration », jamais présentées comme photos |
| Données produits non vérifiées | Catalogue fictif marqué, aucune fiche technique, certification, stock ou délai inventés |
| Poids des animations 3D | Chargement différé, arrêt hors écran, DPR limité sur mobile, repli SVG sans WebGL |
| Faux paiement | Aucun prestataire implémenté ; la base refuse « payée » sans transaction confirmée |
| Fuite de données | RLS sur toutes les tables, aucune lecture anonyme hors catalogue publié, clé service_role serveur uniquement |
| Pas d’instance Supabase pendant le développement | Tests RLS sur PostgreSQL 16 local avec bouchons auth/storage |
| Nom et domaine non vérifiés | Signalé ; site non indexable par défaut (`NEXT_PUBLIC_INDEXABLE=0`) |

## 5. Phasage

1. Fondations · 2. Identité visuelle · 3. Showroom · 4. Boutique · 5. Administration · 6. Sécurité · 7. SEO et conformité · 8. Préparation commerciale — compte rendu de chaque phase dans [STATUS.md](STATUS.md).
