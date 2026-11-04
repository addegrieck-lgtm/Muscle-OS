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
