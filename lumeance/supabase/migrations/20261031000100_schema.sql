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
