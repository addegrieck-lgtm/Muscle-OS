-- LUMÉANCE — liste d'envies des comptes clients. Idempotent : peut être rejoué sans risque.
-- Les visiteurs gardent leurs envies dans leur navigateur ; une fois connectés, elles sont
-- enregistrées ici et retrouvées sur tous leurs appareils. Écriture par le serveur (clé
-- service_role) après vérification de la session ; lecture de ses propres envies seulement.

create table if not exists public.wishlist_items (
  auth_user_id uuid not null, -- auth.users.id (pas de FK : schéma auth géré par Supabase)
  product_id text not null check (length(product_id) between 1 and 64),
  created_at timestamptz not null default now(),
  primary key (auth_user_id, product_id)
);

alter table public.wishlist_items enable row level security;
revoke all on public.wishlist_items from anon;

drop policy if exists wishlist_items_owner_read on public.wishlist_items;
create policy wishlist_items_owner_read on public.wishlist_items for select to authenticated
  using (auth_user_id = auth.uid());
