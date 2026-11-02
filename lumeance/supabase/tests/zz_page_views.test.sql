-- Mesure d'audience : lecture réservée aux administrateurs, agrégats corrects.
begin;
insert into public.page_views (path, source, device, visitor) values
  ('/', 'search', 'mobile', 'a'), ('/', 'direct', 'desktop', 'b'), ('/produit/halo', 'search', 'mobile', 'a');
set local role anon;
do $$ begin
  begin
    perform 1 from public.page_views;
    raise exception 'anon ne doit pas lire page_views';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_traffic_stats(7);
    raise exception 'anon ne doit pas lire les statistiques';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$
declare s jsonb := public.admin_traffic_stats(7);
begin
  if (s->>'views')::int <> 3 or (s->>'visitors')::int <> 2 then raise exception 'agrégats : %', s; end if;
  if jsonb_array_length(s->'daily') <> 7 then raise exception 'jours : %', s->'daily'; end if;
  if (s->'pages'->0->>'path') <> '/' then raise exception 'pages : %', s->'pages'; end if;
end $$;
reset role;
rollback;
