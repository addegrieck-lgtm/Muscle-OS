# Avancement de la construction

Dernière mise à jour : 7 octobre 2026. « Testé » = vérifié par un test automatisé ou une exécution réelle décrite ici ; rien n'est déclaré terminé sans cela.

## Synthèse

| # | Phase | Statut | % |
|---|---|---|---|
| 1 | Architecture | ✅ Terminée | 100 |
| 2 | Design system | ✅ Terminée | 90 |
| 3 | Homepage | ✅ Terminée | 95 |
| 4 | Pages serveur | ✅ Terminée (contenus légaux à renseigner) | 90 |
| 5 | API | 🟡 Avancée | 85 |
| 6 | Database | ✅ Terminée | 90 |
| 7 | Authentication | ✅ Comptes e-mail + mot de passe, rôles, accès admin ; Discord optionnel ; e-mails (vérification, oubli) à faire | 90 |
| 8 | Minecraft Bridge | 🟡 Avancée, pas encore testée sur un vrai serveur Paper | 75 |
| 9 | Profils joueur / faction | ✅ Terminée | 85 |
| 10 | Classements | ✅ Terminée | 85 |
| 11 | Événements | 🟡 Affichage + admin, sans rappels | 70 |
| 12 | Admin | 🟡 Fonctionnel | 70 |
| 13 | Architecture boutique | 🟢 Boutique complète (voir `SHOP_BUILD_PROGRESS.md`) | 95 |
| 14 | Intégration paiement | 🟡 Stripe prêt + prestataire de test ; prestataire réel à choisir | 60 |
| 15 | Analytics | 🟡 Collecte + funnel + UTM | 70 |
| 16 | Sécurité | 🟡 Base solide, CSP et auth admin à faire | 60 |
| 17 | Performance | 🟡 Mesures de build, Lighthouse à faire | 60 |
| 18 | SEO | ✅ Technique en place | 80 |
| 19 | Bêta | 🟡 Inscription testée, trailer à fournir | 70 |

## Tests exécutés

| Suite | Résultat |
|---|---|
| API — intégration sur PostgreSQL 16 (`apps/api/test`) | 33 / 33 ✅ |
| Site — Markdown/XSS, guides (`apps/web/test`) | 4 / 4 ✅ |
| Plugin — signature, spool disque (`gradle build`) | 3 / 3 ✅ |
| Typecheck de tout le workspace | ✅ |
| Build production site (47 pages), admin, API | ✅ |
| Build du site **avec l'API coupée** | ✅ (dégradation propre) |
| E2E navigateur (Playwright) : 29 URL du site (200/404/redirections attendus) | ✅ |
| E2E : inscription bêta, doublon refusé, copie IP, événements analytics en base | ✅ |
| E2E admin : auth, 10 écrans, création news → visible sur l'API, création produit, maintenance on/off | ✅ |
| Client Java du plugin → API réelle (événements acceptés, mauvais secret 401, statut en ligne) | ✅ |
| Sauvegarde `pg_dump` → restauration → comptes identiques | ✅ |
| Export statique « aperçu » servi sous /Muscle-OS : 43 pages explorées, 0 lien cassé, 0 erreur JS | ✅ |
| Docker (Dockerfile, Compose prod) | ⚠️ Non testé : Docker indisponible dans l'environnement de développement |
| Plugin sur un vrai serveur Paper 1.21 | ⚠️ Non testé |

## Détail par phase

### 1. Architecture — 100 %
- Fichiers : `pnpm-workspace.yaml`, `apps/*`, `packages/*`, `docs/*`.
- Problèmes : aucun.

### 2. Design system — 90 %
- Fichiers : `packages/ui/src/*`, `packages/config/theme.css`.
- Composants : Button/ButtonLink, Card, Badge, Container, Section, SectionHeader, EmptyState, Skeleton, Modal, Table, LeaderboardTable, PlayerCard, FactionCard, EventCard, NewsCard, StatCard, StatusIndicator, ServerStatusLine, CopyIpButton. Navbar/Footer dans `apps/web/components`.
- Prochaine étape : page de démonstration des composants si l'équipe grandit.

### 3. Homepage — 95 %
- Fichier : `apps/web/app/page.tsx`. 14 sections dans l'ordre demandé, statut et joueurs réels uniquement.
- Prochaine étape : vidéo/trailer quand disponible (lazy, sans autoplay son).

### 4. Pages serveur — 90 %
- Toutes les pages du §43 + bêta, créateurs, pages légales.
- Problèmes : informations légales `[À RENSEIGNER]` ; valeurs de gameplay `[À CONFIRMER]` dans les guides ; lien Discord provisoire dans `packages/config/src/index.ts`.

### 5. API — 85 %
- Fichiers : `apps/api/src/**`. Routes v1, publique, bridge, admin ; OpenAPI.
- Manque : création/révocation de clés API publiques depuis l'admin ; webhooks Discord sortants ; SSE.

### 6. Database — 90 %
- Fichiers : `apps/api/migrations/001_init.sql`, `src/migrate.ts`, `src/seed.ts`.
- Manque : purge planifiée (`bridge_nonces`, vieux `analytics_events`).

### 7. Authentication — 10 %
- Tables prêtes. Prochaine étape : Discord OAuth, sessions, `/link`, espace `/account`.

### 8. Minecraft Bridge — 75 %
- Fichiers : `plugins/vaeloria-bridge/**`. JOIN/QUIT/KILL/HEARTBEAT, file disque, commandes web, `/vbridge`, API `emit()`.
- Prochaine étape : test sur serveur Paper de développement ; brancher le plugin Factions/KOTH choisi ; `/link`.

### 9–10. Profils & classements — 85 %
- Profils partageables (`/player/Adrien`), metadata dynamiques, 7 classements paginés.
- Manque : historique multi-saisons sur les profils ; instantané automatique de fin de saison.

### 11. Événements — 70 %
- Création depuis l'admin, affichage. Manque : rappels « KOTH dans 10 minutes » (Discord + en jeu).

### 12. Admin — 70 %
- Dashboard, joueurs (recherche pseudo/ancien pseudo/UUID/Discord/faction), fiche joueur, serveur (maintenance, incidents), file de commandes (relance, commande manuelle), CRUD news/événements/boutique/FAQ, marketing/funnel, coûts.
- Manque : sanctions, gestion de saison, bannières, rôles staff.

### 13–14. Boutique & paiement — 70 % / 15 %
- Cœur financier testé. Le bouton d'achat est volontairement inactif tant qu'aucun prestataire n'est branché.

### 15. Analytics — 70 %
- Collecte first-party sans cookie, opt-out, DNT/GPC, UTM conservés sur la session, funnel complet dans `/admin/marketing`.

### 16–18. Sécurité, performance, SEO
- Voir `SECURITY.md`, `SCALABILITY.md`. SEO : metadata par page, canonical, OpenGraph + image générée, sitemap dynamique, robots, JSON-LD Organization/BreadcrumbList/FAQPage/Article.

### 19. Bêta — 70 %
- `/beta` : compte à rebours, inscription (pseudo + e-mail facultatif + code de parrainage), compteur affiché seulement à partir de 50 inscrits.

## V2 — Portail du monde (7 octobre 2026)

Identité visuelle inchangée : toutes les nouvelles pages sont construites avec `@vaeloria/ui` et les jetons de `theme.css`. Aucune donnée fictive hors développement (`db:seed --demo`).

| Fonctionnalité | État | Vérification |
|---|---|---|
| Accueil V2 (hero, monde, empires, fondateurs, guerres, classement, Conseil, événements, journal) | ✅ | Build, captures mobile/desktop, aperçu sur base vide (0 / 3 000, états vides) |
| Fondateurs : numéro sans trou, plafond et ouverture configurables, paliers avec révélation | ✅ | Tests API ; E2E : inscription → fondateur #19 puis #20 |
| Parrainage `/invite/CODE` : clic, attribution, qualification à la liaison Minecraft, anti-abus | ✅ | Tests API ; E2E : clic enregistré, cookie, parrainage `pending` en base ; rejet depuis l'admin |
| Influence (grand livre idempotent, plafonds, compte lié requis, recalcul) | ✅ | Tests API |
| Empires : création (nom, tag, devise, couleur, blason), rejoindre (recrutement / code), quitter, gestion par le chef, partage | ✅ | Tests API ; E2E : création → « Votre empire est né. » → fiche « Tu diriges cet empire » |
| Guerres (admin ou bridge `WAR_START`/`WAR_END`), fiche avec chronologie | ✅ | Tests API ; E2E admin : déclaration → visible sur l'API publique |
| Carte du monde (zones configurables, territoires depuis les claims, événements en direct) | ✅ | Tests API ; rendu desktop/mobile |
| Classements (7 catégories) | ✅ | Build ; routes 200 |
| Événements en direct / à venir / passés, fiche, `KOTH_START`, `EVENT_START`/`EVENT_END` | ✅ | Tests API ; routes 200 |
| Conseil : un vote par compte, éligibilité « compte lié », historique | ✅ | Tests API ; E2E : vote enregistré, bouton retiré |
| Profils `/joueur/[username]` (fondateur, empire, badges, victoires/défaites) | ✅ | Build ; redirection `/player/*` |
| Journal, roadmap interactive, page Jouer | ✅ | Routes 200 |
| Navigation V2 + menu mobile | ✅ | Captures ; corrige un défaut existant (menu mobile tronqué par le `backdrop-filter` du header) |
| Redirections `/leaderboards`, `/events`, `/player/*`, `/carte` ; sitemap et robots étendus | ✅ | Vérifiées en HTTP |
| Analytics V2 (CTA, vues carte/empire/guerre/événement/classement, partage, inscription, fondateur, empire, parrainage, vote) + parcours dans `/admin/marketing` | ✅ | Événements en base pendant l'E2E |
| Admin → Monde (9 écrans) | ✅ | 10 écrans en 200 ; E2E : réglages, guerre, rejet de parrainage |
| Plugin : émission des nouveaux événements | 🟡 | Format documenté (`MINECRAFT_INTEGRATION.md`) ; à brancher dans les plugins Factions/KOTH/événements choisis |
| Image OpenGraph propre à chaque empire | ⬜ | Non fait (image du site utilisée) |

Tests de cette étape : API 90 / 90 ✅, site 4 / 4 ✅, typecheck du workspace ✅, build production du site ✅ (toutes les routes V2), build admin ✅, export statique de l'aperçu sur une base neuve (sans `--demo`) ✅ : 16 pages et 34 liens internes vérifiés, 0 erreur JS, 0 débordement horizontal à 390 px, aucun nom d'empire de démonstration présent. E2E navigateur du parcours joueur complet : 0 erreur console.

Limites connues : le compteur et les listes publiques sont mis en cache 10 à 60 s (une action apparaît sur les pages publiques avec ce délai ; l'îlot personnel est immédiat). Les parrainages et votes d'un même foyer ne sont pas distingués au-delà de « un compte Discord = une personne » et du plafond quotidien.

## Comptes et accès au back-office (8 octobre 2026)

| Fonctionnalité | État | Vérification |
|---|---|---|
| Inscription / connexion e-mail + mot de passe (scrypt, verrou, limites) | ✅ | 6 tests API ; E2E navigateur |
| Formulaire conservé après une erreur (pseudo, e-mail, case) | ✅ | E2E |
| Back-office protégé par le compte du site (rôle admin/owner) | ✅ | E2E : sans session → connexion ; joueur → 403 ; propriétaire → 200 |
| Premier propriétaire par `ADMIN_SETUP_CODE` (Mon compte → Accès équipe) | ✅ | Tests API + E2E (mauvais code refusé et journalisé) |
| Admin → Équipe : donner / retirer l'accès par e-mail, dernier propriétaire protégé | ✅ | Tests API + E2E (second compte devient admin et entre) |
| Vérification d'e-mail, mot de passe oublié | ⬜ | Nécessite un service d'envoi d'e-mails |

Tests : API 96 / 96.

## Décisions attendues du propriétaire

1. Prestataire de paiement (Stripe / PayPal / Tebex).
2. Plugin Factions et KOTH utilisés (pour brancher `emit()`).
3. Informations légales de la structure.
4. Lien Discord définitif et date d'ouverture de la Saison I (modifiable en base).
5. Hébergeur du VPS et du serveur Minecraft.
6. V2 : récompenses réelles des paliers fondateurs (actuellement « [À DÉFINIR] », non affichées), dates des épisodes du journal, sondages à ouvrir au Conseil.
