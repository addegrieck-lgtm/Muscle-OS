# VæloriaFakePlayers

Plugin Paper de faux joueurs, inspiré de [Fake Player Plugin](https://hangar.papermc.io/Pepe-tf/FakePlayerPlugin) et de [FakePlayers](https://modrinth.com/plugin/fakeplayers) : animer un serveur vide, tester le TAB, le scoreboard ou les annonces sans lancer de vrais comptes.

| Fonction | Comment | Prérequis |
|---|---|---|
| Entrée dans la liste **TAB** (pseudo, skin Mojang, ping qui varie) | paquets `PlayerInfoUpdate` | plugin [PacketEvents](https://modrinth.com/plugin/packetevents) 2.14+ |
| Messages de **connexion / déconnexion** | `messages.join` / `messages.quit` | — |
| **Chat** réaliste piloté par `phrases.yml` : ~2 900 phrases spontanées (modèles + vocabulaire faction/PvP), sujets selon l'heure, conversations entre faux joueurs, réponses selon l'intention (salut, KOTH, 1v1, vente, recrutement…), conversation suivie avec un vrai joueur, style propre à chaque faux joueur (abréviations, fautes, « mdr »), apprentissage des phrases qui font réagir (`brain.yml`) | `/fp chat`, `chat.*`, `phrases.yml` | — |
| **Corps** dans le monde avec skin, qui regardent les joueurs proches | entité Mannequin, sans NMS | Minecraft **1.21.9+** |
| **Mode ambiance** : arrivées et départs un par un, vers une cible | `auto.*`, `/fp auto on` | — |
| **Planning** : cible selon l'heure, mercredi, week-end, vacances scolaires (zones A/B/C), jours fériés | `schedule.*`, `/fp schedule` | — |
| **Menu Multijoueur** : compteur (« 87/200 ») et pseudos au survol | `server-list.*` | voir l'avertissement ci-dessous |
| **Commandes** visant un faux joueur : `/msg` (avec réponse), `/r`, `/list`, `/tpa`, `/duel`, `/trade`, `/f invite` (refus ou expiration), `/pay`, `/kick`/`/ban`, `/tp` vers son corps ; pseudos proposés en auto-complétion | `interactions.*` | — |
| **Persistance** des faux joueurs créés par commande | `plugins/VaeloriaFakePlayers/fakes.yml` | — |

Sans PacketEvents ou sur un serveur < 1.21.9, le plugin démarre quand même et désactive seulement la partie concernée.

## Commandes (`/fakeplayers`, alias `/fp`, permission `vaeloria.fakeplayers.admin`, op par défaut)

```
/fp spawn [pseudo] [body]   connecte un faux joueur (body : corps à ta position)
/fp add <1-100> [durée]     connecte plusieurs faux joueurs (durée : arrivées étalées, ex. 10m)
/fp remove <pseudo|all>     déconnecte
/fp list                    liste (ping, corps, auto)
/fp chat <pseudo> <msg>     fait parler un faux joueur
/fp tphere <pseudo>         place son corps à ta position
/fp auto <on|off>           mode ambiance
/fp schedule                planning : type de journée, cible actuelle, prévision sur 12 h
/fp reload                  recharge config.yml
```

## Planning

Avec `auto.enabled` et `schedule.enabled`, la cible vaut `min + (max − min) × courbe(heure) %` (par défaut 12 au creux,
120 au pic), puis ±15 % par jour et ±10 % par quart d'heure (aléatoire reproductible), plafonnée à `hard-cap`.
Les faux joueurs arrivent et partent **un par un**, espacés de 4 à 45 s (plus vite si l'écart est grand). Chacun a une
durée de session (10 min à 3 h, ≈ 1 h en moyenne) : à la fin il part et un autre le remplace.

Cinq courbes horaires (modifiables dans `config.yml`) : `school` (lundi, mardi, jeudi), `wednesday`, `school-eve`
(vendredi, veille de vacances), `day-off` (samedi, vacances), `day-off-eve` (dimanche, dernier jour de vacances).
Une journée va de 6 h à 6 h : la nuit de vendredi à samedi suit la courbe du vendredi. Pendant les vacances décalées
(hiver, printemps), les courbes sont mélangées au prorata des zones en congé.

Vérifie la prévision en jeu avec `/fp schedule`.

Les **vacances 2026-2027** (zones A, B, C) sont préremplies d'après le calendrier officiel
([data.education.gouv.fr](https://data.education.gouv.fr/explore/dataset/fr-en-calendrier-scolaire/)). À compléter
chaque année dans `schedule.school-holidays.periods` ; un avertissement s'affiche au démarrage quand il n'y a plus
de période à venir. Les jours fériés français sont calculés automatiquement (Pâques comprise).

## Chat

Tout le texte est dans `plugins/VaeloriaFakePlayers/phrases.yml` (créé au premier démarrage) : `vocab` (mots
interchangeables), `topics` (messages spontanés, avec heures), `threads` (question → réponse entre faux joueurs),
`intents` (mots-clés des vrais joueurs → réponses), `events` (arrivée, départ, mort, message privé…).
Modèles : `{item}` = mot du vocabulaire, `{a|b}` = variante, `{n:2-64}` = nombre, `{player}` = vrai joueur.
Le style de chaque faux joueur est appliqué automatiquement. `/fp reload` après modification.

Apprentissage : une phrase spontanée suivie d'un message d'un vrai joueur dans les 45 s gagne du poids, une phrase
ignorée en perd un peu (poids entre 0,3 et 5, `brain.yml`). Aucun message de joueur n'est enregistré.
Les questions sur les bots (« t'es un bot ? ») restent sans réponse. Pas d'IA générative : tout ce que disent les
faux joueurs vient de `phrases.yml`.

## Limites, volontaires

- Ce ne sont **pas** de vraies connexions : les autres plugins (factions, économie, scoreboard) ne les voient pas. Les
  commandes courantes sont interceptées par `interactions.commands` pour répondre de façon crédible ; une commande non
  listée répondra « joueur introuvable ». C'est ce qui rend le plugin stable sans NMS d'une version à l'autre.
- Un vrai joueur qui se connecte avec le pseudo d'un faux le remplace.
- **Menu Multijoueur** : gonfler le compteur est interdit par la plupart des sites de classement, qui peuvent retirer
  le serveur s'ils le détectent (`server-list.include-fakes: false` pour le couper).

## Build

```sh
gradle build   # build/libs/vaeloria-fakeplayers-<version>.jar + tests
```
