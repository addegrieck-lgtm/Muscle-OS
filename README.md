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
| `cd plugins/vaeloria-combat && gradle build` | Jar du plugin PvP (combat 1.8, MSPT, ping) + tests |
| `cd plugins/vaeloria-arena && gradle build` | Jar du plugin d'arène de bots P4 U3 |
| `cd plugins/vaeloria-crates && gradle build` | Jar du plugin de coffres à clés + tests |
| `cd plugins/vaeloria-echanges && gradle build` | Jar du plugin d'échanges PNJ (livres, boost, capture à l'œuf) + tests |

## Documentation

- [Architecture du site](docs/SITE_ARCHITECTURE.md) · [API](docs/API_ARCHITECTURE.md) · [Base de données](docs/DATABASE.md)
- [Intégration Minecraft](docs/MINECRAFT_INTEGRATION.md) · [Performance & PvP fluide](docs/MINECRAFT_PERFORMANCE.md) · [Arène de bots P4 U3](docs/ARENA_BOTS.md) · [Coffres à clés](docs/CRATES.md) · [Échanges PNJ et économie émeraude](docs/ECHANGES.md) ([affiche joueurs](minecraft/echanges/affiche-echanges.png)) · [Warps farm par grade](minecraft/warps-farm/README.md) · [Authentification](docs/AUTHENTICATION.md) · [Sécurité](docs/SECURITY.md)
- [Monétisation](docs/MONETIZATION.md) · [Scalabilité, coûts, sauvegardes](docs/SCALABILITY.md)
- **[Avancement](docs/SITE_BUILD_PROGRESS.md)**
- Constructions : [Île Marchande flottante + ponton](minecraft/ile-commerciale/README.md) (schematics WorldEdit)

Serveur non officiel, non affilié à Mojang Studios ni à Microsoft.
