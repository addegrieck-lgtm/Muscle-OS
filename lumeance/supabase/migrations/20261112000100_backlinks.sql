-- LUMÉANCE — liens externes (phase I).
-- Suivi des liens réellement obtenus ou démarchés à la main : aucun achat de lien, aucune
-- campagne automatique. La présence d'un lien n'est marquée qu'après vérification de la page
-- source (lecture à la demande) ou import du rapport « Liens » de Search Console.
-- Idempotent.

create table if not exists public.backlinks (
  id uuid primary key default gen_random_uuid(),
  source_url text not null unique check (source_url ~ '^https?://' and char_length(source_url) <= 600),
  source_domain text not null check (char_length(source_domain) <= 253),
  target_path text check (target_path is null or target_path ~ '^/[^\s]*$'),
  kind text not null default 'autre'
    check (kind in ('annuaire', 'presse', 'blog', 'partenaire', 'fournisseur', 'reseau', 'autre')),
  status text not null default 'prospect'
    check (status in ('prospect', 'contacte', 'obtenu', 'refuse', 'perdu')),
  -- Dernière vérification de la page source.
  check_status text check (check_status in ('present', 'absent', 'blocked', 'error')),
  checked_at timestamptz,
  anchor text check (char_length(anchor) <= 300),
  rel text check (char_length(rel) <= 60),
  origin text not null default 'manuel' check (origin in ('manuel', 'search_console')),
  notes text check (char_length(notes) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists backlinks_status_idx on public.backlinks (status, source_domain);

drop trigger if exists backlinks_touch on public.backlinks;
create or replace function public.backlinks_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger backlinks_touch before update on public.backlinks
  for each row execute function public.backlinks_touch();

drop trigger if exists backlinks_audit on public.backlinks;
create trigger backlinks_audit after insert or update or delete on public.backlinks
  for each row execute function public.log_admin_activity();

alter table public.backlinks enable row level security;
drop policy if exists backlinks_read on public.backlinks;
create policy backlinks_read on public.backlinks for select to authenticated using (public.is_admin());
drop policy if exists backlinks_write on public.backlinks;
create policy backlinks_write on public.backlinks for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());
revoke all on public.backlinks from anon;
grant select, insert, update, delete on public.backlinks to authenticated;
