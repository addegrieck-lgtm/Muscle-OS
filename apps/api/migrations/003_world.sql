-- VÆLORIA V2 — le monde : fondateurs, empires, parrainage, influence, guerres, carte,
-- Conseil (sondages), journal, roadmap. Tout le contenu éditorial est configurable dans l'admin.

-- ───────────── Fondateurs ─────────────
CREATE TABLE founder_counter (id boolean PRIMARY KEY DEFAULT true CHECK (id), last integer NOT NULL DEFAULT 0);
INSERT INTO founder_counter DEFAULT VALUES;

CREATE TABLE founders (
  number      integer PRIMARY KEY,                       -- FONDATEUR #N, attribué sans trou
  user_id     uuid NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE founder_milestones (
  threshold    integer PRIMARY KEY CHECK (threshold > 0),
  title        text NOT NULL,
  description  text NOT NULL DEFAULT '',
  reward       text,
  -- Contenu révélé quand le palier est atteint (vide tant qu'il ne l'est pas côté site)
  reveal       text
);

INSERT INTO founder_milestones (threshold, title, description, reward) VALUES
  (500, 'Première étape communautaire', 'Les 500 premiers habitants ouvrent la voie.', '[À DÉFINIR]'),
  (1000, 'Nouveau contenu dévoilé', 'Une nouvelle mécanique de VÆLORIA est révélée.', '[À DÉFINIR]'),
  (2000, 'Zone spéciale révélée', 'Une région inédite de la carte apparaît.', '[À DÉFINIR]'),
  (3000, 'Lancement', 'Les 3 000 fondateurs déclenchent l''événement d''ouverture.', '[À DÉFINIR]');

INSERT INTO site_settings (key, value) VALUES
  ('founders.cap', '3000'),
  ('founders.open', 'true'),
  ('empires.max_members', '50')
ON CONFLICT (key) DO NOTHING;

-- ───────────── Parrainage (comptes) ─────────────
ALTER TABLE users ADD COLUMN invite_code text UNIQUE CHECK (invite_code ~ '^[A-Z0-9]{6,12}$');
ALTER TABLE users ADD COLUMN influence integer NOT NULL DEFAULT 0;

CREATE TABLE referral_clicks (
  id            bigserial PRIMARY KEY,
  code          text NOT NULL,
  visitor_hash  text NOT NULL,                             -- empreinte anonyme (pas d'IP stockée)
  day           date NOT NULL DEFAULT current_date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code, visitor_hash, day)                          -- un clic compté par visiteur et par jour
);

CREATE TABLE user_referrals (
  referred_user_id  uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,   -- un seul parrain par compte
  referrer_user_id  uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code              text NOT NULL,
  status            text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','qualified','rejected')),
  created_at        timestamptz NOT NULL DEFAULT now(),
  qualified_at      timestamptz,
  reject_reason     text,
  -- Compte Minecraft qui a servi à qualifier : unique, même s'il est relié plus tard à un autre compte VÆLORIA
  qualified_player_uuid uuid UNIQUE,
  CHECK (referred_user_id <> referrer_user_id)
);
CREATE INDEX user_referrals_referrer_idx ON user_referrals (referrer_user_id, status);

-- ───────────── Empires ─────────────
CREATE TABLE empires (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,40}$'),
  name           text NOT NULL,
  tag            text NOT NULL CHECK (tag ~ '^[A-Z0-9]{2,5}$'),
  motto          text NOT NULL DEFAULT '',
  description    text NOT NULL DEFAULT '',
  color          text NOT NULL CHECK (color ~ '^#[0-9a-f]{6}$'),
  crest          text NOT NULL,
  owner_user_id  uuid NOT NULL REFERENCES users(id),
  recruiting     boolean NOT NULL DEFAULT true,
  invite_code    text NOT NULL UNIQUE CHECK (invite_code ~ '^[A-Z0-9]{8}$'),
  influence      integer NOT NULL DEFAULT 0,
  -- Faction en jeu associée (lien posé par l'admin ou le bridge au lancement)
  faction_name   text,
  status         text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disbanded','banned')),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX empires_name_ci ON empires (lower(name)) WHERE status <> 'disbanded';
CREATE UNIQUE INDEX empires_tag_ci ON empires (tag) WHERE status <> 'disbanded';
CREATE INDEX empires_influence_idx ON empires (influence DESC) WHERE status = 'active';

CREATE TABLE empire_members (
  user_id    uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,  -- un empire à la fois
  empire_id  uuid NOT NULL REFERENCES empires(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('leader','officer','member')),
  joined_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX empire_members_empire_idx ON empire_members (empire_id);

-- ───────────── Influence ─────────────
CREATE TABLE influence_rules (
  kind             text PRIMARY KEY,
  label            text NOT NULL,
  points           integer NOT NULL,
  daily_cap        integer,                 -- nombre maximal d'attributions par compte et par jour
  once_per_user    boolean NOT NULL DEFAULT false,
  requires_linked  boolean NOT NULL DEFAULT false,   -- compte Minecraft lié exigé (anti-faux comptes)
  active           boolean NOT NULL DEFAULT true
);

INSERT INTO influence_rules (kind, label, points, daily_cap, once_per_user, requires_linked) VALUES
  ('founder_join', 'Devenir fondateur', 10, NULL, true, false),
  ('account_linked', 'Lier son compte Minecraft', 20, NULL, true, false),
  ('empire_create', 'Fonder un empire', 10, NULL, true, false),
  ('referral_qualified', 'Recrue qualifiée (compte Minecraft lié)', 50, 10, false, true),
  ('vote_cast', 'Voter au Conseil', 3, 5, false, true),
  ('event_participation', 'Participer à un événement', 15, NULL, false, true),
  ('war_victory', 'Victoire de guerre', 40, NULL, false, true),
  ('playtime_hour', 'Heure de jeu', 1, 8, false, true);

CREATE TABLE influence_events (
  id               bigserial PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  empire_id        uuid REFERENCES empires(id) ON DELETE SET NULL,  -- empire du joueur au moment du gain
  kind             text NOT NULL REFERENCES influence_rules(kind),
  points           integer NOT NULL,
  label            text NOT NULL,
  idempotency_key  text NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX influence_events_user_day ON influence_events (user_id, kind, created_at);
CREATE INDEX influence_events_empire ON influence_events (empire_id);

-- ───────────── Guerres ─────────────
CREATE TABLE wars (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                   text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,80}$'),
  title                  text NOT NULL,
  attacker_empire_id     uuid NOT NULL REFERENCES empires(id),
  defender_empire_id     uuid NOT NULL REFERENCES empires(id),
  status                 text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','active','ended','cancelled')),
  starts_at              timestamptz NOT NULL,
  ends_at                timestamptz,
  attacker_score         integer NOT NULL DEFAULT 0,
  defender_score         integer NOT NULL DEFAULT 0,
  attacker_territories   integer NOT NULL DEFAULT 0,
  defender_territories   integer NOT NULL DEFAULT 0,
  participants           integer NOT NULL DEFAULT 0,
  winner_empire_id       uuid REFERENCES empires(id),
  summary                text NOT NULL DEFAULT '',
  source                 text NOT NULL DEFAULT 'admin' CHECK (source IN ('admin','bridge')),
  external_id            text UNIQUE,      -- identifiant côté serveur Minecraft
  created_at             timestamptz NOT NULL DEFAULT now(),
  CHECK (attacker_empire_id <> defender_empire_id)
);
CREATE INDEX wars_status_idx ON wars (status, starts_at DESC);

CREATE TABLE war_events (
  id           bigserial PRIMARY KEY,
  war_id       uuid NOT NULL REFERENCES wars(id) ON DELETE CASCADE,
  kind         text NOT NULL CHECK (kind IN ('start','capture','battle','note','end')),
  message      text NOT NULL,
  occurred_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX war_events_war_idx ON war_events (war_id, occurred_at);

-- ───────────── Carte ─────────────
CREATE TABLE map_zones (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key          text NOT NULL UNIQUE CHECK (key ~ '^[a-z0-9-]{2,40}$'),
  name         text NOT NULL,
  kind         text NOT NULL CHECK (kind IN ('spawn','neutral','koth','warzone','event','outpost')),
  -- Rectangle en coordonnées de blocs Minecraft (X, Z)
  x1 integer NOT NULL, z1 integer NOT NULL, x2 integer NOT NULL, z2 integer NOT NULL,
  description  text NOT NULL DEFAULT '',
  active       boolean NOT NULL DEFAULT true,
  CHECK (x2 > x1 AND z2 > z1)
);

INSERT INTO site_settings (key, value) VALUES ('map.world_radius', '5000') ON CONFLICT DO NOTHING;
INSERT INTO map_zones (key, name, kind, x1, z1, x2, z2, description) VALUES
  ('spawn', 'Spawn', 'spawn', -300, -300, 300, 300, 'Point d''arrivée, zone protégée.'),
  ('terres-neutres', 'Terres neutres', 'neutral', -1200, -1200, 1200, 1200, 'Ni claim ni guerre : le temps de s''installer.'),
  ('citadelle', 'La Citadelle', 'koth', 1700, -500, 2300, 100, 'KOTH principal.'),
  ('kharos', 'Kharos', 'event', -2600, 1600, -1800, 2400, 'Théâtre des grands événements.'),
  ('front-nord', 'Front du Nord', 'warzone', -800, -3600, 800, -2600, 'Zone de guerre permanente.');

ALTER TABLE events DROP CONSTRAINT events_type_check;
ALTER TABLE events ADD CONSTRAINT events_type_check
  CHECK (type IN ('koth','boss','tournament','supply_drop','war','seasonal','gold_rush','siege','other'));
ALTER TABLE events
  ADD COLUMN participants   integer,
  ADD COLUMN empires_count  integer,
  ADD COLUMN zone_key       text REFERENCES map_zones(key) ON UPDATE CASCADE ON DELETE SET NULL,
  ADD COLUMN external_id    text UNIQUE;

-- ───────────── Conseil (sondages) ─────────────
CREATE TABLE polls (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,80}$'),
  question      text NOT NULL,
  description   text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','closed')),
  opens_at      timestamptz NOT NULL DEFAULT now(),
  closes_at     timestamptz,
  -- Qui peut voter : tout compte, ou seulement les comptes avec Minecraft lié (plus robuste)
  eligibility   text NOT NULL DEFAULT 'account' CHECK (eligibility IN ('account','linked')),
  outcome       text,                     -- décision prise à l'issue du vote
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE poll_options (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id   uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label     text NOT NULL,
  position  integer NOT NULL DEFAULT 0
);

CREATE TABLE poll_votes (
  poll_id     uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  option_id   uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)            -- un vote par compte
);

-- ───────────── Journal & roadmap ─────────────
CREATE TABLE journal_entries (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug           text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{2,80}$'),
  episode        integer,
  title          text NOT NULL,
  kind           text NOT NULL CHECK (kind IN ('video','short','update','coulisses','milestone')),
  summary        text NOT NULL DEFAULT '',
  body           text NOT NULL DEFAULT '',
  video_url      text,
  thumbnail_url  text,
  published      boolean NOT NULL DEFAULT false,
  published_at   timestamptz,                 -- NULL = annoncé, pas encore sorti
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE roadmap_steps (
  key       text PRIMARY KEY CHECK (key ~ '^[a-z0-9-]{2,40}$'),
  title     text NOT NULL,
  summary   text NOT NULL DEFAULT '',
  details   text NOT NULL DEFAULT '',
  status    text NOT NULL DEFAULT 'upcoming' CHECK (status IN ('done','current','upcoming')),
  position  integer NOT NULL UNIQUE,
  eta       text
);
