-- LUMÉANCE — offre par lot sur une pièce (« 3 achetées, la 4ᵉ offerte »).
-- Idempotent : peut être rejoué sans risque.
-- { "buy": 3, "free": 1 } : pour 3 exemplaires achetés (toutes versions confondues), 1 offert,
-- le moins cher. Calcul côté serveur (lib/services/pricing.ts). null = pas d'offre.
alter table public.products add column if not exists promotion jsonb;
alter table public.products drop constraint if exists products_promotion_shape;
alter table public.products
  add constraint products_promotion_shape check (
    promotion is null or (
      jsonb_typeof(promotion -> 'buy') = 'number' and jsonb_typeof(promotion -> 'free') = 'number'
      and (promotion ->> 'buy')::int between 1 and 20
      and (promotion ->> 'free')::int between 1 and 20
    )
  );
