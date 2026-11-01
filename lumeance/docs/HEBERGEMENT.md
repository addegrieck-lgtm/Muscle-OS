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

## Cloudflare Workers (configuration retenue)
Le projet est prêt : adaptateur OpenNext (`@opennextjs/cloudflare`), `wrangler.jsonc` (Worker `lumeance`), `open-next.config.ts`.
Les pages de la boutique sont rendues à chaque requête : un produit publié dans l’administration apparaît aussitôt, sans cache R2.

**Création du Worker** — Cloudflare → *Workers & Pages* → *Create* → *Import a repository* → dépôt `Muscle-OS` :
| Champ | Valeur |
|---|---|
| Project name | `lumeance` (doit correspondre à `name` dans `wrangler.jsonc`) |
| Production branch | `main` |
| Root directory | `lumeance` |
| Build command | `npx opennextjs-cloudflare build` |
| Deploy command | `npx opennextjs-cloudflare deploy` |

**Variables** — les `NEXT_PUBLIC_*` sont figées dans le code au moment du build ET relues par le serveur : les mettre aux deux endroits.
| Nom | Build variables | Variables and Secrets (exécution) |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✔ | ✔ (texte) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✔ | ✔ (texte) |
| `NEXT_PUBLIC_SITE_URL` (`https://lumeance.<compte>.workers.dev`, puis le domaine) | ✔ | ✔ (texte) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✘ | ✔ (**Secret**) |

Après tout changement de variable : relancer un déploiement (*Deployments* → *Retry*, ou nouveau push).
Supabase → *Authentication* → *URL Configuration* : *Site URL* = l’adresse du Worker (puis le domaine final).

Vérification locale du rendu Workers : `npm run cf:preview` (http://localhost:8787).
