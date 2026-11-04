-- Veille concurrentielle : réservée aux administrateurs, sources https obligatoires.
begin;
insert into public.competitors (name, domain) values ('Exemple', 'exemple-luminaires.fr');
do $$ begin
  begin
    insert into public.competitors (name, domain) values ('Mauvais', 'http://pas-un-domaine');
    raise exception 'domaine invalide accepté';
  exception when check_violation then null;
  end;
  begin
    insert into public.competitor_prices (competitor_id, product_label, price, source_url)
    select id, 'Lustre test', 10000, 'http://exemple.fr' from public.competitors limit 1;
    raise exception 'source non https acceptée';
  exception when check_violation then null;
  end;
end $$;
set local role anon;
do $$ begin
  begin
    perform 1 from public.competitors;
    raise exception 'anon ne doit pas lire competitors';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
