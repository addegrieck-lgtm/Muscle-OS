"""Mine d'obsidienne VÆLORIA (Paper 1.21.4+), au format Sponge v2 (.schem, WorldEdit/FAWE).

Usage : python3 minecraft/mine-obsidienne/generate.py   (Pillow + numpy ; réutilise minecraft/spawn)
Sorties dans minecraft/mine-obsidienne/ : vaeloria-mine-obsidienne.schem, apercu-*.png.

Bloc d'obsidienne de 21 × 15 × 8, couloir vide d'un bloc tout autour, puis un mur fermé sans sortie.
On y entre seulement en sautant depuis le balcon d'arrivée (3 blocs de chute sur le dessus de la mine).
Point de collage : les pieds du joueur au point d'arrivée, sur le balcon. Nord = -Z.
"""

from __future__ import annotations

import importlib.util
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("vaeloria_spawn", HERE.parent / "spawn" / "generate.py")
_spawn = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_spawn)
Palette, write_schem = _spawn.Palette, _spawn.write_schem

OBS_X, OBS_Z, OBS_H = 21, 15, 8  # obsidienne : x 0..20, z 0..14, y 1..8
WALL_TOP = 11  # haut du mur : 3 blocs au-dessus de l'obsidienne, on ne remonte pas
ARRIVAL = (10, 12, 17)  # pieds du joueur sur le balcon (sud)

PB = "minecraft:polished_blackstone_bricks"
DT = "minecraft:deepslate_tiles"
X0, X1, Z0, Z1, Y0, Y1 = -2, OBS_X + 1, -2, OBS_Z + 4, 0, 15


def build():
    pal = Palette()
    v = np.zeros((Y1 - Y0 + 1, Z1 - Z0 + 1, X1 - X0 + 1), dtype=np.int32)

    def put(x, y, z, name):
        v[y - Y0, z - Z0, x - X0] = pal(name)

    wx0, wx1, wz0, wz1 = -2, OBS_X + 1, -2, OBS_Z + 1  # mur : un bloc après le couloir
    for x in range(wx0, wx1 + 1):
        for z in range(wz0, wz1 + 1):
            put(x, 0, z, "minecraft:polished_deepslate" if wx0 < x < wx1 and wz0 < z < wz1 else PB)  # sol
            if x in (wx0, wx1) or z in (wz0, wz1):
                for y in range(1, WALL_TOP + 1):
                    band = y % 4 == 0 or y == WALL_TOP
                    put(x, y, z, PB if band else DT)
            elif 0 <= x < OBS_X and 0 <= z < OBS_Z:
                for y in range(1, OBS_H + 1):
                    put(x, y, z, "minecraft:obsidian")
    # Lumière dans la face intérieure du mur : pas de monstres dans le couloir ni au fond.
    for x in range(wx0 + 2, wx1 - 1, 5):
        for y in (2, 6):
            put(x, y, wz0, "minecraft:shroomlight")
            put(x, y, wz1, "minecraft:shroomlight")
    for z in range(wz0 + 3, wz1 - 1, 5):
        for y in (2, 6):
            put(wx0, y, z, "minecraft:shroomlight")
            put(wx1, y, z, "minecraft:shroomlight")

    # Balcon d'arrivée au sud : il avance au-dessus du couloir, on saute sur l'obsidienne.
    ax, ay, az = ARRIVAL
    for x in range(ax - 2, ax + 3):
        for z in range(OBS_Z, az + 2):
            put(x, ay - 1, z, "minecraft:polished_blackstone" if abs(x - ax) < 2 else PB)
    for z in range(OBS_Z, az + 3):  # garde-corps latéraux
        put(ax - 3, ay - 1, z, PB)
        put(ax + 3, ay - 1, z, PB)
        put(ax - 3, ay, z, "minecraft:polished_blackstone_brick_wall[up=true]")
        put(ax + 3, ay, z, "minecraft:polished_blackstone_brick_wall[up=true]")
    for x in range(ax - 3, ax + 4):  # mur du fond avec losange rubis
        for y in range(ay - 1, ay + 4):
            put(x, y, az + 2, PB if y in (ay - 1, ay + 3) else DT)
    for y, half in ((ay, 0), (ay + 1, 1), (ay + 2, 0)):
        for x in range(ax - half, ax + half + 1):
            put(x, y, az + 2, "minecraft:redstone_block")
    put(ax - 2, ay, az + 1, "minecraft:lantern[hanging=false]")
    put(ax + 2, ay, az + 1, "minecraft:lantern[hanging=false]")
    put(ax, ay - 1, az, "minecraft:lodestone")  # point d'arrivée

    return v, pal.names


def main():
    v, names = build()
    origin = (ARRIVAL[0] - X0, ARRIVAL[1] - Y0, ARRIVAL[2] - Z0)
    write_schem(HERE / "vaeloria-mine-obsidienne.schem", v, names, origin)
    colors = {"obsidian": (40, 22, 60), "deepslate": (72, 72, 73), "blackstone": (53, 48, 56), "shroom": (240, 140, 70),
              "redstone": (175, 24, 5), "lantern": (230, 180, 90), "lodestone": (150, 150, 155)}

    def color(n):
        return next((c for k, c in colors.items() if k in n), (110, 110, 110))

    H, L, W = v.shape
    top = Image.new("RGB", (W, L), (7, 7, 10))
    for z in range(L):
        for x in range(W):
            col = np.nonzero(v[:, z, x])[0]
            if col.size:
                top.putpixel((x, z), color(names[v[col[-1], z, x]]))
    top.resize((W * 12, L * 12), Image.Resampling.NEAREST).save(HERE / "apercu-dessus.png")
    cut = Image.new("RGB", (L, H), (7, 7, 10))  # coupe nord-sud par le balcon
    for y in range(H):
        for z in range(L):
            b = v[y, z, ARRIVAL[0] - X0]
            if b:
                cut.putpixel((z, H - 1 - y), color(names[b]))
    cut.resize((L * 12, H * 12), Image.Resampling.NEAREST).save(HERE / "apercu-coupe.png")
    print("obsidienne :", int((v == names.index("minecraft:obsidian")).sum()), "· taille :", v.shape[::-1])


if __name__ == "__main__":
    main()
