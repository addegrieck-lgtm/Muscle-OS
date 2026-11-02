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
