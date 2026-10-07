# Authentification

Statut : **conçue, non implémentée** (Phase 7). Les tables existent ; `/login` explique le fonctionnement prévu sans faux formulaire ; `/account` redirige vers `/login`.

## Principes

- Pas de mot de passe à gérer en Phase 1 : **Discord OAuth 2** est l'identité principale (la communauté y est déjà).
- Le compte Minecraft est lié par une **preuve de possession en jeu** (`/link`), pas par simple saisie d'un pseudo.
- E-mail uniquement si un besoin réel apparaît (reçus d'achat : fournis par le prestataire de paiement).

## Flux prévu

1. `GET /api/v1/auth/discord` → redirection Discord (scopes `identify`, `state` aléatoire signé en cookie).
2. Callback : échange du code côté API, création/MAJ `users` + `discord_accounts`.
3. Session : jeton aléatoire 256 bits en cookie `HttpOnly; Secure; SameSite=Lax`, seul son SHA-256 est stocké (`sessions.token_hash`), expiration 30 jours glissants.
4. Liaison Minecraft : `/link` en jeu → le plugin demande un code à l'API (`link_codes`, 10 min, usage unique) → saisie sur `/account` → `minecraft_accounts`.
5. Déconnexion : suppression de la ligne `sessions`.

## Rôles

`users.role` : `player`, `moderator`, `admin`, `owner`. L'admin passera de Basic Auth + jeton serveur à une session Discord avec rôle `admin`/`owner` (et 2FA côté Discord exigée pour le staff).

## Microsoft / Minecraft OAuth

Possible plus tard (Xbox Live → Minecraft Services) pour prouver la possession sans passer par le jeu ; non retenu au départ : flux plus lourd, approbation Microsoft requise, et `/link` suffit.
