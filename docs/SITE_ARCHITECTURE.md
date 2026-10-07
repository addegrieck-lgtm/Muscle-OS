# Architecture du site VÆLORIA

## 1. Analyse du dépôt initial

Le dépôt contenait **MuscleOS**, une PWA de coaching sportif (Vite + React 18, sans backend), déployée sur GitHub Pages. Aucun code serveur, plugin Minecraft, base de données ou contenu lié à VÆLORIA. À la demande explicite du propriétaire, MuscleOS a été **entièrement supprimé** et remplacé par ce projet (l'historique Git le conserve).

## 2. Vue d'ensemble

```
            Navigateur (mobile first)
                     │  HTTPS
          ┌──────────┴───────────┐
          ▼                      ▼
   apps/web (Next.js)     apps/admin (Next.js, /admin, Basic Auth)
          │  rendu serveur + cache ISR, jamais d'accès DB direct
          └──────────┬───────────┘
                     ▼
              apps/api (Fastify)  ◄── HMAC ──  Plugin VæloriaBridge (Paper 1.21)
                     │                               ▲
                     ▼                               │ Server List Ping (repli statut)
               PostgreSQL 16                    Serveur Minecraft
```

Règle absolue : **le navigateur ne parle jamais au serveur Minecraft** et **le serveur Minecraft ne parle jamais à la base**. Tout passe par l'API.

## 3. Arborescence

| Dossier | Rôle |
|---|---|
| `apps/web` | Site public (Next.js 15 App Router, React 19, Tailwind 4) |
| `apps/api` | API REST versionnée (Fastify 5, postgres.js, zod) |
| `apps/admin` | Back-office, servi sous `/admin` |
| `packages/ui` | Design system (Button, Card, Badge, Modal, Table, LeaderboardTable, PlayerCard, FactionCard, EventCard, NewsCard, StatCard, StatusIndicator, CopyIpButton) |
| `packages/types` | Contrats partagés : DTO API, événements du bridge (schémas zod) |
| `packages/config` | Constantes de marque (IP, liens), tokens de design, tsconfig de base |
| `packages/api-client` | Client typé de l'API utilisé par le site |
| `plugins/vaeloria-bridge` | Plugin Paper (Java 21, Gradle) |
| `deploy` | Dockerfile, Compose de production, Caddy, script de sauvegarde |
| `docs` | Cette documentation |

Navbar et Footer vivent dans `apps/web/components` car leur contenu est propre au site public.

## 4. Choix techniques et justification de chaque dépendance

| Dépendance | Pourquoi | Alternative écartée |
|---|---|---|
| Next.js 15 | SSR/ISR = pages rapides et indexables, metadata/sitemap/OG intégrés, server actions (formulaires sans API publique supplémentaire) | SPA Vite : mauvais SEO |
| React 19 | Requis par Next | — |
| Tailwind CSS 4 | Styles atomiques, zéro CSS mort, tokens dans `theme.css` | CSS-in-JS : JS client inutile |
| Fastify 5 | Rapide, validation et hooks simples, écosystème officiel (CORS, rate-limit) | Express : plus lent, moins structuré ; routes API Next : couplerait l'API au site |
| @fastify/rate-limit, @fastify/cors | Sécurité de base, maintenus par l'équipe Fastify | — |
| postgres (porsager) | Client SQL léger, requêtes paramétrées par template, transactions | ORM (Prisma) : moteur binaire lourd, SQL métier (classements, files) plus clair en SQL |
| zod | Validation runtime partagée site/API/bridge | — |
| esbuild, tsx, vitest, typescript | Build/exécution/tests sans configuration lourde | — |
| server-only | Empêche d'importer le client API serveur côté navigateur | — |

Écartés volontairement en Phase 1 : Redis, file de messages, ORM, CMS headless, Turborepo, librairie d'icônes, librairie Markdown, outil d'analytics tiers. Chacun a un point d'entrée prévu (voir `SCALABILITY.md`).

## 5. Rendu et cache côté site

- Pages éditoriales (PvP, Factions, Guides, légal) : **statiques**.
- Pages de données : **ISR** (`revalidate` 15 s à 5 min selon la fraîcheur utile).
- Chaque appel API passe par `orNull()` : si l'API tombe, le site reste affichable avec des états vides honnêtes (jamais de chiffre inventé).
- Profils joueur/faction : rendus à la demande, mis en cache 60 s ; un 404 API donne une vraie 404, une API indisponible donne la page d'erreur.

## 6. Pages (§43)

`/` `/pvp` `/factions` `/seasons` `/leaderboards` (+ `/leaderboards/[category]`, redirections `/leaderboard`, `/classement`) `/events` `/news` (+ `[slug]`) `/guides` (+ `[slug]`) `/faq` `/shop` `/rules` `/staff` `/support` `/discord` `/status` `/login` `/account` `/player/[username]` `/faction/[name]` `/beta` `/creators` `/mentions-legales` `/confidentialite` `/cookies` `/cgv` `/contact`, plus `sitemap.xml`, `robots.txt`, `opengraph-image`.

## 7. Mobile

Barre fixe en bas (Copier l'IP + Jouer), navbar réduite à un menu, tableaux scrollables horizontalement, cartes en une colonne, zones tactiles ≥ 44 px, `safe-area-inset` iOS.

## 8. Accessibilité

Lien d'évitement, `aria-current`, fil d'Ariane, `<details>` natifs pour la FAQ, `<dialog>` natif pour les modales, annonce `aria-live` à la copie de l'IP, contrastes sur fond sombre, `prefers-reduced-motion` respecté, labels sur tous les champs.

## 9. Identité visuelle

Source de vérité : le pack logo dans `brand/` (SVG générés par `brand/build.py`, à relancer après toute retouche ; `valoria-wordmark-argent.svg` et `valoria-og.png` en sont dérivés pour le web).

| Élément | Choix | Raison |
|---|---|---|
| Fond | `#07070A` noir, surfaces anthracite `#101115` / `#1B1C21`, filets `#2A2C33` | palette du pack |
| Argent | dégradé blanc → `#E2E4E9`, bande `#AEB3BC` nette à mi-hauteur (`metal-text`) | reflet chromé du logotype |
| Rubis | `#D21F2F` / `#A3121E` pour les surfaces (boutons `ruby-fill`, losanges) ; `#EF4450` pour le texte | le rubis pur ne fait que 3,8:1 sur noir : le texte utilise une teinte éclaircie (5,4:1, WCAG AA) |
| Titres | Chakra Petch, capitales, léger interlettrage | angles coupés = écho du O octogonal et des facettes de l'écusson |
| Texte | Inter | lisibilité sur mobile |
| Motifs | losange rubis (eyebrows), filet–losange–filet (`Ornament`), lueur rubis sombre derrière l'écusson | repris du logo complet et de la bannière |
| Logos | écusson + logotype en SVG (`public/brand/`), favicon = icône du pack, image de partage = bannière recadrée 1200×630 | nets à toute taille, aucun JS |

L'accent reste personnalisable via `--accent` (texte) et `--accent-fill` (surfaces) dans `packages/config/theme.css`. Icône du serveur Minecraft (64×64) : `brand/server-icon.png`, à placer à la racine du serveur.

## 10. Aperçu statique (GitHub Pages)

En attendant l'hébergement réel, `.github/workflows/preview-pages.yml` publie un export HTML du site sur https://addegrieck-lgtm.github.io/Muscle-OS/ (`pnpm --filter @vaeloria/web build:preview`).

- Aucune API : statut « indisponible », classements et événements vides, bandeau « Aperçu » en haut de page.
- Pas de formulaire bêta (renvoi vers Discord), pas d'analytics, pas de profils joueur/faction ni d'articles individuels.
- Non indexé (`robots.txt` + `noindex`) pour ne pas faire doublon avec le futur site officiel.
- Mécanisme : les fichiers de route qui exigent un serveur sont nommés `*.full.tsx|ts`, leurs remplaçants statiques `*.preview.tsx` ; `pageExtensions` (dans `next.config.ts`) choisit la série selon `NEXT_PUBLIC_PREVIEW`.
