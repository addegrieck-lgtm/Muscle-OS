-- LUMÉANCE — Aigrette : photos réelles + mise en situation 3D selon la version.
-- Remplace le correctif « aigrette-visualisations » (supprimé : inutile de le passer).
-- À coller UNE fois dans Supabase → SQL Editor → Run, après la publication du site.
-- Sans risque à rejouer.
--  • Photos d'ambiance du fabricant, rendues plus nettes (mêmes fichiers, mêmes adresses) :
--    légende et texte alternatif d'origine rétablis (au cas où l'ancien correctif a été passé).
--  • Mise en situation 3D : une seule vue dans la galerie, qui suit la version choisie
--    (versions rondes → salon, versions linéaires → salle à manger), via la clé « scene ».
begin;
update public.product_images set
  caption = 'Photographie d’ambiance du fabricant',
  alt_text = 'Suspension Aigrette ronde dorée, boule de tiges perlées de cristal allumée dans un salon aux murs gris',
  position = 0
where storage_path = '/products/aigrette/ambiance-ronde.webp';
update public.product_images set
  caption = 'Photographie d’ambiance du fabricant',
  alt_text = 'Suspension Aigrette linéaire dorée au-dessus d’une table de salle à manger en bois',
  position = 1
where storage_path = '/products/aigrette/ambiance-lineaire.webp';
-- Les mises en situation ne sont pas des images fixes de la galerie.
delete from public.product_images where storage_path like '/products/aigrette/mise-en-scene-%';

update public.product_variants
   set image_urls = image_urls || '{"scene": "/products/aigrette/mise-en-scene-ronde.webp"}'::jsonb
 where sku like 'LUM-SUS-002-R%';
update public.product_variants
   set image_urls = image_urls || '{"scene": "/products/aigrette/mise-en-scene-lineaire.webp"}'::jsonb
 where sku like 'LUM-SUS-002-L%';
commit;

-- Vérification : 2 photos, puis 7 versions avec leur mise en situation.
select i.position, i.storage_path, i.caption
  from public.product_images i join public.products p on p.id = i.product_id
 where p.reference = 'LUM-SUS-002' order by i.position;
select sku, image_urls ->> 'scene' as mise_en_situation
  from public.product_variants where sku like 'LUM-SUS-002-%' order by position;
