# Intégration Minecraft — VæloriaBridge

Plugin Paper 1.21 (`plugins/vaeloria-bridge`, Java 21). Build : `gradle build` → `build/libs/vaeloria-bridge-0.1.0.jar`.

## Principe

```
Serveur Minecraft ──(HTTPS + HMAC)──► API ──► PostgreSQL ◄── API ◄── Site
```
Le plugin est le **seul** composant du serveur qui communique avec l'extérieur. Il ne connaît ni la base de données ni le site.

## Installation

Icône de la liste des serveurs : copier `brand/server-icon.png` (64×64) à la racine du serveur Minecraft.


1. Copier le jar dans `plugins/`, démarrer une fois.
2. Renseigner `plugins/VaeloriaBridge/config.yml` : `api.url`, `api.key-id`, `api.secret` (le même que `BRIDGE_KEYS` côté API), `server-name`.
3. Redémarrer. `/vbridge` affiche l'état (file en mémoire, file sur disque, dernière erreur API).
Le plugin refuse de démarrer si le secret n'est pas configuré.

## Signature des requêtes

En-têtes : `x-vaeloria-key`, `x-vaeloria-timestamp` (epoch ms), `x-vaeloria-nonce` (UUID), `x-vaeloria-signature` = `hex(HMAC-SHA256(secret, timestamp + "." + nonce + "." + corps))`.
L'API rejette : clé inconnue, horodatage à plus de 5 min, nonce déjà vu, signature invalide (comparaison à temps constant). Un vecteur de test identique existe en Java (`SignerTest`) et en Node (`hmac-vector.test.ts`).

Rotation : ajouter la nouvelle clé dans `BRIDGE_KEYS` (`ancienne:...,nouvelle:...`), déployer, basculer le plugin, retirer l'ancienne.

## Événements (Minecraft → API)

Format commun : `{ id: UUID, event, server, occurredAt: ISO-8601, ... }`. Schémas exacts : `packages/types/src/bridge.ts`.

| Événement | Émis par | Effet côté API |
|---|---|---|
| `PLAYER_JOIN` / `PLAYER_QUIT` (+`sessionSeconds`) | VæloriaBridge | joueur créé/mis à jour, historique de pseudo, temps de jeu |
| `PLAYER_KILL` (`killer`, `victim`, `weapon`) | VæloriaBridge | kills/morts de saison, kills de faction |
| `SERVER_HEARTBEAT` (`online`, `maxPlayers`, `tps`, `mspt`, `version`) | VæloriaBridge, toutes les 30 s | statut, historique (pic MSPT par 5 min), record de joueurs, alertes de lag (voir [MINECRAFT_PERFORMANCE.md](MINECRAFT_PERFORMANCE.md)) |
| `FACTION_CREATE` / `DISBAND` / `JOIN` / `LEAVE` | plugin Factions via `emit()` | factions et membres |
| `FACTION_CLAIM` / `UNCLAIM` | plugin Factions | claims, classement Territoire |
| `FACTION_SNAPSHOT` (`power`, `maxPower`, `wealth`, `claims`) | plugin Factions, périodique | Power, richesse |
| `KOTH_START` (`koth`, `durationSeconds?`) | plugin KOTH | événement KOTH « en direct » sur /evenements et la carte |
| `KOTH_CAPTURE` | plugin KOTH | classement KOTH |
| `WAR_START` (`warId`, `title?`, `attacker`, `defender` = noms de faction) | plugin Factions / guerres | guerre active sur /guerres, si les deux factions sont liées à un empire (admin → Monde → Empires → « faction en jeu ») |
| `WAR_END` (`warId`, `winner` \| null, `scores`, `territories?`, `participants?`) | plugin Factions / guerres | guerre terminée, vainqueur, influence « victoire » aux membres liés |
| `EVENT_START` (`eventId`, `title`, `type`, `zone?`) | plugin d'événements | événement en direct (créé ou mis à jour par `eventId`) |
| `EVENT_END` (`eventId`, `participants[]` ≤ 1000 UUID) | plugin d'événements | participants et empires comptés, influence « participation » aux joueurs liés |
| `ECONOMY_TRANSACTION` | plugin économie | solde joueur |
| `PLAYER_RANK_CHANGE` | plugin de grades | rang affiché |

### Brancher le plugin Factions / KOTH

Le plugin Factions du réseau n'est pas encore choisi. Il suffit d'appeler l'API publique du bridge depuis ses listeners :

```java
JsonObject e = Events.base("KOTH_CAPTURE", VaeloriaBridgePlugin.serverName());
e.addProperty("koth", "citadelle");
e.addProperty("faction", "Ordre-Noir");      // ou JsonNull
e.addProperty("uuid", player.getUniqueId().toString());
e.addProperty("username", player.getName());
VaeloriaBridgePlugin.emit(e);                 // thread-safe, non bloquant
```

### Événements du monde (V2)

VæloriaBridge relaie tel quel tout événement passé à `emit()` : aucune modification du plugin n'est nécessaire pour les guerres, KOTH et événements. Il suffit que les plugins du réseau les émettent :

```java
JsonObject e = Events.base("WAR_START", VaeloriaBridgePlugin.serverName());
e.addProperty("warId", war.getId());          // identifiant stable : rend l'événement idempotent
e.addProperty("title", "Guerre du Nord");
e.addProperty("attacker", "Nightmare");        // nom de la faction en jeu
e.addProperty("defender", "Titans");
VaeloriaBridgePlugin.emit(e);
```

Le site fonctionne entièrement **avant** la synchronisation Minecraft : empires, fondateurs, Conseil et parrainage ne dépendent que des comptes du site. Les guerres et événements peuvent aussi être saisis à la main dans l'admin (Monde → Guerres). `PLAYER_QUIT` crédite l'influence « temps de jeu » (1 / heure, plafonnée) au compte lié.

## File d'événements et pannes

- Événements mis en file en mémoire, envoyés par lots (≤ 200) toutes les 5 s, hors thread principal.
- API injoignable → lot écrit dans `plugins/VaeloriaBridge/spool/*.json`, renvoyé en priorité au retour de l'API.
- Arrêt du serveur → QUIT de chaque joueur + écriture de la file sur disque.
- Lot rejeté pour schéma invalide (400) → journalisé puis abandonné (le renvoyer bouclerait).
- Réponse perdue après traitement → renvoi dédupliqué par l'`id` côté API.

## Boutique : ordres typés et /link

Chaque ordre reçu porte une `action` : `GRANT_RANK`, `GIVE_KIT`, `GIVE_ITEM`, `GIVE_SPAWNER`, `COMMAND`, `ADD_POINTS`, `SYNC_PLAYER` (ces deux derniers sans commande : le plugin prévient le joueur). Détail dans `SHOP_DELIVERY.md`.

`/link` (permission `vaeloria.link`, accordée à tous) : le plugin obtient un code à usage unique (`POST /bridge/v1/link-codes`) et l'affiche au joueur, qui le saisit sur `vaeloria.fr/compte`.

## Commandes (API → Minecraft)

1. Un paiement confirmé (webhook) crée des `entitlements` puis des lignes `minecraft_commands` (modèles du produit, variables `{uuid}` et `{username}`).
2. Toutes les 10 s le plugin appelle `POST /bridge/v1/commands/claim` : les commandes passent `SENT` avec un bail de 60 s.
3. Exécution par la console sur le thread principal, puis accusé :
   - `DELIVERED` : terminé ;
   - `FAILED` : réessayée jusqu'à `max_retries` (10) puis visible en échec dans l'admin, relançable ;
   - `DEFERRED` : `require_online` et joueur hors ligne → retour en file sans consommer d'essai.
4. Serveur planté avant l'accusé → le bail expire, la commande est redistribuée.

Une commande ne peut donc ni être perdue, ni être livrée deux fois via deux paiements/webhooks identiques. Réserve : si le serveur plante **entre** l'exécution et l'accusé, la commande sera rejouée ; les commandes de livraison doivent donc être idempotentes côté jeu (ex. `lp user … parent add` plutôt que `give`) ou marquées `require_online`.

## Warps farm par grade

Un warp farm par grade (Guerrier → Squelette, Seigneur → Pigman, Roi → Creeper, VÆLORIAN → Enderman), livré en schématiques WorldEdit : voir [`minecraft/warps-farm`](../minecraft/warps-farm/README.md).

## Statut sans plugin

Avant l'installation du plugin, l'API interroge le serveur avec le Server List Ping (`MC_PING_HOST`) pour afficher joueurs et version.


## Non testé à ce stade

Le plugin compile et ses tests unitaires passent ; son client HTTP a été validé contre l'API réelle (événements acceptés, mauvais secret refusé). **Il n'a pas encore tourné sur un vrai serveur Paper** : à valider sur un serveur de test (listeners, `callSyncMethod`, arrêt propre).
