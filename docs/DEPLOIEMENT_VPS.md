# Mettre VÆLORIA en ligne sur un VPS

Le site complet (site, API, administration, base de données, HTTPS) tourne sur **un VPS** Ubuntu ou Debian, avec Docker. Le serveur Minecraft reste chez BoxToPlay et envoie ses données à l'API grâce au plugin VaeloriaBridge.

```
Serveur Minecraft (BoxToPlay) ──VaeloriaBridge──► api.<domaine> ─┐
                                                                 ├── VPS : Caddy (HTTPS) · site · admin · API · PostgreSQL
Joueurs ──────────────────────────────────────► <domaine> ──────┘
```

## 1. DNS (chez le fournisseur du domaine)

| Type | Nom | Valeur |
|---|---|---|
| A | `@` | IP du VPS |
| A | `www` | IP du VPS |
| A | `api` | IP du VPS |
| A | `play` | IP du serveur Minecraft BoxToPlay |
| SRV | `_minecraft._tcp.play` | priorité 0, poids 5, port du serveur BoxToPlay, cible `play.<domaine>` (inutile si le port est 25565) |

Les ports **80** et **443** du VPS doivent être ouverts (certificat HTTPS automatique).

## 2. Installation (une commande, en root sur le VPS)

```sh
curl -fsSL https://raw.githubusercontent.com/addegrieck-lgtm/Muscle-OS/main/deploy/install.sh | sudo bash
```

Le script installe Docker, récupère le code dans `/opt/vaeloria`, demande le domaine et l'adresse du serveur Minecraft, **génère tous les secrets** dans `/opt/vaeloria/deploy/.env` (droits 600), vérifie le DNS, construit et démarre tout. À la fin, il affiche :

- le **code propriétaire** à saisir sur le site (Mon compte → Accès équipe) pour ouvrir `/admin` ;
- le bloc à coller dans `plugins/VaeloriaBridge/config.yml` du serveur Minecraft (URL de l'API + secret).

**Mise à jour** : relancer la même commande (le `.env` est conservé).

## 3. Serveur Minecraft (panel BoxToPlay)

1. Mettre `VaeloriaBridge` dans `plugins/` (artefact `vaeloria-bridge` du dernier build CI sur GitHub), démarrer une fois.
2. Coller le bloc affiché par le script dans `plugins/VaeloriaBridge/config.yml`.
3. `bridge: enabled: true` dans `VaeloriaVote/config.yml` et `VaeloriaShop/config.yml`.
4. Redémarrer, puis `/vbridge` en jeu : aucune erreur d'API.

## 4. Vérifications

- `https://api.<domaine>/health` → `{"ok":true}`.
- Page `/status` du site : serveur en ligne, joueurs, TPS.
- Admin → Monde : relier chaque empire à sa faction en jeu, régler les zones et les mondes de la carte.
- En jeu, `/link` : code à saisir sur le site (Mon compte) pour lier son pseudo.

## Commandes utiles (dans `/opt/vaeloria/deploy`)

| Action | Commande |
|---|---|
| Journaux de l'API | `docker compose -f docker-compose.prod.yml --env-file .env logs -f api` |
| Redémarrer | `docker compose -f docker-compose.prod.yml --env-file .env restart` |
| Sauvegarde de la base | `./backup.sh` (voir `SCALABILITY.md`) |

## État des vérifications

Vérifié : script d'installation exécuté de bout en bout (Docker simulé), images reproduites hors Docker (API sur PostgreSQL avec les seules dépendances de production, site et admin en mode `standalone`). **Pas encore vérifié : une vraie construction Docker** (Docker indisponible dans l'environnement de développement) ; le premier lancement sur le VPS en fait office.
