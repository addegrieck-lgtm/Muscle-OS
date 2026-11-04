-- Liens externes : réservés aux administrateurs, statuts contrôlés.
begin;
insert into public.backlinks (source_url, source_domain, status) values ('https://blog.example.test/article', 'blog.example.test', 'obtenu');
do $$ begin
  begin
    insert into public.backlinks (source_url, source_domain, status) values ('https://a.test/b', 'a.test', 'achete');
    raise exception 'statut inconnu accepté';
  exception when check_violation then null;
  end;
end $$;
set local role anon;
do $$ begin
  begin
    perform 1 from public.backlinks;
    raise exception 'anon ne doit pas lire backlinks';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
