# Avancement — comptes rendus de phase

Légende : ✅ fait et vérifié · 🟡 fait, non vérifiable sans service externe · ⬜ à faire

## Phase 1 — Fondations ✅
- Projet Next.js 15 / TypeScript strict / Tailwind 4, ESLint, Prettier, Vitest.
- Schéma PostgreSQL complet (17 tables : toutes celles du cahier des charges + `media_assets`, `contact_messages`, `payment_transactions`, `payment_webhook_events`), index, contraintes, montants en centimes, instantanés de commande.
- **Vérifié** : `npm run test:db` applique les migrations sur PostgreSQL 16 et passe les tests.

## Phase 2 — Identité visuelle ✅
- Symbole reconstitué en vectoriel (flamme, ruban, arc, étoile) d’après la planche validée ; lettrage converti en tracés (aucune dépendance à une police).
- Déclinaisons : principal ivoire, principal noir, symbole seul, horizontal, vertical, monochromes noir et blanc, favicon, icône réseaux sociaux (SVG + PNG), image Open Graph. Voir [IDENTITE.md](IDENTITE.md).
- Palette officielle et hiérarchie typographique dans `app/globals.css`.

## Phase 3 — Showroom ✅
- Intro cinématique (particules champagne convergeant vers le symbole, filaments) : ~4,6 s, une fois par session, « Passer » / Échap, désactivée si mouvement réduit, repli sans WebGL.
- Hero avec lustre 3D (R3F) en cascade, parallaxe à la souris, arrêt hors écran ; repli SVG.
- Manifeste, collections en accordéon, sélection signature éditoriale, section immersive, matières, lettre, pied de page.
- **Vérifié** : captures desktop 1440 px et iPhone 13, aucune erreur console.

## Phase 4 — Boutique ✅
- Catalogue filtrable (univers, matière, budget, tri) sans JavaScript ; 4 pages catégories avec texte éditorial.
- Fiches produit : galerie, finitions, quantité, caractéristiques, fiche technique (vide tant que non vérifiée), livraison, installation.
- Panier conservé 30 jours, **prix recalculés côté serveur**, commande affichée comme non ouverte.
- **Vérifié** : ajout avec variante (+20 €) et quantité, recalcul serveur correct.

## Phase 5 — Administration 🟡
- Tableau de bord, produits (CRUD, publication, archivage, suppression confirmée par la référence, variantes, photos, image principale, aperçu), catégories, commandes (filtres, recherche, statut, notes, historique, paiement manuel reçu, commande manuelle, export CSV), clients (fiche, historique, export), médias, contenus d’accueil, messages et lettre, paramètres (livraison, coordonnées, SEO, administrateurs), journal d’activité.
- **Vérifié** : typecheck, build, écran « non configurée ». **Non vérifié de bout en bout** : aucune instance Supabase n’était disponible ; à tester dès la création du projet Supabase.

## Phase 6 — Sécurité ✅ (voir [SECURITE.md](SECURITE.md))
- RLS testée (anonyme, connecté non admin, gestionnaire, super admin), interdiction d’auto-promotion, dernier super admin protégé, journal d’activité par déclencheurs et non modifiable, « payée » impossible sans transaction.
- Imports : signature réelle des fichiers, 10 Mo, SVG refusé. Limitation de débit, pot de miel, en-têtes de sécurité.

## Phase 7 — SEO et conformité ✅
- Métadonnées uniques, canonical, Open Graph, sitemap, robots, JSON-LD Organization / BreadcrumbList / Product (produits réels uniquement) / Article.
- Journal : 5 guides rédigés. Pages légales structurées avec champs « À compléter » visibles.
- Site **non indexable** tant que `NEXT_PUBLIC_INDEXABLE=1` n’est pas posé.

## Phase 8 — Préparation commerciale ⬜
- [ ] Vérifier la disponibilité du nom (INPI) et du domaine lumeance.fr — aucun achat effectué.
- [x] Projet Supabase créé ; catalogue importé et géré dans l'administration.
- [x] Hébergement : site publié sur Cloudflare Workers via OpenNext ([HEBERGEMENT.md](HEBERGEMENT.md)).
- [ ] Sélection fournisseurs, documents de conformité, photographies réelles, saisie des 20 à 40 pièces.
- [ ] Faire valider CGV, mentions légales, confidentialité ; choisir un médiateur.
- [ ] Intégrer le paiement ([PAIEMENT.md](PAIEMENT.md)).

## Audit du 1er novembre 2026 — corrections appliquées ✅
- Sélecteur de versions : « 26 sphères · 870 € » au lieu de « 26 870 € » (lisible comme un seul montant).
- Bandeau cookies masqué : seuls des éléments strictement nécessaires sont utilisés (exemptés de consentement, CNIL). Réactivation : `CONSENT_REQUIRED` dans `components/layout/CookieConsent.tsx`, le jour où un traceur soumis à consentement est ajouté.
- Pièce non commandable : bouton « Demander cette pièce » (formulaire de contact prérempli avec pièce, version, options, quantité) au lieu d’un bouton grisé.
- Fiche produit mobile : barre fixe prix + « Choisir » tant que le sélecteur est hors écran.
- Prix : fourchette calculée sur les versions actives (`lib/catalog/price-range.ts`) pour les cartes (« dès »), le filtre budget, le tri et les données structurées ; prix barré affiché seulement s’il porte sur la version choisie.
- Scènes 3D non chargées sur connexion lente (2G/3G), en plus du mode économie de données.
- Sécurité : Content-Security-Policy ; limiteurs de débit partagés Cloudflare ; adresse IP non falsifiable.
- Page 404 : titre « Page introuvable », non indexée.
- **Vérifié** : typecheck, lint, 55 tests, build OpenNext, parcours complet dans workerd (aucune violation CSP, aucune erreur console).

## Catalogue au 1er novembre 2026
- En ligne : Céleste, Luciole, Silhouette, Nébuleuse, Constellation, Volute (applique spirale, offre « 3 achetées, la 4ᵉ offerte »).
- Brouillons : Aigrette, Sylve.

## Points ouverts — à traiter avec le propriétaire
- Pages légales : 20+ champs « À compléter » visibles (raison sociale, SIRET, adresse, directeur de publication, hébergeur, médiateur, responsable de traitement).
- Photos fabricant : obtenir une autorisation écrite d’utilisation, puis des visuels propres.
- Cache des pages : toutes les pages sont rendues à chaque visite (`force-dynamic`) ; un cache OpenNext (R2 ou KV) avec revalidation à la publication accélérerait le site.
- Adresses `/_next/static/chunks/app/(store)/…` : un proxy qui réécrit les parenthèses en `%28…%29` provoque une boucle de redirection (observé derrière un proxy d’entreprise). Tester depuis un téléphone en 4G et un Wi-Fi d’entreprise.
- Messages de contact : enregistrés dans `/admin/messages`, sans notification e-mail (aucun service d’e-mail choisi).

## Points ouverts
- Accents de Cormorant Garamond relativement hauts sur les minuscules : dessin d’origine de la police imposée.
- Double opt-in de la lettre : nécessite un service d’e-mail (non choisi).
