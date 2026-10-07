# Scalabilité, coûts et exploitation

Règle : **ne pas dépenser pour impressionner.** Chaque palier est déclenché par une métrique, pas par anticipation.

## Phase 1 — lancement (objectif : < 15 €/mois hors serveur Minecraft)

- 1 VPS (2 vCPU, 4 Go) : PostgreSQL + API + site + admin + Caddy (`deploy/docker-compose.prod.yml`).
- Cloudflare gratuit devant (CDN, cache des pages ISR et des images, protection DDoS basique).
- Cache mémoire dans l'API ; ISR côté site : la plupart des visites ne touchent ni l'API ni la base.
- Le serveur Minecraft est sur une machine séparée (ses pics CPU ne doivent pas ralentir le site).
- Sauvegarde quotidienne `deploy/backup.sh` + copie hors site.

**Passer en Phase 2 quand** : CPU du VPS > 60 % en soirée pendant une semaine, ou p95 de l'API > 300 ms, ou plusieurs serveurs Minecraft (Velocity).

## Phase 2 — croissance

- Plus de ressources sur le VPS, ou base PostgreSQL managée.
- Redis : cache partagé (même interface que `TtlCache`) + rate limiting partagé + 2 instances d'API.
- Worker séparé : notifications Discord, rappels KOTH, instantanés de fin de saison, purge des nonces et vieux événements.
- Velocity + plusieurs serveurs : chaque serveur a sa clé bridge et son `server-name` ; l'API agrège déjà les heartbeats.
- Monitoring : Uptime Kuma (auto-hébergé) + métriques machine poussées dans `infra_metrics`.

**Passer en Phase 3 quand** : la base devient le goulot (requêtes de classement > 100 ms malgré le cache), ou besoin de haute disponibilité contractuelle.

## Phase 3 — réseau établi

Load balancer, réplique en lecture pour les classements et l'admin, file de messages pour les événements bridge (le plugin n'a rien à changer : il appelle toujours la même route), services séparés si une partie (boutique, bridge) évolue à un rythme différent, monitoring avancé.

## Ce qui est déjà prêt pour scaler

API sans état (hors cache), idempotence partout (on peut rejouer), `FOR UPDATE SKIP LOCKED` pour plusieurs consommateurs de commandes, verrou de migration, sortie `standalone` de Next (image légère), en-têtes `s-maxage`/`stale-while-revalidate` pour le CDN.

## Suivi des coûts (`/admin/costs`)

Postes dans `cost_items` (seedés avec des **estimations à remplacer par les factures**), chacun avec une part variable. L'écran affiche : coût mensuel, projection à 100 et 1 000 joueurs simultanés, coût par joueur au pic des 30 derniers jours. La collecte automatique des métriques machine (`infra_metrics` : CPU, RAM, taille de base, bande passante, requêtes) reste à brancher (petit script cron qui POSTe vers l'admin).

## Sauvegardes et restauration

- Base : `pg_dump -Fc` quotidien (`deploy/backup.sh`, rétention locale 14 jours) + copie chiffrée hors site (stockage objet, rétention 30 jours).
- Configuration : `deploy/.env` et `config.yml` du plugin dans un coffre de secrets (pas dans Git).
- Médias : aucun en Phase 1 (pas d'upload) ; prévoir le stockage objet quand l'admin gérera des images.
- Logs : journaux Docker avec rotation (`max-size`).
- **Restauration** (procédure testée sur la base de développement, données identiques après restauration) :
  ```sh
  createdb -O vaeloria vaeloria_restore
  pg_restore -d vaeloria_restore --no-owner vaeloria-AAAAMMJJ.dump
  # vérifier les comptes (players, orders, news), puis basculer DATABASE_URL
  ```
- Tester une restauration complète **une fois par mois**.

## Environnements

| | development | staging | production |
|---|---|---|---|
| Base | locale (`docker-compose.dev.yml`) | séparée, données synthétiques | dédiée, sauvegardée |
| Données de démo | `db:seed --demo` | oui | interdit (refus du script) |
| OpenAPI privée | oui | oui | non |

## Performance (mesuré au build)

JavaScript au premier chargement : ~102–108 kB pour toutes les pages (React + Next ; quasi aucun JS propre aux pages). Polices auto-hébergées, aucune image lourde, fond du hero en CSS pur, images de skins en lazy loading. Audit Lighthouse sur la version déployée : à faire.
