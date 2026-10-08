# VaeloriaTab

Liste des joueurs (TAB) aux couleurs du logo VÆLORIA, pour Paper 1.21.4+ (Java 21). Aucune dépendance externe.

![Aperçu](apercu.png)

- **En-tête** : wordmark `V Æ L O R I A` argent balayé par un reflet blanc animé, l'**Æ en rubis** comme sur le logo, filets rubis et devise « LE RETOUR DE LA **VRAIE GUERRE**. »
- **Pied de page** : joueurs visibles / max, ping et TPS colorés selon des seuils, serveur, grade du joueur, `vaeloria.fr` et `/link`.
- **Noms** : préfixe de grade (Fondateur, Admin, Modo, VÆLORIAN…) et **tri** de la liste par grade.
- Charte du logo (`brand/build.py`) disponible comme balises MiniMessage : `<ruby>`, `<ruby_hi>`, `<ruby_lo>`, `<snow>`, `<silver>`, `<steel>`, `<ash>`, `<graphite>`.

## Installation

```sh
cd plugins/vaeloria-tab && gradle build   # → build/libs/vaeloria-tab-0.1.0.jar
```

Copier le jar dans `plugins/` du serveur, démarrer, ajuster `plugins/VaeloriaTab/config.yml`, puis `/vtab reload` (permission `vaeloria.tab.admin`, ops par défaut).

## Grades

Chaque grade de `config.yml` a une permission ; le joueur reçoit le grade d'`order` le plus élevé qu'il possède (`default` sinon). Exemple avec LuckPerms :

```
/lp group vaelorian permission set vaeloria.rank.vaelorian
```

Ces permissions sont déclarées à `false` par défaut : un op n'apparaît pas « Fondateur » sans qu'on le lui donne. Les grades sont relus toutes les `names-refresh-ticks` (2 s par défaut), un changement LuckPerms apparaît donc sans reconnexion.

## Variables

`<logo>`, `<player>`, `<rank>`, `<online>`, `<max>`, `<ping>`, `<tps>`, `<server>`, `<world>`, et les couleurs `<ping_color>…</ping_color>`, `<tps_color>…</tps_color>`.
