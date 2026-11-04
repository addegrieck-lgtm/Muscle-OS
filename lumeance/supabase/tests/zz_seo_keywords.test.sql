-- Mots-clés suivis : invisibles des visiteurs, expressions normalisées.
begin;
insert into public.seo_keywords (keyword, target_path) values ('lustre escalier', '/luminaires/escalier');
do $$ begin
  begin
    insert into public.seo_keywords (keyword) values ('Lustre Escalier ');
    raise exception 'expression non normalisée acceptée';
  exception when check_violation then null;
  end;
end $$;
set local role anon;
do $$ begin
  begin
    perform 1 from public.seo_keywords;
    raise exception 'anon ne doit pas lire seo_keywords';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
