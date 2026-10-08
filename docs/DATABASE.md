# Base de données

PostgreSQL 16. Schéma : `apps/api/migrations/001_init.sql`. Migrations appliquées automatiquement au démarrage de l'API (verrou consultatif : plusieurs instances peuvent démarrer en même temps). Ajout d'une migration : nouveau fichier `NNN_description.sql`, jamais de modification d'une migration déjà déployée.

## Conventions

- **Joueur = UUID Minecraft** (`players.uuid`). Le pseudo est un attribut modifiable ; l'historique est dans `username_history`. Les URL `/player/:username` sont résolues vers l'UUID.
- Montants en **centimes** (`integer`) + devise ISO. Pas de flottant pour l'argent réel.
- Idempotence par contraintes `UNIQUE` (voir plus bas), jamais par vérification applicative seule.
- Horodatages `timestamptz` (UTC), affichage en Europe/Paris côté site.

## Tables

| Domaine | Tables |
|---|---|
| Comptes | `users`, `discord_accounts`, `minecraft_accounts`, `link_codes`, `sessions` |
| Jeu | `players`, `username_history`, `seasons`, `player_season_stats`, `player_achievements`, `factions`, `faction_members`, `claims`, `leaderboards` (archives figées) |
| Contenu | `events`, `news`, `faq`, `site_settings`, `incidents` |
| Boutique / finances | `products`, `orders`, `order_counters`, `order_items`, `payments`, `payment_webhook_events`, `refunds`, `transactions`, `entitlements`, `minecraft_commands` (sert aussi de table de livraisons) |
| Intégration | `bridge_events` (journal + idempotence), `bridge_nonces` (anti-rejeu), `server_status`, `server_status_history` (pic par tranche de 5 min, MSPT inclus), `server_alerts` (épisodes de lag, migration 005) |
| Sécurité | `api_keys` (hash SHA-256 uniquement), `audit_logs` |
| Acquisition | `analytics_events`, `beta_signups`, `referral_codes`, `referrals` |
| Exploitation | `notifications`, `cost_items`, `infra_metrics` |

## Garanties d'idempotence

| Opération | Clé |
|---|---|
| Événement Minecraft | `bridge_events.id` (UUID du plugin) ; un événement en erreur est retraité s'il est renvoyé |
| Rejeu de requête signée | `bridge_nonces.nonce` |
| Création de commande | `orders.idempotency_key` |
| Webhook de paiement | `payment_webhook_events (provider, provider_event_id)` |
| Paiement | `payments (provider, provider_payment_id)` |
| Droit acquis | `entitlements (order_item_id, unit_index)` |
| Commande Minecraft | `minecraft_commands.idempotency_key` (`entitlement:<id>:<n>`) |
| Parrainage | `referrals.referred_uuid` (un joueur parrainé une seule fois) |
| Bêta | index unique sur `lower(minecraft_username)` |

## Saisons

Une seule saison `active` (index unique partiel). Les factions, claims et statistiques sont rattachés à une saison : une nouvelle saison repart de zéro sans rien supprimer. Les classements live sont calculés en SQL (indexés) puis mis en cache ; `leaderboards` stocke les instantanés de fin de saison.

## Données de démonstration

`pnpm db:seed` : contenu de base réel (FAQ, Saison I à venir, postes de coûts estimés, article d'annonce).
`pnpm db:seed -- --demo` : joueurs et factions **fictifs** pour le développement. Refusé si `NODE_ENV=production`.

## Environnements

`development` (base locale), `staging` (base séparée, données synthétiques), `production`. Les tests refusent toute base dont le nom ne se termine pas par `_test`. Ne jamais copier la production vers un autre environnement sans anonymisation.
