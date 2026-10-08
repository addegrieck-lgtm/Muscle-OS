# Coffres à clés — VaeloriaCrates

Plugin Paper 1.21 (`plugins/vaeloria-crates`), indépendant de VæloriaBridge. **Tout se configure en jeu** avec `/crate admin` : aucune édition de fichier n'est nécessaire.

## Installation

```sh
cd plugins/vaeloria-crates && gradle build      # → build/libs/vaeloria-crates-0.1.0.jar
```

Copier le jar dans `plugins/` du serveur et redémarrer. Les coffres sont enregistrés dans `plugins/VaeloriaCrates/crates.yml` (sauvegardé à chaque modification) ; `config.yml` contient le préfixe, la durée de l'animation et le format des annonces.

## Créer un coffre (interface admin)

1. `/crate admin` → **Créer un coffre** → taper son nom dans le chat (couleurs avec `&`, ex. `&6&lCoffre Légendaire`). L'identifiant est déduit du nom (`coffre_legendaire`).
2. **Clé personnalisée** :
   - prendre n'importe quel objet de son inventaire au curseur et le **déposer sur l'aperçu** (ou shift-clic) : il devient l'apparence de la clé ;
   - **Nom**, **Description** (lignes séparées par `|`), **Brillance** ;
   - **Me donner 1 / 10 clés** pour tester.
3. **Lots** : déposer ses propres objets sur les cases vides (ou shift-clic depuis l'inventaire). L'objet est **copié tel quel** — enchantements, nom, lore, quantité — et l'admin garde l'original. Chaque nouveau lot a un poids de 10.
4. Clic sur un lot :
   - **Chance** : ±1 / ±10, ou clic pour saisir un poids. Chance = poids ÷ somme des poids du coffre (affichée en %). Poids 0 = lot désactivé.
   - **Donner l'objet** : non → l'objet ne sert que d'icône (lot « grade », « argent »…).
   - **Commandes** console, avec `{player}` et `{uuid}` (ex. `eco give {player} 5000`, `lp user {player} parent add vip`).
   - **Annonce** à tout le serveur (lots rares), **Me donner ce lot** pour tester, **Remplacer l'objet**, **Supprimer**.
5. **Placer le coffre** → clic droit sur un bloc du monde (coffre, ender chest, bloc décoratif…). Plusieurs blocs peuvent ouvrir le même coffre. Alternative : regarder le bloc et `/crate set <coffre>`.
6. **Animation** : roulette (par défaut) ou ouverture instantanée.

Une clé d'un autre coffre peut être mise en lot : elle reste une vraie clé.

## Côté joueur

- **Clic droit** sur le coffre avec sa clé (main principale ou secondaire) : une clé est consommée, le lot est tiré, la roulette tourne, le lot est remis (le surplus tombe au sol si l'inventaire est plein).
- Sans clé : message + léger recul. **Clic gauche** : aperçu des lots et de leurs chances.
- Le bloc ne peut pas être cassé, explosé ni déplacé par piston. Un admin le retire en **cassant le bloc accroupi**, avec `/crate unset`, ou via **Retirer tous les emplacements**.

## Commandes

| Commande | Permission | Effet |
|---|---|---|
| `/crate admin [coffre]` | `vaeloria.crates.admin` | Interface admin |
| `/crate give <joueur> <coffre> [n]` | `vaeloria.crates.give` | Donne n clés (1 à 10 000) à un joueur connecté |
| `/crate giveall <coffre> [n]` | `vaeloria.crates.admin` | n clés à chaque joueur connecté + annonce |
| `/crate preview <coffre>` | `vaeloria.crates.use` | Aperçu des lots |
| `/crate set <coffre>` · `/crate unset` | `vaeloria.crates.admin` | Lier / délier le bloc visé |
| `/crate list` · `/crate reload` | — · `vaeloria.crates.admin` | Liste · recharger config et coffres |

Alias : `/crates`, `/coffre`. `vaeloria.crates.use` est accordée à tous par défaut ; `admin` et `give` aux opérateurs.

## Vendre des clés sur la boutique

Dans **Admin → Boutique → produit → Livraison en jeu**, ajouter une action `COMMAND` :

```
crate give {username} coffre_legendaire {quantity}
```

et cocher **joueur en ligne** : VæloriaBridge reporte la livraison tant que le joueur est absent. Si le joueur ou le coffre est introuvable, la commande échoue et la livraison passe en `FAILED` (relançable depuis l'admin).

## Sécurité et fiabilité

- Une clé est reconnue par un marqueur invisible (`PersistentDataContainer`, `vaeloriacrates:crate_key`) et non par son nom : renommer un objet à l'enclume ne crée pas de clé, et changer l'apparence d'une clé n'invalide pas celles déjà distribuées. Supprimer un coffre invalide ses clés.
- Les clés ne peuvent pas être posées (si leur apparence est un bloc).
- La clé est retirée **avant** le tirage ; le lot est tiré **avant** l'animation et remis quoi qu'il arrive (fermeture du menu, déconnexion, arrêt du serveur).
- Les menus annulent tout clic dans leur inventaire : rien ne peut en être retiré. Seuls les admins voient les menus d'édition.
- `crates.yml` est écrit dans un fichier temporaire puis renommé (pas de fichier à moitié écrit en cas de plantage). Les objets y sont encodés au format binaire de Paper, qui migre entre versions de Minecraft.
- Chaque lot remis est journalisé dans la console (`<joueur> a obtenu … (coffre …)`).

## Tests

`gradle test` : tirage pondéré (distribution sur 200 000 tirages, poids nuls), affichage des pourcentages, identifiants, sérialisation des positions.
