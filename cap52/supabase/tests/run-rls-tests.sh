#!/usr/bin/env bash
# Applique les migrations sur un Postgres 16 jetable puis exécute les tests de sécurité RLS.
# Usage : npm run test:rls   (nécessite les binaires PostgreSQL : initdb, pg_ctl, psql)
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$DIR/.."
PGBIN="${PGBIN:-$(pg_config --bindir 2>/dev/null || echo /usr/lib/postgresql/16/bin)}"
PORT="${PGPORT_RLS:-54329}"
TMP="$(mktemp -d)"
as_pg() { if [ "$(id -u)" = "0" ]; then runuser -u postgres -- "$@"; else "$@"; fi; }
[ "$(id -u)" = "0" ] && chown postgres "$TMP"
cleanup() { as_pg "$PGBIN/pg_ctl" -D "$TMP/data" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$TMP"; }
trap cleanup EXIT
as_pg "$PGBIN/initdb" -D "$TMP/data" -U postgres --auth=trust >/dev/null
as_pg "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p $PORT -k $TMP -c listen_addresses=''" -w start >/dev/null
FILES=(-f "$DIR/auth_stub.sql")
for f in "$ROOT"/migrations/*.sql; do FILES+=(-f "$f"); done
FILES+=(-f "$DIR/rls_test.sql")
as_pg "$PGBIN/psql" -h "$TMP" -p "$PORT" -U postgres -d postgres -v ON_ERROR_STOP=1 -q -X -o /dev/null "${FILES[@]}"
echo "Tests RLS : OK"
