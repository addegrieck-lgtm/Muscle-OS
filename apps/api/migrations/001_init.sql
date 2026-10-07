-- VÆLORIA — schéma initial (PostgreSQL 16)
-- Conventions :
--   * Les joueurs sont identifiés par leur UUID Minecraft, jamais par leur pseudo.
--   * Les montants financiers sont en centimes (integer) + devise ISO.
--   * Les opérations sensibles sont idempotentes via des contraintes UNIQUE.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ───────────── Comptes ─────────────
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name  text NOT NULL,
  email         text UNIQUE,
  role          text NOT NULL DEFAULT 'player' CHECK (role IN ('player','moderator','admin','owner')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE discord_accounts (
  discord_id    text PRIMARY KEY,
  user_id       uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  username      text NOT NULL,
  avatar        text,
  linked_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
  token_hash    text PRIMARY KEY,               -- sha256 du jeton ; le jeton brut n'est jamais stocké
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  user_agent    text
);
CREATE INDEX sessions_user_idx ON sessions(user_id);

-- ───────────── Joueurs Minecraft ─────────────
CREATE TABLE players (
  uuid              uuid PRIMARY KEY,
  username          text NOT NULL,
  rank              text,
  first_seen_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz,
  last_server       text,
  online            boolean NOT NULL DEFAULT false,
  playtime_seconds  bigint NOT NULL DEFAULT 0,
  balance           numeric(18,2)
);
CREATE INDEX players_username_lower_idx ON players (lower(username));

CREATE TABLE username_history (
  player_uuid  uuid NOT NULL REFERENCES players(uuid) ON DELETE CASCADE,
  username     text NOT NULL,
  seen_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_uuid, username)
);

CREATE TABLE minecraft_accounts (
  player_uuid   uuid PRIMARY KEY REFERENCES players(uuid) ON DELETE CASCADE,
  user_id       uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  linked_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX minecraft_accounts_user_idx ON minecraft_accounts(user_id);

-- Code de liaison généré en jeu (/link) puis saisi sur le site.
CREATE TABLE link_codes (
  code          text PRIMARY KEY,
  player_uuid   uuid NOT NULL REFERENCES players(uuid) ON DELETE CASCADE,
  expires_at    timestamptz NOT NULL,
  used_at       timestamptz
);

-- ───────────── Saisons ─────────────
CREATE TABLE seasons (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  number       integer NOT NULL UNIQUE,
  name         text NOT NULL,
  status       text NOT NULL CHECK (status IN ('upcoming','active','ended')),
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz,
  description  text NOT NULL DEFAULT '',
  rewards      jsonb NOT NULL DEFAULT '[]',
  objectives   jsonb NOT NULL DEFAULT '[]'
);
-- Une seule saison active à la fois.
CREATE UNIQUE INDEX seasons_single_active ON seasons ((status)) WHERE status = 'active';

CREATE TABLE player_season_stats (
  season_id         uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  player_uuid       uuid NOT NULL REFERENCES players(uuid) ON DELETE CASCADE,
  kills             integer NOT NULL DEFAULT 0,
  deaths            integer NOT NULL DEFAULT 0,
  koth_captures     integer NOT NULL DEFAULT 0,
  playtime_seconds  bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (season_id, player_uuid)
);
CREATE INDEX pss_kills_idx ON player_season_stats (season_id, kills DESC);

CREATE TABLE player_achievements (
  player_uuid     uuid NOT NULL REFERENCES players(uuid) ON DELETE CASCADE,
  achievement_id  text NOT NULL,
  label           text NOT NULL,
  unlocked_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (player_uuid, achievement_id)
);

-- ───────────── Factions ─────────────
CREATE TABLE factions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id      uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  name           text NOT NULL,
  description    text,
  leader_uuid    uuid REFERENCES players(uuid),
  power          numeric(10,2) NOT NULL DEFAULT 0,
  max_power      numeric(10,2) NOT NULL DEFAULT 0,
  wealth         numeric(18,2) NOT NULL DEFAULT 0,
  claims_count   integer NOT NULL DEFAULT 0,
  kills          integer NOT NULL DEFAULT 0,
  koth_captures  integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  disbanded_at   timestamptz
);
CREATE UNIQUE INDEX factions_active_name ON factions (season_id, lower(name)) WHERE disbanded_at IS NULL;

CREATE TABLE faction_members (
  faction_id   uuid NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  player_uuid  uuid NOT NULL REFERENCES players(uuid) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('LEADER','OFFICER','MEMBER','RECRUIT')),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (faction_id, player_uuid)
);
CREATE INDEX faction_members_player_idx ON faction_members(player_uuid);

CREATE TABLE claims (
  id          bigserial PRIMARY KEY,
  faction_id  uuid NOT NULL REFERENCES factions(id) ON DELETE CASCADE,
  season_id   uuid NOT NULL REFERENCES seasons(id) ON DELETE CASCADE,
  world       text NOT NULL,
  chunk_x     integer NOT NULL,
  chunk_z     integer NOT NULL,
  claimed_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, world, chunk_x, chunk_z)
);

-- Instantanés figés (fin de saison, archives). Les classements live sont calculés + mis en cache.
CREATE TABLE leaderboards (
  id           bigserial PRIMARY KEY,
  season_id    uuid REFERENCES seasons(id) ON DELETE CASCADE,
  category     text NOT NULL,
  computed_at  timestamptz NOT NULL DEFAULT now(),
  entries      jsonb NOT NULL
);
CREATE INDEX leaderboards_lookup ON leaderboards (season_id, category, computed_at DESC);

-- ───────────── Contenu ─────────────
CREATE TABLE events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  title        text NOT NULL,
  type         text NOT NULL CHECK (type IN ('koth','boss','tournament','supply_drop','war','seasonal','other')),
  description  text NOT NULL DEFAULT '',
  starts_at    timestamptz NOT NULL,
  ends_at      timestamptz,
  location     text,
  rewards      text,
  published    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_upcoming ON events (starts_at) WHERE published;

CREATE TABLE news (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  title         text NOT NULL,
  excerpt       text NOT NULL DEFAULT '',
  body          text NOT NULL DEFAULT '',
  category      text NOT NULL CHECK (category IN ('actualites','minecraft','pvp','factions','guides','serveur')),
  cover_url     text,
  author        text NOT NULL DEFAULT 'Équipe VÆLORIA',
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  published_at  timestamptz,
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX news_published ON news (published_at DESC) WHERE status = 'published';

CREATE TABLE faq (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question   text NOT NULL,
  answer     text NOT NULL,
  position   integer NOT NULL DEFAULT 0,
  published  boolean NOT NULL DEFAULT true
);

CREATE TABLE site_settings (
  key         text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ───────────── Boutique & finances ─────────────
CREATE TABLE products (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug               text NOT NULL UNIQUE,
  name               text NOT NULL,
  description        text NOT NULL DEFAULT '',
  category           text NOT NULL CHECK (category IN ('cosmetics','ranks','effects','tags','pets','bundles')),
  price_cents        integer NOT NULL CHECK (price_cents >= 0),
  currency           char(3) NOT NULL DEFAULT 'EUR',
  image_url          text,
  active             boolean NOT NULL DEFAULT false,
  stock              integer CHECK (stock IS NULL OR stock >= 0),
  promo_percent      integer CHECK (promo_percent BETWEEN 0 AND 90),
  -- Modèles de commandes Minecraft exécutées à la livraison. Variables : {uuid} {username}
  delivery_commands  jsonb NOT NULL DEFAULT '[]',
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE order_counters (
  year  integer PRIMARY KEY,
  last  integer NOT NULL
);

CREATE TABLE orders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id        text NOT NULL UNIQUE,                 -- VAL-2026-000001
  user_id          uuid REFERENCES users(id),
  player_uuid      uuid NOT NULL REFERENCES players(uuid),
  status           text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','paid','fulfilled','refunded','cancelled','failed')),
  total_cents      integer NOT NULL CHECK (total_cents >= 0),
  currency         char(3) NOT NULL DEFAULT 'EUR',
  idempotency_key  text NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  paid_at          timestamptz,
  fulfilled_at     timestamptz
);

CREATE TABLE order_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES products(id),
  quantity          integer NOT NULL CHECK (quantity BETWEEN 1 AND 100),
  unit_price_cents  integer NOT NULL CHECK (unit_price_cents >= 0)
);

CREATE TABLE payments (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             uuid NOT NULL REFERENCES orders(id),
  provider             text NOT NULL,
  provider_payment_id  text NOT NULL,
  status               text NOT NULL CHECK (status IN ('pending','succeeded','failed','refunded','partially_refunded')),
  amount_cents         integer NOT NULL,
  currency             char(3) NOT NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_payment_id)
);

-- Déduplication des webhooks du prestataire (un même événement peut être livré plusieurs fois).
CREATE TABLE payment_webhook_events (
  provider           text NOT NULL,
  provider_event_id  text NOT NULL,
  type               text NOT NULL,
  received_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_event_id)
);

CREATE TABLE refunds (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id          uuid NOT NULL REFERENCES payments(id),
  provider_refund_id  text NOT NULL UNIQUE,
  amount_cents        integer NOT NULL CHECK (amount_cents > 0),
  reason              text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- Grand livre : chaque mouvement d'argent, positif (encaissement) ou négatif (remboursement).
CREATE TABLE transactions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid NOT NULL REFERENCES orders(id),
  payment_id    uuid REFERENCES payments(id),
  type          text NOT NULL CHECK (type IN ('charge','refund','chargeback','adjustment')),
  amount_cents  integer NOT NULL,
  currency      char(3) NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE entitlements (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id       uuid NOT NULL REFERENCES orders(id),
  order_item_id  uuid NOT NULL REFERENCES order_items(id),
  unit_index     integer NOT NULL,
  product_id     uuid NOT NULL REFERENCES products(id),
  player_uuid    uuid NOT NULL REFERENCES players(uuid),
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','revoked')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_item_id, unit_index)
);

-- File de commandes Web → Minecraft (sert aussi de table de livraisons).
CREATE TABLE minecraft_commands (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_uuid      uuid REFERENCES players(uuid),
  server           text,                          -- NULL = n'importe quel serveur
  command          text NOT NULL,
  require_online   boolean NOT NULL DEFAULT false,
  status           text NOT NULL DEFAULT 'PENDING'
                   CHECK (status IN ('PENDING','SENT','DELIVERED','FAILED','CANCELLED')),
  source           text NOT NULL,                 -- shop, reward, admin, referral…
  entitlement_id   uuid REFERENCES entitlements(id),
  idempotency_key  text NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  sent_at          timestamptz,
  lease_until      timestamptz,
  executed_at      timestamptz,
  retry_count      integer NOT NULL DEFAULT 0,
  max_retries      integer NOT NULL DEFAULT 10,
  error            text
);
CREATE INDEX minecraft_commands_queue ON minecraft_commands (created_at) WHERE status IN ('PENDING','SENT');

-- ───────────── Intégration serveur ─────────────
CREATE TABLE bridge_events (
  id            uuid PRIMARY KEY,               -- généré par le plugin → idempotence
  server        text NOT NULL,
  type          text NOT NULL,
  payload       jsonb NOT NULL,
  occurred_at   timestamptz NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now(),
  processed_at  timestamptz,
  error         text
);
CREATE INDEX bridge_events_type_time ON bridge_events (type, occurred_at DESC);

CREATE TABLE bridge_nonces (
  nonce       text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE server_status (
  server       text PRIMARY KEY,
  online       integer NOT NULL,
  max_players  integer NOT NULL,
  tps          numeric(4,2),
  mspt         numeric(8,2),
  version      text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE server_status_history (
  server       text NOT NULL,
  bucket       timestamptz NOT NULL,           -- arrondi à 5 minutes
  online       integer NOT NULL,
  tps          numeric(4,2),
  PRIMARY KEY (server, bucket)
);

CREATE TABLE incidents (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  severity     text NOT NULL CHECK (severity IN ('minor','major','critical','maintenance')),
  status       text NOT NULL CHECK (status IN ('investigating','identified','monitoring','resolved')),
  body         text NOT NULL DEFAULT '',
  started_at   timestamptz NOT NULL DEFAULT now(),
  resolved_at  timestamptz
);

-- ───────────── Sécurité & audit ─────────────
CREATE TABLE api_keys (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  key_prefix         text NOT NULL UNIQUE,      -- partie publique affichable (vk_xxxxxxxx)
  key_hash           text NOT NULL,             -- sha256 de la clé complète
  scopes             text[] NOT NULL DEFAULT '{public:read}',
  rate_limit_per_min integer NOT NULL DEFAULT 120,
  created_at         timestamptz NOT NULL DEFAULT now(),
  last_used_at       timestamptz,
  revoked_at         timestamptz
);

CREATE TABLE audit_logs (
  id           bigserial PRIMARY KEY,
  actor_type   text NOT NULL CHECK (actor_type IN ('user','admin','system','bridge','webhook')),
  actor_id     text,
  action       text NOT NULL,
  target_type  text,
  target_id    text,
  metadata     jsonb NOT NULL DEFAULT '{}',
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_target ON audit_logs (target_type, target_id);
CREATE INDEX audit_logs_time ON audit_logs (created_at DESC);

CREATE TABLE notifications (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES users(id) ON DELETE CASCADE,  -- NULL = diffusion
  channel        text NOT NULL CHECK (channel IN ('site','discord','minecraft','email')),
  title          text NOT NULL,
  body           text NOT NULL,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','cancelled')),
  scheduled_for  timestamptz NOT NULL DEFAULT now(),
  sent_at        timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX notifications_due ON notifications (scheduled_for) WHERE status = 'pending';

-- ───────────── Acquisition ─────────────
CREATE TABLE analytics_events (
  id             bigserial PRIMARY KEY,
  name           text NOT NULL,                 -- page_view, copy_ip, click_play, click_discord…
  path           text,
  visitor_id     text,                          -- identifiant aléatoire anonyme, pas d'IP stockée
  referrer_host  text,
  utm_source     text,
  utm_medium     text,
  utm_campaign   text,
  utm_content    text,
  props          jsonb NOT NULL DEFAULT '{}',
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX analytics_events_name_time ON analytics_events (name, created_at DESC);

CREATE TABLE beta_signups (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  minecraft_username  text NOT NULL,
  email               text,                     -- facultatif, uniquement pour prévenir de l'ouverture
  referral_code       text,
  utm_source          text,
  consent_at          timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX beta_signups_username ON beta_signups (lower(minecraft_username));

CREATE TABLE referral_codes (
  code        text PRIMARY KEY,
  kind        text NOT NULL DEFAULT 'player' CHECK (kind IN ('player','creator')),
  owner_uuid  uuid REFERENCES players(uuid),
  owner_name  text NOT NULL,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE referrals (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL REFERENCES referral_codes(code),
  referred_uuid  uuid NOT NULL UNIQUE REFERENCES players(uuid),  -- un joueur ne peut être parrainé qu'une fois
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','rewarded','rejected')),
  created_at     timestamptz NOT NULL DEFAULT now(),
  qualified_at   timestamptz,
  reject_reason  text
);

-- ───────────── Coûts d'infrastructure ─────────────
CREATE TABLE cost_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  provider     text NOT NULL,
  category     text NOT NULL CHECK (category IN ('hosting','database','minecraft','cdn','storage','email','monitoring','domain','other')),
  monthly_eur  numeric(10,2) NOT NULL,
  -- Part du coût qui croît avec le nombre de joueurs (0 = fixe, 1 = totalement variable).
  variable_ratio numeric(3,2) NOT NULL DEFAULT 0 CHECK (variable_ratio BETWEEN 0 AND 1),
  active       boolean NOT NULL DEFAULT true
);

CREATE TABLE infra_metrics (
  id            bigserial PRIMARY KEY,
  collected_at  timestamptz NOT NULL DEFAULT now(),
  source        text NOT NULL,
  cpu_pct       numeric(5,2),
  ram_mb        integer,
  db_size_mb    integer,
  storage_gb    numeric(10,2),
  bandwidth_gb  numeric(10,2),
  api_requests  integer
);
