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
| Branche de production | `main` (ou `claude/pensive-faraday-ywxdas` pour tester avant la fusion) |
| Répertoire racine | `lumeance` |
| Commande de build | `npx opennextjs-cloudflare build` |
| Commande de déploiement | `npx opennextjs-cloudflare deploy` |
| Variables de **build** | `NEXT_PUBLIC_SITE_URL=https://lumeance.<votre-sous-domaine>.workers.dev` |

Plus tard : ajouter `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (build + exécution) et `SUPABASE_SERVICE_ROLE_KEY` (exécution, en secret). Domaine personnalisé : Workers → lumeance → Paramètres → Domaines et routes.
