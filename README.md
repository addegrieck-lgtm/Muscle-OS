# VÆLORIA

**LE RETOUR DE LA VRAIE GUERRE.** — Site officiel, API, administration et intégration Minecraft du réseau Faction & PvP français VÆLORIA (Minecraft 1.21, PvP inspiré du 1.8).

```
Minecraft ─► VæloriaBridge ─► API ─► PostgreSQL ◄─ API ◄─ Site / Admin
```

## Démarrage local

Prérequis : Node 22, pnpm 10, PostgreSQL 16 (ou `docker compose -f docker-compose.dev.yml up -d`), Java 21 + Gradle pour le plugin.

```sh
pnpm install
cp apps/api/.env.example apps/api/.env          # renseigner les secrets de dev
cp apps/web/.env.example apps/web/.env.local
cp apps/admin/.env.example apps/admin/.env.local
pnpm db:seed -- --demo                           # migrations + contenu + données FICTIVES
pnpm dev                                         # site :3000, admin :3001/admin, API :4000
```

| Commande | Effet |
|---|---|
| `pnpm test` | Tests API (PostgreSQL `DATABASE_URL_TEST`) + site |
| `pnpm typecheck` | Vérification TypeScript de tout le workspace |
| `pnpm build` | Builds de production |
| `cd plugins/vaeloria-bridge && gradle build` | Jar du plugin + tests Java |
| `cd plugins/vaeloria-fakeplayers && gradle build` | Jar du plugin de faux joueurs ([doc](plugins/vaeloria-fakeplayers/README.md)) |

## Documentation

- [Architecture du site](docs/SITE_ARCHITECTURE.md) · [API](docs/API_ARCHITECTURE.md) · [Base de données](docs/DATABASE.md)
- [Intégration Minecraft](docs/MINECRAFT_INTEGRATION.md) · [Authentification](docs/AUTHENTICATION.md) · [Sécurité](docs/SECURITY.md)
- [Monétisation](docs/MONETIZATION.md) · [Scalabilité, coûts, sauvegardes](docs/SCALABILITY.md)
- **[Avancement](docs/SITE_BUILD_PROGRESS.md)**

Serveur non officiel, non affilié à Mojang Studios ni à Microsoft.
