# Vidéo TikTok en plans 3D

`../vaeloria-tiktok-3d.mp4` : 28 s, 1080 × 1920, 30 i/s, avec musique.

| Temps | Plan |
|---|---|
| 0 – 2,5 s | Logo VÆLORIA PvP Factions, « Le retour de la vraie guerre » |
| 2,5 – 7 s | Le spawn, L'Île-Cœur |
| 7 – 11 s | L'Île Marchande |
| 11 – 15 s | La warzone, La Fosse |
| 15 – 20 s | KOTH, Gouffre de Vælor |
| 20 – 24 s | Événement Totem, Le Sanctuaire |
| 24 – 28 s | Logo, « Saison I », discord.gg/vaeloria |

Les plans sont des rendus three.js des schématiques, image par image. Blocs en couleurs unies (pas de textures Minecraft).
La musique (`vaeloria-musique-ambiance.mp3`) est synthétisée par `source/musique/tiktok_son.py` : aucune musique sous droits.

## Régénérer

Dans `source/` :

1. `export.py <fichier.schem> <plan>.bin <dossier de kv.py>` pour chaque schématique (spawn, ile, fosse, koth, totem).
   `kv.py` est une copie de `minecraft/koth-volcan/generate.py`, placée à côté d'un dossier `ile-commerciale`.
2. `npm i three@0.160.0`, copier la police Chakra Petch 700 et le logo transparent (`logo.png`), puis `python3 -m http.server 8765 &`.
3. `./all.sh` rend les plans 3D dans `out/` (4 processus, environ 12 minutes) ; `node card.js intro cards/intro 75` et
   `node card.js outro cards/outro 120` rendent le début et la fin.
4. `python3 musique/tiktok_son.py musique.wav` (numpy + scipy), puis assemblage des images et du son avec ffmpeg.

Trajectoires de caméra et titres : `shots.js`. Aperçu rapide d'un plan : `./pv.sh <plan>`.
