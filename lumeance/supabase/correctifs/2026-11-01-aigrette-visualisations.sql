-- LUMÉANCE — Aigrette : les deux images de présentation sont désormais des visualisations 3D
-- (mêmes fichiers, remplacés dans public/products/aigrette/), plus des photos du fabricant.
-- À coller UNE fois dans Supabase → SQL Editor → Run, après la publication du site.
-- Ne touche qu'aux légendes et textes alternatifs de ces deux images.
begin;
update public.product_images set
  caption = 'Visualisation 3D — mise en situation',
  alt_text = 'Visualisation 3D de la suspension Aigrette ronde Ø60 cm dorée, allumée en blanc chaud dans un salon au mur anthracite, rideau de lin et tableau encadré'
where storage_path = '/products/aigrette/ambiance-ronde.webp';
update public.product_images set
  caption = 'Visualisation 3D — mise en situation',
  alt_text = 'Visualisation 3D de la suspension Aigrette linéaire 92 cm dorée, allumée en blanc chaud au-dessus d’une table de salle à manger en chêne'
where storage_path = '/products/aigrette/ambiance-lineaire.webp';
commit;

-- Vérification : 2 lignes, légende « Visualisation 3D — mise en situation ».
select storage_path, caption from public.product_images
where storage_path like '/products/aigrette/ambiance-%' order by position;
