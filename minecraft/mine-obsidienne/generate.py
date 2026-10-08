"""Mine d'obsidienne VÆLORIA (Paper 1.21.4+), au format Sponge v2 (.schem, WorldEdit/FAWE).

Usage : python3 minecraft/mine-obsidienne/generate.py   (Pillow + numpy ; réutilise minecraft/spawn)
Sorties dans minecraft/mine-obsidienne/ : vaeloria-mine-obsidienne.schem, apercu-*.png.

Bloc d'obsidienne de 21 × 15 × 8, couloir vide d'un bloc tout autour, puis un mur fermé sans sortie,
coiffé d'une voûte en verre rubis sur nervures de pierre noire : personne ne sort par le haut.
On y entre seulement en sautant depuis le balcon d'arrivée, par-dessus le couloir (3 blocs de chute).
Le couloir d'un bloc autour de l'obsidienne reste vide du sol jusqu'à la voûte.
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
Palette, write_schem, logo_grid = _spawn.Palette, _spawn.write_schem, _spawn.logo_grid

OBS_X, OBS_Z, OBS_H = 21, 15, 8  # obsidienne : x 0..20, z 0..14, y 1..8
WALL_TOP = 16  # haut du mur ; la voûte en ogive commence juste au-dessus
ARRIVAL = (10, 12, 17)  # pieds du joueur sur le balcon (sud)

PB = "minecraft:polished_blackstone_bricks"
DT = "minecraft:deepslate_tiles"
X0, X1, Z0, Z1, Y0, Y1 = -2, OBS_X + 1, -2, OBS_Z + 4, 0, 30
RIDGE_X = OBS_X // 2  # faîtage de la voûte, dans l'axe du balcon


def roof_y(x):
    """Voûte en ogive : 17 au bord, 29 au faîtage, un bloc de plus à chaque pas vers le centre."""
    return WALL_TOP + 1 + (12 - abs(x - RIDGE_X))


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

    # Balcon d'arrivée au sud, dans l'épaisseur du mur : on saute par-dessus le couloir sur l'obsidienne.
    ax, ay, az = ARRIVAL
    for x in range(ax - 2, ax + 3):
        for z in range(OBS_Z + 1, az + 2):  # le balcon s'arrête au mur : le couloir d'un bloc reste vide sur toute sa hauteur
            put(x, ay - 1, z, "minecraft:polished_blackstone" if abs(x - ax) < 2 else PB)
    # Salle du balcon fermée : murs latéraux et mur du fond jusqu'à son plafond (y 17).
    for z in range(wz1, az + 3):
        for y in range(ay - 1, 17):
            put(ax - 3, y, z, PB if y in (ay - 1, 16) else DT)
            put(ax + 3, y, z, PB if y in (ay - 1, 16) else DT)
    for x in range(ax - 3, ax + 4):
        for y in range(ay - 1, 17):
            put(x, y, az + 2, PB if y in (ay - 1, 16) else DT)
        for z in range(wz1, az + 3):
            put(x, 17, z, "minecraft:polished_blackstone_brick_slab[type=bottom]" if wz1 < z < az + 2 and abs(x - ax) < 3 else PB)
    for y, half in ((ay, 0), (ay + 1, 1), (ay + 2, 1), (ay + 3, 0)):  # losange rubis au fond
        for x in range(ax - half, ax + half + 1):
            put(x, y, az + 2, "minecraft:redstone_block")
    for x in (ax - 2, ax + 2):
        put(x, 16, az, "minecraft:chain")
        put(x, 15, az, "minecraft:lantern[hanging=true]")
    put(ax, ay - 1, az, "minecraft:lodestone")  # point d'arrivée

    # Pignons nord et sud : le mur monte jusque sous la voûte. Ouverture au-dessus du balcon.
    for x in range(wx0, wx1 + 1):
        for y in range(WALL_TOP + 1, roof_y(x)):
            put(x, y, wz0, PB if y % 4 == 0 else DT)
            put(x, y, wz1, PB if y % 4 == 0 else DT)
    for x in range(ax - 2, ax + 3):
        for y in range(ay, 17):
            put(x, y, wz1, "minecraft:air")

    # Blason VÆLORIA dans le pignon nord, face au balcon : la première chose qu'on voit en arrivant.
    logo = logo_grid(15, relief=False)
    lh, lw = len(logo), len(logo[0])
    for gy, row in enumerate(logo):
        for gx, b in enumerate(row):
            if b:
                put(RIDGE_X + gx - lw // 2, WALL_TOP + 7 - gy, wz0, b)  # haut du blason en y 23, sous la voûte

    # Voûte : nervures en pierre noire tous les 4 blocs, verre rubis entre elles, faîtage argent.
    ribs = set(range(wz0, wz1 + 1, 4)) | {wz0, wz1}
    for x in range(wx0, wx1 + 1):
        y = roof_y(x)
        for z in range(wz0, wz1 + 1):
            if x == RIDGE_X:
                name = "minecraft:chiseled_polished_blackstone" if z in ribs else "minecraft:smooth_quartz"
            elif z in ribs or x in (wx0, wx1):
                name = PB
            else:
                name = "minecraft:red_stained_glass"
            put(x, y, z, name)
    for z in sorted(ribs):  # lanternes suspendues sous le faîtage, au-dessus de la mine
        if wz0 < z < wz1:
            for y in range(roof_y(RIDGE_X) - 3, roof_y(RIDGE_X)):
                put(RIDGE_X, y, z, "minecraft:chain")
            put(RIDGE_X, roof_y(RIDGE_X) - 4, z, "minecraft:lantern[hanging=true]")
    for x in (wx0, wx1):  # pinacles aux quatre angles
        for z in (wz0, wz1):
            put(x, WALL_TOP + 2, z, "minecraft:chiseled_polished_blackstone")
            put(x, WALL_TOP + 3, z, "minecraft:end_rod[facing=up]")

    return v, pal.names


def main():
    v, names = build()
    origin = (ARRIVAL[0] - X0, ARRIVAL[1] - Y0, ARRIVAL[2] - Z0)
    write_schem(HERE / "vaeloria-mine-obsidienne.schem", v, names, origin)
    colors = {"red_stained": (190, 40, 40), "quartz": (236, 230, 223), "calcite": (223, 224, 220), "white_concrete": (207, 213, 214),
              "diorite": (192, 193, 194), "andesite": (132, 134, 133), "light_gray": (125, 125, 115), "black_concrete": (8, 10, 15),
              "red_concrete": (142, 33, 33), "red_nether": (69, 7, 9), "chain": (90, 95, 105), "end_rod": (240, 240, 230), "obsidian": (40, 22, 60), "deepslate": (72, 72, 73), "blackstone": (53, 48, 56), "shroom": (240, 140, 70),
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
    front = Image.new("RGB", (W, H), (7, 7, 10))  # vue depuis le sud, mur sud retiré : ce qu'on voit du balcon
    for y in range(H):
        for x in range(W):
            for zi in range(OBS_Z - Z0, -1, -1):
                b = v[y, zi, x]
                if b:
                    front.putpixel((x, H - 1 - y), color(names[b]))
                    break
    front.resize((W * 12, H * 12), Image.Resampling.NEAREST).save(HERE / "apercu-face.png")
    print("obsidienne :", int((v == names.index("minecraft:obsidian")).sum()), "· taille :", v.shape[::-1])


if __name__ == "__main__":
    main()
