#!/usr/bin/env bash
# VÆLORIA — installation du kit de configuration (deploy/minecraft/kit) dans le dossier du serveur.
#
# Usage :
#   ./install.sh [options] <dossier-du-serveur>
#
#   <dossier-du-serveur>  racine du serveur (celle qui contient plugins/) ou directement le dossier plugins/.
#                         Sur BoxToPlay : télécharger plugins/ avec FileZilla, lancer le script sur cette copie,
#                         puis renvoyer les fichiers modifiés (liste affichée à la fin).
#
# Options :
#   --dry-run        n'écrit rien : affiche ce qui serait copié, sauvegardé et modifié.
#   --yes            ne demande pas de confirmer que le serveur est arrêté.
#   --new-secret     redemande le secret VaeloriaBridge même si le serveur en a déjà un.
#   --rcon           envoie ensuite la partie CONSOLE de commands.txt par RCON (serveur démarré).
#   --backup-dir D   dossier des archives (défaut : <racine>/kit-backups).
#   -h, --help       cette aide.
#
# Idempotent : un fichier identique n'est ni sauvegardé ni recopié ; relancer le script ne change rien.
# Aucun secret n'est écrit dans le dépôt : le secret du Bridge est demandé à la saisie (masquée) et écrit
# uniquement dans plugins/VaeloriaBridge/config.yml du serveur (droits 600).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KIT="$HERE/kit"
DRY=0; YES=0; NEW_SECRET=0; RCON=0; BACKUP_DIR=""; TARGET=""

# Zone d'investissement du nouveau spawn (vaeloria-spawn-fusionne-noel.schem, collée en 0 100 0 dans « spawn »).
INVEST_WORLD="spawn"; INVEST_MIN="22 101 54"; INVEST_MAX="39 108 71"

usage() { sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; }
die() { echo "ERREUR : $*" >&2; exit 1; }
say() { printf '%s\n' "$*"; }

while (($#)); do
  case "$1" in
    --dry-run) DRY=1 ;;
    --yes) YES=1 ;;
    --new-secret) NEW_SECRET=1 ;;
    --rcon) RCON=1 ;;
    --backup-dir) shift; BACKUP_DIR="${1:-}"; [[ -n "$BACKUP_DIR" ]] || die "--backup-dir sans dossier" ;;
    -h|--help) usage; exit 0 ;;
    -*) die "option inconnue : $1 (voir --help)" ;;
    *) [[ -z "$TARGET" ]] || die "un seul dossier de serveur"; TARGET="$1" ;;
  esac
  shift
done
[[ -n "$TARGET" ]] || { usage; exit 1; }
[[ -d "$TARGET" ]] || die "dossier introuvable : $TARGET"
[[ -d "$KIT/plugins" ]] || die "kit introuvable : $KIT/plugins"

# Racine du serveur ou dossier plugins/ ?
TARGET="$(cd "$TARGET" && pwd)"
if [[ -d "$TARGET/plugins" ]]; then ROOT="$TARGET"; PLUGINS="$TARGET/plugins"
elif [[ -d "$TARGET/Essentials" || -d "$TARGET/WorldGuard" || -n "$(ls "$TARGET"/*.jar 2>/dev/null)" ]]; then ROOT="$(dirname "$TARGET")"; PLUGINS="$TARGET"
else die "$TARGET ne ressemble ni à un serveur (pas de plugins/) ni à un dossier plugins/"
fi
BACKUP_DIR="${BACKUP_DIR:-$ROOT/kit-backups}"

say "Kit      : $KIT"
say "Plugins  : $PLUGINS"
((DRY)) && say "Mode     : --dry-run (rien n'est écrit)"
say ""

if ((!DRY && !YES)); then
  read -r -p "Le serveur Minecraft est-il ARRÊTÉ ? (les plugins réécrivent leurs fichiers à l'arrêt) [o/N] " ok
  [[ "$ok" =~ ^[oOyY]$ ]] || die "arrête le serveur puis relance (ou --dry-run pour simplement voir)"
fi

STAGE="$(mktemp -d)"; trap 'rm -rf "$STAGE"' EXIT
cp -R "$KIT/plugins/." "$STAGE/"

# ── Secret VaeloriaBridge ─────────────────────────────────────────────
BRIDGE_CFG="VaeloriaBridge/config.yml"
current_secret() {
  [[ -f "$PLUGINS/$BRIDGE_CFG" ]] || return 0
  sed -n -E 's/^  secret:[[:space:]]*"?([^"#[:space:]]*)"?.*$/\1/p' "$PLUGINS/$BRIDGE_CFG" | head -1
}
SECRET="$(current_secret)"
if [[ "$SECRET" == "__BRIDGE_SECRET__" || "$SECRET" == "CHANGE_ME" ]]; then SECRET=""; fi
if ((NEW_SECRET)) || [[ -z "$SECRET" ]]; then
  if ((DRY)); then
    say "Bridge   : secret à saisir lors de la vraie installation (non demandé en --dry-run)"
    SECRET="__BRIDGE_SECRET__"
  else
    say "Secret VaeloriaBridge : le même que dans BRIDGE_KEYS côté API ({\"factions-1\":\"<secret>\"} sur le Worker workers.dev ; openssl rand -hex 32)."
    read -r -s -p "Secret (saisie masquée) : " SECRET; echo
    read -r -s -p "Confirme le secret     : " SECRET2; echo
    [[ "$SECRET" == "$SECRET2" ]] || die "les deux saisies diffèrent"
    [[ ${#SECRET} -ge 32 && "$SECRET" =~ ^[A-Za-z0-9._~+/=-]+$ ]] || die "secret trop court (32 caractères minimum, sans espace ni guillemet)"
    unset SECRET2
  fi
else
  say "Bridge   : secret déjà présent sur le serveur, conservé (--new-secret pour le changer)"
fi
# Remplacement par variable d'environnement : le secret n'apparaît pas dans la ligne de commande (ps).
BRIDGE_SECRET="$SECRET" awk '{
    i = index($0, "__BRIDGE_SECRET__")
    if (i) { $0 = substr($0, 1, i - 1) ENVIRON["BRIDGE_SECRET"] substr($0, i + 17); sub(/[[:space:]]*# rempli par install.sh.*$/, "") }
    print }' "$STAGE/$BRIDGE_CFG" > "$STAGE/$BRIDGE_CFG.tmp" && mv "$STAGE/$BRIDGE_CFG.tmp" "$STAGE/$BRIDGE_CFG"
unset SECRET

# ── Zone d'investissement : seul le bloc « zones: » de VaeloriaShop/data/invest.yml change ──
# Les comptes des joueurs (accounts:) sont gardés tels quels.
INVEST="VaeloriaShop/data/invest.yml"
mkdir -p "$STAGE/VaeloriaShop/data"
{
  read -r x0 y0 z0 <<<"$INVEST_MIN"; read -r x1 y1 z1 <<<"$INVEST_MAX"
  zones="zones:
  zone1:
    name: Zone d'investissement 1
    world: $INVEST_WORLD
    min:
    - $x0
    - $y0
    - $z0
    max:
    - $x1
    - $y1
    - $z1"
  if [[ -f "$PLUGINS/$INVEST" ]]; then
    # Remplace le bloc zones: (jusqu'à la clé de premier niveau suivante), garde tout le reste.
    awk -v z="$zones" '
      /^zones:/ { print z; skip=1; done=1; next }
      skip && /^[^[:space:]#]/ { skip=0 }
      !skip { print }
      END { if (!done) print z }' "$PLUGINS/$INVEST"
  else
    printf '%s\n' "$zones"
  fi
} > "$STAGE/$INVEST"

# ── Comparaison kit / serveur ─────────────────────────────────────────
NEW=(); CHANGED=(); SAME=0
while IFS= read -r -d '' f; do
  rel="${f#"$STAGE"/}"
  if [[ ! -e "$PLUGINS/$rel" ]]; then NEW+=("$rel")
  elif cmp -s "$f" "$PLUGINS/$rel"; then SAME=$((SAME + 1))
  else CHANGED+=("$rel")
  fi
done < <(find "$STAGE" -type f -print0 | sort -z)

say ""
say "Identiques : $SAME   Nouveaux : ${#NEW[@]}   Modifiés : ${#CHANGED[@]}"
for r in "${NEW[@]}"; do say "  + plugins/$r"; done
for r in "${CHANGED[@]}"; do
  if [[ "$r" == "$BRIDGE_CFG" ]]; then say "  ~ plugins/$r  (diff masqué : contient le secret)"
  else say "  ~ plugins/$r"; ((DRY)) && diff -u "$PLUGINS/$r" "$STAGE/$r" | sed -n '3,40p' | sed 's/^/      /' || true
  fi
done

# ── Jars en double (deux versions du même plugin = l'une des deux est ignorée, au hasard) ──
if command -v unzip >/dev/null 2>&1; then
  dups="$(for j in "$PLUGINS"/*.jar; do
    [[ -f "$j" ]] || continue
    n="$(unzip -p "$j" plugin.yml paper-plugin.yml 2>/dev/null | sed -n -E "s/^name:[[:space:]]*['\"]?([^'\"[:space:]]+).*/\1/p" | head -1)"
    [[ -n "$n" ]] && printf '%s\t%s\n' "$n" "$(basename "$j")"
  done | sort | awk -F'\t' '{c[$1]++; l[$1]=l[$1] "  " $2} END {for (k in c) if (c[k] > 1) print "  " k " :" l[k]}')"
  if [[ -n "$dups" ]]; then
    say ""; say "ATTENTION — plugins installés en double (garder la version la plus récente, retirer l'autre à la main) :"
    say "$dups"
  fi
fi

if ((${#NEW[@]} + ${#CHANGED[@]} == 0)); then
  say ""; say "Rien à faire : le serveur a déjà le kit."
elif ((DRY)); then
  say ""; say "--dry-run : rien n'a été écrit."
else
  # ── Sauvegarde horodatée des fichiers qui vont être remplacés ──
  stamp="$(date +%Y%m%d-%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  archive="$BACKUP_DIR/configs-$stamp.tar.gz"
  if ((${#CHANGED[@]})); then
    (cd "$PLUGINS" && tar -czf "$archive" "${CHANGED[@]}")
    chmod 600 "$archive"   # contient l'ancien secret du Bridge
    say ""; say "Sauvegarde : $archive"
    say "  (restaurer : tar -xzf \"$archive\" -C \"$PLUGINS\")"
  fi
  for r in "${NEW[@]}" "${CHANGED[@]}"; do
    mkdir -p "$PLUGINS/$(dirname "$r")"
    cp "$STAGE/$r" "$PLUGINS/$r"
  done
  chmod 600 "$PLUGINS/$BRIDGE_CFG" 2>/dev/null || true
  printf '%s\n' "${NEW[@]}" "${CHANGED[@]}" | sed 's#^#plugins/#' > "$BACKUP_DIR/fichiers-modifies-$stamp.txt"
  say ""; say "Copié : $(( ${#NEW[@]} + ${#CHANGED[@]} )) fichier(s). Liste à renvoyer par FileZilla : $BACKUP_DIR/fichiers-modifies-$stamp.txt"
fi

say ""
say "Non touchés exprès : WorldGuard/worlds/*/regions.yml (régions → commands.txt), Votifier/ (jeton et clés des"
say "sites de vote), données des joueurs. Suite : démarrer le serveur puis passer commands.txt (README, étape 4)."

if ((RCON)); then
  ((DRY)) && { say "--rcon ignoré en --dry-run"; exit 0; }
  say ""; say "Envoi de la partie CONSOLE de commands.txt par RCON (le serveur doit être démarré)."
  PY="$(command -v python3 || command -v python || true)"
  [[ -n "$PY" ]] || die "python3 introuvable pour rcon.py"
  "$PY" "$HERE/rcon.py" "$HERE/commands.txt"
fi
