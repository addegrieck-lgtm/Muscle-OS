-- LUMÉANCE — Constellation : 2ᵉ photo du fabricant et prix du 8 têtes.
-- À coller UNE fois dans Supabase → SQL Editor → Run, après la publication du site.
-- Sans risque à rejouer.
--  • La photo « arc noir » a été remplacée par la « barre droite dorée » et son fichier supprimé ;
--    la base pointait encore vers l'ancien fichier (image vide en 2ᵉ position).
--  • Le script d'import n'écrase pas les versions existantes : on applique ici le supplément du
--    8 têtes (+50 €, soit 260 €) et la télécommande (+10 €).
begin;
-- Photo : remplace l'ancienne adresse si la nouvelle n'est pas déjà là, sinon supprime l'ancienne.
update public.product_images set
  storage_path = '/products/constellation/ambiance-droite-doree.webp',
  alt_text = 'Suspension Constellation dorée à branche droite, huit globes de verre étoilés allumés au-dessus d’une table de salle à manger en bois, devant un mur vert sombre',
  caption = 'Photographie d’ambiance du fabricant',
  position = 1
where storage_path = '/products/constellation/ambiance-arc-noir.webp'
  and not exists (select 1 from public.product_images
    where storage_path = '/products/constellation/ambiance-droite-doree.webp');
delete from public.product_images
 where storage_path = '/products/constellation/ambiance-arc-noir.webp';

-- Prix des versions (supplément par rapport au 6 têtes, en centimes).
update public.product_variants set price_adjustment = case
    when sku in ('LUM-SUS-003-A6', 'LUM-SUS-003-D6') then 0
    when sku in ('LUM-SUS-003-A6-TC', 'LUM-SUS-003-D6-TC') then 1000
    when sku in ('LUM-SUS-003-A8', 'LUM-SUS-003-D8') then 5000
    when sku in ('LUM-SUS-003-A8-TC', 'LUM-SUS-003-D8-TC') then 6000
  end
 where sku in ('LUM-SUS-003-A6', 'LUM-SUS-003-D6', 'LUM-SUS-003-A6-TC', 'LUM-SUS-003-D6-TC',
               'LUM-SUS-003-A8', 'LUM-SUS-003-D8', 'LUM-SUS-003-A8-TC', 'LUM-SUS-003-D8-TC');
commit;

-- Vérification : 2 photos (ambiance-doree, ambiance-droite-doree), puis les 8 versions.
select i.position, i.storage_path from public.product_images i
  join public.products p on p.id = i.product_id
 where p.reference = 'LUM-SUS-003' order by i.position;
select v.sku, v.price_adjustment from public.product_variants v
 where v.sku like 'LUM-SUS-003-%' order by v.position;
