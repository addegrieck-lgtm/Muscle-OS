# VæloriaFakePlayers

Plugin Paper de faux joueurs, inspiré de [Fake Player Plugin](https://hangar.papermc.io/Pepe-tf/FakePlayerPlugin) et de [FakePlayers](https://modrinth.com/plugin/fakeplayers) : animer un serveur vide, tester le TAB, le scoreboard ou les annonces sans lancer de vrais comptes.

| Fonction | Comment | Prérequis |
|---|---|---|
| Entrée dans la liste **TAB** (pseudo, skin Mojang, ping qui varie) | paquets `PlayerInfoUpdate` | plugin [PacketEvents](https://modrinth.com/plugin/packetevents) 2.14+ |
| Messages de **connexion / déconnexion** | `messages.join` / `messages.quit` | — |
| **Chat** (à la commande ou automatique) | `/fp chat`, `chat.auto` | — |
| **Corps** dans le monde avec skin, qui regardent les joueurs proches | entité Mannequin, sans NMS | Minecraft **1.21.9+** |
| **Mode ambiance** : arrivées et départs un par un, vers une cible | `auto.*`, `/fp auto on` | — |
| **Planning** : cible selon l'heure, mercredi, week-end, vacances scolaires (zones A/B/C), jours fériés | `schedule.*`, `/fp schedule` | — |
| Compteur de la **liste des serveurs** | `server-list.include-fakes` | désactivé par défaut (voir ci-dessous) |
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

Avec `auto.enabled` et `schedule.enabled`, la cible vaut `auto.max × courbe(heure) %`, jamais sous `auto.min`, puis
±15 % par jour et ±10 % par quart d'heure (aléatoire reproductible). Les faux joueurs arrivent et partent **un par un**,
espacés de 15 à 90 s, avec un peu de rotation une fois la cible atteinte.

Cinq courbes horaires (modifiables dans `config.yml`) : `school` (lundi, mardi, jeudi), `wednesday`, `school-eve`
(vendredi, veille de vacances), `day-off` (samedi, vacances), `day-off-eve` (dimanche, dernier jour de vacances).
Une journée va de 6 h à 6 h : la nuit de vendredi à samedi suit la courbe du vendredi. Pendant les vacances décalées
(hiver, printemps), les courbes sont mélangées au prorata des zones en congé.

Exemple avec `max: 30` (une semaine d'école puis la Toussaint 2026) :

```
               00 02 04 06 08 10 12 14 16 18 20 22
MON 2026-10-12  4  1  0  0  1  1  3  2  4 13 18 12  jour d'école
WED 2026-10-14  3  1  0  0  1  2  5 13 20 17 18 14  mercredi d'école
FRI 2026-10-16  2  1  0  0  1  1  4  2  5 17 25 28  jour d'école
SAT 2026-10-17 15  6  2  1  1  5 10 18 24 21 30 30  week-end, Toussaint
TUE 2026-10-20 20  8  2  1  1  4 10 15 22 19 25 25  Toussaint
```

Les **vacances 2026-2027** (zones A, B, C) sont préremplies d'après le calendrier officiel
([data.education.gouv.fr](https://data.education.gouv.fr/explore/dataset/fr-en-calendrier-scolaire/)). À compléter
chaque année dans `schedule.school-holidays.periods` ; un avertissement s'affiche au démarrage quand il n'y a plus
de période à venir. Les jours fériés français sont calculés automatiquement (Pâques comprise).

## Limites, volontaires

- Ce ne sont **pas** de vraies connexions : les faux joueurs n'apparaissent pas dans `Bukkit.getOnlinePlayers()`, `/list`, ni dans les plugins tiers (factions, économie). C'est ce qui rend le plugin stable sans NMS d'une version à l'autre.
- Un vrai joueur qui se connecte avec le pseudo d'un faux le remplace.
- **Liste des serveurs** : gonfler le compteur est interdit par la plupart des sites de classement et trompe les joueurs ; l'option existe pour les tests et reste à `false` par défaut.

## Build

```sh
gradle build   # build/libs/vaeloria-fakeplayers-<version>.jar + tests
```
