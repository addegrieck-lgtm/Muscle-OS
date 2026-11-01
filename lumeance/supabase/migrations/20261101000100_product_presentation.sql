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
