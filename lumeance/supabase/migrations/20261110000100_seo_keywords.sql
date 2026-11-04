-- LUMÉANCE — suivi des mots-clés (phase E).
-- La liste des expressions suivies, la page cible et l'intention de recherche sont saisies par la
-- maison. Les chiffres (impressions, clics, position) viennent uniquement de Google Search
-- Console, lus à la demande : rien n'est stocké ni estimé, aucun volume de recherche inventé.
-- Idempotent.

create table if not exists public.seo_keywords (
  id uuid primary key default gen_random_uuid(),
  keyword text not null unique check (keyword = lower(btrim(keyword)) and char_length(keyword) between 2 and 100),
  target_path text check (target_path is null or target_path ~ '^/[^\s]*$'),
  intent text not null default 'commerciale'
    check (intent in ('informationnelle', 'commerciale', 'transactionnelle', 'navigationnelle')),
  priority smallint not null default 2 check (priority between 1 and 3),
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now()
);

drop trigger if exists seo_keywords_audit on public.seo_keywords;
create trigger seo_keywords_audit after insert or update or delete on public.seo_keywords
  for each row execute function public.log_admin_activity();

alter table public.seo_keywords enable row level security;
drop policy if exists seo_keywords_read on public.seo_keywords;
create policy seo_keywords_read on public.seo_keywords for select to authenticated
  using (public.is_admin());
drop policy if exists seo_keywords_write on public.seo_keywords;
create policy seo_keywords_write on public.seo_keywords for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());
revoke all on public.seo_keywords from anon;
grant select, insert, update, delete on public.seo_keywords to authenticated;
