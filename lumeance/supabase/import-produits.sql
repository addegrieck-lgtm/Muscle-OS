-- LUMÉANCE — import des pièces du catalogue dans Supabase.
-- GÉNÉRÉ par « npm run catalog:sql » depuis lib/catalog/products.ts : ne pas modifier à la main.
-- À coller dans Supabase → SQL Editor → Run. Sans risque à rejouer : ce qui existe déjà
-- (même référence, même SKU, même image) n'est pas modifié.

begin;

-- ════ Colonnes de présentation ════
-- LUMÉANCE — présentation détaillée des pièces (reprise du catalogue écrit dans le code).
-- Idempotent : peut être rejoué sans risque (add column if not exists).

-- Options sans incidence sur le prix, choisies en plus de la version :
-- [{ "id": "lumiere", "label": "Couleur de lumière", "values": [{ "id": "chaud", "label": "Blanc chaud" }] }]
alter table public.products
  add column if not exists options jsonb not null default '[]'::jsonb;
alter table public.products drop constraint if exists products_options_array;
alter table public.products
  add constraint products_options_array check (jsonb_typeof(options) = 'array');

-- Libellés du sélecteur à deux niveaux : { "group": "Pavillon", "variant": "Nombre de sphères" }
alter table public.products add column if not exists option_labels jsonb;

-- Illustration de substitution quand aucune image n'est disponible (cascade, globes, organic…).
alter table public.products add column if not exists art text;

-- Versions : précisions affichées, visuel propre, visuels selon les options, ordre d'affichage.
alter table public.product_variants add column if not exists details text;
alter table public.product_variants add column if not exists image_url text;
alter table public.product_variants
  add column if not exists image_urls jsonb not null default '{}'::jsonb;
alter table public.product_variants drop constraint if exists product_variants_image_urls_object;
alter table public.product_variants
  add constraint product_variants_image_urls_object check (jsonb_typeof(image_urls) = 'object');
alter table public.product_variants
  add column if not exists position integer not null default 0;

-- Légende affichée sur la photo (« Photographie d'ambiance du fabricant »).
alter table public.product_images add column if not exists caption text;

-- Note : storage_path et image_url commençant par « / » désignent des fichiers du site
-- (dossier public/), les autres des fichiers du bucket « media » de Supabase Storage.

-- LUMÉANCE — offre par lot sur une pièce (« 3 achetées, la 4ᵉ offerte »).
-- Idempotent : peut être rejoué sans risque.
-- { "buy": 3, "free": 1 } : pour 3 exemplaires achetés (toutes versions confondues), 1 offert,
-- le moins cher. Calcul côté serveur (lib/services/pricing.ts). null = pas d'offre.
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

-- ════ Céleste (LUM-LUS-001) ════
insert into public.products (slug, name, reference, short_description, description, price,
  compare_at_price, category_id, status, featured, dimensions, weight, materials, finishes,
  technical_specifications, delivery_information, assembly_information, stock_quantity,
  seo_title, seo_description, options, option_labels, art, promotion)
values ('celeste', 'Céleste', 'LUM-LUS-001', 'Une cascade de sphères de verre cristal, suspendues à des hauteurs différentes.', 'Céleste compose une pluie de lumière verticale : des sphères de verre cristal, chacune abritant une source LED, descendent à des hauteurs différentes depuis un pavillon unique. Allumée, la composition se lit comme une seule constellation ; éteinte, elle reste une sculpture de verre.

Pensée pour les grandes hauteurs sous plafond — cages d’escalier, mezzanines, halls d’entrée et séjours en double hauteur — elle accompagne le regard d’un niveau à l’autre. La longueur de suspension est réglable pour ajuster la composition à votre volume.

Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.',
  17000, null,
  (select id from public.categories where slug = 'lustres'),
  'published', true, '{}'::jsonb, null,
  array['Verre cristal', 'Acier inoxydable']::text[], '{}'::text[], '[{"label":"Sources lumineuses","value":"LED, culot G4"},{"label":"Couleur de lumière","value":"Blanc chaud, blanc neutre ou blanc froid, au choix"},{"label":"Tension d’entrée","value":"AC 95–265 V"},{"label":"Pavillon","value":"Rond — Ø40 cm (14 sphères), Ø50 cm (26), Ø100 cm (46)"},{"label":"Hauteur réglable","value":"Jusqu’à 3 m (14 sphères), 4 m (26), 5 m (36 et 46)"},{"label":"Surface conseillée","value":"10–15 m² (14) · 15–20 m² (26) · 20–25 m² (36) · 25–40 m² (46)"},{"label":"Classe énergétique (sources)","value":"F, selon le fabricant"},{"label":"Pièces conseillées","value":"Escalier, mezzanine, séjour, salle à manger, couloir"}]'::jsonb,
  null, 'Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est vivement recommandée pour une pièce de grande hauteur. Indiquez la hauteur disponible pour ajuster la longueur des câbles.', 0,
  'Céleste — lustre cascade en sphères de verre cristal', 'Lustre en cascade de sphères de verre cristal pour cage d’escalier, mezzanine et grande hauteur sous plafond. LED G4, suspension réglable.', '[{"id":"lumiere","label":"Couleur de lumière","values":[{"id":"chaud","label":"Blanc chaud"},{"id":"neutre","label":"Blanc neutre"},{"id":"froid","label":"Blanc froid"}]}]'::jsonb,
  '{"group":"Pavillon","variant":"Nombre de sphères"}'::jsonb, 'cascade',
  null)
on conflict (reference) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '3 sphères', 'LUM-LUS-001-R3', 'Pavillon rond', 0,
  0, true, 'Pavillon Ø15 cm · hauteur réglable jusqu’à 1,5 m · pièce de 5 à 8 m²', '/products/celeste/rendu-chaud-r3.webp', '{"chaud":"/products/celeste/rendu-chaud-r3.webp","neutre":"/products/celeste/rendu-neutre-r3.webp","froid":"/products/celeste/rendu-froid-r3.webp"}'::jsonb, 0)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '5 sphères', 'LUM-LUS-001-R5', 'Pavillon rond', 8000,
  0, true, 'Pavillon Ø20 cm · hauteur réglable jusqu’à 2 m · pièce de 5 à 8 m²', '/products/celeste/rendu-chaud-r5.webp', '{"chaud":"/products/celeste/rendu-chaud-r5.webp","neutre":"/products/celeste/rendu-neutre-r5.webp","froid":"/products/celeste/rendu-froid-r5.webp"}'::jsonb, 1)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '7 sphères', 'LUM-LUS-001-R7', 'Pavillon rond', 17000,
  0, true, 'Pavillon Ø30 cm · hauteur réglable jusqu’à 2,5 m · pièce de 8 à 12 m²', '/products/celeste/rendu-chaud-r7.webp', '{"chaud":"/products/celeste/rendu-chaud-r7.webp","neutre":"/products/celeste/rendu-neutre-r7.webp","froid":"/products/celeste/rendu-froid-r7.webp"}'::jsonb, 2)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '14 sphères', 'LUM-LUS-001-R14', 'Pavillon rond', 42000,
  0, true, 'Pavillon Ø40 cm · hauteur réglable jusqu’à 3 m · pièce de 10 à 15 m²', '/products/celeste/rendu-chaud-r14.webp', '{"chaud":"/products/celeste/rendu-chaud-r14.webp","neutre":"/products/celeste/rendu-neutre-r14.webp","froid":"/products/celeste/rendu-froid-r14.webp"}'::jsonb, 3)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '26 sphères', 'LUM-LUS-001-R26', 'Pavillon rond', 70000,
  0, true, 'Pavillon Ø50 cm · hauteur réglable jusqu’à 4 m · pièce de 15 à 20 m²', '/products/celeste/rendu-chaud-r26.webp', '{"chaud":"/products/celeste/rendu-chaud-r26.webp","neutre":"/products/celeste/rendu-neutre-r26.webp","froid":"/products/celeste/rendu-froid-r26.webp"}'::jsonb, 4)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '36 sphères', 'LUM-LUS-001-R36', 'Pavillon rond', 93000,
  0, true, 'Dimensions du pavillon communiquées sur demande · hauteur réglable jusqu’à 5 m · pièce de 20 à 25 m²', '/products/celeste/rendu-chaud-r36.webp', '{"chaud":"/products/celeste/rendu-chaud-r36.webp","neutre":"/products/celeste/rendu-neutre-r36.webp","froid":"/products/celeste/rendu-froid-r36.webp"}'::jsonb, 5)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '46 sphères', 'LUM-LUS-001-R46', 'Pavillon rond', 186000,
  0, true, 'Pavillon Ø100 cm · hauteur réglable jusqu’à 5 m · pièce de 25 à 40 m²', '/products/celeste/rendu-chaud-r46.webp', '{"chaud":"/products/celeste/rendu-chaud-r46.webp","neutre":"/products/celeste/rendu-neutre-r46.webp","froid":"/products/celeste/rendu-froid-r46.webp"}'::jsonb, 6)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '18 sphères', 'LUM-LUS-001-C18', 'Pavillon carré', 46000,
  0, true, 'Pavillon 50 × 50 cm · hauteur réglable jusqu’à 3,5 m · pièce de 15 à 20 m²', '/products/celeste/rendu-chaud-c18.webp', '{"chaud":"/products/celeste/rendu-chaud-c18.webp","neutre":"/products/celeste/rendu-neutre-c18.webp","froid":"/products/celeste/rendu-froid-c18.webp"}'::jsonb, 7)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '26 sphères', 'LUM-LUS-001-C26', 'Pavillon carré', 70000,
  0, true, 'Pavillon 50 × 50 cm · hauteur réglable jusqu’à 4 m · pièce de 15 à 20 m²', '/products/celeste/rendu-chaud-c26.webp', '{"chaud":"/products/celeste/rendu-chaud-c26.webp","neutre":"/products/celeste/rendu-neutre-c26.webp","froid":"/products/celeste/rendu-froid-c26.webp"}'::jsonb, 8)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '36 sphères', 'LUM-LUS-001-C36', 'Pavillon carré', 93000,
  0, true, 'Pavillon 75 × 75 cm · hauteur réglable jusqu’à 5 m · pièce de 20 à 25 m²', '/products/celeste/rendu-chaud-c36.webp', '{"chaud":"/products/celeste/rendu-chaud-c36.webp","neutre":"/products/celeste/rendu-neutre-c36.webp","froid":"/products/celeste/rendu-froid-c36.webp"}'::jsonb, 9)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '46 sphères', 'LUM-LUS-001-C46', 'Pavillon carré', 186000,
  0, true, 'Pavillon 100 × 100 cm · hauteur réglable jusqu’à 5 m · pièce de 25 à 40 m²', '/products/celeste/rendu-chaud-c46.webp', '{"chaud":"/products/celeste/rendu-chaud-c46.webp","neutre":"/products/celeste/rendu-neutre-c46.webp","froid":"/products/celeste/rendu-froid-c46.webp"}'::jsonb, 10)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '5 sphères', 'LUM-LUS-001-L5', 'Pavillon rectangulaire', 12000,
  0, true, 'Pavillon 50 × 5 cm · hauteur réglable jusqu’à 2 m · pièce de 5 à 8 m²', '/products/celeste/rendu-chaud-l5.webp', '{"chaud":"/products/celeste/rendu-chaud-l5.webp","neutre":"/products/celeste/rendu-neutre-l5.webp","froid":"/products/celeste/rendu-froid-l5.webp"}'::jsonb, 11)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '7 sphères', 'LUM-LUS-001-L7', 'Pavillon rectangulaire', 17000,
  0, true, 'Pavillon 70 × 5 cm · hauteur réglable jusqu’à 2,5 m · pièce de 8 à 12 m²', '/products/celeste/rendu-chaud-l7.webp', '{"chaud":"/products/celeste/rendu-chaud-l7.webp","neutre":"/products/celeste/rendu-neutre-l7.webp","froid":"/products/celeste/rendu-froid-l7.webp"}'::jsonb, 12)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '14 sphères', 'LUM-LUS-001-L14', 'Pavillon rectangulaire', 42000,
  0, true, 'Pavillon 85 × 28 cm · hauteur réglable jusqu’à 3 m · pièce de 10 à 15 m²', '/products/celeste/rendu-chaud-l14.webp', '{"chaud":"/products/celeste/rendu-chaud-l14.webp","neutre":"/products/celeste/rendu-neutre-l14.webp","froid":"/products/celeste/rendu-froid-l14.webp"}'::jsonb, 13)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '18 sphères', 'LUM-LUS-001-L18', 'Pavillon rectangulaire', 50000,
  0, true, 'Pavillon 85 × 28 cm', '/products/celeste/rendu-chaud-l18.webp', '{"chaud":"/products/celeste/rendu-chaud-l18.webp","neutre":"/products/celeste/rendu-neutre-l18.webp","froid":"/products/celeste/rendu-froid-l18.webp"}'::jsonb, 14)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-001'), '36 sphères', 'LUM-LUS-001-L36', 'Pavillon rectangulaire', 93000,
  0, true, 'Pavillon 110 × 37 cm · hauteur réglable jusqu’à 5 m · pièce de 20 à 25 m²', '/products/celeste/rendu-chaud-l36.webp', '{"chaud":"/products/celeste/rendu-chaud-l36.webp","neutre":"/products/celeste/rendu-neutre-l36.webp","froid":"/products/celeste/rendu-froid-l36.webp"}'::jsonb, 15)
on conflict (sku) do nothing;
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-LUS-001'), '/products/celeste/ambiance-escalier.webp', 'Lustre Céleste en cascade de sphères de verre cristal dans une cage d’escalier en marbre', 'Photographie d’ambiance du fabricant', 0,
  true and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-LUS-001') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-LUS-001') and storage_path = '/products/celeste/ambiance-escalier.webp');
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-LUS-001'), '/products/celeste/ambiance-mezzanine.webp', 'Lustre Céleste suspendu sur trois niveaux devant une mezzanine vitrée', 'Photographie d’ambiance du fabricant', 1,
  false and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-LUS-001') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-LUS-001') and storage_path = '/products/celeste/ambiance-mezzanine.webp');

-- ════ Luciole (LUM-SUS-001) ════
insert into public.products (slug, name, reference, short_description, description, price,
  compare_at_price, category_id, status, featured, dimensions, weight, materials, finishes,
  technical_specifications, delivery_information, assembly_information, stock_quantity,
  seo_title, seo_description, options, option_labels, art, promotion)
values ('luciole', 'Luciole', 'LUM-SUS-001', 'Une constellation de petites lumières portées par de fines branches de métal.', 'Luciole déploie autour d’un anneau ou d’une barre de métal une ramure de tiges fines, chacune terminée par une petite source lumineuse sous un diffuseur en acrylique. Allumée, elle évoque un essaim de lucioles suspendu au-dessus de la pièce ; éteinte, un dessin graphique et végétal.

La couronne s’installe au-dessus d’un salon ou au centre d’une pièce de vie ; la version linéaire accompagne une table de salle à manger ou un îlot. Sept tailles, de 30 à 162 lumières, pour s’accorder au volume.

Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.',
  18000, null,
  (select id from public.categories where slug = 'suspensions'),
  'published', true, '{}'::jsonb, null,
  array['Métal', 'Acrylique']::text[], '{}'::text[], '[{"label":"Sources lumineuses","value":"LED, de 30 à 162 selon la version ; sources remplaçables"},{"label":"Diffuseurs","value":"Acrylique"},{"label":"Hauteur du luminaire","value":"35 cm"},{"label":"Suspension","value":"Câbles réglables jusqu’à 1,5 m"},{"label":"Formes","value":"Couronne (Ø50 à Ø125 cm) ou linéaire (100 cm)"},{"label":"Couleurs de structure","value":"Or champagne, or rose, sable doré ou noir"},{"label":"Couleur de lumière","value":"Blanc chaud ou blanc froid"}]'::jsonb,
  null, 'Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée. Les branches se positionnent à la main lors de l’installation.', 0,
  'Luciole — suspension design à branches lumineuses', 'Suspension design en couronne ou linéaire : fines branches de métal et petites sources LED sous diffuseurs acryliques. Sept tailles, de 30 à 162 lumières.', '[{"id":"structure","label":"Couleur de la structure","values":[{"id":"or-champagne","label":"Or champagne"},{"id":"or-rose","label":"Or rose"},{"id":"sable-dore","label":"Sable doré"},{"id":"noir","label":"Noir"}]},{"id":"lumiere","label":"Couleur de lumière","values":[{"id":"chaud","label":"Blanc chaud"},{"id":"froid","label":"Blanc froid"}]}]'::jsonb,
  '{"group":"Forme","variant":"Taille"}'::jsonb, 'organic',
  null)
on conflict (reference) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-001'), 'Ø50 cm', 'LUM-SUS-001-C50', 'Couronne', 0,
  0, true, '30 lumières · hauteur du luminaire 35 cm · suspension réglable jusqu’à 1,5 m · pièce de 10 à 15 m²', '/products/luciole/ambiance-couronne.webp', '{"or-champagne-chaud":"/products/luciole/rendu-c50-or-champagne-chaud.webp","or-champagne-froid":"/products/luciole/rendu-c50-or-champagne-froid.webp","or-rose-chaud":"/products/luciole/rendu-c50-or-rose-chaud.webp","or-rose-froid":"/products/luciole/rendu-c50-or-rose-froid.webp","sable-dore-chaud":"/products/luciole/rendu-c50-sable-dore-chaud.webp","sable-dore-froid":"/products/luciole/rendu-c50-sable-dore-froid.webp","noir-chaud":"/products/luciole/rendu-c50-noir-chaud.webp","noir-froid":"/products/luciole/rendu-c50-noir-froid.webp"}'::jsonb, 0)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-001'), 'Ø60 cm', 'LUM-SUS-001-C60', 'Couronne', 29000,
  0, true, '81 lumières · hauteur du luminaire 35 cm · suspension réglable jusqu’à 1,5 m · pièce de 18 à 20 m²', '/products/luciole/ambiance-couronne.webp', '{"or-champagne-chaud":"/products/luciole/rendu-c60-or-champagne-chaud.webp","or-champagne-froid":"/products/luciole/rendu-c60-or-champagne-froid.webp","or-rose-chaud":"/products/luciole/rendu-c60-or-rose-chaud.webp","or-rose-froid":"/products/luciole/rendu-c60-or-rose-froid.webp","sable-dore-chaud":"/products/luciole/rendu-c60-sable-dore-chaud.webp","sable-dore-froid":"/products/luciole/rendu-c60-sable-dore-froid.webp","noir-chaud":"/products/luciole/rendu-c60-noir-chaud.webp","noir-froid":"/products/luciole/rendu-c60-noir-froid.webp"}'::jsonb, 1)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-001'), 'Ø80 cm', 'LUM-SUS-001-C80', 'Couronne', 36000,
  0, true, '108 lumières · hauteur du luminaire 35 cm · suspension réglable jusqu’à 1,5 m · pièce de 20 à 25 m²', '/products/luciole/ambiance-couronne.webp', '{"or-champagne-chaud":"/products/luciole/rendu-c80-or-champagne-chaud.webp","or-champagne-froid":"/products/luciole/rendu-c80-or-champagne-froid.webp","or-rose-chaud":"/products/luciole/rendu-c80-or-rose-chaud.webp","or-rose-froid":"/products/luciole/rendu-c80-or-rose-froid.webp","sable-dore-chaud":"/products/luciole/rendu-c80-sable-dore-chaud.webp","sable-dore-froid":"/products/luciole/rendu-c80-sable-dore-froid.webp","noir-chaud":"/products/luciole/rendu-c80-noir-chaud.webp","noir-froid":"/products/luciole/rendu-c80-noir-froid.webp"}'::jsonb, 2)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-001'), 'Ø98 cm', 'LUM-SUS-001-C98', 'Couronne', 51000,
  0, true, '108 lumières · hauteur du luminaire 35 cm · suspension réglable jusqu’à 1,5 m · pièce de 20 à 25 m²', '/products/luciole/ambiance-couronne.webp', '{"or-champagne-chaud":"/products/luciole/rendu-c98-or-champagne-chaud.webp","or-champagne-froid":"/products/luciole/rendu-c98-or-champagne-froid.webp","or-rose-chaud":"/products/luciole/rendu-c98-or-rose-chaud.webp","or-rose-froid":"/products/luciole/rendu-c98-or-rose-froid.webp","sable-dore-chaud":"/products/luciole/rendu-c98-sable-dore-chaud.webp","sable-dore-froid":"/products/luciole/rendu-c98-sable-dore-froid.webp","noir-chaud":"/products/luciole/rendu-c98-noir-chaud.webp","noir-froid":"/products/luciole/rendu-c98-noir-froid.webp"}'::jsonb, 3)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-001'), 'Ø105 cm', 'LUM-SUS-001-C105', 'Couronne', 59000,
  0, true, '135 lumières · hauteur du luminaire 35 cm · suspension réglable jusqu’à 1,5 m · pièce de 25 à 30 m²', '/products/luciole/ambiance-couronne.webp', '{"or-champagne-chaud":"/products/luciole/rendu-c105-or-champagne-chaud.webp","or-champagne-froid":"/products/luciole/rendu-c105-or-champagne-froid.webp","or-rose-chaud":"/products/luciole/rendu-c105-or-rose-chaud.webp","or-rose-froid":"/products/luciole/rendu-c105-or-rose-froid.webp","sable-dore-chaud":"/products/luciole/rendu-c105-sable-dore-chaud.webp","sable-dore-froid":"/products/luciole/rendu-c105-sable-dore-froid.webp","noir-chaud":"/products/luciole/rendu-c105-noir-chaud.webp","noir-froid":"/products/luciole/rendu-c105-noir-froid.webp"}'::jsonb, 4)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-001'), 'Ø125 cm', 'LUM-SUS-001-C125', 'Couronne', 87000,
  0, true, '162 lumières · hauteur du luminaire 35 cm · suspension réglable jusqu’à 1,5 m · pièce de 30 à 35 m²', '/products/luciole/ambiance-couronne.webp', '{"or-champagne-chaud":"/products/luciole/rendu-c125-or-champagne-chaud.webp","or-champagne-froid":"/products/luciole/rendu-c125-or-champagne-froid.webp","or-rose-chaud":"/products/luciole/rendu-c125-or-rose-chaud.webp","or-rose-froid":"/products/luciole/rendu-c125-or-rose-froid.webp","sable-dore-chaud":"/products/luciole/rendu-c125-sable-dore-chaud.webp","sable-dore-froid":"/products/luciole/rendu-c125-sable-dore-froid.webp","noir-chaud":"/products/luciole/rendu-c125-noir-chaud.webp","noir-froid":"/products/luciole/rendu-c125-noir-froid.webp"}'::jsonb, 5)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-001'), 'L 100 cm', 'LUM-SUS-001-L100', 'Linéaire', 29000,
  0, true, '81 lumières · hauteur du luminaire 35 cm · suspension réglable jusqu’à 1,5 m · pièce de 18 à 20 m²', '/products/luciole/ambiance-lineaire.webp', '{"or-champagne-chaud":"/products/luciole/rendu-l100-or-champagne-chaud.webp","or-champagne-froid":"/products/luciole/rendu-l100-or-champagne-froid.webp","or-rose-chaud":"/products/luciole/rendu-l100-or-rose-chaud.webp","or-rose-froid":"/products/luciole/rendu-l100-or-rose-froid.webp","sable-dore-chaud":"/products/luciole/rendu-l100-sable-dore-chaud.webp","sable-dore-froid":"/products/luciole/rendu-l100-sable-dore-froid.webp","noir-chaud":"/products/luciole/rendu-l100-noir-chaud.webp","noir-froid":"/products/luciole/rendu-l100-noir-froid.webp"}'::jsonb, 6)
on conflict (sku) do nothing;
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-SUS-001'), '/products/luciole/ambiance-couronne.webp', 'Suspension Luciole en couronne, lumières sur fines branches, au-dessus d’un salon avec cheminée', 'Visuel d’ambiance du fabricant', 0,
  true and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-SUS-001') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-SUS-001') and storage_path = '/products/luciole/ambiance-couronne.webp');
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-SUS-001'), '/products/luciole/ambiance-lineaire.webp', 'Suspension Luciole linéaire au-dessus d’une table de salle à manger en marbre', 'Visuel d’ambiance du fabricant', 1,
  false and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-SUS-001') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-SUS-001') and storage_path = '/products/luciole/ambiance-lineaire.webp');

-- ════ Silhouette (LUM-APP-001) ════
insert into public.products (slug, name, reference, short_description, description, price,
  compare_at_price, category_id, status, featured, dimensions, weight, materials, finishes,
  technical_specifications, delivery_information, assembly_information, stock_quantity,
  seo_title, seo_description, options, option_labels, art, promotion)
values ('silhouette', 'Silhouette', 'LUM-APP-001', 'Un tableau lumineux : une sculpture en ombre portée, auréolée de lumière.', 'Silhouette tient à la fois de l’œuvre et du luminaire. Sur un fond texturé gris perle, une figure sculpturale se détache en noir profond ; un liseré de lumière LED court tout autour du cadre et dessine un halo doux sur le mur.

Pensée pour une entrée, un couloir, une tête de lit ou un pan de mur de salon, elle installe une atmosphère de galerie. Trois formats, cinq motifs, un cadre noir ou doré, une lumière chaude ou froide.

Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.',
  21000, null,
  (select id from public.categories where slug = 'appliques'),
  'published', true, '{}'::jsonb, null,
  '{}'::text[], array['Cadre noir', 'Cadre doré']::text[], '[{"label":"Type","value":"Applique murale / tableau lumineux LED"},{"label":"Formats","value":"40 × 80, 30 × 120 ou 40 × 140 cm"},{"label":"Couleur de lumière","value":"Blanc chaud (2700–3500 K) ou blanc froid (5500–7000 K)"},{"label":"Cadre","value":"Noir ou doré"},{"label":"Classe énergétique","value":"F, selon le fabricant"}]'::jsonb,
  null, 'Fixation murale. Le raccordement électrique doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée.', 0,
  'Silhouette — tableau lumineux LED, applique murale design', 'Tableau lumineux LED : figure sculpturale noire sur fond texturé, halo de lumière autour du cadre. Cinq motifs, cadre noir ou doré, lumière chaude ou froide.', '[{"id":"motif","label":"Motif","values":[{"id":"envol","label":"Envol"},{"id":"rendez-vous","label":"Rendez-vous"},{"id":"offrande","label":"Offrande"},{"id":"elan","label":"Élan"},{"id":"sous-la-pluie","label":"Sous la pluie"}]},{"id":"cadre","label":"Cadre","values":[{"id":"noir","label":"Noir"},{"id":"dore","label":"Doré"}]},{"id":"lumiere","label":"Couleur de lumière","values":[{"id":"chaud","label":"Blanc chaud"},{"id":"froid","label":"Blanc froid"}]}]'::jsonb,
  null, 'sconce',
  null)
on conflict (reference) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-APP-001'), '40 × 80 cm', 'LUM-APP-001-4080', null, 0,
  0, true, 'Tableau lumineux 40 × 80 cm · éclairage LED en périphérie du cadre', '/products/silhouette/motif-a.webp', '{"envol-noir-chaud":"/products/silhouette/motif-a.webp","envol-noir-froid":"/products/silhouette/motif-a.webp","envol-dore-chaud":"/products/silhouette/motif-a.webp","envol-dore-froid":"/products/silhouette/motif-a.webp","rendez-vous-noir-chaud":"/products/silhouette/motif-b.webp","rendez-vous-noir-froid":"/products/silhouette/motif-b.webp","rendez-vous-dore-chaud":"/products/silhouette/motif-b.webp","rendez-vous-dore-froid":"/products/silhouette/motif-b.webp","offrande-noir-chaud":"/products/silhouette/motif-c.webp","offrande-noir-froid":"/products/silhouette/motif-c.webp","offrande-dore-chaud":"/products/silhouette/motif-c.webp","offrande-dore-froid":"/products/silhouette/motif-c.webp","elan-noir-chaud":"/products/silhouette/motif-d.webp","elan-noir-froid":"/products/silhouette/motif-d.webp","elan-dore-chaud":"/products/silhouette/motif-d.webp","elan-dore-froid":"/products/silhouette/motif-d.webp","sous-la-pluie-noir-chaud":"/products/silhouette/motif-e.webp","sous-la-pluie-noir-froid":"/products/silhouette/motif-e.webp","sous-la-pluie-dore-chaud":"/products/silhouette/motif-e.webp","sous-la-pluie-dore-froid":"/products/silhouette/motif-e.webp"}'::jsonb, 0)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-APP-001'), '30 × 120 cm', 'LUM-APP-001-30120', null, 0,
  0, true, 'Tableau lumineux 30 × 120 cm · éclairage LED en périphérie du cadre', '/products/silhouette/motif-a.webp', '{"envol-noir-chaud":"/products/silhouette/motif-a.webp","envol-noir-froid":"/products/silhouette/motif-a.webp","envol-dore-chaud":"/products/silhouette/motif-a.webp","envol-dore-froid":"/products/silhouette/motif-a.webp","rendez-vous-noir-chaud":"/products/silhouette/motif-b.webp","rendez-vous-noir-froid":"/products/silhouette/motif-b.webp","rendez-vous-dore-chaud":"/products/silhouette/motif-b.webp","rendez-vous-dore-froid":"/products/silhouette/motif-b.webp","offrande-noir-chaud":"/products/silhouette/motif-c.webp","offrande-noir-froid":"/products/silhouette/motif-c.webp","offrande-dore-chaud":"/products/silhouette/motif-c.webp","offrande-dore-froid":"/products/silhouette/motif-c.webp","elan-noir-chaud":"/products/silhouette/motif-d.webp","elan-noir-froid":"/products/silhouette/motif-d.webp","elan-dore-chaud":"/products/silhouette/motif-d.webp","elan-dore-froid":"/products/silhouette/motif-d.webp","sous-la-pluie-noir-chaud":"/products/silhouette/motif-e.webp","sous-la-pluie-noir-froid":"/products/silhouette/motif-e.webp","sous-la-pluie-dore-chaud":"/products/silhouette/motif-e.webp","sous-la-pluie-dore-froid":"/products/silhouette/motif-e.webp"}'::jsonb, 1)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-APP-001'), '40 × 140 cm', 'LUM-APP-001-40140', null, 9000,
  0, true, 'Tableau lumineux 40 × 140 cm · éclairage LED en périphérie du cadre', '/products/silhouette/motif-a.webp', '{"envol-noir-chaud":"/products/silhouette/motif-a.webp","envol-noir-froid":"/products/silhouette/motif-a.webp","envol-dore-chaud":"/products/silhouette/motif-a.webp","envol-dore-froid":"/products/silhouette/motif-a.webp","rendez-vous-noir-chaud":"/products/silhouette/motif-b.webp","rendez-vous-noir-froid":"/products/silhouette/motif-b.webp","rendez-vous-dore-chaud":"/products/silhouette/motif-b.webp","rendez-vous-dore-froid":"/products/silhouette/motif-b.webp","offrande-noir-chaud":"/products/silhouette/motif-c.webp","offrande-noir-froid":"/products/silhouette/motif-c.webp","offrande-dore-chaud":"/products/silhouette/motif-c.webp","offrande-dore-froid":"/products/silhouette/motif-c.webp","elan-noir-chaud":"/products/silhouette/motif-d.webp","elan-noir-froid":"/products/silhouette/motif-d.webp","elan-dore-chaud":"/products/silhouette/motif-d.webp","elan-dore-froid":"/products/silhouette/motif-d.webp","sous-la-pluie-noir-chaud":"/products/silhouette/motif-e.webp","sous-la-pluie-noir-froid":"/products/silhouette/motif-e.webp","sous-la-pluie-dore-chaud":"/products/silhouette/motif-e.webp","sous-la-pluie-dore-froid":"/products/silhouette/motif-e.webp"}'::jsonb, 2)
on conflict (sku) do nothing;
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-APP-001'), '/products/silhouette/ambiance.webp', 'Tableau lumineux Silhouette, figure sculpturale noire dans un cadre éclairé, au fond d’un couloir sombre', 'Visuel d’ambiance du fabricant', 0,
  true and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-APP-001') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-APP-001') and storage_path = '/products/silhouette/ambiance.webp');
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-APP-001'), '/products/silhouette/composition.webp', 'Vue éclatée de Silhouette : panneau arrière, cadre, œuvre imprimée et ruban lumineux LED', 'Composition — visualisation 3D', 1,
  false and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-APP-001') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-APP-001') and storage_path = '/products/silhouette/composition.webp');

-- ════ Nébuleuse (LUM-LUS-002) ════
insert into public.products (slug, name, reference, short_description, description, price,
  compare_at_price, category_id, status, featured, dimensions, weight, materials, finishes,
  technical_specifications, delivery_information, assembly_information, stock_quantity,
  seo_title, seo_description, options, option_labels, art, promotion)
values ('nebuleuse', 'Nébuleuse', 'LUM-LUS-002', 'Une cascade de sphères de verre où scintillent des centaines de micro-lumières.', 'Nébuleuse suspend dans le vide des sphères de verre teinté, chacune habitée d’un nuage de micro-LED. Allumée, chaque globe devient une petite galaxie ; ensemble, elles composent une constellation qui descend le long d’une cage d’escalier ou d’un séjour en double hauteur.

Sept compositions, de 8 à 30 sphères, avec suspensions réglables jusqu’à 5 m. Verre cognac ou gris fumé, pavillon argenté, doré ou noir, et trois températures de lumière.

Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.',
  29000, null,
  (select id from public.categories where slug = 'lustres'),
  'published', true, '{}'::jsonb, null,
  array['Verre', 'Métal']::text[], array['Argenté', 'Doré', 'Noir']::text[], '[{"label":"Sources lumineuses","value":"Micro-LED intégrées dans chaque sphère"},{"label":"Puissance","value":"De 48 W (8 sphères) à 180 W (30 sphères)"},{"label":"Verre","value":"Cognac ou gris fumé"},{"label":"Pavillon","value":"Rond, Ø40 à Ø60 cm selon la version ; argenté, doré ou noir"},{"label":"Couleur de lumière","value":"Blanc chaud 3000 K, neutre 4000 K ou froid 5500 K"},{"label":"Classe énergétique","value":"A, selon le fabricant"}]'::jsonb,
  null, 'Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est vivement recommandée pour une pièce de grande hauteur. La longueur de chaque câble se règle à l’installation.', 0,
  'Nébuleuse — lustre cascade en sphères de verre à micro-LED', 'Lustre en cascade pour escalier et double hauteur : sphères de verre cognac ou gris fumé à micro-LED, de 8 à 30 sphères, suspension réglable jusqu’à 5 m.', '[{"id":"verre","label":"Couleur du verre","values":[{"id":"cognac","label":"Cognac"},{"id":"fume","label":"Gris fumé"}]},{"id":"pavillon","label":"Pavillon","values":[{"id":"dore","label":"Doré"},{"id":"argente","label":"Argenté"},{"id":"noir","label":"Noir"}]},{"id":"lumiere","label":"Couleur de lumière","values":[{"id":"chaud","label":"Blanc chaud"},{"id":"neutre","label":"Blanc neutre"},{"id":"froid","label":"Blanc froid"}]}]'::jsonb,
  null, 'cascade',
  null)
on conflict (reference) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-002'), '8 sphères', 'LUM-LUS-002-8', null, 0,
  0, true, 'Pavillon Ø40 cm · suspension réglable jusqu’à 1,8 m · 48 W · pièce de 15 à 20 m²', '/products/nebuleuse/version-8.webp', '{"cognac-dore-chaud":"/products/nebuleuse/rendu-8-cognac-dore-chaud.webp","cognac-dore-neutre":"/products/nebuleuse/rendu-8-cognac-dore-neutre.webp","cognac-dore-froid":"/products/nebuleuse/rendu-8-cognac-dore-froid.webp","cognac-argente-chaud":"/products/nebuleuse/rendu-8-cognac-argente-chaud.webp","cognac-argente-neutre":"/products/nebuleuse/rendu-8-cognac-argente-neutre.webp","cognac-argente-froid":"/products/nebuleuse/rendu-8-cognac-argente-froid.webp","cognac-noir-chaud":"/products/nebuleuse/rendu-8-cognac-noir-chaud.webp","cognac-noir-neutre":"/products/nebuleuse/rendu-8-cognac-noir-neutre.webp","cognac-noir-froid":"/products/nebuleuse/rendu-8-cognac-noir-froid.webp","fume-dore-chaud":"/products/nebuleuse/rendu-8-fume-dore-chaud.webp","fume-dore-neutre":"/products/nebuleuse/rendu-8-fume-dore-neutre.webp","fume-dore-froid":"/products/nebuleuse/rendu-8-fume-dore-froid.webp","fume-argente-chaud":"/products/nebuleuse/rendu-8-fume-argente-chaud.webp","fume-argente-neutre":"/products/nebuleuse/rendu-8-fume-argente-neutre.webp","fume-argente-froid":"/products/nebuleuse/rendu-8-fume-argente-froid.webp","fume-noir-chaud":"/products/nebuleuse/rendu-8-fume-noir-chaud.webp","fume-noir-neutre":"/products/nebuleuse/rendu-8-fume-noir-neutre.webp","fume-noir-froid":"/products/nebuleuse/rendu-8-fume-noir-froid.webp"}'::jsonb, 0)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-002'), '10 sphères', 'LUM-LUS-002-10', null, 4000,
  0, true, 'Pavillon Ø50 cm · suspension réglable jusqu’à 2 m · 60 W · pièce de 20 à 25 m²', '/products/nebuleuse/version-10.webp', '{"cognac-dore-chaud":"/products/nebuleuse/rendu-10-cognac-dore-chaud.webp","cognac-dore-neutre":"/products/nebuleuse/rendu-10-cognac-dore-neutre.webp","cognac-dore-froid":"/products/nebuleuse/rendu-10-cognac-dore-froid.webp","cognac-argente-chaud":"/products/nebuleuse/rendu-10-cognac-argente-chaud.webp","cognac-argente-neutre":"/products/nebuleuse/rendu-10-cognac-argente-neutre.webp","cognac-argente-froid":"/products/nebuleuse/rendu-10-cognac-argente-froid.webp","cognac-noir-chaud":"/products/nebuleuse/rendu-10-cognac-noir-chaud.webp","cognac-noir-neutre":"/products/nebuleuse/rendu-10-cognac-noir-neutre.webp","cognac-noir-froid":"/products/nebuleuse/rendu-10-cognac-noir-froid.webp","fume-dore-chaud":"/products/nebuleuse/rendu-10-fume-dore-chaud.webp","fume-dore-neutre":"/products/nebuleuse/rendu-10-fume-dore-neutre.webp","fume-dore-froid":"/products/nebuleuse/rendu-10-fume-dore-froid.webp","fume-argente-chaud":"/products/nebuleuse/rendu-10-fume-argente-chaud.webp","fume-argente-neutre":"/products/nebuleuse/rendu-10-fume-argente-neutre.webp","fume-argente-froid":"/products/nebuleuse/rendu-10-fume-argente-froid.webp","fume-noir-chaud":"/products/nebuleuse/rendu-10-fume-noir-chaud.webp","fume-noir-neutre":"/products/nebuleuse/rendu-10-fume-noir-neutre.webp","fume-noir-froid":"/products/nebuleuse/rendu-10-fume-noir-froid.webp"}'::jsonb, 1)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-002'), '12 sphères', 'LUM-LUS-002-12', null, 10000,
  0, true, 'Pavillon Ø50 cm · suspension réglable jusqu’à 2,2 m · 60 W · pièce de 22 à 28 m²', '/products/nebuleuse/version-12.webp', '{"cognac-dore-chaud":"/products/nebuleuse/rendu-12-cognac-dore-chaud.webp","cognac-dore-neutre":"/products/nebuleuse/rendu-12-cognac-dore-neutre.webp","cognac-dore-froid":"/products/nebuleuse/rendu-12-cognac-dore-froid.webp","cognac-argente-chaud":"/products/nebuleuse/rendu-12-cognac-argente-chaud.webp","cognac-argente-neutre":"/products/nebuleuse/rendu-12-cognac-argente-neutre.webp","cognac-argente-froid":"/products/nebuleuse/rendu-12-cognac-argente-froid.webp","cognac-noir-chaud":"/products/nebuleuse/rendu-12-cognac-noir-chaud.webp","cognac-noir-neutre":"/products/nebuleuse/rendu-12-cognac-noir-neutre.webp","cognac-noir-froid":"/products/nebuleuse/rendu-12-cognac-noir-froid.webp","fume-dore-chaud":"/products/nebuleuse/rendu-12-fume-dore-chaud.webp","fume-dore-neutre":"/products/nebuleuse/rendu-12-fume-dore-neutre.webp","fume-dore-froid":"/products/nebuleuse/rendu-12-fume-dore-froid.webp","fume-argente-chaud":"/products/nebuleuse/rendu-12-fume-argente-chaud.webp","fume-argente-neutre":"/products/nebuleuse/rendu-12-fume-argente-neutre.webp","fume-argente-froid":"/products/nebuleuse/rendu-12-fume-argente-froid.webp","fume-noir-chaud":"/products/nebuleuse/rendu-12-fume-noir-chaud.webp","fume-noir-neutre":"/products/nebuleuse/rendu-12-fume-noir-neutre.webp","fume-noir-froid":"/products/nebuleuse/rendu-12-fume-noir-froid.webp"}'::jsonb, 2)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-002'), '15 sphères', 'LUM-LUS-002-15', null, 16000,
  0, true, 'Pavillon Ø60 cm · suspension réglable jusqu’à 2,5 m · 90 W · pièce de 25 à 30 m²', '/products/nebuleuse/version-15.webp', '{"cognac-dore-chaud":"/products/nebuleuse/rendu-15-cognac-dore-chaud.webp","cognac-dore-neutre":"/products/nebuleuse/rendu-15-cognac-dore-neutre.webp","cognac-dore-froid":"/products/nebuleuse/rendu-15-cognac-dore-froid.webp","cognac-argente-chaud":"/products/nebuleuse/rendu-15-cognac-argente-chaud.webp","cognac-argente-neutre":"/products/nebuleuse/rendu-15-cognac-argente-neutre.webp","cognac-argente-froid":"/products/nebuleuse/rendu-15-cognac-argente-froid.webp","cognac-noir-chaud":"/products/nebuleuse/rendu-15-cognac-noir-chaud.webp","cognac-noir-neutre":"/products/nebuleuse/rendu-15-cognac-noir-neutre.webp","cognac-noir-froid":"/products/nebuleuse/rendu-15-cognac-noir-froid.webp","fume-dore-chaud":"/products/nebuleuse/rendu-15-fume-dore-chaud.webp","fume-dore-neutre":"/products/nebuleuse/rendu-15-fume-dore-neutre.webp","fume-dore-froid":"/products/nebuleuse/rendu-15-fume-dore-froid.webp","fume-argente-chaud":"/products/nebuleuse/rendu-15-fume-argente-chaud.webp","fume-argente-neutre":"/products/nebuleuse/rendu-15-fume-argente-neutre.webp","fume-argente-froid":"/products/nebuleuse/rendu-15-fume-argente-froid.webp","fume-noir-chaud":"/products/nebuleuse/rendu-15-fume-noir-chaud.webp","fume-noir-neutre":"/products/nebuleuse/rendu-15-fume-noir-neutre.webp","fume-noir-froid":"/products/nebuleuse/rendu-15-fume-noir-froid.webp"}'::jsonb, 3)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-002'), '18 sphères', 'LUM-LUS-002-18', null, 22000,
  0, true, 'Pavillon Ø60 cm · suspension réglable jusqu’à 3 m · 110 W · pièce de 30 à 35 m²', '/products/nebuleuse/version-18.webp', '{"cognac-dore-chaud":"/products/nebuleuse/rendu-18-cognac-dore-chaud.webp","cognac-dore-neutre":"/products/nebuleuse/rendu-18-cognac-dore-neutre.webp","cognac-dore-froid":"/products/nebuleuse/rendu-18-cognac-dore-froid.webp","cognac-argente-chaud":"/products/nebuleuse/rendu-18-cognac-argente-chaud.webp","cognac-argente-neutre":"/products/nebuleuse/rendu-18-cognac-argente-neutre.webp","cognac-argente-froid":"/products/nebuleuse/rendu-18-cognac-argente-froid.webp","cognac-noir-chaud":"/products/nebuleuse/rendu-18-cognac-noir-chaud.webp","cognac-noir-neutre":"/products/nebuleuse/rendu-18-cognac-noir-neutre.webp","cognac-noir-froid":"/products/nebuleuse/rendu-18-cognac-noir-froid.webp","fume-dore-chaud":"/products/nebuleuse/rendu-18-fume-dore-chaud.webp","fume-dore-neutre":"/products/nebuleuse/rendu-18-fume-dore-neutre.webp","fume-dore-froid":"/products/nebuleuse/rendu-18-fume-dore-froid.webp","fume-argente-chaud":"/products/nebuleuse/rendu-18-fume-argente-chaud.webp","fume-argente-neutre":"/products/nebuleuse/rendu-18-fume-argente-neutre.webp","fume-argente-froid":"/products/nebuleuse/rendu-18-fume-argente-froid.webp","fume-noir-chaud":"/products/nebuleuse/rendu-18-fume-noir-chaud.webp","fume-noir-neutre":"/products/nebuleuse/rendu-18-fume-noir-neutre.webp","fume-noir-froid":"/products/nebuleuse/rendu-18-fume-noir-froid.webp"}'::jsonb, 4)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-002'), '24 sphères', 'LUM-LUS-002-24', null, 37000,
  0, true, 'Pavillon Ø60 cm · suspension réglable jusqu’à 4 m · 140 W · pièce de 35 à 40 m²', '/products/nebuleuse/version-24.webp', '{"cognac-dore-chaud":"/products/nebuleuse/rendu-24-cognac-dore-chaud.webp","cognac-dore-neutre":"/products/nebuleuse/rendu-24-cognac-dore-neutre.webp","cognac-dore-froid":"/products/nebuleuse/rendu-24-cognac-dore-froid.webp","cognac-argente-chaud":"/products/nebuleuse/rendu-24-cognac-argente-chaud.webp","cognac-argente-neutre":"/products/nebuleuse/rendu-24-cognac-argente-neutre.webp","cognac-argente-froid":"/products/nebuleuse/rendu-24-cognac-argente-froid.webp","cognac-noir-chaud":"/products/nebuleuse/rendu-24-cognac-noir-chaud.webp","cognac-noir-neutre":"/products/nebuleuse/rendu-24-cognac-noir-neutre.webp","cognac-noir-froid":"/products/nebuleuse/rendu-24-cognac-noir-froid.webp","fume-dore-chaud":"/products/nebuleuse/rendu-24-fume-dore-chaud.webp","fume-dore-neutre":"/products/nebuleuse/rendu-24-fume-dore-neutre.webp","fume-dore-froid":"/products/nebuleuse/rendu-24-fume-dore-froid.webp","fume-argente-chaud":"/products/nebuleuse/rendu-24-fume-argente-chaud.webp","fume-argente-neutre":"/products/nebuleuse/rendu-24-fume-argente-neutre.webp","fume-argente-froid":"/products/nebuleuse/rendu-24-fume-argente-froid.webp","fume-noir-chaud":"/products/nebuleuse/rendu-24-fume-noir-chaud.webp","fume-noir-neutre":"/products/nebuleuse/rendu-24-fume-noir-neutre.webp","fume-noir-froid":"/products/nebuleuse/rendu-24-fume-noir-froid.webp"}'::jsonb, 5)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-002'), '30 sphères', 'LUM-LUS-002-30', null, 47000,
  0, true, 'Pavillon Ø60 cm · suspension réglable jusqu’à 5 m · 180 W · pièce de 40 à 45 m²', '/products/nebuleuse/version-30.webp', '{"cognac-dore-chaud":"/products/nebuleuse/rendu-30-cognac-dore-chaud.webp","cognac-dore-neutre":"/products/nebuleuse/rendu-30-cognac-dore-neutre.webp","cognac-dore-froid":"/products/nebuleuse/rendu-30-cognac-dore-froid.webp","cognac-argente-chaud":"/products/nebuleuse/rendu-30-cognac-argente-chaud.webp","cognac-argente-neutre":"/products/nebuleuse/rendu-30-cognac-argente-neutre.webp","cognac-argente-froid":"/products/nebuleuse/rendu-30-cognac-argente-froid.webp","cognac-noir-chaud":"/products/nebuleuse/rendu-30-cognac-noir-chaud.webp","cognac-noir-neutre":"/products/nebuleuse/rendu-30-cognac-noir-neutre.webp","cognac-noir-froid":"/products/nebuleuse/rendu-30-cognac-noir-froid.webp","fume-dore-chaud":"/products/nebuleuse/rendu-30-fume-dore-chaud.webp","fume-dore-neutre":"/products/nebuleuse/rendu-30-fume-dore-neutre.webp","fume-dore-froid":"/products/nebuleuse/rendu-30-fume-dore-froid.webp","fume-argente-chaud":"/products/nebuleuse/rendu-30-fume-argente-chaud.webp","fume-argente-neutre":"/products/nebuleuse/rendu-30-fume-argente-neutre.webp","fume-argente-froid":"/products/nebuleuse/rendu-30-fume-argente-froid.webp","fume-noir-chaud":"/products/nebuleuse/rendu-30-fume-noir-chaud.webp","fume-noir-neutre":"/products/nebuleuse/rendu-30-fume-noir-neutre.webp","fume-noir-froid":"/products/nebuleuse/rendu-30-fume-noir-froid.webp"}'::jsonb, 6)
on conflict (sku) do nothing;
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-LUS-002'), '/products/nebuleuse/ambiance-escalier.webp', 'Lustre Nébuleuse, cascade de sphères de verre fumé lumineuses dans un escalier hélicoïdal en double hauteur', 'Visuel d’ambiance du fabricant', 0,
  true and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-LUS-002') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-LUS-002') and storage_path = '/products/nebuleuse/ambiance-escalier.webp');

-- ════ Aigrette (LUM-SUS-002) ════
insert into public.products (slug, name, reference, short_description, description, price,
  compare_at_price, category_id, status, featured, dimensions, weight, materials, finishes,
  technical_specifications, delivery_information, assembly_information, stock_quantity,
  seo_title, seo_description, options, option_labels, art, promotion)
values ('aigrette', 'Aigrette', 'LUM-SUS-002', 'Une boule de lumière rayonnante, hérissée de fines tiges perlées de cristal.', 'Aigrette emprunte sa silhouette à la fleur de pissenlit montée en graine : depuis un cœur de métal, des centaines de tiges fines rayonnent dans toutes les directions, chacune terminée par une petite ramure perlée de cristal. Allumée, la lumière des ampoules se démultiplie dans les cristaux et dessine un halo scintillant ; éteinte, elle reste une sculpture aérienne.

La version ronde, de Ø40 à Ø80 cm, s’installe au centre d’un salon, d’une chambre ou d’une entrée ; la version linéaire, de 72 ou 92 cm, accompagne une table de salle à manger ou un îlot. Finition dorée ou chromée, lumière blanc chaud, neutre ou froid, ou trois teintes commutables à l’interrupteur.

Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.',
  10000, null,
  (select id from public.categories where slug = 'suspensions'),
  'draft', false, '{}'::jsonb, null,
  array['Cristal', 'Métal']::text[], array['Doré', 'Chromé']::text[], '[{"label":"Sources lumineuses","value":"Ampoules LED fournies, culot G9 — de 8 à 16 selon la version"},{"label":"Tension d’entrée","value":"AC 90–260 V"},{"label":"Flux lumineux","value":"De 249 à 2 000 lm selon la version"},{"label":"Formes","value":"Ronde (Ø40, 50, 55, 60 ou 80 cm) ou linéaire (72 ou 92 cm, hauteur 40 cm)"},{"label":"Suspension","value":"Câble réglable jusqu’à 1,5 m"},{"label":"Finitions","value":"Doré ou chromé"},{"label":"Couleur de lumière","value":"Blanc chaud, blanc neutre, blanc froid, ou trois teintes commutables"},{"label":"Surface conseillée","value":"10 à 15 m², selon le fabricant"},{"label":"Garantie fabricant","value":"3 ans"}]'::jsonb,
  null, 'Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée. Les tiges se mettent en place à la main lors du montage.', 0,
  'Aigrette — suspension boule de cristal façon pissenlit', 'Suspension design en boule de tiges perlées de cristal, ronde de Ø40 à Ø80 cm ou linéaire. Finition dorée ou chromée, ampoules LED G9, lumière blanc chaud, neutre ou froid.', '[{"id":"finition","label":"Finition","values":[{"id":"dore","label":"Doré"},{"id":"chrome","label":"Chromé"}]},{"id":"lumiere","label":"Couleur de lumière","values":[{"id":"chaud","label":"Blanc chaud"},{"id":"neutre","label":"Blanc neutre"},{"id":"froid","label":"Blanc froid"},{"id":"commutable","label":"3 teintes commutables"}]}]'::jsonb,
  '{"group":"Forme","variant":"Taille"}'::jsonb, 'globes',
  null)
on conflict (reference) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-002'), 'Ø40 cm', 'LUM-SUS-002-R40', 'Ronde', 0,
  0, true, '8 ampoules G9 LED fournies · 31 éléments de cristal · suspension réglable jusqu’à 1,5 m', '/products/aigrette/ambiance-ronde.webp', '{"dore-chaud":"/products/aigrette/rendu-r40-dore-chaud.webp","dore-neutre":"/products/aigrette/rendu-r40-dore-neutre.webp","dore-froid":"/products/aigrette/rendu-r40-dore-froid.webp","dore-commutable":"/products/aigrette/rendu-r40-dore-neutre.webp","chrome-chaud":"/products/aigrette/rendu-r40-chrome-chaud.webp","chrome-neutre":"/products/aigrette/rendu-r40-chrome-neutre.webp","chrome-froid":"/products/aigrette/rendu-r40-chrome-froid.webp","chrome-commutable":"/products/aigrette/rendu-r40-chrome-neutre.webp"}'::jsonb, 0)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-002'), 'Ø50 cm', 'LUM-SUS-002-R50', 'Ronde', 5000,
  0, true, '9 ampoules G9 LED fournies · 60 éléments de cristal · suspension réglable jusqu’à 1,5 m', '/products/aigrette/ambiance-ronde.webp', '{"dore-chaud":"/products/aigrette/rendu-r50-dore-chaud.webp","dore-neutre":"/products/aigrette/rendu-r50-dore-neutre.webp","dore-froid":"/products/aigrette/rendu-r50-dore-froid.webp","dore-commutable":"/products/aigrette/rendu-r50-dore-neutre.webp","chrome-chaud":"/products/aigrette/rendu-r50-chrome-chaud.webp","chrome-neutre":"/products/aigrette/rendu-r50-chrome-neutre.webp","chrome-froid":"/products/aigrette/rendu-r50-chrome-froid.webp","chrome-commutable":"/products/aigrette/rendu-r50-chrome-neutre.webp"}'::jsonb, 1)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-002'), 'Ø55 cm', 'LUM-SUS-002-R55', 'Ronde', 10000,
  0, true, '12 ampoules G9 LED fournies · 76 éléments de cristal · suspension réglable jusqu’à 1,5 m', '/products/aigrette/ambiance-ronde.webp', '{"dore-chaud":"/products/aigrette/rendu-r55-dore-chaud.webp","dore-neutre":"/products/aigrette/rendu-r55-dore-neutre.webp","dore-froid":"/products/aigrette/rendu-r55-dore-froid.webp","dore-commutable":"/products/aigrette/rendu-r55-dore-neutre.webp","chrome-chaud":"/products/aigrette/rendu-r55-chrome-chaud.webp","chrome-neutre":"/products/aigrette/rendu-r55-chrome-neutre.webp","chrome-froid":"/products/aigrette/rendu-r55-chrome-froid.webp","chrome-commutable":"/products/aigrette/rendu-r55-chrome-neutre.webp"}'::jsonb, 2)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-002'), 'Ø60 cm', 'LUM-SUS-002-R60', 'Ronde', 20000,
  0, true, '16 ampoules G9 LED fournies · 140 éléments de cristal · suspension réglable jusqu’à 1,5 m', '/products/aigrette/ambiance-ronde.webp', '{"dore-chaud":"/products/aigrette/rendu-r60-dore-chaud.webp","dore-neutre":"/products/aigrette/rendu-r60-dore-neutre.webp","dore-froid":"/products/aigrette/rendu-r60-dore-froid.webp","dore-commutable":"/products/aigrette/rendu-r60-dore-neutre.webp","chrome-chaud":"/products/aigrette/rendu-r60-chrome-chaud.webp","chrome-neutre":"/products/aigrette/rendu-r60-chrome-neutre.webp","chrome-froid":"/products/aigrette/rendu-r60-chrome-froid.webp","chrome-commutable":"/products/aigrette/rendu-r60-chrome-neutre.webp"}'::jsonb, 3)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-002'), 'Ø80 cm', 'LUM-SUS-002-R80', 'Ronde', 27000,
  0, true, '16 ampoules G9 LED fournies · 140 éléments de cristal · suspension réglable jusqu’à 1,5 m', '/products/aigrette/ambiance-ronde.webp', '{"dore-chaud":"/products/aigrette/rendu-r80-dore-chaud.webp","dore-neutre":"/products/aigrette/rendu-r80-dore-neutre.webp","dore-froid":"/products/aigrette/rendu-r80-dore-froid.webp","dore-commutable":"/products/aigrette/rendu-r80-dore-neutre.webp","chrome-chaud":"/products/aigrette/rendu-r80-chrome-chaud.webp","chrome-neutre":"/products/aigrette/rendu-r80-chrome-neutre.webp","chrome-froid":"/products/aigrette/rendu-r80-chrome-froid.webp","chrome-commutable":"/products/aigrette/rendu-r80-chrome-neutre.webp"}'::jsonb, 4)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-002'), 'L 72 cm', 'LUM-SUS-002-L72', 'Linéaire', 9000,
  0, true, '9 ampoules G9 LED fournies · 63 éléments de cristal · hauteur 40 cm · pavillon 50 cm · suspension réglable jusqu’à 1,5 m', '/products/aigrette/ambiance-lineaire.webp', '{"dore-chaud":"/products/aigrette/rendu-l72-dore-chaud.webp","dore-neutre":"/products/aigrette/rendu-l72-dore-neutre.webp","dore-froid":"/products/aigrette/rendu-l72-dore-froid.webp","dore-commutable":"/products/aigrette/rendu-l72-dore-neutre.webp","chrome-chaud":"/products/aigrette/rendu-l72-chrome-chaud.webp","chrome-neutre":"/products/aigrette/rendu-l72-chrome-neutre.webp","chrome-froid":"/products/aigrette/rendu-l72-chrome-froid.webp","chrome-commutable":"/products/aigrette/rendu-l72-chrome-neutre.webp"}'::jsonb, 5)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-002'), 'L 92 cm', 'LUM-SUS-002-L92', 'Linéaire', 12000,
  0, true, '12 ampoules G9 LED fournies · 83 éléments de cristal · hauteur 40 cm · pavillon 50 cm · suspension réglable jusqu’à 1,5 m', '/products/aigrette/ambiance-lineaire.webp', '{"dore-chaud":"/products/aigrette/rendu-l92-dore-chaud.webp","dore-neutre":"/products/aigrette/rendu-l92-dore-neutre.webp","dore-froid":"/products/aigrette/rendu-l92-dore-froid.webp","dore-commutable":"/products/aigrette/rendu-l92-dore-neutre.webp","chrome-chaud":"/products/aigrette/rendu-l92-chrome-chaud.webp","chrome-neutre":"/products/aigrette/rendu-l92-chrome-neutre.webp","chrome-froid":"/products/aigrette/rendu-l92-chrome-froid.webp","chrome-commutable":"/products/aigrette/rendu-l92-chrome-neutre.webp"}'::jsonb, 6)
on conflict (sku) do nothing;
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-SUS-002'), '/products/aigrette/ambiance-ronde.webp', 'Suspension Aigrette ronde dorée, boule de tiges perlées de cristal allumée dans un salon aux murs gris', 'Photographie d’ambiance du fabricant', 0,
  true and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-SUS-002') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-SUS-002') and storage_path = '/products/aigrette/ambiance-ronde.webp');
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-SUS-002'), '/products/aigrette/ambiance-lineaire.webp', 'Suspension Aigrette linéaire dorée au-dessus d’une table de salle à manger en bois', 'Photographie d’ambiance du fabricant', 1,
  false and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-SUS-002') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-SUS-002') and storage_path = '/products/aigrette/ambiance-lineaire.webp');

-- ════ Sylve (LUM-LUS-003) ════
insert into public.products (slug, name, reference, short_description, description, price,
  compare_at_price, category_id, status, featured, dimensions, weight, materials, finishes,
  technical_specifications, delivery_information, assembly_information, stock_quantity,
  seo_title, seo_description, options, option_labels, art, promotion)
values ('sylve', 'Sylve', 'LUM-LUS-003', 'Une ramure de métal noir, hérissée de pointes et ponctuée de lumières sous verre.', 'Sylve réinterprète la branche comme une architecture : un réseau organique de rameaux en métal noir mat, aux jonctions fondues comme celles d’un arbre, hérissé de tiges effilées et ponctué de petites ampoules LED sous tube de verre. Allumée, elle diffuse une lumière douce qui révèle ses ombres portées ; éteinte, elle reste une sculpture graphique.

Pensée pour les grands volumes, elle se décline en six longueurs, de 120 cm (10 lumières) à 450 cm (45 lumières), toutes larges de 65 cm : au-dessus d’une table de salle à manger ou d’un îlot, dans un séjour, un hall d’entrée ou une cage d’escalier. Les câbles de suspension se règlent en hauteur.

Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.',
  69000, null,
  (select id from public.categories where slug = 'lustres'),
  'draft', false, '{}'::jsonb, null,
  array['Métal', 'Verre']::text[], array['Noir mat']::text[], '[{"label":"Sources lumineuses","value":"Ampoules LED fournies, culot E14 — de 10 à 45 selon la longueur"},{"label":"Diffuseurs","value":"Tubes de verre"},{"label":"Dimensions","value":"Longueur 120, 150, 185, 230, 310 ou 450 cm × largeur 65 cm"},{"label":"Suspension","value":"2 à 5 câbles réglables selon la longueur"},{"label":"Tension d’entrée","value":"AC 90–260 V"},{"label":"Finition","value":"Métal noir mat"},{"label":"Couleur de lumière","value":"Blanc chaud 3000 K ou blanc froid 6000 K, fixe ou variable"},{"label":"Garantie annoncée","value":"3 ans"}]'::jsonb,
  null, 'Installation au plafond, avec plusieurs points de fixation selon la longueur. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est vivement recommandée. Indiquez la hauteur sous plafond pour régler la longueur des câbles.', 0,
  'Sylve — lustre branches en métal noir, grande longueur', 'Lustre design en ramure de métal noir mat et lumières LED sous verre, de 120 à 450 cm de long. Pour table de salle à manger, séjour et grands volumes.', '[{"id":"lumiere","label":"Couleur de lumière","values":[{"id":"chaud","label":"Blanc chaud"},{"id":"froid","label":"Blanc froid"},{"id":"chaud-variable","label":"Blanc chaud, variable"},{"id":"froid-variable","label":"Blanc froid, variable"}]}]'::jsonb,
  null, 'organic',
  null)
on conflict (reference) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-003'), 'L 120 cm', 'LUM-LUS-003-L120', null, 0,
  0, true, '10 ampoules LED E14 fournies · 120 × 65 cm · 2 câbles de suspension réglables · pièce de 10 à 15 m²', '/products/sylve/rendu-l120-chaud.webp', '{"chaud":"/products/sylve/rendu-l120-chaud.webp","chaud-variable":"/products/sylve/rendu-l120-chaud.webp","froid":"/products/sylve/rendu-l120-froid.webp","froid-variable":"/products/sylve/rendu-l120-froid.webp"}'::jsonb, 0)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-003'), 'L 150 cm', 'LUM-LUS-003-L150', null, 13000,
  0, true, '12 ampoules LED E14 fournies · 150 × 65 cm · 2 câbles de suspension réglables · pièce de 12 à 18 m²', '/products/sylve/rendu-l150-chaud.webp', '{"chaud":"/products/sylve/rendu-l150-chaud.webp","chaud-variable":"/products/sylve/rendu-l150-chaud.webp","froid":"/products/sylve/rendu-l150-froid.webp","froid-variable":"/products/sylve/rendu-l150-froid.webp"}'::jsonb, 1)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-003'), 'L 185 cm', 'LUM-LUS-003-L185', null, 23000,
  0, true, '18 ampoules LED E14 fournies · 185 × 65 cm · 2 câbles de suspension réglables · pièce de 15 à 20 m²', '/products/sylve/rendu-l185-chaud.webp', '{"chaud":"/products/sylve/rendu-l185-chaud.webp","chaud-variable":"/products/sylve/rendu-l185-chaud.webp","froid":"/products/sylve/rendu-l185-froid.webp","froid-variable":"/products/sylve/rendu-l185-froid.webp"}'::jsonb, 2)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-003'), 'L 230 cm', 'LUM-LUS-003-L230', null, 40000,
  0, true, '22 ampoules LED E14 fournies · 230 × 65 cm · 3 câbles de suspension réglables · pièce de 18 à 22 m²', '/products/sylve/rendu-l230-chaud.webp', '{"chaud":"/products/sylve/rendu-l230-chaud.webp","chaud-variable":"/products/sylve/rendu-l230-chaud.webp","froid":"/products/sylve/rendu-l230-froid.webp","froid-variable":"/products/sylve/rendu-l230-froid.webp"}'::jsonb, 3)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-003'), 'L 310 cm', 'LUM-LUS-003-L310', null, 70000,
  0, true, '30 ampoules LED E14 fournies · 310 × 65 cm · 3 câbles de suspension réglables · pièce de 20 à 25 m²', '/products/sylve/rendu-l310-chaud.webp', '{"chaud":"/products/sylve/rendu-l310-chaud.webp","chaud-variable":"/products/sylve/rendu-l310-chaud.webp","froid":"/products/sylve/rendu-l310-froid.webp","froid-variable":"/products/sylve/rendu-l310-froid.webp"}'::jsonb, 4)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-003'), 'L 450 cm', 'LUM-LUS-003-L450', null, 133000,
  0, true, '45 ampoules LED E14 fournies · 450 × 65 cm · 5 câbles de suspension réglables · pièce de 22 à 28 m²', '/products/sylve/rendu-l450-chaud.webp', '{"chaud":"/products/sylve/rendu-l450-chaud.webp","chaud-variable":"/products/sylve/rendu-l450-chaud.webp","froid":"/products/sylve/rendu-l450-froid.webp","froid-variable":"/products/sylve/rendu-l450-froid.webp"}'::jsonb, 5)
on conflict (sku) do nothing;
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-LUS-003'), '/products/sylve/ambiance-table.webp', 'Lustre Sylve, ramure de métal noir et lumières sous verre, au-dessus d’une table en marbre', 'Visuel d’ambiance du fabricant', 0,
  true and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-LUS-003') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-LUS-003') and storage_path = '/products/sylve/ambiance-table.webp');
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-LUS-003'), '/products/sylve/ambiance-fenetres.webp', 'Lustre Sylve vu de près devant des fenêtres en arcade, branches noires hérissées de pointes', 'Visuel d’ambiance du fabricant', 1,
  false and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-LUS-003') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-LUS-003') and storage_path = '/products/sylve/ambiance-fenetres.webp');

-- ════ Constellation (LUM-SUS-003) ════
insert into public.products (slug, name, reference, short_description, description, price,
  compare_at_price, category_id, status, featured, dimensions, weight, materials, finishes,
  technical_specifications, delivery_information, assembly_information, stock_quantity,
  seo_title, seo_description, options, option_labels, art, promotion)
values ('constellation', 'Constellation', 'LUM-SUS-003', 'Une fine branche de métal portant des globes de verre où scintille un ciel de micro-lumières.', 'Constellation pose sur une fine branche de métal une suite de globes de verre clair, de trois diamètres, placés au-dessus, au-dessous ou au fil de la ligne. Dans chacun, un fil de cuivre semé de micro-LED dessine un ciel étoilé ; au centre, une perle dorée marque l’axe de la composition.

La branche se décline en arc, qui s’élève doucement vers son centre, ou en ligne droite, avec six globes sur 75 cm ou huit globes sur 100 cm. Elle accompagne une table de salle à manger, un îlot ou un séjour. Finition dorée ou noire, lumière blanc chaud ou blanc froid, et une version à intensité variable, réglable à la télécommande.

Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.',
  21000, null,
  (select id from public.categories where slug = 'suspensions'),
  'published', false, '{}'::jsonb, null,
  array['Verre', 'Métal']::text[], array['Doré', 'Noir']::text[], '[{"label":"Sources lumineuses","value":"Micro-LED intégrées sur fil de cuivre, dans chaque globe"},{"label":"Puissance","value":"36 W (6 têtes) · 48 W (8 têtes)"},{"label":"Tension d’entrée","value":"AC 90–265 V"},{"label":"Globes","value":"Verre clair, Ø10, Ø12 et Ø15 cm"},{"label":"Formes","value":"Branche en arc ou droite, 75 cm (6 têtes) ou 100 cm (8 têtes)"},{"label":"Pavillon","value":"50 × 8 × 3,5 cm"},{"label":"Suspension","value":"Câbles réglables, hauteur jusqu’à 120 cm"},{"label":"Finitions","value":"Doré ou noir (perle centrale dorée)"},{"label":"Couleur de lumière","value":"Blanc chaud ou blanc froid"},{"label":"Commande","value":"Interrupteur ; ou télécommande, intensité variable (versions « télécommande »)"},{"label":"Matières","value":"Fer, verre"},{"label":"Surface conseillée","value":"10 à 30 m², selon le fabricant"},{"label":"Classe énergétique","value":"F, selon le fabricant"}]'::jsonb,
  null, 'Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée. La hauteur se règle par les câbles, jusqu’à 120 cm.', 0,
  'Constellation — suspension globes de verre étoilés, dorée ou noire', 'Suspension design : globes de verre clair à micro-LED étoilées sur une branche en arc ou droite, 75 ou 100 cm. Finition dorée ou noire, lumière chaude ou froide, version variable à la télécommande.', '[{"id":"finition","label":"Finition","values":[{"id":"dore","label":"Doré"},{"id":"noir","label":"Noir"}]},{"id":"lumiere","label":"Couleur de lumière","values":[{"id":"chaud","label":"Blanc chaud"},{"id":"froid","label":"Blanc froid"}]}]'::jsonb,
  '{"group":"Forme","variant":"Taille"}'::jsonb, 'globes',
  null)
on conflict (reference) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-003'), '6 têtes · 75 cm', 'LUM-SUS-003-A6', 'Arc', 0,
  0, true, '6 globes de verre Ø10 à Ø15 cm · 36 W · longueur 75 cm · suspension réglable jusqu’à 120 cm · allumage à l’interrupteur', '/products/constellation/rendu-a6-dore-chaud.webp', '{"dore-chaud":"/products/constellation/rendu-a6-dore-chaud.webp","dore-froid":"/products/constellation/rendu-a6-dore-froid.webp","noir-chaud":"/products/constellation/rendu-a6-noir-chaud.webp","noir-froid":"/products/constellation/rendu-a6-noir-froid.webp"}'::jsonb, 0)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-003'), '6 têtes · 75 cm · télécommande', 'LUM-SUS-003-A6-TC', 'Arc', 1000,
  0, true, '6 globes de verre Ø10 à Ø15 cm · 36 W · longueur 75 cm · suspension réglable jusqu’à 120 cm · intensité variable à la télécommande', '/products/constellation/rendu-a6-dore-chaud.webp', '{"dore-chaud":"/products/constellation/rendu-a6-dore-chaud.webp","dore-froid":"/products/constellation/rendu-a6-dore-froid.webp","noir-chaud":"/products/constellation/rendu-a6-noir-chaud.webp","noir-froid":"/products/constellation/rendu-a6-noir-froid.webp"}'::jsonb, 1)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-003'), '8 têtes · 100 cm', 'LUM-SUS-003-A8', 'Arc', 5000,
  0, true, '8 globes de verre Ø10 à Ø15 cm · 48 W · longueur 100 cm · suspension réglable jusqu’à 120 cm · allumage à l’interrupteur', '/products/constellation/rendu-a8-dore-chaud.webp', '{"dore-chaud":"/products/constellation/rendu-a8-dore-chaud.webp","dore-froid":"/products/constellation/rendu-a8-dore-froid.webp","noir-chaud":"/products/constellation/rendu-a8-noir-chaud.webp","noir-froid":"/products/constellation/rendu-a8-noir-froid.webp"}'::jsonb, 2)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-003'), '8 têtes · 100 cm · télécommande', 'LUM-SUS-003-A8-TC', 'Arc', 6000,
  0, true, '8 globes de verre Ø10 à Ø15 cm · 48 W · longueur 100 cm · suspension réglable jusqu’à 120 cm · intensité variable à la télécommande', '/products/constellation/rendu-a8-dore-chaud.webp', '{"dore-chaud":"/products/constellation/rendu-a8-dore-chaud.webp","dore-froid":"/products/constellation/rendu-a8-dore-froid.webp","noir-chaud":"/products/constellation/rendu-a8-noir-chaud.webp","noir-froid":"/products/constellation/rendu-a8-noir-froid.webp"}'::jsonb, 3)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-003'), '6 têtes · 75 cm', 'LUM-SUS-003-D6', 'Droite', 0,
  0, true, '6 globes de verre Ø10 à Ø15 cm · 36 W · longueur 75 cm · suspension réglable jusqu’à 120 cm · allumage à l’interrupteur', '/products/constellation/rendu-d6-dore-chaud.webp', '{"dore-chaud":"/products/constellation/rendu-d6-dore-chaud.webp","dore-froid":"/products/constellation/rendu-d6-dore-froid.webp","noir-chaud":"/products/constellation/rendu-d6-noir-chaud.webp","noir-froid":"/products/constellation/rendu-d6-noir-froid.webp"}'::jsonb, 4)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-003'), '6 têtes · 75 cm · télécommande', 'LUM-SUS-003-D6-TC', 'Droite', 1000,
  0, true, '6 globes de verre Ø10 à Ø15 cm · 36 W · longueur 75 cm · suspension réglable jusqu’à 120 cm · intensité variable à la télécommande', '/products/constellation/rendu-d6-dore-chaud.webp', '{"dore-chaud":"/products/constellation/rendu-d6-dore-chaud.webp","dore-froid":"/products/constellation/rendu-d6-dore-froid.webp","noir-chaud":"/products/constellation/rendu-d6-noir-chaud.webp","noir-froid":"/products/constellation/rendu-d6-noir-froid.webp"}'::jsonb, 5)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-003'), '8 têtes · 100 cm', 'LUM-SUS-003-D8', 'Droite', 5000,
  0, true, '8 globes de verre Ø10 à Ø15 cm · 48 W · longueur 100 cm · suspension réglable jusqu’à 120 cm · allumage à l’interrupteur', '/products/constellation/rendu-d8-dore-chaud.webp', '{"dore-chaud":"/products/constellation/rendu-d8-dore-chaud.webp","dore-froid":"/products/constellation/rendu-d8-dore-froid.webp","noir-chaud":"/products/constellation/rendu-d8-noir-chaud.webp","noir-froid":"/products/constellation/rendu-d8-noir-froid.webp"}'::jsonb, 6)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-SUS-003'), '8 têtes · 100 cm · télécommande', 'LUM-SUS-003-D8-TC', 'Droite', 6000,
  0, true, '8 globes de verre Ø10 à Ø15 cm · 48 W · longueur 100 cm · suspension réglable jusqu’à 120 cm · intensité variable à la télécommande', '/products/constellation/rendu-d8-dore-chaud.webp', '{"dore-chaud":"/products/constellation/rendu-d8-dore-chaud.webp","dore-froid":"/products/constellation/rendu-d8-dore-froid.webp","noir-chaud":"/products/constellation/rendu-d8-noir-chaud.webp","noir-froid":"/products/constellation/rendu-d8-noir-froid.webp"}'::jsonb, 7)
on conflict (sku) do nothing;
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-SUS-003'), '/products/constellation/ambiance-doree.webp', 'Suspension Constellation dorée en arc, huit globes de verre étoilés allumés au-dessus d’une table de salle à manger, devant un mur bleu nuit', 'Photographie d’ambiance du fabricant', 0,
  true and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-SUS-003') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-SUS-003') and storage_path = '/products/constellation/ambiance-doree.webp');
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-SUS-003'), '/products/constellation/ambiance-droite-doree.webp', 'Suspension Constellation dorée à branche droite, huit globes de verre étoilés allumés au-dessus d’une table de salle à manger en bois, devant un mur vert sombre', 'Photographie d’ambiance du fabricant', 1,
  false and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-SUS-003') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-SUS-003') and storage_path = '/products/constellation/ambiance-droite-doree.webp');

-- ════ Volute (LUM-APP-002) ════
insert into public.products (slug, name, reference, short_description, description, price,
  compare_at_price, category_id, status, featured, dimensions, weight, materials, finishes,
  technical_specifications, delivery_information, assembly_information, stock_quantity,
  seo_title, seo_description, options, option_labels, art, promotion)
values ('volute', 'Volute', 'LUM-APP-002', 'Une feuille d’aluminium enroulée en spirale, qui laisse filer la lumière vers le haut et vers le bas.', 'Volute enroule une fine feuille d’aluminium autour de sa source de lumière, comme un ruban qui tourne sur lui-même. Le faisceau s’échappe par le haut et par le bas et dessine sur le mur deux éventails de lumière ; dans les versions bicolores, l’intérieur doré s’allume et répond à la teinte de la lumière.

Étanche (IP65), elle se pose aussi bien dans une entrée, un couloir ou de part et d’autre d’un lit que sur une façade ou une terrasse. Deux formats, 28 ou 23 cm de haut ; noir ou blanc, uni ou doublé d’or ; lumière blanc chaud, naturel ou froid. Offre : pour trois appliques achetées, la quatrième est offerte.

Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.',
  8000, null,
  (select id from public.categories where slug = 'appliques'),
  'published', false, '{}'::jsonb, null,
  array['Aluminium']::text[], array['Noir', 'Noir et or', 'Blanc', 'Blanc et or']::text[], '[{"label":"Type","value":"Applique murale LED, éclairage vers le haut et vers le bas"},{"label":"Puissance","value":"10 W, selon le fabricant"},{"label":"Étanchéité","value":"IP65 : intérieur et extérieur"},{"label":"Formats","value":"Grand : 28 × 10 cm · petit : 23 × 8 cm (hauteur × largeur)"},{"label":"Finitions","value":"Noir, noir et or, blanc, blanc et or (intérieur doré)"},{"label":"Couleur de lumière","value":"Blanc chaud (2700–3500 K), naturel (3500–5500 K) ou froid (5500–7000 K)"},{"label":"Lumière","value":"Sans scintillement, selon le fabricant"},{"label":"Matières","value":"Coque en aluminium"},{"label":"Offre","value":"3 achetées, la 4ᵉ offerte (toutes versions confondues)"}]'::jsonb,
  null, 'Fixation murale. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée, en particulier en extérieur.', 0,
  'Volute — applique murale LED spirale, noire ou blanche, intérieur doré', 'Applique murale LED en aluminium enroulé en spirale, lumière vers le haut et le bas, étanche IP65 pour l’intérieur et l’extérieur. 28 ou 23 cm, noir ou blanc, uni ou doré. 3 achetées, la 4ᵉ offerte.', '[{"id":"finition","label":"Finition","values":[{"id":"noir","label":"Noir"},{"id":"noir-or","label":"Noir et or"},{"id":"blanc","label":"Blanc"},{"id":"blanc-or","label":"Blanc et or"}]},{"id":"lumiere","label":"Couleur de lumière","values":[{"id":"chaud","label":"Blanc chaud"},{"id":"neutre","label":"Blanc naturel"},{"id":"froid","label":"Blanc froid"}]}]'::jsonb,
  null, 'sconce',
  '{"buy":3,"free":1}'::jsonb)
on conflict (reference) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-APP-002'), 'Grand · 28 cm', 'LUM-APP-002-G', null, 2000,
  0, true, 'Hauteur 28 cm · largeur 10 cm · éclairage vers le haut et vers le bas', '/products/volute/rendu-g-noir-or-chaud.webp', '{"noir-chaud":"/products/volute/rendu-g-noir-chaud.webp","noir-neutre":"/products/volute/rendu-g-noir-neutre.webp","noir-froid":"/products/volute/rendu-g-noir-froid.webp","noir-or-chaud":"/products/volute/rendu-g-noir-or-chaud.webp","noir-or-neutre":"/products/volute/rendu-g-noir-or-neutre.webp","noir-or-froid":"/products/volute/rendu-g-noir-or-froid.webp","blanc-chaud":"/products/volute/rendu-g-blanc-chaud.webp","blanc-neutre":"/products/volute/rendu-g-blanc-neutre.webp","blanc-froid":"/products/volute/rendu-g-blanc-froid.webp","blanc-or-chaud":"/products/volute/rendu-g-blanc-or-chaud.webp","blanc-or-neutre":"/products/volute/rendu-g-blanc-or-neutre.webp","blanc-or-froid":"/products/volute/rendu-g-blanc-or-froid.webp"}'::jsonb, 0)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-APP-002'), 'Petit · 23 cm', 'LUM-APP-002-P', null, 0,
  0, true, 'Hauteur 23 cm · largeur 8 cm · éclairage vers le haut et vers le bas', '/products/volute/rendu-p-noir-or-chaud.webp', '{"noir-chaud":"/products/volute/rendu-p-noir-chaud.webp","noir-neutre":"/products/volute/rendu-p-noir-neutre.webp","noir-froid":"/products/volute/rendu-p-noir-froid.webp","noir-or-chaud":"/products/volute/rendu-p-noir-or-chaud.webp","noir-or-neutre":"/products/volute/rendu-p-noir-or-neutre.webp","noir-or-froid":"/products/volute/rendu-p-noir-or-froid.webp","blanc-chaud":"/products/volute/rendu-p-blanc-chaud.webp","blanc-neutre":"/products/volute/rendu-p-blanc-neutre.webp","blanc-froid":"/products/volute/rendu-p-blanc-froid.webp","blanc-or-chaud":"/products/volute/rendu-p-blanc-or-chaud.webp","blanc-or-neutre":"/products/volute/rendu-p-blanc-or-neutre.webp","blanc-or-froid":"/products/volute/rendu-p-blanc-or-froid.webp"}'::jsonb, 1)
on conflict (sku) do nothing;
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-APP-002'), '/products/volute/ambiance-exterieur.webp', 'Deux appliques Volute noir et or allumées sur une façade enduite, lumière chaude projetée vers le haut et vers le bas, au crépuscule', 'Photographie d’ambiance du fabricant', 0,
  true and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-APP-002') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-APP-002') and storage_path = '/products/volute/ambiance-exterieur.webp');

-- ════ Organza (LUM-LUS-004) ════
insert into public.products (slug, name, reference, short_description, description, price,
  compare_at_price, category_id, status, featured, dimensions, weight, materials, finishes,
  technical_specifications, delivery_information, assembly_information, stock_quantity,
  seo_title, seo_description, options, option_labels, art, promotion)
values ('organza', 'Organza', 'LUM-LUS-004', 'Des voiles d’acrylique ondulés, éclairés par la tranche, qui tombent en cascade comme une étoffe de lumière.', 'Organza suspend des plaques d’acrylique clair, ondulées comme un tissu léger et finement striées. Chacune est coiffée d’une réglette LED qui l’éclaire par la tranche : la lumière court dans la matière, s’accroche aux stries et souligne d’un trait vif le bord découpé de chaque voile.

Du pavillon rond, les plaques descendent en spirale, de six à vingt-huit, pour un séjour, une cage d’escalier ou un volume en double hauteur ; sur un pavillon rectangulaire, d’une à six plaques s’alignent au-dessus d’une table, d’un îlot ou d’un comptoir. Métal doré, noir ou argenté ; lumière blanc chaud ou blanc froid, ou intensité variable à la télécommande.

Caractéristiques techniques communiquées par le fabricant. Les documents de conformité sont en cours de vérification avant la mise en vente.',
  16000, null,
  (select id from public.categories where slug = 'lustres'),
  'published', true, '{}'::jsonb, null,
  array['Aluminium', 'Acrylique', 'Acier inoxydable']::text[], array['Doré', 'Noir', 'Argenté']::text[], '[{"label":"Sources lumineuses","value":"LED intégrées, 5 W par plaque"},{"label":"Tension d’entrée","value":"110–240 V"},{"label":"Plaques","value":"Acrylique ondulé et strié, 18 × 28 cm chacune"},{"label":"Pavillons","value":"Rond : Ø40 (6 plaques), Ø50 (8), Ø60 (12), Ø70 (18), Ø80 cm (28) · rectangulaire : 20 × 5 (1), 55 × 12 (2), 70 × 10 (3), 76 × 24 cm (6)"},{"label":"Suspension","value":"Câbles réglables : 100 à 300 cm selon la version, longueur sur mesure sur demande"},{"label":"Finitions","value":"Métal doré, noir ou argenté"},{"label":"Couleur de lumière","value":"Blanc chaud ou blanc froid ; intensité variable à la télécommande (versions « télécommande »)"},{"label":"Matières","value":"Aluminium, acrylique, acier inoxydable"},{"label":"Surface conseillée","value":"De 3 à 30 m² selon la version, selon le fabricant"}]'::jsonb,
  null, 'Installation au plafond. Le raccordement doit être réalisé hors tension, dans le respect de la norme NF C 15-100 ; l’intervention d’un électricien qualifié est recommandée. La hauteur se règle par les câbles.', 0,
  'Organza — lustre LED voiles d’acrylique en cascade, doré, noir ou argenté', 'Lustre design : voiles d’acrylique ondulés éclairés par la tranche, en cascade de 1 à 28 plaques. Pavillon rond ou rectangulaire, métal doré, noir ou argenté, pour séjour, escalier et double hauteur.', '[{"id":"finition","label":"Finition","values":[{"id":"dore","label":"Doré"},{"id":"noir","label":"Noir"},{"id":"argent","label":"Argenté"}]},{"id":"lumiere","label":"Couleur de lumière","values":[{"id":"chaud","label":"Blanc chaud"},{"id":"froid","label":"Blanc froid"}]}]'::jsonb,
  '{"group":"Pavillon","variant":"Nombre de plaques"}'::jsonb, 'cascade',
  null)
on conflict (reference) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '1 plaque', 'LUM-LUS-004-L1', 'Pavillon rectangulaire', 0,
  0, true, 'Pavillon 20 × 5 cm · 5 W · longueur de câble sur demande · pièce de 3 à 5 m²', '/products/organza/rendu-l1-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-l1-dore-chaud.webp","dore-froid":"/products/organza/rendu-l1-dore-froid.webp","noir-chaud":"/products/organza/rendu-l1-noir-chaud.webp","noir-froid":"/products/organza/rendu-l1-noir-froid.webp","argent-chaud":"/products/organza/rendu-l1-argent-chaud.webp","argent-froid":"/products/organza/rendu-l1-argent-froid.webp"}'::jsonb, 0)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '1 plaque · télécommande', 'LUM-LUS-004-L1-TC', 'Pavillon rectangulaire', 1000,
  0, true, 'Pavillon 20 × 5 cm · 5 W · longueur de câble sur demande · pièce de 3 à 5 m² · intensité variable à la télécommande', '/products/organza/rendu-l1-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-l1-dore-chaud.webp","dore-froid":"/products/organza/rendu-l1-dore-froid.webp","noir-chaud":"/products/organza/rendu-l1-noir-chaud.webp","noir-froid":"/products/organza/rendu-l1-noir-froid.webp","argent-chaud":"/products/organza/rendu-l1-argent-chaud.webp","argent-froid":"/products/organza/rendu-l1-argent-froid.webp"}'::jsonb, 1)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '2 plaques', 'LUM-LUS-004-L2', 'Pavillon rectangulaire', 9000,
  0, true, 'Pavillon 55 × 12 × 3,5 cm · 10 W · câbles de 100 cm, réglables', '/products/organza/rendu-l2-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-l2-dore-chaud.webp","dore-froid":"/products/organza/rendu-l2-dore-froid.webp","noir-chaud":"/products/organza/rendu-l2-noir-chaud.webp","noir-froid":"/products/organza/rendu-l2-noir-froid.webp","argent-chaud":"/products/organza/rendu-l2-argent-chaud.webp","argent-froid":"/products/organza/rendu-l2-argent-froid.webp"}'::jsonb, 2)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '2 plaques · télécommande', 'LUM-LUS-004-L2-TC', 'Pavillon rectangulaire', 10000,
  0, true, 'Pavillon 55 × 12 × 3,5 cm · 10 W · câbles de 100 cm, réglables · intensité variable à la télécommande', '/products/organza/rendu-l2-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-l2-dore-chaud.webp","dore-froid":"/products/organza/rendu-l2-dore-froid.webp","noir-chaud":"/products/organza/rendu-l2-noir-chaud.webp","noir-froid":"/products/organza/rendu-l2-noir-froid.webp","argent-chaud":"/products/organza/rendu-l2-argent-chaud.webp","argent-froid":"/products/organza/rendu-l2-argent-froid.webp"}'::jsonb, 3)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '3 plaques', 'LUM-LUS-004-L3', 'Pavillon rectangulaire', 17000,
  0, true, 'Pavillon 70 × 10 cm · 15 W · câbles de 150 cm, réglables · pièce de 5 à 10 m²', '/products/organza/rendu-l3-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-l3-dore-chaud.webp","dore-froid":"/products/organza/rendu-l3-dore-froid.webp","noir-chaud":"/products/organza/rendu-l3-noir-chaud.webp","noir-froid":"/products/organza/rendu-l3-noir-froid.webp","argent-chaud":"/products/organza/rendu-l3-argent-chaud.webp","argent-froid":"/products/organza/rendu-l3-argent-froid.webp"}'::jsonb, 4)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '3 plaques · télécommande', 'LUM-LUS-004-L3-TC', 'Pavillon rectangulaire', 18000,
  0, true, 'Pavillon 70 × 10 cm · 15 W · câbles de 150 cm, réglables · pièce de 5 à 10 m² · intensité variable à la télécommande', '/products/organza/rendu-l3-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-l3-dore-chaud.webp","dore-froid":"/products/organza/rendu-l3-dore-froid.webp","noir-chaud":"/products/organza/rendu-l3-noir-chaud.webp","noir-froid":"/products/organza/rendu-l3-noir-froid.webp","argent-chaud":"/products/organza/rendu-l3-argent-chaud.webp","argent-froid":"/products/organza/rendu-l3-argent-froid.webp"}'::jsonb, 5)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '6 plaques', 'LUM-LUS-004-L6', 'Pavillon rectangulaire', 27000,
  0, true, 'Pavillon 76 × 24 cm · 30 W · câbles de 150 cm, réglables · pièce de 8 à 12 m²', '/products/organza/rendu-l6-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-l6-dore-chaud.webp","dore-froid":"/products/organza/rendu-l6-dore-froid.webp","noir-chaud":"/products/organza/rendu-l6-noir-chaud.webp","noir-froid":"/products/organza/rendu-l6-noir-froid.webp","argent-chaud":"/products/organza/rendu-l6-argent-chaud.webp","argent-froid":"/products/organza/rendu-l6-argent-froid.webp"}'::jsonb, 6)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '6 plaques · télécommande', 'LUM-LUS-004-L6-TC', 'Pavillon rectangulaire', 28000,
  0, true, 'Pavillon 76 × 24 cm · 30 W · câbles de 150 cm, réglables · pièce de 8 à 12 m² · intensité variable à la télécommande', '/products/organza/rendu-l6-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-l6-dore-chaud.webp","dore-froid":"/products/organza/rendu-l6-dore-froid.webp","noir-chaud":"/products/organza/rendu-l6-noir-chaud.webp","noir-froid":"/products/organza/rendu-l6-noir-froid.webp","argent-chaud":"/products/organza/rendu-l6-argent-chaud.webp","argent-froid":"/products/organza/rendu-l6-argent-froid.webp"}'::jsonb, 7)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '6 plaques', 'LUM-LUS-004-R6', 'Pavillon rond', 27000,
  0, true, 'Pavillon Ø40 cm · 30 W · câbles de 150 cm, réglables · pièce de 8 à 12 m²', '/products/organza/rendu-r6-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-r6-dore-chaud.webp","dore-froid":"/products/organza/rendu-r6-dore-froid.webp","noir-chaud":"/products/organza/rendu-r6-noir-chaud.webp","noir-froid":"/products/organza/rendu-r6-noir-froid.webp","argent-chaud":"/products/organza/rendu-r6-argent-chaud.webp","argent-froid":"/products/organza/rendu-r6-argent-froid.webp"}'::jsonb, 8)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '6 plaques · télécommande', 'LUM-LUS-004-R6-TC', 'Pavillon rond', 28000,
  0, true, 'Pavillon Ø40 cm · 30 W · câbles de 150 cm, réglables · pièce de 8 à 12 m² · intensité variable à la télécommande', '/products/organza/rendu-r6-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-r6-dore-chaud.webp","dore-froid":"/products/organza/rendu-r6-dore-froid.webp","noir-chaud":"/products/organza/rendu-r6-noir-chaud.webp","noir-froid":"/products/organza/rendu-r6-noir-froid.webp","argent-chaud":"/products/organza/rendu-r6-argent-chaud.webp","argent-froid":"/products/organza/rendu-r6-argent-froid.webp"}'::jsonb, 9)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '8 plaques', 'LUM-LUS-004-R8', 'Pavillon rond', 39000,
  0, true, 'Pavillon Ø50 cm · 40 W · câbles de 200 cm, réglables · pièce de 10 à 18 m²', '/products/organza/rendu-r8-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-r8-dore-chaud.webp","dore-froid":"/products/organza/rendu-r8-dore-froid.webp","noir-chaud":"/products/organza/rendu-r8-noir-chaud.webp","noir-froid":"/products/organza/rendu-r8-noir-froid.webp","argent-chaud":"/products/organza/rendu-r8-argent-chaud.webp","argent-froid":"/products/organza/rendu-r8-argent-froid.webp"}'::jsonb, 10)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '8 plaques · télécommande', 'LUM-LUS-004-R8-TC', 'Pavillon rond', 40000,
  0, true, 'Pavillon Ø50 cm · 40 W · câbles de 200 cm, réglables · pièce de 10 à 18 m² · intensité variable à la télécommande', '/products/organza/rendu-r8-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-r8-dore-chaud.webp","dore-froid":"/products/organza/rendu-r8-dore-froid.webp","noir-chaud":"/products/organza/rendu-r8-noir-chaud.webp","noir-froid":"/products/organza/rendu-r8-noir-froid.webp","argent-chaud":"/products/organza/rendu-r8-argent-chaud.webp","argent-froid":"/products/organza/rendu-r8-argent-froid.webp"}'::jsonb, 11)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '12 plaques', 'LUM-LUS-004-R12', 'Pavillon rond', 66000,
  0, true, 'Pavillon Ø60 cm · 60 W · câbles de 300 cm, réglables · pièce de 10 à 20 m²', '/products/organza/rendu-r12-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-r12-dore-chaud.webp","dore-froid":"/products/organza/rendu-r12-dore-froid.webp","noir-chaud":"/products/organza/rendu-r12-noir-chaud.webp","noir-froid":"/products/organza/rendu-r12-noir-froid.webp","argent-chaud":"/products/organza/rendu-r12-argent-chaud.webp","argent-froid":"/products/organza/rendu-r12-argent-froid.webp"}'::jsonb, 12)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '12 plaques · télécommande', 'LUM-LUS-004-R12-TC', 'Pavillon rond', 67000,
  0, true, 'Pavillon Ø60 cm · 60 W · câbles de 300 cm, réglables · pièce de 10 à 20 m² · intensité variable à la télécommande', '/products/organza/rendu-r12-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-r12-dore-chaud.webp","dore-froid":"/products/organza/rendu-r12-dore-froid.webp","noir-chaud":"/products/organza/rendu-r12-noir-chaud.webp","noir-froid":"/products/organza/rendu-r12-noir-froid.webp","argent-chaud":"/products/organza/rendu-r12-argent-chaud.webp","argent-froid":"/products/organza/rendu-r12-argent-froid.webp"}'::jsonb, 13)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '18 plaques', 'LUM-LUS-004-R18', 'Pavillon rond', 86000,
  0, true, 'Pavillon Ø70 cm · 90 W · câbles de 300 cm, réglables · pièce de 18 à 25 m²', '/products/organza/rendu-r18-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-r18-dore-chaud.webp","dore-froid":"/products/organza/rendu-r18-dore-froid.webp","noir-chaud":"/products/organza/rendu-r18-noir-chaud.webp","noir-froid":"/products/organza/rendu-r18-noir-froid.webp","argent-chaud":"/products/organza/rendu-r18-argent-chaud.webp","argent-froid":"/products/organza/rendu-r18-argent-froid.webp"}'::jsonb, 14)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '18 plaques · télécommande', 'LUM-LUS-004-R18-TC', 'Pavillon rond', 87000,
  0, true, 'Pavillon Ø70 cm · 90 W · câbles de 300 cm, réglables · pièce de 18 à 25 m² · intensité variable à la télécommande', '/products/organza/rendu-r18-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-r18-dore-chaud.webp","dore-froid":"/products/organza/rendu-r18-dore-froid.webp","noir-chaud":"/products/organza/rendu-r18-noir-chaud.webp","noir-froid":"/products/organza/rendu-r18-noir-froid.webp","argent-chaud":"/products/organza/rendu-r18-argent-chaud.webp","argent-froid":"/products/organza/rendu-r18-argent-froid.webp"}'::jsonb, 15)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '28 plaques', 'LUM-LUS-004-R28', 'Pavillon rond', 135000,
  0, true, 'Pavillon Ø80 cm · 140 W · câbles de 300 cm, réglables · pièce de 25 à 30 m²', '/products/organza/rendu-r28-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-r28-dore-chaud.webp","dore-froid":"/products/organza/rendu-r28-dore-froid.webp","noir-chaud":"/products/organza/rendu-r28-noir-chaud.webp","noir-froid":"/products/organza/rendu-r28-noir-froid.webp","argent-chaud":"/products/organza/rendu-r28-argent-chaud.webp","argent-froid":"/products/organza/rendu-r28-argent-froid.webp"}'::jsonb, 16)
on conflict (sku) do nothing;
insert into public.product_variants (product_id, name, sku, finish, price_adjustment,
  stock_quantity, active, details, image_url, image_urls, position)
values ((select id from public.products where reference = 'LUM-LUS-004'), '28 plaques · télécommande', 'LUM-LUS-004-R28-TC', 'Pavillon rond', 136000,
  0, true, 'Pavillon Ø80 cm · 140 W · câbles de 300 cm, réglables · pièce de 25 à 30 m² · intensité variable à la télécommande', '/products/organza/rendu-r28-dore-chaud.webp', '{"dore-chaud":"/products/organza/rendu-r28-dore-chaud.webp","dore-froid":"/products/organza/rendu-r28-dore-froid.webp","noir-chaud":"/products/organza/rendu-r28-noir-chaud.webp","noir-froid":"/products/organza/rendu-r28-noir-froid.webp","argent-chaud":"/products/organza/rendu-r28-argent-chaud.webp","argent-froid":"/products/organza/rendu-r28-argent-froid.webp"}'::jsonb, 17)
on conflict (sku) do nothing;
insert into public.product_images (product_id, storage_path, alt_text, caption, position, is_primary)
select (select id from public.products where reference = 'LUM-LUS-004'), '/products/organza/ambiance-salon.webp', 'Lustre Organza doré à pavillon rond, cascade de voiles d’acrylique lumineux au-dessus d’un salon en double hauteur, devant un mur anthracite', 'Photographie d’ambiance du fabricant', 0,
  true and not exists (select 1 from public.product_images
    where product_id = (select id from public.products where reference = 'LUM-LUS-004') and is_primary)
where not exists (select 1 from public.product_images
  where product_id = (select id from public.products where reference = 'LUM-LUS-004') and storage_path = '/products/organza/ambiance-salon.webp');

commit;

-- Vérification : une ligne par pièce, avec son nombre de versions et d'images.
select p.reference, p.name, p.status, c.slug as categorie,
  (select count(*) from public.product_variants v where v.product_id = p.id) as versions,
  (select count(*) from public.product_images i where i.product_id = p.id) as images
from public.products p left join public.categories c on c.id = p.category_id
order by p.reference;
