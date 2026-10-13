# SEO — VÆLORIA

Stratégie de référencement naturel du site public (export statique `apps/web`, publié sur Cloudflare Workers à chaque push sur `main`).
Objectif : être trouvé par les joueurs francophones qui cherchent un serveur Minecraft Faction / PvP Faction / PvP 1.8 **avant l'ouverture**, sans publicité.

> Règle de base : aucune donnée inventée. Pas de volume de recherche, de difficulté ou de position citée sans source mesurée. Pas de faux avis, faux joueurs, faux votes ni données structurées de serveur en ligne.

## 1. Audit initial (13 octobre 2026)

Mesuré sur le HTML produit par `pnpm run build` (script d'audit : titres, descriptions, H1, canonical, robots, liens internes, JSON-LD), plus un rendu Chromium en 390 px et 1366 px. **Non mesurés** faute d'outil ici : Core Web Vitals de terrain (CrUX), Lighthouse, réponse HTTP réelle du site en ligne (le réseau de l'environnement bloque `workers.dev`).

**Technologie** : Next.js 15 (App Router), React 19, Tailwind 4. Deux modes : serveur (API + PostgreSQL) et export HTML statique (`NEXT_PUBLIC_PREVIEW=1`), qui est la version publiée sur Cloudflare. Le contenu est rendu dans le HTML initial (pas de dépendance au JavaScript pour le texte).

### Problèmes trouvés, par priorité

| Priorité | Problème | État |
|---|---|---|
| Bloquant | Tout le site public était en `noindex, nofollow` et `robots.txt` interdisait tout (réglage prévu pour l'aperçu GitHub Pages). | Corrigé : `NEXT_PUBLIC_INDEXABLE=1` dans le build Cloudflare. GitHub Pages reste non indexé. |
| Bloquant | Le site présentait le serveur comme ouvert : bouton « Jouer », IP à copier, « Prêt en 30 secondes », « Voter maintenant », FAQ « rejoins avec l'IP ». | Corrigé : stade de projet `LAUNCH.stage` (prelaunch / beta / open) qui pilote bandeau, CTA, IP, FAQ, votes, événements. |
| Haute | ~30 pages indexables vides dans l'export statique (carte, empires, guerres, classements, boutique, saisons, news…) : « momentanément indisponible ». | `noindex, follow` en export statique (option `live` de `pageMeta`) et retirées du sitemap. Elles redeviennent indexables en mode serveur. |
| Haute | Accueil : H1 = logo seul, sections vides (carte, empires, guerres, votes, événements) et FAQPage en double avec /faq. | Accueil réécrit : H1 « VÆLORIA, serveur Minecraft Faction & PvP français », texte de fond, 6 piliers reliés aux pages de détail, guides, FAQ. Sections en direct affichées seulement avec des données. |
| Haute | Sitemap avec des URL sans `/` final alors que l'export sert `/page/` (redirection à chaque URL), et des pages vides. | Sitemap = uniquement les URL canoniques indexables, avec `/` final (33 URL). |
| Haute | `og:image` absente de toutes les pages sauf l'accueil (les métadonnées par page écrasaient l'image). | Image 1200×630 déclarée dans `pageMeta`. |
| Moyenne | Redirections de `next.config.ts` (`/events`, `/leaderboards`, `/shop`, `/carte`…) inopérantes en export : doublons servis en 200. | `_redirects` Cloudflare (301) copié dans `out/`. |
| Moyenne | En-têtes de sécurité absents en export statique. | `_headers` Cloudflare (nosniff, X-Frame-Options, HSTS, cache long des fichiers versionnés). |
| Moyenne | Titres avec la marque en double (« Les empires de VÆLORIA · VÆLORIA ») ; H1 non descriptifs (« Claim. Pille. Domine. », « Prêt en 30 secondes ») ; plusieurs pages visant la même requête. | Titres et H1 réécrits, une intention par page (section 2). |
| Moyenne | Pages placeholder `…/indisponible` générées pour les routes dynamiques, sans `noindex`. | `NOT_FOUND_META` (`noindex, nofollow`). |
| Basse | Cartes en `<p>` au lieu de titres ; pas de table dans les guides ; pas de date de mise à jour. | `<h3>` dans les cartes, tableaux Markdown, date + JSON-LD `Article` sur les guides. |

Vérifié après correction : 0 lien interne cassé, 1 seul H1 par page indexable, titres uniques, aucune erreur console ni débordement horizontal (390 px et 1366 px) sur l'accueil, /factions, /pvp, /evenements, /fonctionnalites et un guide.

### Points de vigilance (décisions du propriétaire)

- **« Serveur Faction sans pay-to-win » : à ne pas cibler en l'état.** `docs/MONETIZATION.md` dit « aucun avantage de combat vendu », mais le catalogue d'exemple (`apps/api/src/shopSeed.ts`) vend des kits en diamant, des spawners et des diamants. Revendiquer « sans pay-to-win » serait trompeur et ferait réagir la communauté. Soit le catalogue change, soit cette famille de mots-clés est abandonnée.
- **Domaine définitif.** Tout le référencement acquis sur `vaeloria-site.paysapro-prospection.workers.dev` devra être transféré par des redirections 301 vers `vaeloria.fr` (ou autre). Plus tôt le domaine est en place, moins on perd. Voir section 7.
- **Liens sociaux** (`LINKS` dans `packages/config`) : l'invitation Discord et les comptes TikTok/YouTube/Instagram sont marqués « à remplacer ». Un lien Discord invalide casse le principal appel à l'action.

## 2. Architecture des mots-clés

Les expressions ci-dessous sont des **hypothèses**, pas des volumes validés. Une requête principale par page pour éviter la cannibalisation.

| Page | Requête principale (hypothèse) | Intention | Requêtes secondaires |
|---|---|---|---|
| `/` | serveur minecraft faction français | Trouver un serveur | serveur faction fr, vaeloria |
| `/factions` | serveur minecraft faction | Comparer les règles d'un serveur | serveur pvp faction, faction minecraft règles |
| `/pvp` | serveur minecraft pvp 1.8 | Trouver un serveur au combat 1.8 | serveur pvp 1.8.9, pvp 1.8 en 1.21 |
| `/fonctionnalites` | fonctionnalités serveur faction | Évaluer l'offre complète | serveur faction 1.21 |
| `/economie` | économie minecraft faction | Comprendre l'économie | marché dynamique, générateurs, hdv |
| `/evenements` | événements pvp faction | Connaître les événements | koth, totem, guerre de factions |
| `/faq` | (questions longues) | Réponses rapides | ip, version, bêta, ouverture |
| `/guides/comment-commencer` | guide débutant faction | Apprendre | comment jouer faction minecraft |
| `/guides/power-faction` | power faction minecraft | Apprendre une mécanique | perdre du power, régénération power |
| `/guides/comment-claim` | claim faction minecraft | Apprendre | /f claim, protéger sa base |
| `/guides/surclaim` | surclaim faction | Apprendre | overclaim minecraft |
| `/guides/faire-un-raid` | raid faction minecraft | Apprendre | raid tnt, obsidienne tnt |
| `/guides/comment-pvp` | pvp 1.8.9 astuces | Progresser | w-tap, combo pvp |
| `/guides/creer-une-faction` | créer une faction minecraft | Apprendre | /f creer |
| `/guides/gagner-de-l-argent` | gagner de l'argent faction | Apprendre | farm argent minecraft |
| `/guides/obtenir-des-spawners` | spawner faction | Apprendre | générateur de mobs |
| `/guides/participer-koth` | koth minecraft | Apprendre | koth faction stratégie |
| `/beta` | bêta serveur minecraft faction | Agir | candidater bêta |

**Validation à faire, gratuitement :**
1. Google Search Console → Performances → Requêtes : quelles requêtes affichent déjà le site, avec quelles pages. C'est la seule source fiable.
2. Suggestions de saisie Google et « Autres questions posées » sur chaque requête (navigation privée, google.fr).
3. Google Trends (France) pour comparer « serveur faction », « pvp faction », « serveur pvp 1.8 » dans le temps.
4. Recherche manuelle des 10 premiers résultats de chaque requête : type de page qui se classe (annuaire, site de serveur, vidéo) pour ajuster le format.
5. Après 4 à 6 semaines d'indexation : réattribuer les requêtes si deux pages apparaissent sur la même.

## 3. Optimisations techniques réalisées

- `lib/preview.ts` : `INDEXABLE` (export statique indexable si `NEXT_PUBLIC_INDEXABLE=1`).
- `lib/launch.ts` + `LAUNCH` dans `packages/config` : stade du projet, CTA, phrases d'état. `NEXT_PUBLIC_LAUNCH_STAGE` force le stade au build.
- `lib/seo.tsx` : canonical avec `/` final en export, image OG, option `live` (noindex des pages vides en export), `absoluteTitle`, `NOT_FOUND_META`, JSON-LD `WebSite`.
- `app/sitemap.ts`, `app/robots.ts` : uniquement les pages indexables ; sitemap déclaré dans robots.txt.
- `app/layout.tsx` : bandeau d'état du projet, balise Google Search Console (`NEXT_PUBLIC_GSC_VERIFICATION`), Cloudflare Web Analytics optionnel (`NEXT_PUBLIC_CF_BEACON_TOKEN`).
- `static-host/_redirects`, `static-host/_headers` : copiés dans `out/` par `build:preview`.
- Données structurées : `Organization` (toutes pages), `WebSite` (accueil), `BreadcrumbList` (pages internes), `FAQPage` (/faq seulement), `Article` (guides). **Pas** de `VideoGame`/`GameServer` ni de note : rien ne les justifie avant l'ouverture.

**Performance** : HTML statique servi par Cloudflare, polices auto-hébergées, aucun appel à l'API côté navigateur en export, images de marque en SVG (2 à 3 Ko). Cache d'un an sur `/_next/static/*`. À mesurer après mise en ligne : PageSpeed Insights (labo) puis rapport Core Web Vitals de la Search Console (terrain, quand il y aura assez de trafic).

## 4. Pré-lancement et ouverture

Le stade se change à un seul endroit : `LAUNCH.stage` dans `packages/config/src/index.ts`.

| Stade | Bandeau | CTA principal | IP | Votes / événements |
|---|---|---|---|---|
| `prelaunch` (actuel) | « en développement » | Rejoindre le Discord, puis Candidater à la bêta | masquée | « ouvriront avec le serveur », programme « prévu à l'ouverture » |
| `beta` | « bêta fermée » | Candidater aux tests | masquée | idem |
| `open` | aucun | Jouer maintenant | affichée | en direct |

Passer à `open` **le jour où l'IP accepte réellement les joueurs**, et seulement si l'API est déployée (sinon les pages en direct restent vides). Les pages de connexion, compte et boutique ne sont pas supprimées : elles sont en `noindex` dans l'export statique.

## 5. Calendrier éditorial (12 semaines)

Une publication par semaine, en guide (`content/guides.ts`) ou en article de journal. Chaque contenu cite des valeurs réelles de la configuration. CTA : Discord / bêta tant que le stade n'est pas `open`.

| Sem. | Sujet | Mot-clé principal | Intention | Titre SEO | H1 | Plan | Liens internes | CTA |
|---|---|---|---|---|---|---|---|---|
| 1 | Bouclier de faction | bouclier faction minecraft | Comprendre | Bouclier de faction : bien choisir ses 6 h | Le bouclier de faction | Principe · ce qu'il bloque (surclaim) et ne bloque pas (TNT) · choisir sa plage · délai de changement | /guides/surclaim, /guides/faire-un-raid | Discord |
| 2 | Obsidienne rare | obsidienne faction | Comprendre | Obsidienne en Faction : rare et anti-TNT | L'obsidienne sur VÆLORIA | Pourquoi rare · éclats de deepslate · achat au marché · usage défensif · seule faille : le surclaim | /guides/faire-un-raid, /economie | Discord |
| 3 | Comparatif PvP 1.8 / 1.9 | pvp 1.8 vs 1.9 | Comparer | PvP 1.8 ou 1.9 : ce qui change vraiment | PvP 1.8 contre PvP 1.9 | Cooldown · balayage · knockback · netherite · pourquoi le Faction préfère la 1.8 | /pvp, /guides/comment-pvp | Bêta |
| 4 | Journal de dev #1 : le combat | serveur faction en développement | Suivre | Journal #1 : régler le combat 1.8 en 1.21 | Comment on a réglé le combat | Choix techniques · tests à deux · MSPT · ce qui reste à faire | /pvp, /beta | Bêta |
| 5 | Guerres de factions | guerre de factions minecraft | Comprendre | Guerres de factions : score, durée, règles | Les guerres de factions | Déclarer · préparation · score kill/raid/surclaim · cooldown | /evenements, /guides/surclaim | Discord |
| 6 | Avant-postes | avant-poste faction | Comprendre | Avant-postes : revenus et power pour ta faction | Les avant-postes | Capture · revenu · bonus de power · défendre | /evenements, /guides/power-faction | Discord |
| 7 | Organiser sa faction | organiser une faction minecraft | Apprendre | Organiser sa faction : rôles et permissions | Organiser sa faction | Rôles · permissions sensibles · banque · missions · horaires | /guides/creer-une-faction | Discord |
| 8 | Défendre sa base | défendre base faction | Apprendre | Défendre sa base en Faction : le guide | Défendre sa base | Placement · couches · bords vides · alerte de raid · bouclier | /guides/faire-un-raid, /guides/comment-claim | Bêta |
| 9 | Marché dynamique | économie dynamique minecraft | Comprendre | Marché dynamique : pourquoi varier ses farms | Le marché dynamique | Baisse des prix · demi-vie de 8 h · cours du jour · stratégies | /economie, /guides/gagner-de-l-argent | Discord |
| 10 | Journal de dev #2 : bêta | bêta serveur faction | Agir | Journal #2 : ce que la bêta va tester | Ce que la bêta va tester | Objectifs · profils recherchés · déroulé · comment candidater | /beta, /fonctionnalites | Bêta |
| 11 | Choisir un serveur Faction | comment choisir un serveur faction | Comparer | Choisir un serveur Faction : 7 critères | Bien choisir son serveur Faction | Version et combat · règles de raid · économie · boutique · staff · performances · communauté (honnête, sans dénigrer d'autres serveurs) | /factions, /fonctionnalites, /pvp | Discord |
| 12 | Préparer l'ouverture | ouverture serveur faction | Agir | Ouverture de VÆLORIA : se préparer | Préparer l'ouverture | Date (si confirmée) · checklist joueur · premières heures · factions qui recrutent | /guides/comment-commencer, /jouer | Selon le stade |

À chaque publication : ajouter la page au maillage (« À lire aussi » des guides proches), la partager sur Discord, et demander l'indexation dans la Search Console.

## 6. Autorité et acquisition de liens (gratuit et légitime)

- **Annuaires de serveurs Minecraft francophones** : fiche complète dès que l'IP existe (description originale, pas copiée du site ; bannière ; lien vers `/` ou `/factions`). Les mêmes sites serviront aux votes : choisir les 3 sites de `VOTE_SITES` parmi eux.
- **Fiches** : Discord (serveurs publics), Google Business n'est pas pertinent (pas de lieu physique).
- **Créateurs** : page `/creators` existante. Proposer aux créateurs Faction FR un accès bêta et un code créateur ; leur demander de lier `/factions` ou `/pvp` en description, pas seulement le Discord.
- **YouTube / TikTok** : une vidéo par mécanique (surclaim, raid à la TNT, combat 1.8) avec le lien vers le guide correspondant en description et en commentaire épinglé.
- **Communautés** : Reddit (r/Minecraft FR, r/france selon les règles), forums et Discord où la promotion est autorisée. Partager les guides, pas des annonces.
- **Ressources citables** : le tableau des valeurs de power, le comparatif PvP 1.8 / 1.9 et le guide des raids sont conçus pour être cités. Les tenir à jour.
- **À ne jamais faire** : votes automatisés, faux avis, achat de liens, réseaux de sites, commentaires en masse.

## 7. Mesure

**À brancher (accès externe nécessaire) :**
1. **Google Search Console** : ajouter une propriété « préfixe d'URL » pour `https://vaeloria-site.paysapro-prospection.workers.dev/` (une propriété « domaine » est impossible sur `workers.dev`). Choisir la validation par balise HTML, copier seulement la valeur `content`, la mettre dans la variable de build `NEXT_PUBLIC_GSC_VERIFICATION` (Cloudflare → Worker `vaeloria-site` → Settings → Builds → Variables), relancer un build, valider, puis soumettre `sitemap.xml`.
2. **Mesure d'audience sans cookie** : Cloudflare Web Analytics → ajouter le site → copier le jeton dans `NEXT_PUBLIC_CF_BEACON_TOKEN`. Aucun bandeau de consentement nécessaire (pas de cookie, pas de donnée personnelle). Mettre à jour `/cookies` et `/confidentialite` en le mentionnant.
3. **Domaine définitif** : quand il existe, le relier au Worker (Custom domain), changer `NEXT_PUBLIC_SITE_URL` dans le script `build` de la racine, ajouter une propriété Search Console « domaine » (validation DNS), et faire rediriger l'adresse `workers.dev` en 301 vers le domaine. Puis outil « Changement d'adresse » de la Search Console.

**Indicateurs :**

| Indicateur | Source | Remarque |
|---|---|---|
| Pages indexées | Search Console → Pages | Comparer aux 33 URL du sitemap ; examiner les « explorées, non indexées ». |
| Impressions, clics | Search Console → Performances | Par page et par requête. |
| Requêtes | Search Console → Performances | Vérifie les hypothèses de la section 2. |
| CTR | Search Console | Réécrire titre et description des pages à forte impression et faible CTR. |
| Position moyenne | Search Console | **Moyenne** de toutes les impressions, variable selon le lieu et l'appareil : ce n'est pas un classement fixe. Suivre la tendance. |
| Clics vers le Discord | Vues de la page `/discord` (tous les CTA y passent) dans Cloudflare Web Analytics | L'invitation Discord peut aussi compter les arrivées (lien d'invitation dédié au site). |
| Inscriptions à la bêta | Discord (candidatures) ; formulaire `/beta` en mode serveur (`beta_signup`) | |
| Joueurs venus de la recherche après l'ouverture | Question « Comment nous as-tu connus ? » à l'inscription ou code `/rejoindre?invitation=` | Le site ne peut pas relier seul une visite à une connexion en jeu. |

Revue mensuelle : pages indexées, top 20 requêtes, pages à faible CTR, contenu du mois suivant.
