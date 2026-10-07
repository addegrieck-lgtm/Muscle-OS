#!/usr/bin/env sh
# Sauvegarde quotidienne PostgreSQL (cron : 15 4 * * *). Conserve 14 jours en local ;
# copier ensuite vers un stockage externe (voir docs/SCALABILITY.md § Sauvegardes).
set -eu
DIR="${BACKUP_DIR:-/var/backups/vaeloria}"
mkdir -p "$DIR"
FILE="$DIR/vaeloria-$(date +%Y%m%d-%H%M%S).dump"
docker compose -f "$(dirname "$0")/docker-compose.prod.yml" exec -T postgres pg_dump -U vaeloria -Fc vaeloria > "$FILE"
find "$DIR" -name 'vaeloria-*.dump' -mtime +14 -delete
echo "Sauvegarde : $FILE ($(du -h "$FILE" | cut -f1))"
