-- LUMÉANCE — installation complète (à coller UNE FOIS dans Supabase → SQL Editor → Run).
-- Généré à partir de supabase/migrations/*.sql et supabase/seed/seed.sql. Ne contient aucun produit.

-- ════ migrations/20261031000100_schema.sql ════
-- LUMÉANCE — schéma principal.
-- Conventions : montants en CENTIMES entiers (bigint), horodatages timestamptz UTC,
-- identifiants uuid. Ne jamais modifier une migration publiée : en ajouter une nouvelle.

create extension if not exists citext;

-- ── Types ───────────────────────────────────────────────────────────────────
create type public.product_status as enum ('draft', 'published', 'archived');
create type public.order_status as enum (
  'draft', 'pending_payment', 'paid', 'preparing', 'shipped', 'delivered', 'cancelled', 'refunded'
);
create type public.payment_status as enum (
  'unpaid', 'pending', 'paid', 'failed', 'partially_refunded', 'refunded'
);
create type public.admin_role as enum ('super_admin', 'admin', 'order_manager');
create type public.newsletter_status as enum ('subscribed', 'unsubscribed');
create type public.address_type as enum ('shipping', 'billing');

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- ── Catalogue ───────────────────────────────────────────────────────────────
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  image_path text,
  position integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger categories_touch before update on public.categories
  for each row execute function public.touch_updated_at();

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 1 and 160),
  reference text not null unique check (length(reference) between 1 and 60),
  short_description text,
  description text,
  price bigint not null check (price >= 0),
  compare_at_price bigint check (compare_at_price is null or compare_at_price > price),
  category_id uuid references public.categories (id) on delete set null,
  status public.product_status not null default 'draft',
  featured boolean not null default false,
  -- Dimensions en millimètres : {"height": .., "width": .., "depth": .., "diameter": .., "cable_length": ..}
  dimensions jsonb not null default '{}'::jsonb check (jsonb_typeof(dimensions) = 'object'),
  weight integer check (weight is null or weight > 0), -- grammes
  materials text[] not null default '{}',
  finishes text[] not null default '{}',
  -- Liste ordonnée [{ "label": "...", "value": "..." }] : uniquement des données VÉRIFIÉES fournisseur.
  technical_specifications jsonb not null default '[]'::jsonb
    check (jsonb_typeof(technical_specifications) = 'array'),
  delivery_information text,
  assembly_information text,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_category_idx on public.products (category_id);
create index products_status_idx on public.products (status) where status = 'published';
create index products_featured_idx on public.products (featured) where featured;
create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  storage_path text not null,
  alt_text text not null default '',
  position integer not null default 0,
  is_primary boolean not null default false,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on public.product_images (product_id, position);
create unique index product_images_one_primary on public.product_images (product_id) where is_primary;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  name text not null,
  sku text not null unique,
  finish text,
  price_adjustment bigint not null default 0,
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index product_variants_product_idx on public.product_variants (product_id);
create trigger product_variants_touch before update on public.product_variants
  for each row execute function public.touch_updated_at();

create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  alt_text text not null default '',
  folder text not null default 'general' check (folder ~ '^[a-z0-9-]{1,40}$'),
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/avif')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 10485760),
  width integer,
  height integer,
  created_at timestamptz not null default now()
);
create index media_assets_folder_idx on public.media_assets (folder, created_at desc);

-- ── Clients ─────────────────────────────────────────────────────────────────
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz not null default now()
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  address_type public.address_type not null default 'shipping',
  first_name text not null,
  last_name text not null,
  address_line_1 text not null,
  address_line_2 text,
  postal_code text not null,
  city text not null,
  country char(2) not null default 'FR' check (country ~ '^[A-Z]{2}$'),
  created_at timestamptz not null default now()
);
create index customer_addresses_customer_idx on public.customer_addresses (customer_id);

-- ── Commandes ───────────────────────────────────────────────────────────────
create sequence public.order_number_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_id uuid references public.customers (id) on delete restrict,
  status public.order_status not null default 'draft',
  payment_status public.payment_status not null default 'unpaid',
  payment_method text,
  subtotal bigint not null default 0 check (subtotal >= 0),
  shipping_amount bigint not null default 0 check (shipping_amount >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  total bigint not null default 0 check (total >= 0),
  currency char(3) not null default 'EUR',
  shipping_address_snapshot jsonb,
  billing_address_snapshot jsonb,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_total_consistent check (total = subtotal + shipping_amount - discount_amount),
  -- Une commande ne peut être payée / préparée / expédiée / livrée sans paiement confirmé.
  constraint orders_paid_requires_payment check (
    status not in ('paid', 'preparing', 'shipped', 'delivered')
    or payment_status in ('paid', 'partially_refunded')
  ),
  constraint orders_refunded_requires_refund check (
    status <> 'refunded' or payment_status = 'refunded'
  )
);
create index orders_customer_idx on public.orders (customer_id);
create index orders_status_idx on public.orders (status, created_at desc);
create index orders_payment_status_idx on public.orders (payment_status);
create index orders_created_idx on public.orders (created_at desc);

create or replace function public.orders_assign_number() returns trigger
language plpgsql as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'LUM-' || to_char(now() at time zone 'Europe/Paris', 'YYYY') || '-'
      || lpad(nextval('public.order_number_seq')::text, 6, '0');
  end if;
  return new;
end $$;
create trigger orders_number before insert on public.orders
  for each row execute function public.orders_assign_number();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  product_name_snapshot text not null,
  product_reference_snapshot text not null,
  unit_price bigint not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 99),
  variant_snapshot jsonb,
  total bigint not null,
  constraint order_items_total_consistent check (total = unit_price * quantity)
);
create index order_items_order_idx on public.order_items (order_id);

create table public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  previous_status public.order_status,
  new_status public.order_status not null,
  changed_by uuid, -- auth.users.id de l'administrateur, null pour un traitement système
  note text,
  created_at timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- ── Paiement (préparé, inactif en V1) ───────────────────────────────────────
create table public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete restrict,
  provider text not null check (provider in ('stripe', 'manual')),
  kind text not null check (kind in ('payment', 'refund')),
  status text not null check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  amount bigint not null check (amount > 0),
  currency char(3) not null default 'EUR',
  provider_reference text,
  idempotency_key text not null unique,
  recorded_by uuid,
  note text,
  raw_event jsonb,
  created_at timestamptz not null default now(),
  unique (provider, provider_reference)
);
create index payment_transactions_order_idx on public.payment_transactions (order_id);

create table public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null,
  event_type text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  error text,
  unique (provider, event_id)
);

-- payment_status ne peut passer à « paid » que si un paiement réussi couvre le total.
create or replace function public.orders_guard_payment_status() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  paid bigint;
  refunded bigint;
begin
  if new.payment_status is distinct from old.payment_status
     and new.payment_status in ('paid', 'partially_refunded', 'refunded') then
    select coalesce(sum(amount) filter (where kind = 'payment'), 0),
           coalesce(sum(amount) filter (where kind = 'refund'), 0)
      into paid, refunded
      from public.payment_transactions
     where order_id = new.id and status = 'succeeded';
    if paid < new.total then
      raise exception 'Paiement non confirmé : % centimes encaissés pour un total de %', paid, new.total
        using errcode = 'check_violation';
    end if;
    if new.payment_status = 'refunded' and refunded < paid then
      raise exception 'Remboursement non confirmé' using errcode = 'check_violation';
    end if;
    if new.payment_status = 'partially_refunded' and refunded = 0 then
      raise exception 'Aucun remboursement enregistré' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
create trigger orders_payment_guard before update on public.orders
  for each row execute function public.orders_guard_payment_status();

create or replace function public.orders_insert_guard() returns trigger
language plpgsql as $$
begin
  if new.payment_status in ('paid', 'partially_refunded', 'refunded') then
    raise exception 'Une commande ne peut pas être créée payée' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger orders_insert_guard before insert on public.orders
  for each row execute function public.orders_insert_guard();

-- ── Administration ─────────────────────────────────────────────────────────
create table public.admin_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique, -- auth.users.id (pas de FK : schéma auth géré par Supabase)
  email citext,
  role public.admin_role not null default 'admin',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.site_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique check (setting_key ~ '^[a-z0-9_.]{2,80}$'),
  setting_value jsonb not null,
  is_public boolean not null default false,
  updated_at timestamptz not null default now()
);
create trigger site_settings_touch before update on public.site_settings
  for each row execute function public.touch_updated_at();

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email citext not null unique check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  consent_timestamp timestamptz not null,
  consent_source text not null check (length(consent_source) <= 60),
  status public.newsletter_status not null default 'subscribed',
  created_at timestamptz not null default now()
);

create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  email citext not null check (email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subject text not null check (length(subject) between 1 and 160),
  message text not null check (length(message) between 1 and 5000),
  handled boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid references public.admin_users (id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index admin_activity_log_created_idx on public.admin_activity_log (created_at desc);

-- ════ migrations/20261031000200_security.sql ════
-- LUMÉANCE — rôles, Row Level Security, journalisation.
-- Principe : tout est fermé par défaut. Le public lit uniquement le catalogue publié et les
-- contenus marqués publics. Aucune donnée client, commande ou paiement n'est lisible anonymement.

-- ── Fonctions d'autorisation ───────────────────────────────────────────────
create or replace function public.current_admin_role() returns public.admin_role
language sql stable security definer set search_path = public as $$
  select role from public.admin_users where auth_user_id = auth.uid() and active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where auth_user_id = auth.uid() and active)
$$;

/** Rôles autorisés à modifier le catalogue, les contenus et les réglages. */
create or replace function public.is_catalog_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_admin_role() in ('super_admin', 'admin'), false)
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_admin_role() = 'super_admin', false)
$$;

revoke all on function public.current_admin_role(), public.is_admin(), public.is_catalog_admin(),
  public.is_super_admin() from public;
grant execute on function public.current_admin_role(), public.is_admin(), public.is_catalog_admin(),
  public.is_super_admin() to anon, authenticated, service_role;

-- ── Activation RLS sur toutes les tables ───────────────────────────────────
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.product_variants enable row level security;
alter table public.media_assets enable row level security;
alter table public.customers enable row level security;
alter table public.customer_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.payment_webhook_events enable row level security;
alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.contact_messages enable row level security;
alter table public.admin_activity_log enable row level security;

-- ── Catalogue : lecture publique restreinte, écriture admin ────────────────
create policy categories_public_read on public.categories for select
  using (active or public.is_admin());
create policy categories_admin_write on public.categories for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

create policy products_public_read on public.products for select
  using (status = 'published' or public.is_admin());
create policy products_admin_write on public.products for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

create policy product_images_public_read on public.product_images for select
  using (exists (select 1 from public.products p where p.id = product_id
                 and (p.status = 'published' or public.is_admin())));
create policy product_images_admin_write on public.product_images for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

create policy product_variants_public_read on public.product_variants for select
  using ((active and exists (select 1 from public.products p where p.id = product_id
                             and p.status = 'published')) or public.is_admin());
create policy product_variants_admin_write on public.product_variants for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

create policy media_public_read on public.media_assets for select using (true);
create policy media_admin_write on public.media_assets for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

-- ── Clients et commandes : administrateurs uniquement ─────────────────────
create policy customers_admin_read on public.customers for select to authenticated
  using (public.is_admin());
create policy customers_admin_write on public.customers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy customer_addresses_admin_read on public.customer_addresses for select to authenticated
  using (public.is_admin());
create policy customer_addresses_admin_write on public.customer_addresses for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy orders_admin_read on public.orders for select to authenticated
  using (public.is_admin());
create policy orders_admin_insert on public.orders for insert to authenticated
  with check (public.is_admin());
create policy orders_admin_update on public.orders for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
-- Suppression réservée aux brouillons, par un administrateur catalogue.
create policy orders_admin_delete on public.orders for delete to authenticated
  using (public.is_catalog_admin() and status = 'draft');

create policy order_items_admin_read on public.order_items for select to authenticated
  using (public.is_admin());
create policy order_items_admin_write on public.order_items for all to authenticated
  using (public.is_admin() and exists (select 1 from public.orders o where o.id = order_id
                                        and o.status in ('draft', 'pending_payment')))
  with check (public.is_admin() and exists (select 1 from public.orders o where o.id = order_id
                                             and o.status in ('draft', 'pending_payment')));

create policy order_status_history_admin_read on public.order_status_history for select
  to authenticated using (public.is_admin());

-- Paiements : lecture admin ; écriture via le serveur (service_role) ou enregistrement manuel
-- par un administrateur catalogue (virement reçu, etc.), toujours journalisé.
create policy payment_transactions_admin_read on public.payment_transactions for select
  to authenticated using (public.is_admin());
create policy payment_transactions_manual_insert on public.payment_transactions for insert
  to authenticated with check (public.is_catalog_admin() and provider = 'manual'
                               and recorded_by = auth.uid());
create policy payment_webhook_events_admin_read on public.payment_webhook_events for select
  to authenticated using (public.is_super_admin());

-- ── Administration ─────────────────────────────────────────────────────────
create policy admin_users_read on public.admin_users for select to authenticated
  using (auth_user_id = auth.uid() or public.is_super_admin());
create policy admin_users_super_write on public.admin_users for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy site_settings_public_read on public.site_settings for select
  using (is_public or public.is_admin());
create policy site_settings_admin_write on public.site_settings for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());

create policy newsletter_admin_read on public.newsletter_subscribers for select to authenticated
  using (public.is_catalog_admin());
create policy newsletter_admin_write on public.newsletter_subscribers for update to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());
create policy newsletter_admin_delete on public.newsletter_subscribers for delete to authenticated
  using (public.is_catalog_admin());

create policy contact_admin_read on public.contact_messages for select to authenticated
  using (public.is_admin());
create policy contact_admin_update on public.contact_messages for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy activity_log_read on public.admin_activity_log for select to authenticated
  using (public.is_catalog_admin());
-- Aucune politique d'écriture : seuls les déclencheurs (security definer) écrivent le journal.

-- Les rôles API n'ont aucun droit sur les séquences et tables hors politiques ci-dessus.
revoke all on public.payment_webhook_events from anon;
revoke all on all tables in schema public from anon;
grant select on public.categories, public.products, public.product_images,
  public.product_variants, public.media_assets, public.site_settings to anon;
grant usage on sequence public.order_number_seq to authenticated, service_role;

-- ── Garde-fous sur les administrateurs ─────────────────────────────────────
create or replace function public.admin_users_guard() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'DELETE' and old.role = 'super_admin' and old.active)
     or (tg_op = 'UPDATE' and old.role = 'super_admin' and old.active
         and (new.role <> 'super_admin' or not new.active)) then
    if (select count(*) from public.admin_users where role = 'super_admin' and active) <= 1 then
      raise exception 'Impossible de retirer le dernier super administrateur'
        using errcode = 'check_violation';
    end if;
  end if;
  return coalesce(new, old);
end $$;
create trigger admin_users_guard before update or delete on public.admin_users
  for each row execute function public.admin_users_guard();

-- ── Historique des statuts de commande ─────────────────────────────────────
create or replace function public.orders_log_status() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history (order_id, previous_status, new_status, changed_by, note)
    values (new.id, null, new.status, auth.uid(), 'Création');
  elsif new.status is distinct from old.status then
    insert into public.order_status_history (order_id, previous_status, new_status, changed_by,
                                             note)
    values (new.id, old.status, new.status, auth.uid(),
            nullif(current_setting('lumeance.status_note', true), ''));
  end if;
  return new;
end $$;
create trigger orders_status_history after insert or update of status on public.orders
  for each row execute function public.orders_log_status();

-- ── Journal d'activité (déclencheurs, impossible à contourner côté client) ─
create or replace function public.log_admin_activity() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  admin_id uuid;
  rec jsonb;
  changed text[];
begin
  if auth.uid() is null then
    return coalesce(new, old); -- opérations système (migrations, service_role)
  end if;
  select id into admin_id from public.admin_users where auth_user_id = auth.uid();
  rec := to_jsonb(coalesce(new, old));
  if tg_op = 'UPDATE' then
    select array_agg(key) into changed
      from jsonb_each(to_jsonb(new)) n
     where n.value is distinct from (to_jsonb(old) -> n.key) and key <> 'updated_at';
  end if;
  insert into public.admin_activity_log (admin_user_id, action, entity_type, entity_id, metadata)
  values (admin_id, lower(tg_op), tg_table_name, rec ->> 'id',
          jsonb_strip_nulls(jsonb_build_object(
            'label', coalesce(rec ->> 'name', rec ->> 'order_number', rec ->> 'setting_key',
                              rec ->> 'storage_path', rec ->> 'email'),
            'changed', to_jsonb(changed))));
  return coalesce(new, old);
end $$;

do $$
declare t text;
begin
  foreach t in array array['categories', 'products', 'product_images', 'product_variants',
    'media_assets', 'customers', 'orders', 'payment_transactions', 'admin_users',
    'site_settings', 'newsletter_subscribers'] loop
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.log_admin_activity()', t || '_audit', t);
  end loop;
end $$;

-- ── Statistiques du tableau de bord ────────────────────────────────────────
-- Le chiffre d'affaires encaissé ne compte QUE les paiements confirmés (payment_transactions).
create or replace function public.admin_dashboard_stats() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  result jsonb;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = 'insufficient_privilege';
  end if;
  select jsonb_build_object(
    'orders_total', (select count(*) from orders where status <> 'draft'),
    'orders_pending', (select count(*) from orders where status = 'pending_payment'),
    'orders_preparing', (select count(*) from orders where status = 'preparing'),
    'orders_shipped', (select count(*) from orders where status = 'shipped'),
    'revenue_collected', (
      select coalesce(sum(case when kind = 'payment' then amount else -amount end), 0)
        from payment_transactions where status = 'succeeded'),
    'paid_orders', (select count(*) from orders where payment_status in ('paid', 'partially_refunded')),
    'products_available', (select count(*) from products where status = 'published' and stock_quantity > 0),
    'low_stock', (select count(*) from products where status = 'published' and stock_quantity <= 2)
  ) into result;
  return result;
end $$;
revoke all on function public.admin_dashboard_stats() from public, anon;
grant execute on function public.admin_dashboard_stats() to authenticated;

-- ── Enregistrement manuel d'un paiement reçu (virement, etc.) ──────────────
-- Seule voie, avec le webhook du prestataire (service_role), pour passer une commande « payée ».
create or replace function public.record_manual_payment(p_order_id uuid, p_amount bigint,
  p_reference text, p_note text) returns void
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  if not public.is_catalog_admin() then
    raise exception 'Accès refusé' using errcode = 'insufficient_privilege';
  end if;
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable'; end if;
  if p_amount <= 0 then raise exception 'Montant invalide'; end if;
  insert into public.payment_transactions (order_id, provider, kind, status, amount, currency,
    provider_reference, idempotency_key, recorded_by, note)
  values (o.id, 'manual', 'payment', 'succeeded', p_amount, o.currency, p_reference,
          'manual:' || o.id || ':' || coalesce(p_reference, gen_random_uuid()::text),
          auth.uid(), p_note);
  if (select coalesce(sum(amount), 0) from public.payment_transactions
       where order_id = o.id and kind = 'payment' and status = 'succeeded') >= o.total then
    perform set_config('lumeance.status_note', 'Paiement manuel enregistré', true);
    update public.orders set payment_status = 'paid', payment_method = 'manual',
      status = case when status in ('draft', 'pending_payment') then 'paid' else status end
     where id = o.id;
  end if;
end $$;
revoke all on function public.record_manual_payment(uuid, bigint, text, text) from public, anon;
grant execute on function public.record_manual_payment(uuid, bigint, text, text) to authenticated;

-- ════ migrations/20261031000300_storage.sql ════
-- LUMÉANCE — stockage des médias (Supabase Storage).
-- Bucket public en lecture (images du catalogue), écriture réservée aux administrateurs catalogue.
-- Types et poids limités au niveau du bucket ET contrôlés côté serveur avant l'envoi.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy media_objects_public_read on storage.objects for select
  using (bucket_id = 'media');
create policy media_objects_admin_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_catalog_admin());
create policy media_objects_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_catalog_admin())
  with check (bucket_id = 'media' and public.is_catalog_admin());
create policy media_objects_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_catalog_admin());

-- ════ migrations/20261031000400_order_status_rpc.sql ════
-- Changement de statut avec note d'historique, en une transaction, soumis à la RLS de l'appelant.
create or replace function public.admin_set_order_status(p_order_id uuid, p_status public.order_status,
  p_note text default null) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = 'insufficient_privilege';
  end if;
  perform set_config('lumeance.status_note', coalesce(p_note, ''), true);
  update public.orders set status = p_status where id = p_order_id;
  if not found then
    raise exception 'Commande introuvable';
  end if;
end $$;
revoke all on function public.admin_set_order_status(uuid, public.order_status, text) from public, anon;
grant execute on function public.admin_set_order_status(uuid, public.order_status, text) to authenticated;

-- ════ seed/seed.sql ════
-- LUMÉANCE — données de base (catégories et contenus éditoriaux). AUCUN produit :
-- les fiches ne seront créées qu'à partir de données fournisseurs vérifiées.
insert into public.categories (name, slug, description, position) values
  ('Lustres', 'lustres', 'Lustres monumentaux et compositions en cascade pour les grands volumes.', 1),
  ('Suspensions', 'suspensions', 'Suspensions XXL, verre soufflé, cristal et compositions organiques.', 2),
  ('Appliques', 'appliques', 'Appliques murales sculpturales, pour dessiner la lumière sur la paroi.', 3),
  ('Lampadaires', 'lampadaires', 'Lampadaires sculpturaux, présences lumineuses à hauteur d''homme.', 4)
on conflict (slug) do nothing;

insert into public.site_settings (setting_key, setting_value, is_public) values
  ('content.home', '{
    "heroTitle": "LUMÉANCE",
    "heroSignature": "L’art de révéler la lumière.",
    "heroText": "Des créations lumineuses pensées pour sublimer les espaces.",
    "manifestoTitle": "La lumière est une matière.",
    "manifestoText": "Chez LUMÉANCE, un luminaire n’est jamais un simple objet fonctionnel. C’est une présence. Il dessine l’espace, révèle les volumes, réchauffe la pierre et le bois, et donne à chaque pièce son atmosphère. Nous sélectionnons des créations sculpturales, en verre, en cristal et en métal, pensées pour devenir le cœur d’un intérieur.",
    "immersiveQuote": "La lumière devient architecture.",
    "newsletterTitle": "Entrez dans l’univers LUMÉANCE."
  }', true),
  ('shop.shipping', '{"standardAmount": 0, "freeThreshold": 0, "deliveryNote": "Délais communiqués pour chaque pièce après vérification auprès du fournisseur et du transporteur.", "countries": ["FR"]}', true),
  ('shop.contact', '{"email": "", "phone": "", "address": "", "legalName": "", "siret": ""}', true),
  ('seo.default', '{"title": "LUMÉANCE — Luminaires design haut de gamme", "description": "Maison française de luminaires décoratifs : lustres monumentaux, suspensions en verre et cristal, appliques et lampadaires sculpturaux."}', true)
on conflict (setting_key) do nothing;

-- ════ migrations/20261101000100_product_presentation.sql ════
-- LUMÉANCE — présentation détaillée des pièces (reprise du catalogue écrit dans le code).
-- Idempotent : peut être rejoué sans risque (add column if not exists).

-- Options sans incidence sur le prix, choisies en plus de la version :
-- [{ "id": "lumiere", "label": "Couleur de lumière", "values": [{ "id": "chaud", "label": "Blanc chaud" }] }]
alter table public.products
  add column if not exists options jsonb not null default '[]'::jsonb;
alter table public.products drop constraint if exists products_options_array;
alter table public.products
  add constraint products_options_array check (jsonb_typeof(options) = 'array');

-- Libellés du sélecteur à deux niveaux : { "group": "Pavillon", "variant": "Nombre de sphères" }
alter table public.products add column if not exists option_labels jsonb;

-- Illustration de substitution quand aucune image n'est disponible (cascade, globes, organic…).
alter table public.products add column if not exists art text;

-- Versions : précisions affichées, visuel propre, visuels selon les options, ordre d'affichage.
alter table public.product_variants add column if not exists details text;
alter table public.product_variants add column if not exists image_url text;
alter table public.product_variants
  add column if not exists image_urls jsonb not null default '{}'::jsonb;
alter table public.product_variants drop constraint if exists product_variants_image_urls_object;
alter table public.product_variants
  add constraint product_variants_image_urls_object check (jsonb_typeof(image_urls) = 'object');
alter table public.product_variants
  add column if not exists position integer not null default 0;

-- Légende affichée sur la photo (« Photographie d'ambiance du fabricant »).
alter table public.product_images add column if not exists caption text;

-- Note : storage_path et image_url commençant par « / » désignent des fichiers du site
-- (dossier public/), les autres des fichiers du bucket « media » de Supabase Storage.

-- ════ migrations/20261102000100_product_promotion.sql ════
-- LUMÉANCE — offre par lot sur une pièce (« 3 achetées, la 4ᵉ offerte »).
-- Idempotent : peut être rejoué sans risque.
-- { "buy": 3, "free": 1 } : pour 3 exemplaires achetés (toutes versions confondues), 1 offert,
-- le moins cher. Calcul côté serveur (lib/services/pricing.ts). null = pas d'offre.
alter table public.products add column if not exists promotion jsonb;
alter table public.products drop constraint if exists products_promotion_shape;
alter table public.products
  add constraint products_promotion_shape check (
    promotion is null or (
      jsonb_typeof(promotion -> 'buy') = 'number' and jsonb_typeof(promotion -> 'free') = 'number'
      and (promotion ->> 'buy')::int between 1 and 20
      and (promotion ->> 'free')::int between 1 and 20
    )
  );
