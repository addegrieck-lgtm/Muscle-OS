#!/usr/bin/env bash
# Applique les migrations sur un PostgreSQL 16 jetable (avec des bouchons minimaux des schémas
# auth/storage de Supabase) puis exécute les tests RLS et métier. Nécessite les binaires PostgreSQL.
set -euo pipefail
cd "$(dirname "$0")/.."
PGBIN=${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}
DIR=$(mktemp -d)
PORT=${PORT:-55432}
cleanup() { $RUN "$PGBIN/pg_ctl" -D "$DIR" stop -m immediate >/dev/null 2>&1 || true; rm -rf "$DIR"; }
if [ "$(id -u)" = "0" ]; then RUN="runuser -u postgres --"; chown postgres "$DIR"; else RUN=""; fi
trap cleanup EXIT
$RUN "$PGBIN/initdb" -D "$DIR" -U postgres -A trust >/dev/null
$RUN "$PGBIN/pg_ctl" -D "$DIR" -o "-p $PORT -k /tmp -c listen_addresses=''" -l "$DIR/log" start >/dev/null
PSQL=(psql -h /tmp -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q)
"${PSQL[@]}" -f tests/supabase_stubs.sql
for f in migrations/*.sql; do echo "→ $f"; "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f seed/seed.sql
for f in tests/*.test.sql; do echo "▶ $f"; "${PSQL[@]}" -f "$f"; done
[ -n "${DEBUG_SQL:-}" ] && "${PSQL[@]}" -c "$DEBUG_SQL"
echo "✔ Tests base de données réussis"
