-- LUMÉANCE — Volute : colonne « promotion » manquante (offre « 3 achetées, la 4ᵉ offerte »).
-- À coller UNE fois dans Supabase → SQL Editor → Run, puis cliquer à nouveau sur
-- « Importer les nouvelles pièces » dans l'administration. Sans risque à rejouer.
-- Cause : la migration 20261102000100_product_promotion.sql n'avait pas été appliquée à la base
-- (ni ajoutée à setup.sql) ; l'import de Volute échouait sur la colonne inconnue.
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
