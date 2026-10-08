# Arène de bots P4 U3 — VæloriaArena

Plugin Paper 1.21 (`plugins/vaeloria-arena`, Java 21), indépendant de VæloriaBridge. Build : `gradle build` → `build/libs/vaeloria-arena-0.2.1.jar`. **Vault** et un plugin d'économie sont nécessaires pour les paris ; sans eux, les combats ont lieu sans paris.

Des bots s'affrontent en deux équipes, **Rouge** et **Bleu**, en stuff diamant **Protection IV / Unbreaking III** avec une **hache en diamant Sharpness V**. Avant chaque combat, les joueurs **parient leur monnaie** sur l'équipe gagnante. Les joueurs autour regardent le combat : compte à rebours, kill feed, titre de victoire et MVP.

L'arène du spawn est fournie en schematic : [minecraft/arene-spawn](../minecraft/arene-spawn/README.md).

## Utilisation (permission `vaeloria.arena.admin`, op par défaut)

| Commande | Effet |
|---|---|
| `/pari rouge\|bleu <mise>` | **Tous les joueurs.** Mise sur une équipe pendant les paris (`500`, `1,5k`, `2m`). On peut relancer sur la même équipe, pas sur l'autre. `/pari` seul affiche les cagnottes, les cotes et ta mise. |
| `/botarena setcentre [rayon]` | Le centre de l'arène est ta position (sol plat conseillé). Pour l'arène du spawn : centre de la fosse, rayon 18. |
| `/botarena start [n]` | Lance un combat `n` contre `n` (par défaut 3, maximum `match.max-team-size`). |
| `/botarena stop` | Annule le combat et supprime les bots. |
| `/botarena statut` | Affiche les survivants, les kills et la durée. |
| `/botarena reload` | Recharge `config.yml` (pris en compte au combat suivant). |

## Déroulement

1. Les bots apparaissent sur deux lignes face à face et restent immobiles pendant les paris et le compte à rebours.
2. **Paris** (`bets.duration-seconds`, 30 s par défaut) : l'annonce part à tout le serveur avec des boutons cliquables [Parier Rouge] / [Parier Bleu]. Une barre de boss affiche le temps restant, la cagnotte de chaque équipe, le nombre de parieurs et les cotes. Un rappel est envoyé 10 s avant la fermeture.
3. Au « COMBAT ! », chaque bot cible le bot adverse vivant le plus proche. Il strafe et saute près de sa cible (style PvP 1.8). Sous 3 ❤ il mange une golden apple (régénération II et absorption, 2 pommes par défaut). Un combat dure au plus 2 minutes (`match.max-duration-seconds`).
4. Une équipe éliminée a perdu. Si `match.max-duration-seconds` est atteint, la victoire va à l'équipe qui a le plus de survivants, puis le plus de kills, sinon c'est une égalité.
5. Les gains sont versés (voir ci-dessous). Après `cleanup-delay-seconds`, les bots sont supprimés.

## Paris

C'est un **pari mutuel** : les joueurs parient les uns contre les autres, et le serveur ne fixe pas de cote.

- La mise est débitée tout de suite (Vault). Elle doit être entre `bets.min` et `bets.max` (total par joueur et par combat).
- Les gagnants récupèrent leur mise **plus une part de la mise des perdants, au prorata de leur mise**, arrondie au centime inférieur. Exemple : Rouge 100 + 300, Bleu 200, Rouge gagne. Le premier parieur reçoit 150, le second 450.
- La cote affichée (×1,50) est ce que rapporte 1 misé. Elle bouge jusqu'à la fermeture des paris.
- **Remboursement intégral** si personne n'a parié en face, en cas d'égalité, si le combat est annulé (`/botarena stop`, arrêt du plugin), ou après un crash : les mises en cours sont écrites dans `paris-en-cours.yml` et remboursées au démarrage suivant.
- `bets.house-cut-percent` prélève une part de la mise des perdants pour le serveur (0 par défaut).
- Un paiement refusé par l'économie est écrit en `SEVERE` dans la console avec le joueur et le montant, pour le verser à la main.

## Combats automatiques

Avec `auto.enabled: true`, un combat est lancé tout seul `auto.interval-minutes` après la fin du précédent, s'il y a au moins `auto.min-players-online` joueurs connectés. La taille des équipes est tirée dans `auto.team-sizes`.

Chaque bot affiche au-dessus de sa tête `[R] Kael 8.5❤` (absorption comprise) et un contour lumineux à la couleur de son équipe.

## Garanties

- Les bots sont des zombies marqués : ils **ne ciblent et ne blessent que l'équipe adverse**, jamais les joueurs. Les joueurs ne peuvent pas les frapper (`spectators.players-can-hit-bots`).
- Pas de tir ami, de butin, d'XP, de renforts zombies, de combustion au soleil ni de conversion en drowned.
- Les bots ne peuvent pas sortir du cercle : ils sont repoussés vers le centre, ou téléportés s'ils s'éloignent trop.
- Les chunks de l'arène restent chargés pendant le combat (tickets de chunk), même si aucun joueur n'est à côté.
- Si le serveur s'arrête brutalement, les bots restants sont supprimés au démarrage suivant ou au chargement de leur chunk.

## Réglages (`config.yml`)

L'arme (`bot.weapon`, `DIAMOND_AXE` par défaut) et les niveaux d'enchantement (`bot.protection`, `bot.unbreaking`, `bot.sharpness`, `bot.fire-aspect`) sont réglables. On peut aussi régler la vie, la vitesse, les golden apples, le strafe, le contour, la liste des pseudos, la taille des équipes, l'espacement, le compte à rebours, la durée maximale et la portée des annonces aux spectateurs.
