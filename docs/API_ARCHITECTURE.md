# Architecture de l'API

Fastify 5, TypeScript, un seul processus (Phase 1). Point d'entrée : `apps/api/src/index.ts` (migrations automatiques au démarrage), construction de l'app dans `src/app.ts` (injectable pour les tests).

## Espaces de routes

| Préfixe | Consommateur | Auth | Limite |
|---|---|---|---|
| `/api/v1` | Site (rendu serveur) | aucune (lecture) | 300 req/min/IP ; `POST /beta` 5/10 min ; `POST /analytics` 60/min |
| `/public/v1` | Tiers (bots, overlays, sites de vote) | facultative `x-api-key` | 30 req/min/IP, ou quota de la clé |
| `/bridge/v1` | Plugin VæloriaBridge | HMAC + timestamp + nonce | 600 req/min |
| `/admin/v1` | App admin (serveur à serveur) | `Authorization: Bearer ADMIN_API_TOKEN` | 300 req/min |
| `/health` | Supervision | — | — |
| `/docs/openapi.json` | Développeurs | — (spec publique seule en production) | — |

### `/api/v1`

| Méthode | Route | Description |
|---|---|---|
| GET | `/server/status` | État agrégé : `online/offline/maintenance/unknown`, joueurs, source (`bridge`/`ping`/`none`) |
| GET | `/server/services` | État des services + incidents (page Statut) |
| GET | `/server/players` | Joueurs en ligne (seulement sur serveurs avec heartbeat récent) |
| GET | `/season` | Saison active et prochaine |
| GET | `/leaderboards?limit=` | Top N de toutes les catégories |
| GET | `/leaderboards/:category?page=` | Classement paginé (factions, kills, wealth, power, territory, koth, activity) |
| GET | `/player/:username` | Profil par pseudo **ou UUID** |
| GET | `/faction/:name` | Profil de faction (saison active) |
| GET | `/events` | Événements à venir publiés |
| GET | `/news`, `/news/:slug` | Articles publiés |
| GET | `/faq` | FAQ dynamique |
| GET | `/stats` | Compteurs globaux |
| GET | `/shop/products` | Produits actifs, prix promo calculé serveur |
| POST | `/beta` | Inscription bêta (consentement obligatoire, unicité du pseudo) |
| POST | `/analytics` | Événement analytics first-party (accepte `text/plain` pour `sendBeacon`) |

### `/bridge/v1`

| Méthode | Route | Description |
|---|---|---|
| POST | `/events` | Lot ≤ 500 événements, idempotent par `id` |
| POST | `/commands/claim` | Réserve des commandes (bail 60 s, `FOR UPDATE SKIP LOCKED`) |
| POST | `/commands/:id/ack` | `DELIVERED`, `FAILED` ou `DEFERRED` |

### `/admin/v1`

`GET /dashboard`, `GET /players?q=`, `GET /players/:uuid`, CRUD `news` `events` `products` `faq` `incidents`, `GET|POST /commands`, `POST /commands/:id/retry`, `GET|PUT /settings/maintenance`, `GET /costs`, `GET /funnel?days=`, `GET /marketing?days=`, `GET /audit`. Chaque écriture est journalisée dans `audit_logs`.

## Format des erreurs

```json
{ "error": { "code": "not_found", "message": "Joueur introuvable", "details": [] } }
```

Codes : `bad_request` (400, avec `details` zod), `unauthorized` (401), `not_found` (404), `already_registered` / `not_retryable` (409), `rate_limited` (429), `internal` (500, message générique, détail dans les logs).

## Cache

`TtlCache` mémoire (`src/lib/cache.ts`) avec déduplication des requêtes concurrentes : statut 10 s, classements 60 s, news 2 min, articles 5 min, produits 5 min. En-têtes `Cache-Control` avec `s-maxage` + `stale-while-revalidate` pour le CDN. Invalidation ciblée lors des écritures admin et des événements bridge. Phase 2 : même interface sur Redis.

## Statut du serveur

1. Heartbeat du plugin < 90 s → source `bridge` (somme de tous les serveurs du réseau).
2. Sinon, si `MC_PING_HOST` est défini → Server List Ping effectué **par l'API** (`src/lib/minecraftPing.ts`, sans dépendance).
3. Sinon `unknown` : le site affiche « Statut indisponible », jamais un faux chiffre.
Le mode maintenance (admin) prime sur tout.

## Temps réel

Pas de WebSocket/SSE en Phase 1 : l'ISR à 15 s suffit pour le compteur de joueurs. SSE sera ajouté (`GET /api/v1/stream`) lorsque des usages le justifieront : compte à rebours KOTH en direct, notifications. Le canal n'enverra que des événements déjà publics.

## Documentation OpenAPI

`GET /docs/openapi.json` (OpenAPI 3.1, `src/openapi.ts`). En production, seule la section `/public/v1` est exposée. À importer dans Swagger UI / Scalar / Postman.

## Tests

`apps/api/test` — 33 tests d'intégration sur un vrai PostgreSQL (`DATABASE_URL_TEST`, base `*_test` obligatoire, remise à zéro à chaque fichier) : sécurité du bridge, idempotence, cycle de vie d'une faction, file de commandes, commandes boutique, API publique, admin, Server List Ping (faux serveur TCP), vecteur HMAC partagé avec Java.
