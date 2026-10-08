# Mines régénérées — VaeloriaMines

Plugin Paper 1.21 (`plugins/vaeloria-mines`), indépendant des autres plugins. Une mine est une **zone** du monde remplie à nouveau, **toutes les N minutes**, avec les **blocs** choisis (ex. 100 % obsidienne). Tout se configure **en jeu** avec `/mine admin`.

## Installation

```sh
cd plugins/vaeloria-mines && gradle build      # → build/libs/vaeloria-mines-0.1.0.jar
```

Copier le jar dans `plugins/` du serveur et redémarrer. Les mines sont enregistrées dans `plugins/VaeloriaMines/mines.yml` (sauvegardé à chaque modification) ; `config.yml` contient les messages, les avertissements et l'affichage.

## Exemple : la mine d'obsidienne, toutes les 15 minutes

1. `/mine wand` → **clic gauche** sur un coin de la zone, **clic droit** sur le coin opposé (le chat affiche la taille). Sans baguette : se placer sur chaque coin et taper `/mine pos1` puis `/mine pos2`.
2. `/mine admin` → **Créer une mine** → taper `&5Mine d'obsidienne` dans le chat. L'identifiant est déduit du nom : `mine-d-obsidienne`. La sélection devient la zone de la mine.
3. **Blocs régénérés** → déposer un bloc d'obsidienne de son inventaire sur une case vide (ou shift-clic dessus). Seul bloc = 100 %.
4. **Délai** : clic gauche / droit = ±1 min, shift = ±10 min, ou **Saisir un délai** → `15m`. Par défaut, une nouvelle mine se réinitialise toutes les 15 minutes.
5. Facultatif : **Point d'arrivée** (où sont mis à l'abri les joueurs dans la mine), **Hologramme** (texte flottant « Mine d'obsidienne — Réinitialisation dans 14 minutes 59 secondes »), **Réinitialisation anticipée** à 25/50/75/90 % miné.

Le serveur annonce alors automatiquement :

> [VÆLORIA] Mine d'obsidienne s'est réinitialisée ! Prochaine réinitialisation dans 15 minutes.
> [VÆLORIA] Mine d'obsidienne se réinitialise dans 10 minutes !
> … dans 5 minutes, 1 minute, 30 secondes, 10 secondes, 5…1 seconde

et la zone est remplie d'obsidienne. Les joueurs dans la mine voient une barre de boss avec le compte à rebours.

## Interface admin (`/mine admin`)

| Bouton | Effet |
|---|---|
| Liste des mines | État et compte à rebours en direct. **Clic** : modifier · **clic droit** : réinitialiser maintenant |
| Nom | Renommer (couleurs `&`) ; l'identifiant ne change pas |
| Zone | Clic gauche : appliquer ma sélection · clic droit : recevoir la baguette |
| Blocs régénérés | Déposer des blocs ; **poids** réglables (clic ±1, shift ±10, **Q** pour retirer). Proportion = poids ÷ somme. Ex. pierre 70 + fer 20 + diamant 10. Ajout par nom possible (`deepslate_diamond_ore`) |
| Délai | ±1 / ±10 min, ou saisie (`15m`, `1h30`, `90s`, `2h`) — de 10 s à 7 jours |
| Point d'arrivée | Ma position · m'y téléporter · **Q** pour retirer (par défaut : au-dessus de la zone) |
| Hologramme | Placer à hauteur des yeux · retirer |
| Annonces | Activer / couper les messages de cette mine |
| Réinitialisation anticipée | Aucune / 25 / 50 / 75 / 90 % de la zone minée |
| Réinitialiser maintenant · Pause | Relance le compte à rebours · fige le compte à rebours |
| Supprimer | Retire la mine (les blocs du monde restent tels quels) |

## Commandes

| Commande | Permission | Effet |
|---|---|---|
| `/mine` · `/mine list` | `vaeloria.mines.use` | Mines et temps avant réinitialisation |
| `/mine info <mine>` | `vaeloria.mines.use` | Détail (zone, blocs et % miné pour les admins) |
| `/mine tp <mine>` | `vaeloria.mines.tp` | Téléportation au point d'arrivée |
| `/mine admin [mine]` | `vaeloria.mines.admin` | Interface admin |
| `/mine create <nom>` | `vaeloria.mines.admin` | Nouvelle mine (zone = sélection en cours) |
| `/mine wand` · `/mine pos1` · `/mine pos2` | `vaeloria.mines.admin` | Sélection de la zone |
| `/mine setzone <mine>` | `vaeloria.mines.admin` | Applique la sélection à la mine |
| `/mine interval <mine> <délai>` | `vaeloria.mines.admin` | Ex. `/mine interval mine-d-obsidienne 15m` |
| `/mine reset <mine>` | `vaeloria.mines.admin` | Réinitialisation immédiate |
| `/mine reload` | `vaeloria.mines.admin` | Recharger `config.yml` et `mines.yml` |

Alias : `/mines`. `use` est accordée à tous ; `admin` et `tp` aux opérateurs.

## Fonctionnement et fiabilité

- **Compte à rebours persistant** : l'échéance est enregistrée en heure absolue ; un redémarrage ne remet pas le délai à zéro (une échéance passée pendant l'arrêt déclenche la réinitialisation au démarrage).
- **Sans lag** : la zone est remplie par lots de `blocks-per-tick` blocs (5 000 par défaut), de bas en haut, sans physique (le sable/gravier ne tombe pas pendant le remplissage). Casser un bloc de la mine est bloqué pendant le remplissage.
- **Sécurité des joueurs** : les joueurs dans la zone sont téléportés au point d'arrivée (ou juste au-dessus de la zone) avant le remplissage — personne n'étouffe dans les blocs.
- **Arrêt du serveur** pendant un remplissage : il est terminé immédiatement, la mine n'est jamais laissée à moitié pleine.
- **Avertissements** sans doublon : si un tick est en retard, le seuil franchi est quand même annoncé, une seule fois.
- **Hologrammes** non sauvegardés avec le monde : recréés quand leur chunk est chargé, jamais dupliqués après un crash.
- Une mine sans zone ou sans bloc reste « Non configurée » et n'est jamais réinitialisée.

## Réglages (`config.yml`)

| Clé | Défaut | Rôle |
|---|---|---|
| `blocks-per-tick` | `5000` | Vitesse de remplissage |
| `warnings` | `[900, 600, 300, 60, 30, 10, 5, 4, 3, 2, 1]` | Secondes avant la réinitialisation où une annonce est faite |
| `announce.scope` | `server` | `server`, `world` (monde de la mine) ou `nearby` (à moins de `announce.radius` blocs) |
| `messages.*` | — | Textes des annonces : `{mine}`, `{time}` (« 15 minutes »), `{clock}` (« 14:59 »), `{percent}` |
| `bossbar.*` | activée, marge 5, `PURPLE` | Barre de boss pour les joueurs dans la mine |
| `hologram.format` · `states.*` | — | Texte de l'hologramme et des états (compte à rebours, en cours, pause, non configurée) |
