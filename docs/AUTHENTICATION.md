# Authentification

Statut : **implémentée** avec la boutique (code testé ; connexion Discord réelle à activer avec l'identifiant et le secret de l'application Discord). `/account` redirige vers `/compte`.

Fichiers : `apps/api/src/services/identity.ts`, `apps/api/src/routes/internal.ts` et `me.ts`, `apps/web/app/api/auth/*`, `apps/web/lib/session.ts`.

En développement uniquement, `DEV_LOGIN=1` (API et site) permet de se connecter sans Discord ; l'API refuse de démarrer en production avec ce réglage.

## Comptes e-mail + mot de passe

Chacun peut créer son compte sur `/login?mode=inscription` (pseudo, e-mail, mot de passe), sans dépendre de Discord. Le bouton Discord n'apparaît que si `DISCORD_CLIENT_ID` est configuré.

- Mots de passe hachés avec **scrypt** (N=2^14, r=8, p=1, sel aléatoire) ; jamais stockés ni journalisés en clair. 10 caractères minimum, mots de passe triviaux refusés.
- E-mail unique, insensible à la casse.
- Connexion : même message et même durée pour « e-mail inconnu » et « mauvais mot de passe » ; **verrou de 15 min après 10 échecs** sur un e-mail ; limites par visiteur (le site relaie l'IP) : 5 inscriptions / heure, 20 connexions / 10 min.
- Inscription = même parcours que Discord : numéro de fondateur, parrainage (cookie `vae_ref`).
- Le site appelle `POST /internal/v1/auth/register|login` côté serveur (jeton `WEB_INTERNAL_TOKEN`), puis pose le cookie de session.
- Non fait : vérification de l'e-mail et « mot de passe oublié » (nécessitent un service d'envoi d'e-mails, à brancher avant l'ouverture publique).

## Principes

- **Discord OAuth 2** reste disponible en option (la communauté y est déjà).
- Le compte Minecraft est lié par une **preuve de possession en jeu** (`/link`), pas par simple saisie d'un pseudo.
- L'e-mail sert d'identifiant de connexion ; il n'est jamais affiché publiquement (reçus d'achat : fournis par le prestataire de paiement).

## Flux prévu

1. `GET /api/auth/discord` (site) → redirection Discord (scope `identify`, `state` aléatoire en cookie HttpOnly).
2. `GET /api/auth/callback` (site) vérifie `state`, puis appelle l'API `POST /internal/v1/auth/discord` (jeton `WEB_INTERNAL_TOKEN`) qui échange le code et crée/MAJ `users` + `discord_accounts`.
3. Session : jeton aléatoire 256 bits en cookie `HttpOnly; Secure; SameSite=Lax`, seul son SHA-256 est stocké (`sessions.token_hash`), expiration 30 jours glissants.
4. Liaison Minecraft : `/link` en jeu → le plugin demande un code à l'API (`POST /bridge/v1/link-codes`, 10 min, usage unique) → saisie sur `/compte` → `minecraft_accounts`.
5. Le site transmet la session à l'API côté serveur (`Authorization: Session <jeton>`) ; le navigateur ne voit jamais le jeton.
6. Déconnexion (`POST /api/auth/logout`, contrôle d'origine) : suppression de la ligne `sessions`.

## Rôles et accès au back-office

`users.role` : `player`, `moderator`, `admin`, `owner`. **Le back-office (`/admin`) s'ouvre avec un compte du site ayant le rôle `admin` ou `owner`** : son middleware vérifie le cookie de session auprès de l'API à chaque requête ; sans session → page de connexion du site ; joueur → 403. Les appels du back-office à l'API restent signés par `ADMIN_API_TOKEN`, côté serveur uniquement.

Premier propriétaire :
1. Au déploiement, définir `ADMIN_SETUP_CODE` (16 caractères min., ex. `openssl rand -hex 16`) dans `deploy/.env`.
2. Créer son compte sur le site, puis **Mon compte → Accès équipe** → saisir le code → rôle `owner` (tentatives limitées à 5 / heure, toutes journalisées).
3. Vider `ADMIN_SETUP_CODE` et redémarrer l'API.

Ensuite, le propriétaire ajoute l'équipe dans **Admin → Équipe** (par e-mail d'un compte existant). Il reste toujours au moins un propriétaire. Basic Auth (`ADMIN_USER`/`ADMIN_PASSWORD`) n'est plus qu'un secours facultatif.

## Microsoft / Minecraft OAuth

Possible plus tard (Xbox Live → Minecraft Services) pour prouver la possession sans passer par le jeu ; non retenu au départ : flux plus lourd, approbation Microsoft requise, et `/link` suffit.
