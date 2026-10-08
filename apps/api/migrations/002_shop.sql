-- VÆLORIA — Boutique complète : catégories, livraisons par produit, promotions, coupons,
-- points boutique, grades, livraisons métier. Migre les données de 001 sans perte.

-- ───────────── Catalogue ─────────────
CREATE TABLE product_categories (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug             text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9-]{1,40}$'),
  name             text NOT NULL,
  description      text NOT NULL DEFAULT '',
  position         integer NOT NULL DEFAULT 0,
  active           boolean NOT NULL DEFAULT true,
  seo_title        text,
  seo_description  text
);

INSERT INTO product_categories (slug, name, description, position) VALUES
  ('grades', 'Grades', 'Débloque un grade et son kit. Chaque achat rapporte aussi des points boutique.', 10),
  ('spawners', 'Spawners', 'Développe l''économie de ta faction.', 20),
  ('items', 'Items', 'Ressources vanilla pour bâtir et progresser plus vite.', 30),
  ('kits', 'Kits', 'Équipement vanilla prêt à l''emploi.', 40),
  ('packs', 'Packs', 'Plusieurs avantages réunis, au meilleur prix.', 50),
  ('cosmetiques', 'Cosmétiques', 'Pour se distinguer, sans aucun avantage de combat.', 60);

ALTER TABLE products
  ADD COLUMN category_id        uuid REFERENCES product_categories(id),
  ADD COLUMN short_description  text NOT NULL DEFAULT '',
  -- NULL = points calculés depuis le prix payé (1 € = 1 point par défaut)
  ADD COLUMN points             integer CHECK (points IS NULL OR points >= 0),
  ADD COLUMN delivery_type      text NOT NULL DEFAULT 'ITEM' CHECK (delivery_type IN ('RANK','KIT','ITEM','SPAWNER','PACK','COSMETIC')),
  ADD COLUMN sort_order         integer NOT NULL DEFAULT 0;

-- Anciennes catégories texte → nouvelles catégories
UPDATE products p SET category_id = c.id
FROM product_categories c
WHERE c.slug = CASE p.category
  WHEN 'ranks' THEN 'grades' WHEN 'bundles' THEN 'packs' WHEN 'cosmetics' THEN 'cosmetiques'
  WHEN 'effects' THEN 'cosmetiques' WHEN 'tags' THEN 'cosmetiques' WHEN 'pets' THEN 'cosmetiques' ELSE 'items' END;
UPDATE products SET delivery_type = CASE category WHEN 'ranks' THEN 'RANK' WHEN 'bundles' THEN 'PACK' ELSE 'COSMETIC' END;
ALTER TABLE products ALTER COLUMN category_id SET NOT NULL;
CREATE INDEX products_category_idx ON products (category_id, sort_order) WHERE active;

-- Commandes de livraison par produit (remplace products.delivery_commands)
CREATE TABLE product_deliveries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position        integer NOT NULL DEFAULT 0,
  action          text NOT NULL CHECK (action IN ('GRANT_RANK','GIVE_KIT','GIVE_ITEM','GIVE_SPAWNER','ADD_POINTS','SYNC_PLAYER','COMMAND')),
  -- Variables : {uuid} {username} {quantity}. NULL pour ADD_POINTS / SYNC_PLAYER (traités par le plugin).
  command         text,
  require_online  boolean NOT NULL DEFAULT false
);
CREATE INDEX product_deliveries_product_idx ON product_deliveries (product_id, position);

INSERT INTO product_deliveries (product_id, position, action, command)
SELECT p.id, t.ord::int - 1, 'COMMAND', t.cmd
FROM products p, jsonb_array_elements_text(p.delivery_commands) WITH ORDINALITY AS t(cmd, ord);

-- ───────────── Promotions & coupons ─────────────
CREATE TABLE promotions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  label        text,                       -- badge affiché (« WEEK-END VÆLORIA »)
  kind         text NOT NULL CHECK (kind IN ('percent','fixed','points_bonus')),
  -- percent : 1..90 ; fixed : centimes ; points_bonus : points par unité
  value        integer NOT NULL CHECK (value > 0),
  target_type  text NOT NULL DEFAULT 'product' CHECK (target_type IN ('all','category','product')),
  target_id    uuid,
  starts_at    timestamptz NOT NULL DEFAULT now(),
  ends_at      timestamptz,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CHECK (kind <> 'percent' OR value <= 90),
  CHECK ((target_type = 'all') = (target_id IS NULL))
);
CREATE INDEX promotions_live ON promotions (starts_at, ends_at) WHERE active;

INSERT INTO promotions (name, kind, value, target_type, target_id)
SELECT 'Promotion migrée — ' || name, 'percent', promo_percent, 'product', id FROM products WHERE promo_percent > 0;

CREATE TABLE coupons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL UNIQUE CHECK (code ~ '^[A-Z0-9_-]{3,32}$'),
  kind        text NOT NULL CHECK (kind IN ('percent','fixed','points_bonus')),
  value       integer NOT NULL CHECK (value > 0),
  max_uses    integer,
  uses        integer NOT NULL DEFAULT 0,
  starts_at   timestamptz NOT NULL DEFAULT now(),
  ends_at     timestamptz,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE products DROP COLUMN category, DROP COLUMN promo_percent, DROP COLUMN delivery_commands;

-- ───────────── Commandes ─────────────
ALTER TABLE orders DROP CONSTRAINT orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('pending','paid','fulfilled','partially_refunded','refunded','cancelled','failed','expired'));
ALTER TABLE orders
  ADD COLUMN recipient_username  text,
  ADD COLUMN subtotal_cents      integer NOT NULL DEFAULT 0,
  ADD COLUMN discount_cents      integer NOT NULL DEFAULT 0,
  ADD COLUMN points_total        integer NOT NULL DEFAULT 0,
  ADD COLUMN coupon_id           uuid REFERENCES coupons(id),
  ADD COLUMN provider            text,
  ADD COLUMN provider_checkout_id text,
  ADD COLUMN expires_at          timestamptz;
UPDATE orders SET subtotal_cents = total_cents WHERE subtotal_cents = 0;
CREATE INDEX orders_user_idx ON orders (user_id, created_at DESC);
CREATE INDEX orders_player_idx ON orders (player_uuid, created_at DESC);

ALTER TABLE order_items
  ADD COLUMN product_name          text,
  ADD COLUMN original_price_cents  integer,
  ADD COLUMN points_per_unit       integer NOT NULL DEFAULT 0,
  ADD COLUMN promotion_id          uuid REFERENCES promotions(id);
UPDATE order_items i SET product_name = p.name, original_price_cents = i.unit_price_cents FROM products p WHERE p.id = i.product_id;

-- Journal des événements du prestataire (dédoublonnage + rejeu)
ALTER TABLE payment_webhook_events RENAME TO payment_events;
ALTER TABLE payment_events
  ADD COLUMN order_id      uuid REFERENCES orders(id),
  ADD COLUMN payload       jsonb,
  ADD COLUMN processed_at  timestamptz,
  ADD COLUMN outcome       text;

ALTER TABLE refunds ADD COLUMN source text NOT NULL DEFAULT 'provider' CHECK (source IN ('provider','admin'));

-- ───────────── Points boutique ─────────────
CREATE TABLE shop_points (
  player_uuid      uuid PRIMARY KEY REFERENCES players(uuid),
  balance          integer NOT NULL DEFAULT 0,
  lifetime_earned  integer NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Grand livre des points : jamais modifié ni supprimé, seulement complété.
CREATE TABLE point_transactions (
  id               bigserial PRIMARY KEY,
  player_uuid      uuid NOT NULL REFERENCES players(uuid),
  delta            integer NOT NULL CHECK (delta <> 0),
  balance_after    integer NOT NULL,
  reason           text NOT NULL CHECK (reason IN ('purchase','refund','promotion_bonus','admin_adjustment')),
  label            text NOT NULL,
  order_id         uuid REFERENCES orders(id),
  order_item_id    uuid REFERENCES order_items(id),
  refund_id        uuid REFERENCES refunds(id),
  actor            text,
  idempotency_key  text NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX point_transactions_player_idx ON point_transactions (player_uuid, created_at DESC);

-- ───────────── Grades ─────────────
CREATE TABLE rank_thresholds (
  key         text PRIMARY KEY CHECK (key ~ '^[a-z0-9_-]{2,32}$'),
  name        text NOT NULL,
  min_points  integer NOT NULL CHECK (min_points >= 0),
  position    integer NOT NULL UNIQUE,
  product_id  uuid REFERENCES products(id) ON DELETE SET NULL,  -- contenu livré au déblocage (grade + kit)
  color       text,
  perks       jsonb NOT NULL DEFAULT '[]',                      -- avantages : structure prête, vide par défaut
  active      boolean NOT NULL DEFAULT true
);

INSERT INTO rank_thresholds (key, name, min_points, position, color) VALUES
  ('joueur', 'Joueur', 0, 0, '#a9aeb8'),
  ('guerrier', 'Guerrier', 15, 1, '#d9dce2'),
  ('seigneur', 'Seigneur', 35, 2, '#c0c4cc'),
  ('roi', 'Roi', 65, 3, '#e2c27f'),
  ('vaelorian', 'VÆLORIAN', 100, 4, '#d21f2f');

CREATE TABLE player_ranks (
  player_uuid  uuid NOT NULL REFERENCES players(uuid),
  rank_key     text NOT NULL REFERENCES rank_thresholds(key) ON UPDATE CASCADE,
  unlocked_at  timestamptz NOT NULL DEFAULT now(),
  source       text NOT NULL CHECK (source IN ('points','purchase','admin')),
  order_id     uuid REFERENCES orders(id),
  -- review : solde repassé sous le seuil après remboursement → décision humaine, jamais automatique
  status       text NOT NULL DEFAULT 'active' CHECK (status IN ('active','review','revoked')),
  PRIMARY KEY (player_uuid, rank_key)
);

-- ───────────── Livraisons ─────────────
CREATE TABLE deliveries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_uuid      uuid NOT NULL REFERENCES players(uuid),
  order_id         uuid REFERENCES orders(id),
  order_item_id    uuid REFERENCES order_items(id),
  entitlement_id   uuid REFERENCES entitlements(id),
  rank_key         text REFERENCES rank_thresholds(key) ON UPDATE CASCADE,
  label            text NOT NULL,
  status           text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','DELIVERED','FAILED','CANCELLED')),
  idempotency_key  text NOT NULL UNIQUE,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  delivered_at     timestamptz
);
CREATE INDEX deliveries_order_idx ON deliveries (order_id);
CREATE INDEX deliveries_status_idx ON deliveries (status, created_at) WHERE status IN ('PENDING','PROCESSING','FAILED');

CREATE TABLE delivery_logs (
  id           bigserial PRIMARY KEY,
  delivery_id  uuid NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
  status       text NOT NULL,
  message      text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX delivery_logs_delivery_idx ON delivery_logs (delivery_id, created_at);

ALTER TABLE minecraft_commands
  ADD COLUMN delivery_id  uuid REFERENCES deliveries(id),
  ADD COLUMN action       text NOT NULL DEFAULT 'COMMAND'
    CHECK (action IN ('GRANT_RANK','GIVE_KIT','GIVE_ITEM','GIVE_SPAWNER','ADD_POINTS','SYNC_PLAYER','COMMAND'));
ALTER TABLE minecraft_commands ALTER COLUMN command DROP NOT NULL;
CREATE INDEX minecraft_commands_delivery_idx ON minecraft_commands (delivery_id);

-- Réglages boutique
INSERT INTO site_settings (key, value) VALUES ('shop.points_per_euro', '1') ON CONFLICT (key) DO NOTHING;
