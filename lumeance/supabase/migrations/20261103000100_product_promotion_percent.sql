-- LUMÉANCE — offre par lot avec remise en pourcentage (« 1 achetée, la 2ᵉ à −50 % »).
-- Idempotent : peut être rejoué sans risque.
-- { "buy": 1, "free": 1, "percent": 50 } : pour 1 exemplaire acheté, le 2ᵉ (le moins cher) à
-- −50 %. Sans « percent », les exemplaires sont offerts (100 %).
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
