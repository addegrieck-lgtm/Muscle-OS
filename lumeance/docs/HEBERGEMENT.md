# Hébergement et domaine

**Aucun achat ni abonnement n’a été engagé.** Domaine souhaité : `lumeance.fr` — disponibilité non vérifiée.

## Contraintes
Next.js avec rendu serveur, actions serveur, middleware et routes API : un hébergement statique (GitHub Pages) **ne convient pas**.

## Options (limites à revérifier au moment du choix)
| Option | Coût de départ | Remarques |
|---|---|---|
| Vercel Hobby | Gratuit | Idéal en développement ; l’offre gratuite est réservée à un usage non commercial → passage à l’offre payante à l’ouverture |
| Cloudflare Workers + OpenNext | Gratuit puis faible | Usage commercial possible ; adaptateur `@opennextjs/cloudflare` à ajouter ; déjà utilisé dans ce dépôt pour VÆLORIA |
| Netlify | Gratuit | Support Next.js via adaptateur, quotas de fonctions |
| VPS (Docker, `next start`) | Payant | Contrôle total, maintenance à votre charge |

Base et fichiers : **Supabase** (offre gratuite pour le développement ; mise en pause après inactivité et pas de sauvegarde à un instant donné → offre payante conseillée à l’ouverture). Choisir une région UE.

**Recommandation** : développement sur Vercel Hobby ou Cloudflare (gratuits) + Supabase gratuit ; à l’ouverture, Cloudflare Workers (OpenNext) ou Vercel Pro + Supabase Pro.

## Mise en production
1. Variables : `NEXT_PUBLIC_SITE_URL=https://lumeance.fr`, clés Supabase, `NEXT_PUBLIC_INDEXABLE=1` seulement quand contenus et pages légales sont validés.
2. DNS : apex `lumeance.fr` et `www` vers l’hébergeur ; redirection 301 `www` → apex (domaine canonique) ; HTTPS automatique.
3. Supabase : URL du site et URL de redirection d’authentification sur le domaine final.
4. Environnements distincts développement / production (deux projets Supabase).

## Déploiement Cloudflare Workers (prêt)

Le projet est configuré avec l'adaptateur OpenNext (`wrangler.jsonc`, `open-next.config.ts`). Vérifié localement dans workerd (`npm run cf:preview`).

Dans le tableau de bord Cloudflare : **Workers & Pages → Créer → Importer un dépôt Git** → `addegrieck-lgtm/Muscle-OS` :

| Réglage | Valeur |
|---|---|
| Nom du projet | `lumeance` (doit correspondre à `name` dans `wrangler.jsonc`) |
| Branche de production | `main` |
| Répertoire racine | `lumeance` |
| Commande de build | `npm ci && npx opennextjs-cloudflare build` (le `npm ci` est indispensable : la racine du dépôt est un espace pnpm et Cloudflare n'y installe pas les dépendances de `lumeance/`) |
| Commande de déploiement | `npx opennextjs-cloudflare deploy` |
| Variable de **build** | `SKIP_DEPENDENCY_INSTALL=1` (évite l'installation pnpm automatique, qui échoue ; `npm ci` s'en charge) |

Variables d'**exécution** (Settings → Variables and Secrets) : `NEXT_PUBLIC_SUPABASE_URL` (sans `/rest/v1`), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (clé publishable), `SUPABASE_SERVICE_ROLE_KEY` (type **Secret**). `NEXT_PUBLIC_SITE_URL` est fournie par `.env.production`. Les pages lisent la configuration à l'exécution : aucune variable Supabase n'est nécessaire au build. `keep_vars` (dans `wrangler.jsonc`) empêche chaque déploiement d'effacer ces variables.

Domaine personnalisé : Workers → lumeance → Paramètres → Domaines et routes.

## Supabase : installation et produits
1. SQL Editor : coller `supabase/setup.sql` (schéma, sécurité, stockage, catégories) — une fois.
2. Authentication → Users → Add user, puis `supabase/first-admin.sql` (premier super administrateur).
3. SQL Editor : coller `supabase/import-produits.sql` — importe les pièces du catalogue écrit dans le code (`lib/catalog/products.ts`) avec leurs versions, options et visuels. Sans risque à rejouer : rien d'existant n'est modifié.
4. Ensuite, les pièces se gèrent dans `/admin/products`. Après l'ajout d'une pièce dans le code : `npm run catalog:sql`, puis recoller le fichier.

Tant que Supabase n'est pas configuré, le site affiche le catalogue du code ; une fois configuré, il lit la base (vide tant que l'import n'est pas fait).
