# Fiche produit — modèle de référence

Modèle **validé par le propriétaire le 1er novembre 2026** sur la fiche **Aigrette** (`LUM-SUS-002`,
`lib/catalog/products.ts`). Toute nouvelle pièce suit ce modèle, sauf demande contraire.

## 1. Galerie : dans cet ordre, rien de plus

1. **Photographies d'ambiance du fournisseur** (1 ou 2, une par forme si la pièce en a plusieurs),
   en premier, rendues plus nettes (voir § 2).
   - `public/products/<piece>/ambiance-<forme>.webp`, 1600 × 2000 (4:5).
   - Légende : « Photographie d’ambiance du fabricant ».
   - Texte alternatif descriptif : pièce, forme, finition, pièce de vie.
2. **Visualisation 3D de la version choisie** : une seule vue, qui change avec la version et les
   options (finition × couleur de lumière). Elle est ajoutée automatiquement par
   `components/product/ProductGallery.tsx` à partir de `variant.imageUrls`, avec la légende
   « Visualisation 3D — non contractuelle ».

**Pas de mise en situation 3D** dans la galerie (essayée puis retirée à la demande du propriétaire).

## 2. Photos du fournisseur : rendre plus net, jamais retoucher le produit

- Script : `scripts/images/ameliorer-photo.py` (installation et usage en tête du fichier).
  Real-ESRGAN ×2 sur l'image entière, recadrage 4:5, 1600 × 2000, WebP qualité 88.
- Réglages écartés après comparaison : ×4 (cristaux « peints »), mélange avec l'original
  (dédoublements). Toujours comparer avant/après sur un zoom du produit.
- **Ne jamais effacer un filigrane** ni modifier le produit (forme, nombre d'éléments, couleur).
- Signaler au propriétaire tout filigrane d'un tiers : l'autorisation écrite du fabricant reste à
  obtenir pour la mise en vente.

## 3. Visualisations 3D des versions

- Modèle construit **d'après les fiches techniques du fournisseur** (cotes, nombre d'ampoules et
  de cristaux, forme du pavillon, câbles), pas d'après une photo d'ambiance seule. Demander au
  propriétaire les fiches techniques (images « L92cm | 12 Bulbs | Gold »…) si elles manquent.
- Avant de générer toutes les versions, **comparer côte à côte** un rendu avec la fiche du
  fournisseur et corriger les écarts.
- Organisation (exemple Aigrette) :
  - `scripts/render/aigrette-model.js` : le luminaire, partagé entre les scènes ;
  - `scripts/render/scene-aigrette.html` : la scène de rendu des versions ;
  - `scripts/render/room.js` : le décor intérieur commun (« salon », « salle ») ;
  - `scripts/render/render.mjs` : le rendu (1200 × 1500 par défaut, WebP), avec Chromium
    `/opt/pw-browsers/chromium-*/chrome-linux64/chrome` dans les sessions cloud.
- Fichiers : `public/products/<piece>/rendu-<code>-<finition>-<lumiere>.webp`, une image par
  combinaison ; une option sans rendu propre (« 3 teintes commutables ») réutilise le rendu le plus
  proche (blanc neutre).
- Une modification du modèle ne doit pas changer les rendus des autres formes : le vérifier au pixel
  près en comparant un rendu avant/après.

## 4. Structure de la fiche (`lib/catalog/products.ts`)

- **Versions** (`variants`) issues d'un tableau de versions du fournisseur : forme, taille, nombre
  d'ampoules et de cristaux, prix d'achat. `finish` = groupe (« Ronde », « Linéaire »),
  `name` = taille (« Ø50 cm », « L 92 cm »), `details` = précisions vérifiées (ampoules
  fournies, éléments, suspension).
- **Sélecteur à deux niveaux** : `optionLabels: { group: "Forme", variant: "Taille" }`. Les boutons
  de version **n'affichent pas de prix** ; le prix TTC de la version choisie s'affiche au-dessus.
- **Options sans incidence sur le prix** (`options`) : finition (Doré / Chromé), couleur de lumière
  (Blanc chaud / neutre / froid / 3 teintes commutables). Clé des visuels dans `imageUrls` :
  valeurs des options dans l'ordre, ex. `dore-chaud`.
- **Prix** : `salePrice(prix d'achat)` (×1,8 sous 500 €, ×1,5 au-delà, arrondi à la dizaine
  supérieure) ; prix de base = version la moins chère, chaque version porte son écart. Noter dans un
  commentaire la date du relevé fournisseur et toute promotion temporaire (fin de promotion =
  marge à revoir).
- **Fiche technique** (`specifications`) : uniquement des données confirmées par le fournisseur
  (tension, culot, flux, formes, suspension, finitions, lumière, surface conseillée, garantie).
- **Description** : 3 paragraphes (silhouette et matière ; usages et versions ; « Caractéristiques
  techniques communiquées par le fabricant. Les documents de conformité sont en cours de
  vérification avant la mise en vente. »).
- `stockQuantity: 0` → bouton « Demander cette pièce » (contact prérempli) tant que la vente en
  ligne n'est pas ouverte. `status: "draft"` tant que la conformité (CE, notice, DEEE) n'est pas
  vérifiée.
- SEO : `seoTitle` et `seoDescription` propres à la pièce.

## 5. Base Supabase (site en ligne)

- Après toute modification du catalogue dans le code : `npm run catalog:sql` (régénère
  `supabase/import-produits.sql`, qui n'écrase jamais l'existant).
- Pour une pièce **déjà en base**, écrire un correctif `supabase/correctifs/<date>-<piece>-<objet>.sql`
  (transaction, sans risque à rejouer, requête de vérification à la fin) et le **tester sur une
  base jetable** qui simule la base en ligne (ancien import + correctifs déjà publiés). Le
  propriétaire le colle ensuite dans Supabase → SQL Editor.
- Mettre à jour le nombre d'images attendu dans `supabase/tests/run.sh` si la galerie change.

## 6. Avant de publier

`npm run check`, `npm run test:db`, aperçu de la fiche dans le navigateur (la passer
temporairement en `published` en local si elle est en brouillon, sans enregistrer ce changement),
puis présenter les images au propriétaire avant fusion.
