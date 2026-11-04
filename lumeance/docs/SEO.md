# SEO — notes techniques

## Images (phase B)

Sur Cloudflare (OpenNext sans service d'images), `/_next/image` renvoie la photo d'origine quelle
que soit la largeur demandée. Le site utilise donc un chargeur maison :

- `npm run build` lance d'abord `prebuild` → `scripts/images/variants.mjs`, qui crée avec `sharp`
  des versions de 320, 640 et 960 px de chaque photo de `public/products` et `public/brand` dans
  `public/img-w/<largeur>/…` (dossier non versionné, environ 40 s).
- `lib/image-loader.ts` (déclaré dans `next.config.ts`) pointe chaque `srcset` vers la plus petite
  version suffisante ; au-delà de 960 px, ou pour les images Supabase, l'original est servi.
- Exemple Organza : 292 Ko à l'origine, 20 Ko en vignette, 55 Ko en 640 px.

Ne plus ajouter `unoptimized` sur les `<Image>` locales : cela contourne le chargeur.

## Pages par pièce

`/luminaires/<id>` (salle à manger, escalier, salon, chambre, entrée) : textes dans
`lib/content/rooms-seo.ts` (conseils généraux, jamais de caractéristique produit), pièces listées
dans `ROOMS` (`lib/content/home.ts`). Une page n'est indexée et déclarée au sitemap qu'avec au moins
3 pièces en ligne. Elles sont auditées dans l'outil SEO de l'administration.

## Données structurées

Organization (logo PNG 512 px) et WebSite sur toutes les pages, fil d'Ariane, Product (note
moyenne seulement avec de vrais avis vérifiés).

## Plus tard

- Cache des pages sur Cloudflare (R2 pour OpenNext) : à configurer avec le compte Cloudflare.
- Date de mise à jour des fiches dans le sitemap : nécessite une colonne `updated_at` exposée.

## Studio éditorial (phase D)

- Migration `supabase/migrations/20261109000100_journal.sql` (table `journal_articles`, à coller
  dans Supabase → SQL Editor). Sans elle, le site continue avec les articles du code.
- Administration → **Studio éditorial** : créer, relire, programmer, dépublier, archiver.
  Statuts : brouillon, à relire, programmé, en ligne, archivé.
- **Aucune publication sans validation** : seul le bouton « Valider et publier », avec la case de
  relecture cochée, rend un article public (contrainte en base : un article publié a forcément une
  date et une validation). La lecture publique est limitée par la RLS aux articles validés dont la
  date est passée.
- Articles du code : « Reprendre dans le studio » les copie avec leurs dates ; ensuite la version
  du studio fait foi (la dépublier la retire aussi du site).
- Propositions de la rédaction (`lib/content/journal-propositions.ts`) : ajoutées en « à relire »,
  jamais publiées automatiquement ; sources laissées vides (à renseigner uniquement avec des
  sources réelles).
- Aperçu d'un brouillon : `/journal/<adresse>?apercu=1`, réservé aux administrateurs (non indexé).
- Format du texte : `## Intertitre`, paragraphes séparés par une ligne vide ; FAQ en blocs
  `Q : …` / `R : …` ; liens et sources `Libellé | adresse`.
