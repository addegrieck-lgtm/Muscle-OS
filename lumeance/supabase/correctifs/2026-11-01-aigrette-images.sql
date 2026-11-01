-- LUMÉANCE — Aigrette : photos d'ambiance du fabricant rendues plus nettes.
-- Remplace le correctif « aigrette-visualisations » (supprimé : inutile de le passer).
-- À coller UNE fois dans Supabase → SQL Editor → Run, après la publication du site.
-- Sans risque à rejouer.
--  • Mêmes fichiers, mêmes adresses : légende et texte alternatif d'origine rétablis (au cas où
--    l'ancien correctif, qui les présentait comme des visualisations 3D, a été passé).
--  • Retire toute trace de mise en situation 3D (abandonnée), si une version précédente de ce
--    correctif a été passée.
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
delete from public.product_images where storage_path like '/products/aigrette/mise-en-scene-%';
update public.product_variants set image_urls = image_urls - 'scene'
 where sku like 'LUM-SUS-002-%' and image_urls ? 'scene';
commit;

-- Vérification : 2 photos, légende « Photographie d’ambiance du fabricant ».
select i.position, i.storage_path, i.caption
  from public.product_images i join public.products p on p.id = i.product_id
 where p.reference = 'LUM-SUS-002' order by i.position;
