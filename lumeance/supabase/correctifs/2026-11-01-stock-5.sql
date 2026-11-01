-- LUMÉANCE — 5 en stock pour chaque pièce et chaque version (décision du propriétaire).
-- Le stock n'est jamais affiché au client : il rend les pièces commandables (« Ajouter au panier »
-- au lieu de « Demander cette pièce »). À coller dans Supabase → SQL Editor → Run.
-- Sans risque à rejouer.
begin;
update public.products set stock_quantity = 5 where reference like 'LUM-%';
update public.product_variants set stock_quantity = 5 where sku like 'LUM-%';
commit;

-- Vérification : chaque ligne doit afficher 5.
select reference, stock_quantity from public.products where reference like 'LUM-%' order by reference;
select stock_quantity, count(*) as versions from public.product_variants where sku like 'LUM-%' group by 1;
