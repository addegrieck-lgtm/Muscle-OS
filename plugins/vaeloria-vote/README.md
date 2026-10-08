# VaeloriaVote

Plugin de vote de VÆLORIA (Paper 1.21). Il est fait pour que le plus de joueurs possible votent sur les 3 sites, sans récompenses qui cassent l'économie de VaeloriaShop.

## Ce que voit un joueur

1. **Rappel toutes les 30 minutes** tant qu'au moins un site est votable. Le rappel contient des boutons cliquables vers les sites manquants, un titre, un son et le bouton **[✔ J'ai voté]**. Il s'arrête quand les 3 votes sont faits et reprend quand les délais des sites sont écoulés.
2. **Chaque vote remplit la cagnotte du jour** : argent + objets.
3. **Au 3ᵉ site**, un bonus de fidélité s'ajoute et la **roue du jour** se débloque (`/roue`) :
   - **Roue classique** : ×1, ×2 ou ×3. On ne perd jamais rien.
   - **Quitte ou double** : ×4 ou **rien**, avec une confirmation.
   - Les chances sont affichées au survol des boutons. Une seule roue par jour.
4. Une cagnotte jamais lancée est versée ×1 à minuit. On ne perd que si on choisit le quitte ou double.
5. **Preuve sociale** : « X a voté (2/3) [/vote] » et « X décroche ×4 à la roue ! » sont annoncés à tout le serveur. Une série de jours complets s'affiche aussi dans `/vote`.

## Équilibrage (repères de VaeloriaShop)

| Journée complète | Argent | Valeur boutique totale | Équivalent |
|---|---|---|---|
| ×1 | 1 400 $ | ~2 600 $ | ~1 h de farm débutant (houe I) |
| ×3 | 4 200 $ | ~7 800 $ | ~30 min de farm équipé |
| ×4 | 5 600 $ | ~10 400 $ | — |

- Les objets ne sont **pas rachetables** par `/vendre` (steak cuit, fioles d'XP, carottes dorées, pommes dorées) : les votes ne créent pas d'argent au-delà de la somme versée.
- Pas d'obsidienne, de TNT ni de générateurs : les raids et l'économie restent une affaire de farm.
- Plafond de **6 000 $ par jour et par joueur** (`economy.max-money-per-day`).
- Roue classique : ×1,65 en moyenne. Quitte ou double : ×1,6. Le risque est un frisson, pas un meilleur calcul.

## Brancher les 3 sites (plus tard)

Dans `config.yml`, section `sites`, renseignez pour chaque site son nom, son lien et son délai (`cooldown-minutes`). Ensuite, au choix :

- **API de vérification** : `check-url` (avec `{key}` `{player}` `{uuid}` `{ip}`), `api-key`, `success-regex`. Le joueur clique **[J'ai voté]** et le plugin interroge le site. Un vote vérifié par IP n'est utilisable que par **un seul compte** du foyer.
- **NuVotifier** : `votifier-service` = nom du service. Le vote arrive tout seul, même hors ligne.
- **Console** : `/votes give <joueur> <site>`.

Le délai du site est toujours respecté : un même vote n'est jamais payé deux fois.

Pour tester avant d'avoir les API, mettez `verification.test-mode: true` : **[J'ai voté]** crédite alors sans vérifier. **À désactiver en production.**

## Commandes

| Commande | Effet |
|---|---|
| `/vote` | État des 3 sites, cagnotte, série, roue |
| `/vote verifier` | « J'ai voté » : vérifie par API |
| `/roue` | Choix de la roue du jour |
| `/votes give <joueur> <site>` · `info <joueur>` · `reload` | Administration (`vaeloria.vote.admin`) |

Permission `vaeloria.vote.noreminder` : pas de rappels (staff).

## Technique

- Argent par **Vault**, comme VaeloriaShop. Sans Vault, la commande `economy.money-command` est utilisée.
- Données : `plugins/VaeloriaVote/players/<uuid>.json`, écrites dans l'ordre par un seul fil et de façon atomique. Les IP sont conservées hachées dans `ip-locks.json`.
- Le résultat de la roue est enregistré avant l'animation : se déconnecter pendant qu'elle tourne ne change rien, le gain est versé à la reconnexion.
- `bridge.enabled: true` envoie un événement `VOTE` au site via VaeloriaBridge, quand l'API le connaîtra.

```sh
gradle build   # build/libs/vaeloria-vote-1.0.0.jar + tests
```
