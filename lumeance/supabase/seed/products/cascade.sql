-- LUMÉANCE — fiche produit « Cascade » et ses 17 variantes.
-- Source : docs/produits/CASCADE.md (données fournisseur relevées le 31/10/2026).
--
-- À exécuter une fois dans Supabase (SQL Editor). Rejouable : la fiche et les variantes sont
-- mises à jour si elles existent déjà (clés : référence produit et SKU).
-- Le produit est créé en BROUILLON : le publier depuis /admin une fois les photos ajoutées
-- et les justificatifs de conformité réunis (docs/RGPD.md).
--
-- Montants en centimes. Prix de base = Rond 3 sphères (230 €) ; prix d'une variante = base + ajustement.

begin;

insert into public.products (
  slug, name, reference, short_description, description,
  price, compare_at_price, category_id, status, featured,
  dimensions, weight, materials, finishes, technical_specifications,
  delivery_information, assembly_information, stock_quantity, seo_title, seo_description
) values (
  'cascade',
  'Cascade',
  'LUM-CASCADE',
  $txt$Une pluie de sphères de verre bullé, suspendues à des hauteurs différentes et éclairées de l'intérieur. Pensé pour les cages d'escalier et les doubles hauteurs.$txt$,
  $txt$Cascade fait tomber du plafond une pluie de sphères de verre, suspendues à des hauteurs différentes comme une chute de lumière figée dans l'air.

Au cœur de chaque sphère, une source LED éclaire le verre bullé de l'intérieur : la lumière se diffracte dans les inclusions, rebondit d'une sphère à l'autre et compose un scintillement chaud, vivant, qui change selon l'endroit d'où on le regarde.

Pensé pour les cages d'escalier, les doubles hauteurs et les mezzanines, Cascade occupe le volume sans encombrer le sol et accompagne le regard d'un niveau à l'autre. Dans ses formats plus compacts, il devient la pièce maîtresse d'un salon, d'une entrée ou d'une table de salle à manger.

Chaque câble se règle indépendamment : spirale, chute verticale ou composition en paliers, c'est vous qui dessinez la silhouette.

Trois formes de pavillon — rond, carré ou rectangulaire — pour s'accorder à votre plafond et à la forme de la pièce.

Quel modèle choisir ?

— Jusqu'à 8 m² (au-dessus d'une table, d'un îlot, dans une entrée) : 3 à 5 sphères, suspension jusqu'à 2 m.

— De 8 à 15 m² (salon, salle à manger) : 7 à 14 sphères, suspension jusqu'à 3 m.

— De 15 à 25 m² (cage d'escalier, double hauteur) : 18 à 36 sphères, suspension de 3,5 à 5 m.

— Au-delà de 25 m² (hall, escalier sur plusieurs étages) : 46 sphères, suspension jusqu'à 5 m.$txt$,
  23000,
  null,
  (select id from public.categories where slug = 'lustres'),
  'draft',
  true,
  '{}'::jsonb,
  null,
  array['Verre bullé', 'Acier inoxydable'],
  array['Acier poli'],
  $json$[
    {"label": "Source lumineuse", "value": "LED, culot G4 — une source par sphère"},
    {"label": "Ampoules", "value": "Incluses"},
    {"label": "Tension", "value": "95–265 V CA (compatible réseau 230 V)"},
    {"label": "Sphères", "value": "Verre bullé"},
    {"label": "Pavillon", "value": "Acier inoxydable"},
    {"label": "Câbles", "value": "Réglables individuellement"},
    {"label": "Hauteur de suspension", "value": "Réglable, de 1,5 m à 5 m selon le modèle"},
    {"label": "Formes de pavillon", "value": "Rond (Ø 15 à 100 cm), carré (50 à 100 cm), linéaire et rectangulaire (50 à 160 cm)"},
    {"label": "Modèles", "value": "De 3 à 46 sphères"},
    {"label": "Pièces conseillées", "value": "Escalier, double hauteur, salon, salle à manger, entrée, chambre, couloir"}
  ]$json$::jsonb,
  $txt$Pièce préparée à la commande. Délai de livraison communiqué à la validation, selon le modèle choisi. Livraison soignée en emballage renforcé ; les sphères sont protégées individuellement.$txt$,
  $txt$Fixation au plafond et raccordement au réseau électrique. Compte tenu du poids et du réglage de chaque câble, nous recommandons une pose par un électricien qualifié. Notice de montage fournie.$txt$,
  0,
  'Lustre Cascade — suspension LED à sphères de verre | LUMÉANCE',
  $txt$Lustre Cascade : une pluie de sphères de verre bullé éclairées par LED, pour cage d'escalier et double hauteur. Câbles réglables, ampoules incluses.$txt$
)
on conflict (reference) do update set
  slug = excluded.slug,
  name = excluded.name,
  short_description = excluded.short_description,
  description = excluded.description,
  price = excluded.price,
  category_id = excluded.category_id,
  featured = excluded.featured,
  materials = excluded.materials,
  finishes = excluded.finishes,
  technical_specifications = excluded.technical_specifications,
  delivery_information = excluded.delivery_information,
  assembly_information = excluded.assembly_information,
  seo_title = excluded.seo_title,
  seo_description = excluded.seo_description;
  -- Le statut n'est pas modifié : une fiche déjà publiée le reste.

-- Variantes : nom affiché, SKU, ajustement (centimes) par rapport au prix de base de 230 €.
-- Stock à 0 : à renseigner dans l'admin selon la politique de la boutique.
insert into public.product_variants (product_id, name, sku, finish, price_adjustment, stock_quantity, active)
select p.id, v.name, v.sku, 'Acier poli', v.adjustment, 0, true
from public.products p
cross join (values
  ('Rond · 3 sphères · Ø 15 cm',            'LUM-CASCADE-R03',       0),  --   230 €
  ('Rond · 5 sphères · Ø 20 cm',            'LUM-CASCADE-R05',   11000),  --   340 €
  ('Rond · 7 sphères · Ø 30 cm',            'LUM-CASCADE-R07',   24000),  --   470 €
  ('Rond · 14 sphères · Ø 40 cm',           'LUM-CASCADE-R14',   48000),  --   710 €
  ('Rond · 26 sphères · Ø 50 cm',           'LUM-CASCADE-R26',   86000),  -- 1 090 €
  ('Rond · 36 sphères',                     'LUM-CASCADE-R36',  116000),  -- 1 390 €
  ('Rond · 46 sphères · Ø 100 cm',          'LUM-CASCADE-R46',  226000),  -- 2 490 €
  ('Carré · 18 sphères · 50 × 50 cm',       'LUM-CASCADE-C18',   51000),  --   740 €
  ('Carré · 26 sphères · 50 × 50 cm',       'LUM-CASCADE-C26',   86000),  -- 1 090 €
  ('Carré · 36 sphères · 75 × 75 cm',       'LUM-CASCADE-C36',  116000),  -- 1 390 €
  ('Carré · 46 sphères · 100 × 100 cm',     'LUM-CASCADE-C46',  226000),  -- 2 490 €
  ('Linéaire · 5 sphères · 50 cm',          'LUM-CASCADE-L05',   17000),  --   400 €
  ('Linéaire · 7 sphères · 70 cm',          'LUM-CASCADE-L07',   24000),  --   470 €
  ('Rectangle · 14 sphères · 85 × 28 cm',   'LUM-CASCADE-L14',   48000),  --   710 €
  ('Rectangle · 18 sphères · 85 × 28 cm',   'LUM-CASCADE-L18',   55000),  --   780 €
  ('Rectangle · 36 sphères · 110 × 37 cm',  'LUM-CASCADE-L36',  116000),  -- 1 390 €
  ('Rectangle · 46 sphères · 160 × 42 cm',  'LUM-CASCADE-L46',  226000)   -- 2 490 €
) as v(name, sku, adjustment)
where p.reference = 'LUM-CASCADE'
on conflict (sku) do update set
  name = excluded.name,
  finish = excluded.finish,
  price_adjustment = excluded.price_adjustment;

commit;
