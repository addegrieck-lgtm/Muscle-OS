# Arène de bots P4 U3 — VæloriaArena

Plugin Paper 1.21 (`plugins/vaeloria-arena`, Java 21), indépendant de VæloriaBridge. Build : `gradle build` → `build/libs/vaeloria-arena-0.1.0.jar`.

Des bots s'affrontent en deux équipes, **Rouge** et **Bleu**, en stuff diamant **Protection IV / Unbreaking III** avec une épée Sharpness V. Les joueurs autour regardent le combat : compte à rebours, kill feed, titre de victoire et MVP.

## Utilisation (permission `vaeloria.arena.admin`, op par défaut)

| Commande | Effet |
|---|---|
| `/botarena setcentre [rayon]` | Le centre de l'arène est ta position (sol plat conseillé). Le rayon par défaut est de 20 blocs. |
| `/botarena start [n]` | Lance un combat `n` contre `n` (par défaut 3, maximum `match.max-team-size`). |
| `/botarena stop` | Annule le combat et supprime les bots. |
| `/botarena statut` | Affiche les survivants, les kills et la durée. |
| `/botarena reload` | Recharge `config.yml` (pris en compte au combat suivant). |

## Déroulement

1. Les bots apparaissent sur deux lignes face à face et restent immobiles pendant le compte à rebours.
2. Au « COMBAT ! », chaque bot cible le bot adverse vivant le plus proche. Il strafe et saute près de sa cible (style PvP 1.8). Sous 4 ❤ il mange une golden apple (régénération II et absorption, 6 pommes par défaut).
3. Une équipe éliminée a perdu. Si `match.max-duration-seconds` est atteint, la victoire va à l'équipe qui a le plus de survivants, puis le plus de kills, sinon c'est une égalité.
4. Après `cleanup-delay-seconds`, les bots sont supprimés.

Chaque bot affiche au-dessus de sa tête `[R] Kael 8.5❤` (absorption comprise) et un contour lumineux à la couleur de son équipe.

## Garanties

- Les bots sont des zombies marqués : ils **ne ciblent et ne blessent que l'équipe adverse**, jamais les joueurs. Les joueurs ne peuvent pas les frapper (`spectators.players-can-hit-bots`).
- Pas de tir ami, de butin, d'XP, de renforts zombies, de combustion au soleil ni de conversion en drowned.
- Les bots ne peuvent pas sortir du cercle : ils sont repoussés vers le centre, ou téléportés s'ils s'éloignent trop.
- Les chunks de l'arène restent chargés pendant le combat (tickets de chunk), même si aucun joueur n'est à côté.
- Si le serveur s'arrête brutalement, les bots restants sont supprimés au démarrage suivant ou au chargement de leur chunk.

## Réglages (`config.yml`)

Les niveaux d'enchantement (`bot.protection`, `bot.unbreaking`, `bot.sharpness`, `bot.fire-aspect`) sont réglables. On peut aussi régler la vie, la vitesse, les golden apples, le strafe, le contour, la liste des pseudos, la taille des équipes, l'espacement, le compte à rebours, la durée maximale et la portée des annonces aux spectateurs.
