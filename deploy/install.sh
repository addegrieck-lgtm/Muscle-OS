#!/usr/bin/env bash
# Installation / mise à jour de VÆLORIA (site + API + admin + base) sur un VPS Ubuntu/Debian.
#
#   curl -fsSL https://raw.githubusercontent.com/addegrieck-lgtm/Muscle-OS/main/deploy/install.sh | sudo bash
#
# Relancer le script = mise à jour (récupère le code, reconstruit, redémarre). Les secrets de
# deploy/.env sont créés une seule fois et jamais écrasés.
# Variables facultatives : DOMAIN, MC_HOST, MC_PORT, VAELORIA_DIR (défaut /opt/vaeloria), VAELORIA_BRANCH (défaut main).
set -euo pipefail

REPO_URL="https://github.com/addegrieck-lgtm/Muscle-OS.git"
DIR="${VAELORIA_DIR:-/opt/vaeloria}"
BRANCH="${VAELORIA_BRANCH:-main}"

say() { printf '\n\033[1;31m◆\033[0m \033[1m%s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m! %s\033[0m\n' "$*"; }
die() { printf '\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }
# Lecture au clavier même quand le script arrive par « curl | bash ».
ask() { local prompt="$1" def="$2" ans=""; if [ -r /dev/tty ]; then read -r -p "$prompt [$def] : " ans </dev/tty || true; fi; echo "${ans:-$def}"; }

# Tout le script est dans main() : avec « curl | bash », bash lit ainsi le fichier en entier avant de
# l'exécuter, et aucune commande (docker, apt…) ne peut avaler la suite du script par l'entrée standard.
main() {
[ "$(id -u)" -eq 0 ] || die "Lance ce script en root (sudo bash install.sh)."
command -v apt-get >/dev/null || die "Ce script vise Ubuntu ou Debian (apt-get introuvable)."

say "Paquets de base"
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq git curl openssl ca-certificates >/dev/null

if ! command -v docker >/dev/null || ! docker compose version >/dev/null 2>&1; then
  say "Installation de Docker"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker >/dev/null 2>&1 || true

say "Code de VÆLORIA ($BRANCH) dans $DIR"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch --quiet origin "$BRANCH"
  git -C "$DIR" checkout --quiet "$BRANCH"
  git -C "$DIR" reset --quiet --hard "origin/$BRANCH"
else
  git clone --quiet --branch "$BRANCH" "$REPO_URL" "$DIR"
fi
cd "$DIR/deploy"

ENV_FILE="$DIR/deploy/.env"
if [ ! -f "$ENV_FILE" ]; then
  say "Configuration (une seule fois)"
  DOMAIN="${DOMAIN:-$(ask "Nom de domaine du site (sans https://)" "vaeloria.fr")}"
  MC_HOST="${MC_HOST:-$(ask "Adresse du serveur Minecraft (IP BoxToPlay ou play.$DOMAIN)" "play.$DOMAIN")}"
  MC_PORT="${MC_PORT:-$(ask "Port du serveur Minecraft" "25565")}"
  BRIDGE_SECRET="$(openssl rand -hex 32)"
  SETUP_CODE="$(openssl rand -hex 6 | tr 'a-f' 'A-F')"
  umask 077
  cat > "$ENV_FILE" <<EOF
# Généré par deploy/install.sh le $(date -u +%F). NE JAMAIS PARTAGER NI COMMITER CE FICHIER.
DOMAIN=$DOMAIN
MC_PING_HOST=$MC_HOST
MC_PING_PORT=$MC_PORT
POSTGRES_PASSWORD=$(openssl rand -hex 24)
BRIDGE_KEYS=factions-1:$BRIDGE_SECRET
ADMIN_API_TOKEN=$(openssl rand -hex 32)
WEB_INTERNAL_TOKEN=$(openssl rand -hex 32)
# Code pour devenir propriétaire (site → Mon compte → Accès équipe). À vider une fois utilisé, puis relancer le script.
ADMIN_SETUP_CODE=$SETUP_CODE
EOF
  chmod 600 "$ENV_FILE"
fi
# shellcheck disable=SC1090
set -a; . "$ENV_FILE"; set +a

say "Vérification du DNS"
PUBLIC_IP="$(curl -fsS --max-time 5 https://api.ipify.org || true)"
for host in "$DOMAIN" "www.$DOMAIN" "api.$DOMAIN"; do
  resolved="$(getent ahostsv4 "$host" | awk 'NR==1{print $1}' || true)"
  if [ -z "$resolved" ]; then
    warn "$host ne pointe nulle part : crée un enregistrement A vers ${PUBLIC_IP:-l’IP de ce VPS}."
  elif [ -n "$PUBLIC_IP" ] && [ "$resolved" != "$PUBLIC_IP" ]; then
    warn "$host pointe vers $resolved, pas vers ce VPS ($PUBLIC_IP) : le certificat HTTPS échouera tant que ce n'est pas corrigé."
  else
    echo "  ✓ $host → $resolved"
  fi
done

say "Construction et démarrage (5 à 15 minutes la première fois)"
docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" up -d --build --remove-orphans

say "Attente de l'API"
ok=""
for _ in $(seq 1 60); do
  if docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" exec -T api wget -qO- http://127.0.0.1:4000/health </dev/null 2>/dev/null | grep -q '"ok":true'; then ok=1; break; fi
  sleep 3
done
[ -n "$ok" ] || { docker compose -f docker-compose.prod.yml --env-file "$ENV_FILE" logs --tail 60 api; die "L'API ne répond pas (journaux ci-dessus)."; }
echo "  ✓ API en ligne"

BRIDGE_SECRET="${BRIDGE_KEYS#*:}"
cat <<EOF

────────────────────────────────────────────────────────────────────
 VÆLORIA est en ligne (le certificat HTTPS peut prendre 1 à 2 minutes)
────────────────────────────────────────────────────────────────────
 Site   : https://$DOMAIN
 Admin  : https://$DOMAIN/admin
 API    : https://api.$DOMAIN/health

 1) Crée ton compte sur https://$DOMAIN/login, puis
    Mon compte → Accès équipe → code : ${ADMIN_SETUP_CODE:-(déjà utilisé / vidé)}

 2) Sur le serveur Minecraft, plugins/VaeloriaBridge/config.yml :

    api:
      url: "https://api.$DOMAIN"
      key-id: "factions-1"
      secret: "$BRIDGE_SECRET"
    server-name: "factions"

    puis redémarre le serveur et tape /vbridge en jeu.

 Mise à jour plus tard : relance ce même script.
 Secrets : $ENV_FILE (garde-le privé).
────────────────────────────────────────────────────────────────────
EOF
}

main "$@"
