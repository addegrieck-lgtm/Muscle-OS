-- LUMÉANCE — Aiguille : offre « 1 achetée, la 2ᵉ à −50 % ».
-- À coller UNE fois dans Supabase → SQL Editor → Run. Sans risque à rejouer.
-- 1) La contrainte de la colonne promotion accepte désormais un pourcentage.
alter table public.products drop constraint if exists products_promotion_shape;
alter table public.products
  add constraint products_promotion_shape check (
    promotion is null or (
      jsonb_typeof(promotion -> 'buy') = 'number' and jsonb_typeof(promotion -> 'free') = 'number'
      and (promotion ->> 'buy')::int between 1 and 20
      and (promotion ->> 'free')::int between 1 and 20
      and (
        promotion -> 'percent' is null or jsonb_typeof(promotion -> 'percent') = 'null'
        or (jsonb_typeof(promotion -> 'percent') = 'number'
            and (promotion ->> 'percent')::int between 1 and 100)
      )
    )
  );
-- 2) Offre sur Aiguille.
update public.products
  set promotion = '{"buy": 1, "free": 1, "percent": 50}'::jsonb
  where reference = 'LUM-APP-003';
