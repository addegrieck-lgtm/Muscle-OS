# Plans 3D (motion) des constructions

Rendu three.js des schématiques, image par image, assemblé avec ffmpeg. Blocs en couleurs unies (pas de textures Minecraft).

- `test-koth-3d.mp4` : plan test de 6 s (1080 × 1920, 30 i/s) sur le KOTH « Gouffre de Vælor ».

## Régénérer

    cd source
    cp ../../../../minecraft/koth-volcan/generate.py kv.py   # export.py lit les couleurs du KOTH
    python3 export.py ../../../../minecraft/koth-volcan/koth-volcan.schem koth.bin .
    npm i three@0.160.0
    cp ../../../../brand/pvp-factions/fonts/chakra-petch-latin-700-normal.woff2 .
    python3 -m http.server 8765 &
    mkdir -p frames && node shoot.js frames 180
    ffmpeg -framerate 30 -i frames/f%04d.png -c:v libx264 -pix_fmt yuv420p -crf 18 test-koth-3d.mp4

La trajectoire de la caméra et les titres sont dans `scene.html` (`renderAt`). Environ 5 s par image en rendu logiciel.
