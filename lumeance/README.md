# LUMÉANCE

**L’art de révéler la lumière.** — Maison française de luminaires design haut de gamme : showroom digital immersif, boutique et administration.

Projet autonome, hébergé dans le dépôt Muscle-OS (dossier `lumeance/`, indépendant des autres projets, comme `cap52/`).

- **Stack** : Next.js 15 (App Router) · React 19 · TypeScript strict · Tailwind CSS 4 · GSAP · Three.js + React Three Fiber · Supabase (PostgreSQL, Auth, Storage) · Zod · Vitest · ESLint · Prettier
- **Sans Supabase**, le site tourne sur un **catalogue de démonstration fictif** (bandeau visible, fiches non indexées) et l’administration affiche « non configurée ».
- **Paiement en ligne désactivé (V1)** : panier fonctionnel, commande clairement fermée, architecture prête (voir `docs/PAIEMENT.md`).

## Démarrer

```sh
cd lumeance
npm ci
cp .env.example .env.local   # facultatif : clés Supabase
npm run dev                  # http://localhost:3100  (intro : une fois par session, ?intro=0 pour la passer)
```

## Commandes

| Commande | Effet |
|---|---|
| `npm run check` | typecheck + lint + tests unitaires |
| `npm test` | Tests Vitest (prix, panier, statuts, CSV, imports, formulaires, SEO) |
| `npm run test:db` | Migrations + tests RLS/règles métier sur un PostgreSQL 16 jetable |
| `npm run build` | Build de production |
| `npm run admin:init -- email@domaine.fr` | Crée le premier super administrateur (clé service_role requise) |
| `npm run brand -- <dossier .woff>` | Régénère logos SVG et tracés du lettrage |
| `npm run brand:raster` | Régénère apple-icon, image Open Graph, icônes PNG |

## Structure

```
app/(store)      site public : accueil, collections, produit, panier, maison, journal, pages légales
app/admin        back-office : connexion, tableau de bord, produits, catégories, commandes, clients,
                 médias, contenus, messages, paramètres, journal d’activité
app/api          exports CSV protégés, webhook de paiement (inactif)
components       brand · art · home · catalog · product · cart · motion · layout · admin · ui
lib              env · supabase · auth · services · validation · seo · payments · admin · content · demo
supabase         migrations SQL, seed, tests RLS
public/brand     identité vectorielle (logos, symbole, favicon, icônes)
docs             plan, avancement, sécurité, paiement, RGPD et conformité, hébergement
```

## Documentation

[Plan d’exécution](docs/PLAN.md) · [Avancement par phase](docs/STATUS.md) · [Identité](docs/IDENTITE.md) · [Sécurité](docs/SECURITE.md) · [Paiement](docs/PAIEMENT.md) · [RGPD et conformité produits](docs/RGPD.md) · [Hébergement et domaine](docs/HEBERGEMENT.md)
