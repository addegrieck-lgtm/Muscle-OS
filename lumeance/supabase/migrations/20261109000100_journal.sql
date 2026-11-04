-- LUMÉANCE — studio éditorial : articles du journal en base.
-- Un article n'est visible du public qu'une fois VALIDÉ par un administrateur (statut
-- « published ») et sa date de mise en ligne atteinte : aucune publication automatique d'un
-- brouillon. Les articles écrits dans le code restent servis tant qu'ils ne sont pas repris ici
-- (un article en base remplace celui du code de même adresse).
-- Idempotent.

do $$ begin
  create type public.article_status as enum ('draft', 'review', 'published', 'archived');
exception when duplicate_object then null; end $$;

create table if not exists public.journal_articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(slug) <= 90),
  status public.article_status not null default 'draft',
  published_at timestamptz,
  category text not null check (char_length(category) between 2 and 60),
  title text not null check (char_length(title) between 10 and 120),
  description text not null check (char_length(description) between 50 and 200),
  excerpt text not null check (char_length(excerpt) between 20 and 300),
  art text not null default 'tiers' check (char_length(art) <= 30),
  -- [{ "heading": "…", "paragraphs": ["…"] }]
  sections jsonb not null default '[]' check (jsonb_typeof(sections) = 'array'),
  -- [{ "q": "…", "a": "…" }]
  faq jsonb not null default '[]' check (jsonb_typeof(faq) = 'array'),
  product_slugs text[] not null default '{}',
  -- [{ "href": "/…", "label": "…" }]
  related jsonb not null default '[]' check (jsonb_typeof(related) = 'array'),
  -- Sources vérifiables citées (jamais inventées) : [{ "label": "…", "url": "https://…" }]
  sources jsonb not null default '[]' check (jsonb_typeof(sources) = 'array'),
  -- Note interne de relecture (non publiée).
  notes text check (char_length(notes) <= 2000),
  origin text not null default 'studio' check (origin in ('studio', 'code', 'proposition')),
  approved_by uuid references public.admin_users (id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Un article publié a forcément une date et une validation.
  constraint journal_articles_published check (
    status <> 'published' or (published_at is not null and approved_at is not null)
  )
);
create index if not exists journal_articles_public_idx
  on public.journal_articles (published_at) where status = 'published';

create or replace function public.journal_articles_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists journal_articles_touch on public.journal_articles;
create trigger journal_articles_touch before update on public.journal_articles
  for each row execute function public.journal_articles_touch();

drop trigger if exists journal_articles_audit on public.journal_articles;
create trigger journal_articles_audit after insert or update or delete on public.journal_articles
  for each row execute function public.log_admin_activity();

alter table public.journal_articles enable row level security;
-- Lecture publique : articles validés dont la date est passée, rien d'autre.
drop policy if exists journal_articles_public_read on public.journal_articles;
create policy journal_articles_public_read on public.journal_articles for select to anon, authenticated
  using (status = 'published' and published_at <= now());
-- Rédaction et validation : administrateurs du catalogue (super_admin, admin).
drop policy if exists journal_articles_admin on public.journal_articles;
create policy journal_articles_admin on public.journal_articles for all to authenticated
  using (public.is_catalog_admin()) with check (public.is_catalog_admin());
grant select on public.journal_articles to anon, authenticated;
grant insert, update, delete on public.journal_articles to authenticated;
