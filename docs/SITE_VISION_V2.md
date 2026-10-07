# VÆLORIA V2 — du site de serveur au portail d'un monde

> Règle absolue : **nouvelle expérience, identité visuelle inchangée.** Logos du pack (`brand/`), palette noir / anthracite / argent / rubis, Chakra Petch + Inter, boutons rubis, cartes `metal-border`, losange rubis, filet–losange–filet, lueur rubis : tout est réutilisé tel quel via `@vaeloria/ui` et `packages/config/theme.css`. Aucun nouveau design system, aucun décor médiéval ajouté.

## 1. Audit de l'existant (avant V2)

| Domaine | État | Décision V2 |
|---|---|---|
| Framework | Monorepo pnpm : Next.js 15 (site, admin), Fastify 5 (API), PostgreSQL 16, plugin Paper | Conservé |
| Design | Pack logo appliqué, design system `@vaeloria/ui` (Button, Card, Badge, Eyebrow, Ornament, Diamond, Table, StatCard, EmptyState…) | **Conservé tel quel**, nouveaux composants construits uniquement avec ces briques |
| Pages | Accueil, PvP, Factions, Saisons, Classements, Événements, News, Guides, FAQ, Boutique, Statut, Bêta, Créateurs, légal, profils joueur/faction, compte | Conservées ; routes françaises V2 ajoutées, anciennes adresses redirigées (`/leaderboards` → `/classements`, `/events` → `/evenements`, `/player/*` → `/joueur/*`) ; les classements détaillés `/leaderboards/*` restent, liés depuis `/classements` |
| API | `/api/v1`, `/public/v1`, `/bridge/v1` (HMAC), `/admin/v1`, boutique, webhooks | Conservée, étendue |
| Base | Joueurs, saisons, factions, claims, événements, news, boutique, points, grades, livraisons, analytics, bêta, parrainage (par UUID, inutilisé) | Étendue par `003_world.sql` |
| Comptes | Discord OAuth + sessions + liaison Minecraft `/link` | Conservés : l'inscription V2 = compte VÆLORIA |
| Boutique | Complète (points, grades, livraison) | Inchangée ; retirée de la navigation principale mais accessible (panier, menu mobile, pied de page, compte) |
| Minecraft | VæloriaBridge : événements, heartbeat, file de commandes, `/link` | Étendu : guerres, KOTH, événements |
| Aperçu GitHub Pages | Export statique avec catalogue d'exemple | Conservé : chaque nouvelle page doit s'exporter |
| SEO | Metadata, sitemap, JSON-LD, OG | Étendu aux nouvelles pages |

**Ce qui est excellent et ne bouge pas** : l'identité visuelle, l'architecture site ↔ API ↔ base (jamais de lien direct Minecraft ↔ site), l'idempotence, la sécurité du bridge, la boutique, le mode aperçu.

## 2. Ancienne vision → nouvelle vision

| Ancienne | Nouvelle |
|---|---|
| « Un serveur Minecraft PvP/Factions » | « Un monde dans lequel les joueurs construisent leur empire » |
| Le site présente le serveur | Le site **fait partie du jeu** : on y crée son empire, on recrute, on vote, on suit les guerres |
| Rien à faire avant le lancement | Avant le lancement : devenir fondateur, fonder un empire, recruter, voter au Conseil |
| CTA « Jouer » | CTA « Rejoindre VÆLORIA » + « Explorer le monde » |

Message : **LE RETOUR DE LA VRAIE GUERRE.** — *Construis ton empire. Conquiers le monde. Marque l'histoire.*

## 3. Règle des données

- **Aucun faux chiffre en production.** Compteurs, empires, membres, influence, votes : toujours réels. Avant le lancement, guerres, territoires et événements en direct affichent un état vide explicite (« Les premières guerres éclateront au lancement »).
- Les données fictives n'existent qu'en développement (`db:seed --demo`, refusé en production).
- Les contenus éditoriaux (paliers fondateurs, étapes de roadmap, épisodes du journal, zones de la carte, sondages) sont **configurables dans l'admin** ; ceux livrés par défaut sont des exemples.

## 4. Fonctionnalités

| Fonctionnalité | Sert à | Données |
|---|---|---|
| Accueil V2 | Raconter le monde dès la 1re seconde | Réelles (API) |
| Fondateurs (3 000) | Acquisition, appartenance | Numéro attribué à l'inscription (compteur sans trou), paliers configurables |
| Empires | Appartenance, recrutement, compétition | Créés par les joueurs sur le site (nom, tag, devise, couleur, blason), liés plus tard à la faction en jeu |
| Parrainage `/invite/CODE` | Recrutement | Clic → inscription → qualification (compte Minecraft lié) |
| Influence | Compétition avant le lancement | Grand livre d'influence, règles et plafonds configurables, anti-faux comptes |
| Monde / carte | Rendre le monde tangible | Zones configurables (spawn, neutre, KOTH, guerre…) + territoires synchronisés depuis le jeu |
| Guerres | Le cœur du récit | Créées par l'admin ou par le bridge (`WAR_START`/`WAR_END`) |
| Classements | Compétition | Empires (influence/puissance), guerriers, richesse, territoires, guerres, saison, recruteurs |
| Événements | Revenir | En direct / à venir, participants via le bridge |
| Conseil | Participation | Sondages, un vote par compte, résultats, historique |
| Profils joueurs | Fierté, partage | Joueur Minecraft + fondateur + empire + stats |
| Journal / roadmap | Contenu, transparence | Épisodes (vidéos, Shorts), étapes interactives |

## 5. Architecture cible

```
Minecraft ─► VæloriaBridge ─(HMAC)─► API ─► PostgreSQL ◄─ API ◄─ Site (Next, ISR + îlots interactifs)
                                         ▲
                     Site : actions joueur (créer un empire, voter, rejoindre) via routes serveur du site
```

- Pages publiques mises en cache (ISR) ; l'état personnel (« mon empire », « j'ai voté ») est chargé à part par de petits îlots client → les pages restent rapides et cachables, et exportables pour l'aperçu GitHub.
- Nouveaux événements bridge : `WAR_START`, `WAR_END`, `KOTH_START`, `EVENT_START`, `EVENT_END` (en plus des existants).

## 6. Pages et navigation

Navigation principale : **Jouer · Monde · Empires · Guerres · Classements · Événements · Conseil** + Connexion + Rejoindre (+ panier). Menu mobile : Rejoindre / Connexion en tête, navigation principale, puis Fondateurs, Boutique, Journal, Roadmap, News, Guides, FAQ, Support.

| Route | Contenu | Rendu |
|---|---|---|
| `/` | Hero « Le retour de la vraie guerre », carte, empires, fondateurs (compteur + paliers), guerres, classement, Conseil, événements, journal, jouer, FAQ, CTA final | ISR 20 s |
| `/rejoindre` | Parcours fondateur : Discord → numéro → Minecraft → empire → lien d'invitation et ses statistiques | ISR + îlot |
| `/invite/CODE` | Enregistre le clic (dédoublonné par visiteur/jour), mémorise le code 30 jours, redirige vers `/rejoindre` | serveur |
| `/fondateurs` | Compteur, paliers, registre (numéro / top recruteurs / influence) | ISR 30 s |
| `/empires`, `/empires/creer`, `/empire/[slug]` | Recherche, filtres (recrute, en guerre), tri ; création avec aperçu en direct → « Votre empire est né. » + lien d'invitation + partage ; fiche (membres, guerres, rejoindre / gérer / quitter / partager) | ISR + îlots |
| `/guerres`, `/guerre/[slug]` | En cours / déclarées / terminées ; face-à-face, horloge, territoires, chronologie | ISR 10–15 s |
| `/monde` | Carte SVG interactive : filtres Tout / Empires / Guerres / KOTH / Événements, zoom, déplacement, panneau de détail | ISR 60 s |
| `/classements`, `/classements/[categorie]` | Empires, Guerriers, Richesse, Territoires, Guerres, Saison, Recruteurs | ISR 60 s |
| `/evenements`, `/evenement/[slug]` | En direct / à venir / passés ; fiche avec compte à rebours et JSON-LD Event | ISR 30 s |
| `/conseil` | Votes ouverts (un vote par compte, définitif), décisions passées | ISR + îlot |
| `/joueur/[username]` | Profil : fondateur, empire, badges, stats, victoires / défaites de guerre | serveur (ISR 60 s) |
| `/journal`, `/roadmap`, `/jouer` | Épisodes (vidéo chargée au clic seulement), frise interactive, premiers pas | ISR / statique |

Administration : **Admin → Monde** (réglages et paliers fondateurs, empires, guerres + chronologie, Conseil, journal, roadmap, zones de carte, règles d'influence + recalcul, parrainages + rejet) et **Admin → Marketing** (parcours inscription → fondateur → compte lié → empire).

## 7. État

Voir `SITE_BUILD_PROGRESS.md` § V2 pour l'état réel et testé de chaque fonctionnalité.
