-- Studio éditorial : seuls les articles validés et datés dans le passé sont publics.
begin;
insert into public.journal_articles (slug, status, published_at, approved_at, category, title, description, excerpt)
values
  ('en-ligne', 'published', now() - interval '1 day', now(), 'Guides', 'Un article en ligne', repeat('d', 60), repeat('e', 30)),
  ('programme', 'published', now() + interval '3 days', now(), 'Guides', 'Un article programmé', repeat('d', 60), repeat('e', 30)),
  ('brouillon', 'draft', now() - interval '1 day', null, 'Guides', 'Un brouillon non validé', repeat('d', 60), repeat('e', 30));
do $$ begin
  begin
    insert into public.journal_articles (slug, status, published_at, category, title, description, excerpt)
    values ('sans-validation', 'published', now(), 'Guides', 'Publié sans validation', repeat('d', 60), repeat('e', 30));
    raise exception 'un article publié doit être validé';
  exception when check_violation then null;
  end;
end $$;
set local role anon;
do $$ begin
  if (select count(*) from public.journal_articles) <> 1 then
    raise exception 'anon voit % article(s)', (select count(*) from public.journal_articles);
  end if;
  begin
    insert into public.journal_articles (slug, category, title, description, excerpt)
    values ('pirate', 'Guides', 'Article pirate du visiteur', repeat('d', 60), repeat('e', 30));
    raise exception 'anon ne doit pas écrire';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
