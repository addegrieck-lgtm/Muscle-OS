-- LUMÉANCE — télécommande fournie avec Constellation et Organza (décision du propriétaire).
-- À coller UNE fois dans Supabase → SQL Editor → Run. Sans risque à rejouer.
--  • Les versions « télécommande » (SKU …-TC) sont supprimées : plus de choix à faire.
--  • Le prix de base intègre la télécommande (+10 €) : Constellation dès 220 €, Organza dès 170 €.
--  • Les précisions des versions et la fiche technique indiquent « télécommande fournie ».
begin;
-- Prix de base + 10 €, une seule fois (seulement tant que des versions -TC existent).
update public.products p set price = p.price + 1000
 where p.reference in ('LUM-SUS-003', 'LUM-LUS-004')
   and exists (select 1 from public.product_variants v
                where v.product_id = p.id and v.sku like '%-TC');
delete from public.product_variants
 where sku like 'LUM-SUS-003-%-TC' or sku like 'LUM-LUS-004-%-TC';

-- Précisions des versions.
update public.product_variants
   set details = replace(details, 'allumage à l’interrupteur', 'télécommande fournie, intensité variable')
 where sku like 'LUM-SUS-003-%' and details like '%allumage à l’interrupteur%';
update public.product_variants
   set details = details || ' · télécommande fournie, intensité variable'
 where sku like 'LUM-LUS-004-%' and details not like '%télécommande fournie%';

-- Textes de la fiche.
update public.products set
  description = replace(description,
    'Finition dorée ou noire, lumière blanc chaud ou blanc froid, et une version à intensité variable, réglable à la télécommande.',
    'Finition dorée ou noire, lumière blanc chaud ou blanc froid ; la télécommande, fournie, règle l’intensité.'),
  seo_description = replace(seo_description, 'version variable à la télécommande.', 'télécommande fournie.'),
  technical_specifications = (
    select jsonb_agg(case when e ->> 'label' = 'Commande'
      then jsonb_build_object('label', 'Commande', 'value', 'Télécommande fournie : allumage et intensité variable')
      else e end order by i)
    from jsonb_array_elements(technical_specifications) with ordinality as t(e, i))
 where reference = 'LUM-SUS-003';
update public.products set
  description = replace(description,
    'lumière blanc chaud ou blanc froid, ou intensité variable à la télécommande.',
    'lumière blanc chaud ou blanc froid ; la télécommande, fournie, règle l’intensité.'),
  technical_specifications = (
    select jsonb_agg(e order by i) from (
      select case when e ->> 'label' = 'Couleur de lumière'
        then jsonb_build_object('label', 'Couleur de lumière', 'value', 'Blanc chaud ou blanc froid')
        else e end as e, i * 2 as i
        from jsonb_array_elements(technical_specifications) with ordinality as t(e, i)
      union all
      select jsonb_build_object('label', 'Commande', 'value', 'Télécommande fournie : allumage et intensité variable'),
             (select i * 2 - 1 from jsonb_array_elements(technical_specifications) with ordinality as t(e, i)
               where e ->> 'label' = 'Matières')
       where not technical_specifications @> '[{"label": "Commande"}]'::jsonb
    ) s)
 where reference = 'LUM-LUS-004';
commit;

-- Vérification : prix de base, puis versions (plus aucune « -TC »).
select reference, price from public.products where reference in ('LUM-SUS-003', 'LUM-LUS-004');
select sku, price_adjustment, details from public.product_variants
 where sku like 'LUM-SUS-003-%' or sku like 'LUM-LUS-004-%' order by sku;
