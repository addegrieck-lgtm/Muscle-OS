#!/usr/bin/env bash
# VÆLORIA — lancement du serveur Paper avec les flags d'Aikar (G1GC réglé pour Minecraft).
# Usage : MEM=12G ./start.sh            (Java 21 requis, paper.jar dans le dossier courant)
# Redémarre automatiquement après un crash ou un /restart, sauf arrêt volontaire (fichier .stop).
set -euo pipefail

MEM="${MEM:-12G}"
JAR="${JAR:-paper.jar}"
GB="${MEM%[GgMm]}"; [[ "$MEM" =~ [Mm]$ ]] && GB=$((GB / 1024))

# Au-delà de 12 Go, Aikar recommande une jeune génération plus grande.
if (( GB > 12 )); then
  G1="-XX:G1NewSizePercent=40 -XX:G1MaxNewSizePercent=50 -XX:G1HeapRegionSize=16M -XX:G1ReservePercent=15 -XX:InitiatingHeapOccupancyPercent=20"
else
  G1="-XX:G1NewSizePercent=30 -XX:G1MaxNewSizePercent=40 -XX:G1HeapRegionSize=8M -XX:G1ReservePercent=20 -XX:InitiatingHeapOccupancyPercent=15"
fi

FLAGS="-Xms$MEM -Xmx$MEM -XX:+UseG1GC -XX:+ParallelRefProcEnabled -XX:MaxGCPauseMillis=200 \
-XX:+UnlockExperimentalVMOptions -XX:+DisableExplicitGC -XX:+AlwaysPreTouch $G1 \
-XX:G1HeapWastePercent=5 -XX:G1MixedGCCountTarget=4 -XX:G1MixedGCLiveThresholdPercent=90 \
-XX:G1RSetUpdatingPauseIntervalMillis=100 -XX:SurvivorRatio=32 -XX:+PerfDisableSharedMem \
-XX:MaxTenuringThreshold=1 -Dusing.aikars.flags=https://mcflags.emc.gs -Daikars.new.flags=true \
-Dfile.encoding=UTF-8"

rm -f .stop
while true; do
  # shellcheck disable=SC2086
  java $FLAGS -jar "$JAR" --nogui || true
  [[ -f .stop ]] && { echo "Arrêt volontaire (.stop présent)."; exit 0; }
  echo "Serveur arrêté — redémarrage dans 5 s (créer un fichier .stop pour annuler)."
  sleep 5
done
