# Votes pour le serveur

Page publique : **`/vote`**. Administration : **Admin → Monde → Votes**.

Les joueurs votent pour VÆLORIA sur les sites de classement et sont récompensés en jeu. Trois sites sont préconfigurés, **désactivés** tant que la fiche du serveur n'existe pas sur chacun d'eux :

| Site | Vérification « J'ai voté » | Clé à renseigner | Délai par défaut* |
|---|---|---|---|
| serveur-prive.net | `GET https://serveur-prive.net/api/v1/servers/{clé}/votes/{ip}` → `{"success": true}` | jeton API de la fiche serveur | 1 h 30 |
| serveur-minecraft.com | `GET https://serveur-minecraft.com/api/1/vote/{clé}/{ip}/json` → `{"vote": 1}` | identifiant numérique du serveur | 3 h |
| liste-serveurs-minecraft.org | `GET https://api.liste-serveurs-minecraft.org/vote/vote_verification.php?server_id={clé}&ip={ip}&duration=5` → `1` | `server_id` | 3 h |

\* À aligner sur le délai réel affiché par chaque site (champ « Délai entre deux votes »). Les formats d'appel sont ceux des intégrations publiques de ces sites (plugin Vote d'Azuriom) ; s'ils changent, la correction se fait dans `apps/api/src/services/votes/verifiers.ts`.

## Deux canaux, un seul décompte

```
Joueur ──► site de vote ──► (1) bouton « J'ai voté » sur /vote ──► API ──► site de vote (IP du joueur)
                        └─► (2) Votifier / NuVotifier en jeu ──► VæloriaBridge ──► API (SERVER_VOTE)
```

1. **Bouton « J'ai voté »** : l'API demande au site de vote si l'IP du joueur vient de voter. Fonctionne sans aucun plugin. Compte VÆLORIA avec Minecraft lié requis (sinon personne à récompenser).
2. **Votifier** (facultatif) : si NuVotifier est installé, VæloriaBridge le détecte au démarrage et relaie chaque vote. Le site est reconnu par le champ « Nom du service Votifier » ; le joueur par son pseudo (il doit s'être déjà connecté au serveur). Aucun clic nécessaire.

Les deux canaux alimentent la table `server_votes` : **un vote par site, par joueur et par délai**, quel que soit le canal. Un vote reçu par Votifier puis confirmé sur le site n'est donc compté qu'une fois.

## Récompenses

- **Influence** : règle « Voter pour VÆLORIA » (2 points, 8 par jour maximum, compte lié requis), modifiable dans Admin → Monde → Influence.
- **Commande en jeu** (facultative, par site) : par ex. `crate key give {username} vote 1`. Placée dans la file de commandes existante, exécutée quand le joueur est connecté (rien n'est perdu s'il est hors ligne).
- **Récompense affichée** : texte libre montré sur /vote (ex. « 1 clé de vote »).
- **Classement du mois** sur /vote (remis à zéro le 1er de chaque mois, UTC).

## Anti-abus

- Délai de revote vérifié en base, sous verrou (les deux canaux ne peuvent pas compter le même vote en parallèle).
- Un même vote (même IP, même site, même délai) ne peut pas être revendiqué par deux joueurs. Seule une empreinte de l'IP est conservée (`ip_hash`), jamais l'IP.
- L'IP vérifiée est celle relayée par le site Next (`x-vaeloria-client-ip`), acceptée par l'API **uniquement avec le jeton interne** ; un appel direct à l'API utilise l'IP de connexion. Impossible donc de revendiquer le vote d'une autre IP.
- Les votes Votifier avec un pseudo invalide sont filtrés par le plugin ; un pseudo jamais vu ou un service inconnu est ignoré sans erreur.

## Mise en service

1. Inscrire VÆLORIA sur les trois sites et récupérer pour chacun l'URL de vote et la clé ci-dessus.
2. Admin → Monde → Votes : renseigner l'URL de vote, la clé, la récompense affichée, la commande en jeu éventuelle ; cocher « Affiché sur /vote ».
3. (Facultatif) Installer NuVotifier sur le serveur, déclarer ses coordonnées (IP, port, clé publique ou jeton) sur chaque site, et vérifier que le nom du service reçu correspond au champ « Nom du service Votifier » (visible dans les logs de NuVotifier au premier vote de test).
4. **Cloudflare devant Caddy** : déclarer les plages IP de Cloudflare comme `trusted_proxies` dans Caddy, sinon le site verra l'IP de Cloudflare au lieu de celle du joueur et la vérification par IP échouera. Sans Cloudflare, rien à faire (Caddy remplace `X-Forwarded-For` par l'IP de connexion).
