# Boutique — livraison Minecraft

## Chaîne

```
Commande payée ─► deliveries (métier) ─► minecraft_commands (transport) ─► VæloriaBridge ─► console du serveur
```

- **Une livraison par unité achetée** (`entitlement:<id>`) et **une par grade débloqué** (`rank:<uuid>:<grade>`).
- Chaque livraison crée un ou plusieurs **ordres** typés, copiés depuis les actions du produit (`product_deliveries`) avec les variables `{username}`, `{uuid}`, `{quantity}` remplacées.

| Action | Usage | Commande |
|---|---|---|
| `GRANT_RANK` | Attribuer un grade | ex. `lp user {uuid} parent add guerrier` |
| `GIVE_KIT` | Objets d'un kit | `give {username} minecraft:iron_sword 1`… |
| `GIVE_ITEM` | Ressources | `give {username} minecraft:diamond 32` |
| `GIVE_SPAWNER` | Spawners | dépend du plugin installé (exemple : `spawner give {username} zombie 3`) |
| `COMMAND` | Commande libre (cosmétiques…) | ex. `lp user {uuid} permission set …` |
| `ADD_POINTS` / `SYNC_PLAYER` | Information du plugin | aucune commande ; le plugin prévient le joueur |

> Les commandes d'exemple sont à **adapter aux plugins réellement installés** (LuckPerms, plugin de spawners, kits). Configuration LuckPerms prête : `minecraft/luckperms/`.

## Statuts

| Livraison | Signifie |
|---|---|
| `PENDING` | En attente (serveur pas encore passé, ou joueur hors ligne pour un ordre « joueur en ligne ») |
| `PROCESSING` | Le plugin a pris au moins un ordre |
| `DELIVERED` | Tous les ordres confirmés par le plugin |
| `FAILED` | Un ordre a épuisé ses 10 tentatives, ou le produit n'a aucune action configurée |
| `CANCELLED` | Remboursement avant livraison |

Chaque changement est écrit dans `delivery_logs` (visible dans l'admin, commande par commande).

## Fiabilité

- **Joueur hors ligne** : un ordre « joueur en ligne » (objets à mettre dans l'inventaire) est renvoyé en file sans consommer d'essai (`DEFERRED`) → livré à la prochaine connexion.
- **Serveur planté avant l'accusé** : bail de 60 s, l'ordre est redistribué.
- **Webhook rejoué, livraison relancée** : clés d'idempotence → aucun doublon.
- **Échec** : `/admin/shop/deliveries` → « Relancer ».
- Limite connue : si le serveur plante *entre* l'exécution d'une commande et son accusé, la commande est rejouée. Préférer des commandes idempotentes (`parent add`, `permission set`) pour les grades et cosmétiques ; pour les objets, le risque est un doublon d'objets, jamais une perte.

## Plugin

`plugins/vaeloria-bridge` — voir `MINECRAFT_INTEGRATION.md`. Ajouts boutique : champ `action` dans chaque ordre, messages au joueur (grade débloqué, synchronisation), commande `/link`.
