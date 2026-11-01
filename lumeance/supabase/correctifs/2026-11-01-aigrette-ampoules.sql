-- LUMÉANCE — Aigrette : ampoules LED G9 fournies (confirmé le 01/11/2026).
-- À coller UNE fois dans Supabase → SQL Editor → Run. Ne touche qu'aux textes concernés.
begin;
update public.products set technical_specifications = '[{"label":"Sources lumineuses","value":"Ampoules LED fournies, culot G9 — de 8 à 16 selon la version"},{"label":"Tension d’entrée","value":"AC 90–260 V"},{"label":"Flux lumineux","value":"De 249 à 2 000 lm selon la version"},{"label":"Formes","value":"Ronde (Ø40, 50, 55, 60 ou 80 cm) ou linéaire (72 ou 92 cm, hauteur 40 cm)"},{"label":"Suspension","value":"Câble réglable jusqu’à 1,5 m"},{"label":"Finitions","value":"Doré ou chromé"},{"label":"Couleur de lumière","value":"Blanc chaud, blanc neutre, blanc froid, ou trois teintes commutables"},{"label":"Surface conseillée","value":"10 à 15 m², selon le fabricant"},{"label":"Garantie fabricant","value":"3 ans"}]'::jsonb where reference = 'LUM-SUS-002';
update public.product_variants set details = '8 ampoules G9 LED fournies · 31 éléments de cristal · suspension réglable jusqu’à 1,5 m' where sku = 'LUM-SUS-002-R40';
update public.product_variants set details = '9 ampoules G9 LED fournies · 60 éléments de cristal · suspension réglable jusqu’à 1,5 m' where sku = 'LUM-SUS-002-R50';
update public.product_variants set details = '12 ampoules G9 LED fournies · 76 éléments de cristal · suspension réglable jusqu’à 1,5 m' where sku = 'LUM-SUS-002-R55';
update public.product_variants set details = '16 ampoules G9 LED fournies · 140 éléments de cristal · suspension réglable jusqu’à 1,5 m' where sku = 'LUM-SUS-002-R60';
update public.product_variants set details = '16 ampoules G9 LED fournies · 140 éléments de cristal · suspension réglable jusqu’à 1,5 m' where sku = 'LUM-SUS-002-R80';
update public.product_variants set details = '9 ampoules G9 LED fournies · 63 éléments de cristal · hauteur 40 cm · pavillon 50 cm · suspension réglable jusqu’à 1,5 m' where sku = 'LUM-SUS-002-L72';
update public.product_variants set details = '12 ampoules G9 LED fournies · 83 éléments de cristal · hauteur 40 cm · pavillon 50 cm · suspension réglable jusqu’à 1,5 m' where sku = 'LUM-SUS-002-L92';
commit;

-- Vérification : 7 lignes, chacune avec « fournies ».
select sku, details from public.product_variants where sku like 'LUM-SUS-002-%' order by position;
