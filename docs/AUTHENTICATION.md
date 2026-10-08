# Authentification

Statut : **implémentée** avec la boutique (code testé ; connexion Discord réelle à activer avec l'identifiant et le secret de l'application Discord). `/account` redirige vers `/compte`.

Fichiers : `apps/api/src/services/identity.ts`, `apps/api/src/routes/internal.ts` et `me.ts`, `apps/web/app/api/auth/*`, `apps/web/lib/session.ts`.

En développement uniquement, `DEV_LOGIN=1` (API et site) permet de se connecter sans Discord ; l'API refuse de démarrer en production avec ce réglage.

## Principes

- Pas de mot de passe à gérer en Phase 1 : **Discord OAuth 2** est l'identité principale (la communauté y est déjà).
- Le compte Minecraft est lié par une **preuve de possession en jeu** (`/link`), pas par simple saisie d'un pseudo.
- E-mail uniquement si un besoin réel apparaît (reçus d'achat : fournis par le prestataire de paiement).

## Flux prévu

1. `GET /api/auth/discord` (site) → redirection Discord (scope `identify`, `state` aléatoire en cookie HttpOnly).
2. `GET /api/auth/callback` (site) vérifie `state`, puis appelle l'API `POST /internal/v1/auth/discord` (jeton `WEB_INTERNAL_TOKEN`) qui échange le code et crée/MAJ `users` + `discord_accounts`.
3. Session : jeton aléatoire 256 bits en cookie `HttpOnly; Secure; SameSite=Lax`, seul son SHA-256 est stocké (`sessions.token_hash`), expiration 30 jours glissants.
4. Liaison Minecraft : `/link` en jeu → le plugin demande un code à l'API (`POST /bridge/v1/link-codes`, 10 min, usage unique) → saisie sur `/compte` → `minecraft_accounts`.
5. Le site transmet la session à l'API côté serveur (`Authorization: Session <jeton>`) ; le navigateur ne voit jamais le jeton.
6. Déconnexion (`POST /api/auth/logout`, contrôle d'origine) : suppression de la ligne `sessions`.

## Rôles

`users.role` : `player`, `moderator`, `admin`, `owner`. L'admin passera de Basic Auth + jeton serveur à une session Discord avec rôle `admin`/`owner` (et 2FA côté Discord exigée pour le staff).

## Microsoft / Minecraft OAuth

Possible plus tard (Xbox Live → Minecraft Services) pour prouver la possession sans passer par le jeu ; non retenu au départ : flux plus lourd, approbation Microsoft requise, et `/link` suffit.
