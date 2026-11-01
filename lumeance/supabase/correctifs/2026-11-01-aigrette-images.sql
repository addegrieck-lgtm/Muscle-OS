-- LUMÉANCE — Aigrette : quatre images (remplace le correctif « aigrette-visualisations »,
-- supprimé : inutile de le passer). À coller UNE fois dans Supabase → SQL Editor → Run, après la
-- publication du site. Sans risque à rejouer.
--  1-2. Photos d'ambiance du fabricant, rendues plus nettes (mêmes fichiers, mêmes adresses) :
--       légende et texte alternatif d'origine rétablis (au cas où l'ancien correctif a été passé).
--  3-4. Mises en situation 3D (nouveaux fichiers), ajoutées si absentes.
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

insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select p.id, v.path, v.alt, 'Visualisation 3D — mise en situation', v.pos, false
from public.products p
cross join (values
  ('/products/aigrette/mise-en-scene-ronde.webp',
   'Visualisation 3D de la suspension Aigrette ronde Ø60 cm dorée, allumée en blanc chaud dans un salon au mur anthracite, rideau de lin et tableau encadré', 2),
  ('/products/aigrette/mise-en-scene-lineaire.webp',
   'Visualisation 3D de la suspension Aigrette linéaire 92 cm dorée, allumée en blanc chaud au-dessus d’une table en noyer, devant un mur anthracite et un tableau encadré', 3)
) as v(path, alt, pos)
where p.reference = 'LUM-SUS-002'
  and not exists (select 1 from public.product_images i where i.product_id = p.id and i.storage_path = v.path);
commit;

-- Vérification : 4 lignes, dans l'ordre photo ronde, photo linéaire, 3D ronde, 3D linéaire.
select i.position, i.storage_path, i.caption
from public.product_images i join public.products p on p.id = i.product_id
where p.reference = 'LUM-SUS-002' order by i.position;
