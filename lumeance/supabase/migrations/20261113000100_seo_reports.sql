-- LUMÉANCE — rapports SEO hebdomadaires (phase J).
-- Instantané calculé chaque semaine (ou à la demande) à partir des données réelles : Search
-- Console, audits du site, studio, liens externes. Aucune donnée estimée.
-- Idempotent.

create table if not exists public.seo_reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  period_start date not null,
  period_end date not null,
  -- manuel (bouton de l'administration) ou planifie (tâche hebdomadaire)
  trigger text not null default 'manuel' check (trigger in ('manuel', 'planifie')),
  alerts integer not null default 0 check (alerts >= 0),
  data jsonb not null check (jsonb_typeof(data) = 'object')
);
create index if not exists seo_reports_created_idx on public.seo_reports (created_at desc);

alter table public.seo_reports enable row level security;
drop policy if exists seo_reports_read on public.seo_reports;
create policy seo_reports_read on public.seo_reports for select to authenticated using (public.is_admin());
drop policy if exists seo_reports_write on public.seo_reports;
create policy seo_reports_write on public.seo_reports for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());
revoke all on public.seo_reports from anon;
grant select, insert, delete on public.seo_reports to authenticated;
