-- LUMÉANCE — avis clients vérifiés.
-- Seul un client ayant passé commande peut déposer un avis : l'administration génère, pour une
-- commande expédiée ou livrée, un lien personnel (jeton aléatoire, seule son empreinte SHA-256 est
-- conservée) valable 60 jours. Chaque avis est relu avant publication (art. L111-7-2 et D111-17
-- du Code de la consommation : information sur le contrôle des avis).
-- Idempotent.

do $$ begin
  create type public.review_status as enum ('pending', 'published', 'rejected');
exception when duplicate_object then null; end $$;

create table if not exists public.review_requests (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders (id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '60 days'
);

create table if not exists public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.review_requests (id) on delete cascade,
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  author_name text not null check (char_length(author_name) between 2 and 60),
  rating smallint not null check (rating between 1 and 5),
  title text check (char_length(title) <= 120),
  body text not null check (char_length(body) between 10 and 3000),
  -- Photos du client : bucket privé « review-uploads » tant que l'avis n'est pas publié,
  -- puis copiées dans le bucket public « media » (dossier reviews/) à la publication.
  photos text[] not null default '{}' check (cardinality(photos) <= 4),
  purchased_at timestamptz not null,
  status public.review_status not null default 'pending',
  admin_reply text check (char_length(admin_reply) <= 2000),
  moderation_note text check (char_length(moderation_note) <= 500),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  unique (request_id, product_id)
);
create index if not exists product_reviews_product_idx on public.product_reviews (product_id, status);
create index if not exists product_reviews_status_idx on public.product_reviews (status, created_at);

-- Écriture des demandes et des avis : serveur (service_role) pour les clients ; administrateurs
-- pour la modération. Aucun accès direct des visiteurs aux tables.
alter table public.review_requests enable row level security;
alter table public.product_reviews enable row level security;
drop policy if exists review_requests_admin on public.review_requests;
create policy review_requests_admin on public.review_requests for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists product_reviews_admin on public.product_reviews;
create policy product_reviews_admin on public.product_reviews for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.review_requests, public.product_reviews from anon;

-- Vue publique : avis publiés uniquement, sans identifiant de commande ni de client.
create or replace view public.published_reviews with (security_invoker = false) as
  select r.id, r.product_id, r.author_name, r.rating, r.title, r.body, r.photos,
         r.purchased_at, r.published_at, r.admin_reply
    from public.product_reviews r
   where r.status = 'published';
revoke all on public.published_reviews from public;
grant select on public.published_reviews to anon, authenticated;

-- Bucket privé des photos en attente de modération (lecture par les administrateurs seulement).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-uploads', 'review-uploads', false, 10485760,
        array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;
drop policy if exists review_uploads_admin_read on storage.objects;
create policy review_uploads_admin_read on storage.objects for select to authenticated
  using (bucket_id = 'review-uploads' and public.is_admin());
drop policy if exists review_uploads_admin_delete on storage.objects;
create policy review_uploads_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'review-uploads' and public.is_admin());
-- Publication : les administrateurs du catalogue écrivent déjà dans « media » (dossier reviews/).
