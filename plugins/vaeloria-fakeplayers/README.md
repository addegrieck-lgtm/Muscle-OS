# VæloriaFakePlayers

Plugin Paper de faux joueurs, inspiré de [Fake Player Plugin](https://hangar.papermc.io/Pepe-tf/FakePlayerPlugin) et de [FakePlayers](https://modrinth.com/plugin/fakeplayers) : animer un serveur vide, tester le TAB, le scoreboard ou les annonces sans lancer de vrais comptes.

| Fonction | Comment | Prérequis |
|---|---|---|
| Entrée dans la liste **TAB** (pseudo, skin Mojang, ping qui varie) | paquets `PlayerInfoUpdate` | plugin [PacketEvents](https://modrinth.com/plugin/packetevents) 2.14+ |
| Messages de **connexion / déconnexion** | `messages.join` / `messages.quit` | — |
| **Chat** (à la commande ou automatique) | `/fp chat`, `chat.auto` | — |
| **Corps** dans le monde avec skin, qui regardent les joueurs proches | entité Mannequin, sans NMS | Minecraft **1.21.9+** |
| **Mode ambiance** : arrivées et départs aléatoires entre `min` et `max` | `auto.*`, `/fp auto on` | — |
| Compteur de la **liste des serveurs** | `server-list.include-fakes` | désactivé par défaut (voir ci-dessous) |
| **Persistance** des faux joueurs créés par commande | `plugins/VaeloriaFakePlayers/fakes.yml` | — |

Sans PacketEvents ou sur un serveur < 1.21.9, le plugin démarre quand même et désactive seulement la partie concernée.

## Commandes (`/fakeplayers`, alias `/fp`, permission `vaeloria.fakeplayers.admin`, op par défaut)

```
/fp spawn [pseudo] [body]   connecte un faux joueur (body : corps à ta position)
/fp add <1-100>             connecte plusieurs faux joueurs aux pseudos aléatoires
/fp remove <pseudo|all>     déconnecte
/fp list                    liste (ping, corps, auto)
/fp chat <pseudo> <msg>     fait parler un faux joueur
/fp tphere <pseudo>         place son corps à ta position
/fp auto <on|off>           mode ambiance
/fp reload                  recharge config.yml
```

## Limites, volontaires

- Ce ne sont **pas** de vraies connexions : les faux joueurs n'apparaissent pas dans `Bukkit.getOnlinePlayers()`, `/list`, ni dans les plugins tiers (factions, économie). C'est ce qui rend le plugin stable sans NMS d'une version à l'autre.
- Un vrai joueur qui se connecte avec le pseudo d'un faux le remplace.
- **Liste des serveurs** : gonfler le compteur est interdit par la plupart des sites de classement et trompe les joueurs ; l'option existe pour les tests et reste à `false` par défaut.

## Build

```sh
gradle build   # build/libs/vaeloria-fakeplayers-<version>.jar + tests
```
