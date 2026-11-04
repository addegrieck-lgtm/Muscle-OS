-- LUMÉANCE — veille concurrentielle (phase H).
-- Uniquement des informations publiques et vérifiables : concurrents choisis par la maison,
-- relevés de prix saisis à la main avec leur source et leur date, et instantanés de pages
-- publiques (titre, description, nombre d'adresses du plan du site) pris à la demande, dans le
-- respect du robots.txt. Aucun trafic ni classement concurrent n'est estimé.
-- Idempotent.

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 80),
  domain text not null unique check (domain ~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$'),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now()
);

create table if not exists public.competitor_snapshots (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors (id) on delete cascade,
  taken_at timestamptz not null default now(),
  -- ok | blocked (robots.txt) | error
  status text not null check (status in ('ok', 'blocked', 'error')),
  message text check (char_length(message) <= 500),
  title text check (char_length(title) <= 300),
  description text check (char_length(description) <= 600),
  structured_types text[] not null default '{}',
  url_count integer check (url_count >= 0),
  -- Adresses du plan du site (au plus 5 000), pour repérer les nouveautés d'un relevé à l'autre.
  urls text[] not null default '{}'
);
create index if not exists competitor_snapshots_idx on public.competitor_snapshots (competitor_id, taken_at desc);

create table if not exists public.competitor_prices (
  id uuid primary key default gen_random_uuid(),
  competitor_id uuid not null references public.competitors (id) on delete cascade,
  product_label text not null check (char_length(product_label) between 2 and 160),
  -- Pièce LUMÉANCE comparable (adresse produit), facultative.
  our_slug text check (our_slug is null or our_slug ~ '^[a-z0-9-]+$'),
  price bigint not null check (price > 0), -- centimes TTC
  source_url text not null check (source_url ~ '^https://'),
  observed_on date not null default current_date,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists competitor_prices_idx on public.competitor_prices (competitor_id, observed_on desc);

do $$
declare t text;
begin
  foreach t in array array['competitors', 'competitor_prices'] loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I
                    for each row execute function public.log_admin_activity()', t || '_audit', t);
  end loop;
  foreach t in array array['competitors', 'competitor_snapshots', 'competitor_prices'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_read', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_admin())', t || '_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_write', t);
    execute format('create policy %I on public.%I for all to authenticated
                    using (public.is_catalog_admin()) with check (public.is_catalog_admin())', t || '_write', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;
