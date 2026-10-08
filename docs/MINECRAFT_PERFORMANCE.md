# Performance du serveur Minecraft et PvP fluide

Objectif : un combat 1.8 en 1.21 **régulier pour tout le monde**, même en KOTH ou en raid avec 150 joueurs.
Modèles de configuration prêts à fusionner : [`deploy/minecraft/`](../deploy/minecraft/).

## 1. Ce qui fait un PvP fluide (par ordre d'importance)

| Facteur | Cible | Symptôme quand ça dérape |
|---|---|---|
| **MSPT** (temps d'un tick serveur) | < 30 ms en soirée, jamais > 50 ms | knockback irrégulier, coups qui « ne passent pas », rubberband |
| **Ping** des joueurs | < 40 ms pour la France | coups en retard, combos impossibles |
| **Combat identique pour tous** | un seul réglage OCM imposé | « il me combo et pas moi » |
| **Anticheat sans faux positifs** | aucun setback sur un joueur légitime | téléportations en arrière en plein combat |

À 20 TPS, un tick dure 50 ms au maximum. Au-dessus, le serveur prend du retard. Le MSPT est donc l'indicateur à surveiller, pas le TPS : il se dégrade **avant** que le TPS ne chute.

## 2. Machine

- **Processeur rapide sur un seul cœur.** Le tick Minecraft est essentiellement mono-thread. Ryzen 7950X/9950X ou i9 récent, sur un dédié ou des cœurs réservés. **Pas de vCPU partagés.**
- **Disque NVMe**, et 10 à 16 Go de RAM pour le serveur Faction. Plus de RAM ne rend pas le serveur plus rapide : le ramasse-miettes travaille plus longtemps.
- **Datacenter en France** (OVH Roubaix ou Gravelines, Scaleway Paris), avec un anti-DDoS adapté au jeu (OVH Game, TCPShield).
- Le Minecraft reste **séparé du VPS du site** (voir [SCALABILITY.md](SCALABILITY.md)).
- **Java 21** et [`deploy/minecraft/start.sh`](../deploy/minecraft/start.sh), qui contient les flags d'Aikar : `MEM=12G ./start.sh`.

## 3. Logiciel serveur

- **Paper 1.21.x, dernier build stable.** VæloriaBridge dépend de l'API Paper (`getTPS`, `getAverageTickTime`).
- **Pas de Folia** : la plupart des plugins Faction, KOTH et économie ne sont pas compatibles.
- **Velocity** si plusieurs serveurs (hub + factions) :
  - côté Velocity : forwarding `modern` et `compression-threshold = 256` ;
  - côté Paper : `network-compression-threshold=-1`, `online-mode=false`, `proxies.velocity.enabled: true` avec le même secret.

## 4. Combat 1.8 en 1.21 : OldCombatMechanics

Modules à activer et à **imposer à tous les joueurs** (dans OCM 2.x : un seul *modeset* autorisé, pas de choix par joueur) :

| Module | Effet |
|---|---|
| `disable-attack-cooldown` | plus de recharge d'attaque 1.9 |
| `attack-frequency` | délai entre coups de 1.8 (`playerDelay: 20`) |
| `old-player-knockback` | knockback 1.8 |
| `old-tool-damage`, `old-critical-hits` | dégâts des armes et coups critiques de 1.8 |
| `disable-sword-sweep` | pas de coup balayé |
| `old-golden-apples` | pommes (et pommes de Notch) de 1.8 |
| `old-potion-effects` | durées et valeurs des potions de 1.8 |
| `old-player-regen` | régénération de 1.8 |
| `sword-blocking` | blocage à l'épée (à vous de voir) |
| `disable-offhand` | à vous de voir : sans main secondaire, le totem disparaît du PvP |

Points à vérifier après chaque mise à jour d'OCM ou de Paper : knockback identique au sol et en l'air, délai entre coups, pas de double coup.

## 5. Anticheat : GrimAC

Grim prédit les mouvements et tient compte de la latence de chaque joueur, ce qui donne très peu de faux positifs avec un knockback modifié.

- Le tester **avec OCM actif** avant la bêta : combos, W-tap, knockback en l'air, perles.
- Commencer en mode « alertes seulement » pour les vérifications de combat. Activer les sanctions une fois les seuils validés sur de vrais joueurs.
- **Un seul anticheat.** Deux anticheats qui corrigent chacun la position du joueur produisent des rubberbands.

## 6. Configuration (modèles dans `deploy/minecraft/`)

| Fichier | Réglages clés |
|---|---|
| `server.properties` | `view-distance=8`, `simulation-distance=5`, `sync-chunk-writes=false`, `entity-broadcast-range-percentage=100` |
| `spigot.yml` | `entity-activation-range`, `entity-tracking-range.players: 64`, `nerf-spawner-mobs: true`, `merge-radius` |
| `bukkit.yml` | limites de spawn naturel basses (le Faction vit des spawners) |
| `config/paper-global.yml` | chargement des chunks hors thread principal, limite de connexions par tick, limiteur de paquets |
| `config/paper-world-defaults.yml` | `ALTERNATE_CURRENT`, `optimize-explosions`, plafond de projectiles par chunk, `mob-spawner: 2`, `max-entity-collisions: 2` |

Ce sont des **extraits à fusionner** dans les fichiers générés par Paper, pas des fichiers à copier tels quels. Une clé absente garde sa valeur par défaut.

**Ce qu'il ne faut pas baisser pour gagner du TPS :** `entity-tracking-range.players` et `entity-broadcast-range-percentage`. Sinon, des joueurs apparaissent au dernier moment en combat.

## 7. Plugins : ce qui coûte cher en Faction

- **Empilement des mobs** (RoseStacker ou WildStacker) : obligatoire avec des spawners.
- **Limites par chunk** sur les hoppers, la redstone et les spawners (plugin de claims ou limiteur dédié).
- **Monde prégénéré** avec Chunky, plus une bordure de monde : aucune génération de chunks pendant un combat.
- **Scoreboard et tab** à base de paquets (TAB), sans mise à jour à chaque tick.
- **Combat tag** (CombatLogX ou équivalent) : pas d'affichage recalculé à chaque tick.
- Tout plugin qui écrit en base ou appelle une API web **depuis le thread principal** est à proscrire. C'est la règle suivie par VæloriaBridge : seule la mise en file se fait sur le thread principal, l'envoi HTTP se fait en tâche asynchrone.

## 8. Mesurer : spark et alertes de lag

**spark** (inclus dans Paper) :
- `/spark tickmonitor` : signale chaque tick lent pendant un KOTH ;
- `/spark profiler start` … `/spark profiler stop` : rapport qui montre quel plugin ou quelle entité consomme le tick. Corriger ce que spark montre, rien d'autre ;
- `/spark health` : TPS, MSPT, CPU et mémoire en un coup d'œil.

**Alertes automatiques (API + back-office)** : le heartbeat VæloriaBridge envoie le MSPT toutes les 30 s.

- Quand le MSPT reste ≥ `LAG_ALERT_MSPT` (40 ms par défaut) pendant `LAG_ALERT_MINUTES` (3 min), une alerte s'ouvre :
  - visible sur le tableau de bord de l'admin (section « Alertes de performance ») ;
  - envoyée sur Discord si `DISCORD_ALERTS_WEBHOOK_URL` est défini. Utilisez un salon **staff**, pas le webhook des annonces.
- L'alerte se ferme quand le MSPT redescend sous 75 % du seuil (30 ms par défaut), avec un second message Discord indiquant la durée et le pic.
- Entre les deux seuils, l'état ne change pas, ce qui évite d'ouvrir et de fermer l'alerte en boucle.
- L'historique `server_status_history` conserve le pic de MSPT par tranche de 5 minutes.

## 9. Avant d'ouvrir : test de charge

1. Faire tourner 100 à 150 bots (par exemple avec Mineflayer) qui se battent dans une zone KOTH, avec des spawners chargés à proximité.
2. Lancer `/spark profiler` pendant le test et viser un MSPT < 30 ms.
3. Refaire le test après chaque ajout de plugin important et après chaque mise à jour majeure de Paper.

## 10. Liste de contrôle

- [ ] Dédié ou cœurs réservés, CPU rapide sur un cœur, NVMe, datacenter en France, anti-DDoS jeu
- [ ] Java 21 + `start.sh` (flags d'Aikar, `-Xms` = `-Xmx`)
- [ ] Paper 1.21 à jour ; extraits de `deploy/minecraft/` fusionnés
- [ ] OldCombatMechanics : un seul modeset imposé, modules du §4
- [ ] GrimAC testé avec OCM, sanctions activées seulement après validation
- [ ] Empilement des mobs, limites par chunk, monde prégénéré + bordure
- [ ] `DISCORD_ALERTS_WEBHOOK_URL` configuré sur un salon staff
- [ ] Test de charge KOTH : MSPT < 30 ms
