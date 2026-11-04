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

-- ════ migrations/20261103000100_product_promotion_percent.sql ════
-- LUMÉANCE — offre par lot avec remise en pourcentage (« 1 achetée, la 2ᵉ à −50 % »).
-- Idempotent : peut être rejoué sans risque.
-- { "buy": 1, "free": 1, "percent": 50 } : pour 1 exemplaire acheté, le 2ᵉ (le moins cher) à
-- −50 %. Sans « percent », les exemplaires sont offerts (100 %).
alter table public.products drop constraint if exists products_promotion_shape;
alter table public.products
  add constraint products_promotion_shape check (
    promotion is null or (
      jsonb_typeof(promotion -> 'buy') = 'number' and jsonb_typeof(promotion -> 'free') = 'number'
      and (promotion ->> 'buy')::int between 1 and 20
      and (promotion ->> 'free')::int between 1 and 20
      and (
        promotion -> 'percent' is null or jsonb_typeof(promotion -> 'percent') = 'null'
        or (jsonb_typeof(promotion -> 'percent') = 'number'
            and (promotion ->> 'percent')::int between 1 and 100)
      )
    )
  );

-- ════ migrations/20261104000100_catalog_hash.sql ════
-- LUMÉANCE — empreinte de la version du catalogue (code) appliquée à chaque pièce.
-- Idempotent. Le bandeau « changements préparés » de l'administration ne propose une mise à jour
-- que si le catalogue a changé depuis la dernière importation ou mise à jour : les modifications
-- faites ensuite dans l'administration ne sont pas signalées comme des écarts.
alter table public.products add column if not exists catalog_hash text;

-- ════ migrations/20261105000100_page_views.sql ════
-- LUMÉANCE — statistiques de visite internes, sans cookie et sans donnée personnelle.
-- Mesure d'audience exemptée de consentement (CNIL) : finalité limitée à la mesure du site,
-- données non recoupées, visiteur identifié par une empreinte journalière non réversible
-- (sel tournant, aucune adresse IP conservée), conservation limitée à 13 mois.
-- Idempotent.
create table if not exists public.page_views (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  day date not null default (now() at time zone 'Europe/Paris')::date,
  path text not null check (char_length(path) between 1 and 300),
  referrer_host text check (char_length(referrer_host) <= 120),
  source text not null default 'direct' check (source in ('direct', 'search', 'social', 'site', 'other')),
  device text not null default 'desktop' check (device in ('desktop', 'mobile', 'tablet')),
  country text check (char_length(country) <= 2),
  visitor text not null check (char_length(visitor) <= 64)
);
create index if not exists page_views_day_idx on public.page_views (day);
create index if not exists page_views_path_idx on public.page_views (path, day);

-- Écriture uniquement par le serveur (service_role) ; lecture par les administrateurs.
alter table public.page_views enable row level security;
drop policy if exists page_views_admin_read on public.page_views;
create policy page_views_admin_read on public.page_views for select to authenticated
  using (public.is_admin());
revoke all on public.page_views from anon;

-- Agrégats pour le tableau de bord : p_days jours glissants, comparés à la période précédente.
create or replace function public.admin_traffic_stats(p_days integer default 30) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  d0 date := (now() at time zone 'Europe/Paris')::date - (greatest(1, least(p_days, 400)) - 1);
  p0 date := d0 - greatest(1, least(p_days, 400));
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = 'insufficient_privilege';
  end if;
  return jsonb_build_object(
    'views', (select count(*) from page_views where day >= d0),
    'visitors', (select count(distinct (day, visitor)) from page_views where day >= d0),
    'prev_views', (select count(*) from page_views where day >= p0 and day < d0),
    'prev_visitors', (select count(distinct (day, visitor)) from page_views where day >= p0 and day < d0),
    'daily', coalesce((
      select jsonb_agg(jsonb_build_object('day', g::date, 'views', coalesce(v.views, 0),
        'visitors', coalesce(v.visitors, 0)) order by g)
      from generate_series(d0, (now() at time zone 'Europe/Paris')::date, interval '1 day') g
      left join (select day, count(*) views, count(distinct visitor) visitors
                   from page_views where day >= d0 group by day) v on v.day = g::date), '[]'),
    'pages', coalesce((
      select jsonb_agg(x) from (select path, count(*) views, count(distinct (day, visitor)) visitors
        from page_views where day >= d0 group by path order by 2 desc limit 15) x), '[]'),
    'sources', coalesce((
      select jsonb_agg(x) from (select source, count(*) views
        from page_views where day >= d0 group by source order by 2 desc) x), '[]'),
    'referrers', coalesce((
      select jsonb_agg(x) from (select referrer_host, count(*) views from page_views
        where day >= d0 and referrer_host is not null group by referrer_host order by 2 desc limit 10) x), '[]'),
    'devices', coalesce((
      select jsonb_agg(x) from (select device, count(*) views
        from page_views where day >= d0 group by device order by 2 desc) x), '[]'),
    'countries', coalesce((
      select jsonb_agg(x) from (select country, count(*) views from page_views
        where day >= d0 and country is not null group by country order by 2 desc limit 8) x), '[]')
  );
end $$;
revoke all on function public.admin_traffic_stats(integer) from public, anon;
grant execute on function public.admin_traffic_stats(integer) to authenticated;

-- Purge au-delà de 13 mois (appelée à chaque enregistrement, coût négligeable grâce à l'index).
create or replace function public.purge_page_views() returns void
language sql security definer set search_path = public as $$
  delete from page_views where day < (now() at time zone 'Europe/Paris')::date - interval '13 months';
$$;
revoke all on function public.purge_page_views() from public, anon, authenticated;

-- ════ migrations/20261106000100_customer_accounts.sql ════
-- LUMÉANCE — comptes clients : particuliers et entreprises, Cercle (cumul d'achats), parrainage.
-- Idempotent : peut être rejoué sans risque.
--
-- • Un compte = un utilisateur Supabase Auth (auth.users) relié à une fiche `customers`.
-- • Entreprise : raison sociale + SIRET ; la remise professionnelle n'est active qu'après
--   validation par un administrateur (pro_status = 'approved'). Le client ne peut pas modifier
--   ce statut : aucune politique d'écriture ne lui est ouverte (création par le serveur, avec la
--   clé de service, après contrôle des champs).
-- • Parrainage : code personnel ; le filleul bénéficie d'une remise sur sa 1re commande
--   (calculée par l'application) ; à la 1re commande PAYÉE du filleul, le parrain reçoit un
--   avoir (referral_credits), créé par déclencheur.

do $$ begin
  create type public.account_type as enum ('particulier', 'entreprise');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.pro_status as enum ('none', 'pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.customer_accounts (
  auth_user_id uuid primary key, -- auth.users.id (pas de FK : schéma auth géré par Supabase)
  customer_id uuid not null unique references public.customers (id) on delete cascade,
  account_type public.account_type not null default 'particulier',
  company_name text check (company_name is null or length(company_name) between 2 and 160),
  siret text check (siret is null or siret ~ '^[0-9]{14}$'),
  vat_number text check (vat_number is null or vat_number ~ '^[A-Z]{2}[A-Z0-9]{2,13}$'),
  pro_status public.pro_status not null default 'none',
  pro_reviewed_at timestamptz,
  referral_code text not null unique check (referral_code ~ '^[A-Z0-9]{6,12}$'),
  referred_by uuid references public.customer_accounts (auth_user_id) on delete set null,
  created_at timestamptz not null default now(),
  constraint customer_accounts_company check (
    account_type = 'particulier' or (company_name is not null and siret is not null)
  ),
  constraint customer_accounts_pro_status check (account_type = 'entreprise' or pro_status = 'none'),
  constraint customer_accounts_no_self_referral check (referred_by is distinct from auth_user_id)
);
create index if not exists customer_accounts_pro_pending
  on public.customer_accounts (created_at) where pro_status = 'pending';

-- Avoirs de parrainage (montant TTC en centimes), utilisables une fois.
create table if not exists public.referral_credits (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.customer_accounts (auth_user_id) on delete cascade,
  amount bigint not null check (amount > 0),
  reason text not null check (reason in ('parrainage')),
  source_order_id uuid unique references public.orders (id) on delete set null,
  used_order_id uuid references public.orders (id) on delete set null,
  used_at timestamptz,
  created_at timestamptz not null default now(),
  constraint referral_credits_used check ((used_at is null) = (used_order_id is null))
);
create index if not exists referral_credits_account on public.referral_credits (account_id);

-- ── Sécurité ────────────────────────────────────────────────────────────────
alter table public.customer_accounts enable row level security;
alter table public.referral_credits enable row level security;
revoke all on public.customer_accounts, public.referral_credits from anon;

drop policy if exists customer_accounts_read on public.customer_accounts;
create policy customer_accounts_read on public.customer_accounts for select to authenticated
  using (auth_user_id = auth.uid() or public.is_admin());
drop policy if exists customer_accounts_admin_write on public.customer_accounts;
create policy customer_accounts_admin_write on public.customer_accounts for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists referral_credits_read on public.referral_credits;
create policy referral_credits_read on public.referral_credits for select to authenticated
  using (account_id = auth.uid() or public.is_admin());
drop policy if exists referral_credits_admin_write on public.referral_credits;
create policy referral_credits_admin_write on public.referral_credits for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Le client lit sa propre fiche (nom, téléphone) ; l'administration garde tous les droits.
drop policy if exists customers_owner_read on public.customers;
create policy customers_owner_read on public.customers for select to authenticated
  using (exists (select 1 from public.customer_accounts a
                 where a.customer_id = customers.id and a.auth_user_id = auth.uid()));

-- Journal d'activité (actions des administrateurs : validation d'un compte pro, avoirs).
drop trigger if exists customer_accounts_audit on public.customer_accounts;
create trigger customer_accounts_audit after insert or update or delete on public.customer_accounts
  for each row execute function public.log_admin_activity();
drop trigger if exists referral_credits_audit on public.referral_credits;
create trigger referral_credits_audit after insert or update or delete on public.referral_credits
  for each row execute function public.log_admin_activity();

-- ── Parrainage : avoir du parrain à la 1re commande payée du filleul ────────
-- Montant et minimum de commande : à garder identiques à lib/catalog/loyalty.ts
-- (REFERRAL_AMOUNT = 30 €, REFERRAL_MIN_ORDER = 300 € de pièces).
create or replace function public.grant_referral_credit() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  sponsor uuid;
begin
  if new.payment_status not in ('paid', 'partially_refunded')
     or old.payment_status in ('paid', 'partially_refunded')
     or new.customer_id is null or new.subtotal < 30000 then
    return new;
  end if;
  select referred_by into sponsor from public.customer_accounts where customer_id = new.customer_id;
  if sponsor is null then return new; end if;
  -- 1re commande payée du filleul uniquement.
  if exists (select 1 from public.orders o where o.customer_id = new.customer_id and o.id <> new.id
             and o.payment_status in ('paid', 'partially_refunded')) then
    return new;
  end if;
  insert into public.referral_credits (account_id, amount, reason, source_order_id)
  values (sponsor, 3000, 'parrainage', new.id)
  on conflict (source_order_id) do nothing;
  return new;
end $$;

drop trigger if exists orders_referral_credit on public.orders;
create trigger orders_referral_credit after update of payment_status on public.orders
  for each row execute function public.grant_referral_credit();
-- ════ migrations/20261107000100_reviews.sql ════
-- LUMÉANCE — avis clients vérifiés.
-- Seul un client ayant passé commande peut déposer un avis : l'administration génère, pour une
-- commande expédiée ou livrée, un lien personnel (jeton aléatoire, seule son empreinte SHA-256 est
-- conservée) valable 60 jours. Chaque avis est relu avant publication (art. L111-7-2 et D111-17
-- du Code de la consommation : information sur le contrôle des avis).
-- Idempotent.

do $$ begin
  create type public.review_status as enum ('pending', 'published', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 days'
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.review_requests (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 2 and 60),
  rating smallint not null check (rating between 1 and 5),
  title text check (char_length(title) <= 120),
  body text not null check (char_length(body) between 10 and 3000),
  -- Photos du client : bucket privé « review-uploads » tant que l'avis n'est pas publié,
  -- puis copiées dans le bucket public « media » (dossier reviews/) à la publication.
  photos text[] not null default '{}' check (cardinality(photos) <= 4),
  purchased_at timestamptz not null,
  status public.review_status not null default 'pending',
  admin_reply text check (char_length(admin_reply) <= 2000),
  moderation_note text check (char_length(moderation_note) <= 500),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (request_id, product_id)
);
create index if not exists product_reviews_product_idx on public.product_reviews (product_id, status);
create index if not exists product_reviews_status_idx on public.product_reviews (status, created_at);

-- Écriture des demandes et des avis : serveur (service_role) pour les clients ; administrateurs
-- pour la modération. Aucun accès direct des visiteurs aux tables.
alter table public.review_requests enable row level security;
alter table public.product_reviews enable row level security;
drop policy if exists review_requests_admin on public.review_requests;
create policy review_requests_admin on public.review_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists product_reviews_admin on public.product_reviews;
create policy product_reviews_admin on public.product_reviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.review_requests, public.product_reviews from anon;

-- Vue publique : avis publiés uniquement, sans identifiant de commande ni de client.
create or replace view public.published_reviews with (security_invoker = false) as
  select r.id, r.product_id, r.author_name, r.rating, r.title, r.body, r.photos,
         r.purchased_at, r.published_at, r.admin_reply
    from public.product_reviews r
   where r.status = 'published';
revoke all on public.published_reviews from public;
grant select on public.published_reviews to anon, authenticated;

-- Bucket privé des photos en attente de modération (lecture par les administrateurs seulement).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-uploads', 'review-uploads', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;
drop policy if exists review_uploads_admin_read on storage.objects;
create policy review_uploads_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'review-uploads' and public.is_admin());
drop policy if exists review_uploads_admin_delete on storage.objects;
create policy review_uploads_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'review-uploads' and public.is_admin());
-- Publication : les administrateurs du catalogue écrivent déjà dans « media » (dossier reviews/).

-- ════ migrations/20261108000100_stripe_payments.sql ════
-- LUMÉANCE — paiement en ligne (Stripe Checkout). Idempotent : peut être rejoué sans risque.
--
-- Toutes ces fonctions sont réservées au serveur (clé service_role) :
-- • create_checkout_order : crée atomiquement client, commande « en attente de paiement » et
--   lignes, avec des montants DÉJÀ RECALCULÉS par le serveur (lib/services/pricing.ts) ;
-- • record_provider_payment : appelée par le webhook SIGNÉ du prestataire ; enregistre la
--   transaction (idempotente) puis passe la commande « payée » si le total est couvert ;
-- • record_provider_refund : enregistre un remboursement confirmé par le prestataire ;
-- • release_checkout_order : annule une commande dont le paiement a expiré ou échoué et libère
--   l'avoir de parrainage réservé.

-- ── Création d'une commande en ligne ───────────────────────────────────────
create or replace function public.create_checkout_order(
  p_customer_id uuid,
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text,
  p_address jsonb,
  p_items jsonb,
  p_subtotal bigint,
  p_shipping bigint,
  p_discount bigint,
  p_total bigint,
  p_credit_id uuid,
  p_note text
) returns table (order_id uuid, order_number text)
language plpgsql security definer set search_path = public as $$
declare
  cid uuid := p_customer_id;
  o public.orders;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Commande vide' using errcode = 'check_violation';
  end if;
  if cid is null then
    insert into public.customers (email, first_name, last_name, phone)
    values (p_email, p_first_name, p_last_name, nullif(p_phone, ''))
    on conflict (email) do update
      set first_name = coalesce(customers.first_name, excluded.first_name),
          last_name = coalesce(customers.last_name, excluded.last_name),
          phone = coalesce(customers.phone, excluded.phone)
    returning id into cid;
  end if;

  perform set_config('lumeance.status_note', 'Commande en ligne', true);
  insert into public.orders (customer_id, status, payment_status, payment_method, subtotal,
    shipping_amount, discount_amount, total, shipping_address_snapshot, billing_address_snapshot,
    admin_notes)
  values (cid, 'pending_payment', 'pending', 'stripe', p_subtotal, p_shipping, p_discount, p_total,
    p_address, p_address, nullif(p_note, ''))
  returning * into o;

  insert into public.order_items (order_id, product_id, product_name_snapshot,
    product_reference_snapshot, unit_price, quantity, variant_snapshot, total)
  select o.id, (i ->> 'product_id')::uuid, i ->> 'name', i ->> 'reference',
         (i ->> 'unit_price')::bigint, (i ->> 'quantity')::integer,
         nullif(i -> 'variant', 'null'::jsonb), (i ->> 'total')::bigint
    from jsonb_array_elements(p_items) as i;

  -- Avoir de parrainage : réservé pour cette commande, libéré si le paiement n'aboutit pas.
  if p_credit_id is not null then
    update public.referral_credits set used_order_id = o.id, used_at = now()
     where id = p_credit_id and used_at is null;
    if not found then
      raise exception 'Avoir déjà utilisé' using errcode = 'check_violation';
    end if;
  end if;

  return query select o.id, o.order_number;
end $$;

-- ── Paiement confirmé par le prestataire (webhook signé) ───────────────────
create or replace function public.record_provider_payment(
  p_order_id uuid,
  p_provider text,
  p_amount bigint,
  p_currency text,
  p_reference text,
  p_raw jsonb
) returns text
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  inserted int;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable : %', p_order_id; end if;
  if upper(p_currency) <> o.currency then
    raise exception 'Devise inattendue : %', p_currency using errcode = 'check_violation';
  end if;

  insert into public.payment_transactions (order_id, provider, kind, status, amount, currency,
    provider_reference, idempotency_key, raw_event)
  values (o.id, p_provider, 'payment', 'succeeded', p_amount, o.currency, p_reference,
          p_provider || ':payment:' || p_reference, p_raw)
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 'duplicate'; end if;

  if o.payment_status in ('paid', 'partially_refunded', 'refunded') then
    return 'already_paid';
  end if;
  if (select coalesce(sum(amount), 0) from public.payment_transactions
       where order_id = o.id and kind = 'payment' and status = 'succeeded') < o.total then
    return 'partial';
  end if;
  perform set_config('lumeance.status_note', 'Paiement en ligne confirmé', true);
  -- Une commande annulée entre-temps (paiement arrivé après expiration) reste annulée mais
  -- payée : visible dans l'administration pour remboursement ou réactivation.
  update public.orders set payment_status = 'paid', payment_method = p_provider,
    status = case when status in ('draft', 'pending_payment') then 'paid' else status end
   where id = o.id;
  return case when o.status = 'cancelled' then 'paid_after_cancel' else 'paid' end;
end $$;

-- ── Remboursement confirmé par le prestataire ──────────────────────────────
create or replace function public.record_provider_refund(
  p_order_id uuid,
  p_provider text,
  p_amount bigint,
  p_reference text,
  p_recorded_by uuid,
  p_note text
) returns text
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
  inserted int;
  paid bigint;
  refunded bigint;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable : %', p_order_id; end if;

  insert into public.payment_transactions (order_id, provider, kind, status, amount, currency,
    provider_reference, idempotency_key, recorded_by, note)
  values (o.id, p_provider, 'refund', 'succeeded', p_amount, o.currency, p_reference,
          p_provider || ':refund:' || p_reference, p_recorded_by, nullif(p_note, ''))
  on conflict do nothing;
  get diagnostics inserted = row_count;
  if inserted = 0 then return 'duplicate'; end if;

  select coalesce(sum(amount) filter (where kind = 'payment'), 0),
         coalesce(sum(amount) filter (where kind = 'refund'), 0)
    into paid, refunded
    from public.payment_transactions where order_id = o.id and status = 'succeeded';
  if refunded > paid then
    raise exception 'Remboursement supérieur aux paiements' using errcode = 'check_violation';
  end if;
  perform set_config('lumeance.status_note',
    case when refunded >= paid then 'Remboursement total' else 'Remboursement partiel' end, true);
  update public.orders
     set payment_status = case when refunded >= paid then 'refunded' else 'partially_refunded' end
             ::public.payment_status,
         status = case when refunded >= paid then 'refunded' else status end
   where id = o.id;
  return case when refunded >= paid then 'refunded' else 'partially_refunded' end;
end $$;

-- ── Paiement expiré ou échoué : annulation et libération de l'avoir ────────
create or replace function public.release_checkout_order(p_order_id uuid, p_failed boolean,
  p_note text) returns text
language plpgsql security definer set search_path = public as $$
declare
  o public.orders;
begin
  select * into o from public.orders where id = p_order_id for update;
  if not found then return 'not_found'; end if;
  if o.status <> 'pending_payment' or o.payment_status not in ('unpaid', 'pending', 'failed') then
    return 'ignored';
  end if;
  perform set_config('lumeance.status_note', p_note, true);
  update public.orders
     set status = 'cancelled',
         payment_status = case when p_failed then 'failed' else 'unpaid' end::public.payment_status
   where id = o.id;
  update public.referral_credits set used_order_id = null, used_at = null
   where used_order_id = o.id;
  return 'cancelled';
end $$;

-- Réservées au serveur : ni les visiteurs ni les comptes connectés ne peuvent les appeler.
revoke all on function public.create_checkout_order(uuid, text, text, text, text, jsonb, jsonb,
  bigint, bigint, bigint, bigint, uuid, text) from public, anon, authenticated;
revoke all on function public.record_provider_payment(uuid, text, bigint, text, text, jsonb)
  from public, anon, authenticated;
revoke all on function public.record_provider_refund(uuid, text, bigint, text, uuid, text)
  from public, anon, authenticated;
revoke all on function public.release_checkout_order(uuid, boolean, text)
  from public, anon, authenticated;
grant execute on function public.create_checkout_order(uuid, text, text, text, text, jsonb, jsonb,
  bigint, bigint, bigint, bigint, uuid, text) to service_role;
grant execute on function public.record_provider_payment(uuid, text, bigint, text, text, jsonb)
  to service_role;
grant execute on function public.record_provider_refund(uuid, text, bigint, text, uuid, text)
  to service_role;
grant execute on function public.release_checkout_order(uuid, boolean, text) to service_role;
