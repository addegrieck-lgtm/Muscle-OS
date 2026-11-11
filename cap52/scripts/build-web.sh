#!/usr/bin/env bash
# Construit la version web statique de CAP 52.
# Usage : EXPO_BASE_URL=/Muscle-OS/cap52 bash scripts/build-web.sh <dossier de sortie>
#
# Hébergeurs statiques sans réécriture d'URL (GitHub Pages) : on copie index.html dans le dossier
# de chaque route, pour qu'un rechargement ou un lien direct (ex. …/stats) ouvre bien l'application.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:?dossier de sortie requis}"

npx expo export --platform web --output-dir "$OUT"

routes=(onboarding challenge stats settings share premium challenges challenges/new account friends coach privacy)
# Route dynamique /week/[index] : une page par semaine possible (jusqu'à 260, limite des challenges).
for i in $(seq 1 260); do routes+=("week/$i"); done

for r in "${routes[@]}"; do
  mkdir -p "$OUT/$r"
  cp "$OUT/index.html" "$OUT/$r/index.html"
done
echo "Version web prête dans $OUT (${#routes[@]} routes)"
