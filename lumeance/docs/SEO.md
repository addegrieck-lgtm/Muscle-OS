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

## Mots-clés (phase E)

- Migration `supabase/migrations/20261110000100_seo_keywords.sql` (table `seo_keywords` :
  expression, page cible, intention, priorité ; réservée aux administrateurs).
- Administration → **Mots-clés** : expressions suivies avec leur position, impressions, clics et
  taux de clic réels (Search Console, 28 ou 90 jours, évolution vs période précédente), page qui
  ressort dans Google (alerte si elle diffère de la cible), cannibalisation (plusieurs pages pour
  une même recherche), recherches réelles non suivies, pistes tirées de la structure du site.
- **Volume de recherche et difficulté : « Non renseigné »** — aucune source gratuite fiable ;
  aucun chiffre n'est estimé ni stocké, tout est relu dans Search Console à l'affichage.

## Maillage interne (phase F)

- `lib/seo/linking.ts` : graphe des liens contextuels du site (hors menu et pied de page), calculé
  à partir du contenu publié ; les mêmes fonctions produisent les liens affichés.
- Liens ajoutés sur le site : fiche produit → pages par pièce où elle est conseillée et articles
  qui la citent (« Pour aller plus loin ») ; page par pièce → guides associés (« Nos guides »).
- Administration → **Maillage interne** : liens reçus et émis par page, textes des liens, pages
  orphelines ou peu liées, liens cassés, liens à ajouter (article citant une pièce sans lien ;
  page parlant d'un mot-clé suivi sans renvoyer vers sa page cible).
- Test de non-régression : aucun lien du contenu vers une page inexistante, chaque fiche et page
  par pièce reçoit au moins 3 liens contextuels.

## Fiches produits (phase G)

- Données structurées `Product` enrichies (uniquement des données réelles) : URL et images
  absolues, catégorie, finitions, dimensions et poids s'ils sont renseignés, état neuf, vendeur,
  livraison (frais réels de la boutique, pays desservis), droit de rétractation de 14 jours (page
  Retours ; frais de retour non indiqués tant qu'ils ne sont pas fixés). Note moyenne uniquement
  avec de vrais avis vérifiés.
- Administration → **Fiches produits (SEO)** : score par fiche (titre, description, photos et
  textes alternatifs, visuel par version, dimensions, lumière, matières, poids, garantie, prix,
  liens, avis) et liste « À demander au fournisseur ». Aucun manque n'est comblé
  automatiquement ; lien « Tester dans Google » (test des résultats enrichis).
- Flux **Google Shopping** : `/flux/google-shopping.xml` (une ligne par version, prix et stock
  réels, pas de GTIN : `identifier_exists = no`). À déclarer dans Google Merchant Center **une fois
  le paiement en ligne ouvert** (Merchant Center exige un achat possible sur le site).

## Veille concurrentielle (phase H)

- Migration `supabase/migrations/20261111000100_competitors.sql` (concurrents, relevés de pages,
  relevés de prix ; réservés aux administrateurs).
- Administration → **Veille concurrentielle** : concurrents choisis par la maison ; « Relever
  maintenant » lit la page d'accueil (titre, description, types de données structurées) et le
  plan du site public (nombre de pages, nouvelles pages depuis le relevé précédent), uniquement si
  le robots.txt l'autorise, au plus une fois par heure et par site, robot identifié
  « LumeanceVeille », au plus 5 pages lues ; relevés de prix saisis à la main avec leur source
  https et leur date, comparés au prix « à partir de » de la pièce LUMÉANCE équivalente.
- Aucun trafic, classement ou volume concurrent n'est estimé (aucune source gratuite fiable).

## Liens externes (phase I)

- Migration `supabase/migrations/20261112000100_backlinks.sql` (table `backlinks`, administrateurs).
- Administration → **Liens externes** : pages qui citent (ou pourraient citer) LUMÉANCE, avec
  type, statut (à contacter, contacté, obtenu, refusé, perdu) et notes ; « Vérifier » lit la page
  source (robots.txt respecté) et constate le lien, son texte et s'il transmet de la popularité
  (pas de nofollow / sponsored / ugc) ; un lien disparu passe en « perdu ». Import de l'export
  « Liens » de Search Console. Pistes légitimes et modèle de message à envoyer soi-même.
- « Obtenu » n'est attribué qu'après vérification ou import Google. Aucun achat de lien, aucun
  envoi automatique.

## Rapports et automatisations (phase J)

- Migration `supabase/migrations/20261113000100_seo_reports.sql` (table `seo_reports`).
- Administration → **Rapports SEO** : clics et impressions Google de la semaine contre la
  précédente, recherches en recul ou en progrès (3 places ou plus), pages qui perdent des clics,
  mots-clés suivis, score d'audit, score moyen des fiches, maillage, liens externes (les 5 liens
  obtenus les moins récemment contrôlés sont revérifiés), studio ; alertes classées critique /
  attention / info ; historique de 26 semaines ; bouton « Générer maintenant ».
- **Automatique chaque lundi** (`.github/workflows/lumeance-seo-report.yml`) :
  1. créer un secret aléatoire d'au moins 24 caractères ;
  2. Cloudflare → lumeance → Variables and Secrets : secret `CRON_SECRET` ;
  3. GitHub → dépôt → Settings → Secrets and variables → Actions : secret `CRON_SECRET` (même
     valeur). Sans secret, la route `/api/cron/seo-report` reste fermée (401).
- **E-mail facultatif** (Brevo, offre gratuite) : secrets Cloudflare `BREVO_API_KEY`,
  `REPORT_EMAIL_TO`, `REPORT_EMAIL_FROM` (adresse validée dans Brevo).
- Statistiques de visite détaillées (GA4) : prévues à l'ouverture du paiement.
