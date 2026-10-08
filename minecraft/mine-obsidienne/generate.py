"""Mine d'obsidienne VÆLORIA (Paper 1.21.4+), au format Sponge v2 (.schem, WorldEdit/FAWE).

Usage : python3 minecraft/mine-obsidienne/generate.py   (Pillow + numpy ; réutilise minecraft/spawn)
Sorties dans minecraft/mine-obsidienne/ : vaeloria-mine-obsidienne.schem, apercu-*.png.

Bloc d'obsidienne de 21 × 15 × 8, couloir vide d'un bloc tout autour, puis un mur fermé sans sortie,
coiffé d'une voûte en verre rubis sur nervures de pierre noire : personne ne sort par le haut.
L'obsidienne est au centre exact de l'enceinte, avec un couloir vide d'un bloc tout autour, du sol à la voûte.
On arrive sur une plateforme suspendue sous la voûte, au-dessus du centre, et on saute (3 blocs de chute).
Point de collage : les pieds du joueur au point d'arrivée, au centre de la plateforme. Nord = -Z.

build(flat=True) : même mine, mais la voûte est remplacée par un plafond plat en verre rubis en y 17 (FLAT_Y),
fait pour affleurer au niveau du sol (grotte.py) : on voit la mine depuis le dessus et le ciel depuis la mine.
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
FLAT_Y = WALL_TOP + 1  # plafond plat : haut du mur et verrière au même niveau
ARRIVAL = (OBS_X // 2, OBS_H + 4, OBS_Z // 2)  # pieds du joueur au centre de la plateforme suspendue

PB = "minecraft:polished_blackstone_bricks"
DT = "minecraft:deepslate_tiles"
X0, X1, Z0, Z1, Y0, Y1 = -2, OBS_X + 1, -2, OBS_Z + 1, 0, 30
RIDGE_X = OBS_X // 2  # faîtage de la voûte, au-dessus du centre


def roof_y(x):
    """Voûte en ogive : 17 au bord, 29 au faîtage, un bloc de plus à chaque pas vers le centre."""
    return WALL_TOP + 1 + (12 - abs(x - RIDGE_X))


def top_y(x, flat=False):
    """Haut de l'enceinte au-dessus de la colonne x : voûte en ogive, ou plafond plat."""
    return FLAT_Y if flat else roof_y(x)


def build(flat=False):
    pal = Palette()
    v = np.zeros((Y1 - Y0 + 1, Z1 - Z0 + 1, X1 - X0 + 1), dtype=np.int32)

    def put(x, y, z, name):
        v[y - Y0, z - Z0, x - X0] = pal(name)

    wx0, wx1, wz0, wz1 = -2, OBS_X + 1, -2, OBS_Z + 1  # mur : un bloc après le couloir
    for x in range(wx0, wx1 + 1):
        for z in range(wz0, wz1 + 1):
            put(x, 0, z, "minecraft:polished_deepslate" if wx0 < x < wx1 and wz0 < z < wz1 else PB)  # sol
            if x in (wx0, wx1) or z in (wz0, wz1):
                for y in range(1, (FLAT_Y if flat else WALL_TOP) + 1):
                    band = y % 4 == 0 or y >= WALL_TOP
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

    if flat:
        _flat_top(put, pal, wx0, wx1, wz0, wz1)
        return v, pal.names

    # Pignons nord et sud : le mur monte jusque sous la voûte.
    for x in range(wx0, wx1 + 1):
        for y in range(WALL_TOP + 1, roof_y(x)):
            put(x, y, wz0, PB if y % 4 == 0 else DT)
            put(x, y, wz1, PB if y % 4 == 0 else DT)

    # Blason VÆLORIA dans les deux pignons, lisible depuis l'intérieur.
    logo = logo_grid(15, relief=False)
    lh, lw = len(logo), len(logo[0])
    for gy, row in enumerate(logo):
        for gx, b in enumerate(row):
            if b:
                y = WALL_TOP + 7 - gy  # haut du blason en y 23, sous la voûte
                put(RIDGE_X + gx - lw // 2, y, wz0, b)  # nord, vu depuis le sud : gauche = ouest
                put(RIDGE_X - (gx - lw // 2), y, wz1, b)  # sud, vu depuis le nord : gauche = est

    # Plateforme d'arrivée 5 × 5 suspendue au centre, au-dessus de l'obsidienne (jamais au-dessus du couloir).
    _arrival_platform(put, roof_y)

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


def _arrival_platform(put, top):
    """Plateforme d'arrivée 5 × 5 suspendue au centre, tenue par quatre chaînes jusqu'au plafond (top(x) = premier bloc du plafond)."""
    ax, ay, az = ARRIVAL
    for x in range(ax - 2, ax + 3):
        for z in range(az - 2, az + 3):
            edge = max(abs(x - ax), abs(z - az)) == 2
            put(x, ay - 1, z, "minecraft:red_nether_bricks" if edge else "minecraft:polished_blackstone")
    put(ax, ay - 1, az, "minecraft:lodestone")  # point d'arrivée
    for x in (ax - 2, ax + 2):
        for z in (az - 2, az + 2):
            for y in range(ay, top(x)):
                put(x, y, z, "minecraft:chain")


def _flat_top(put, pal, wx0, wx1, wz0, wz1):
    """Plafond plat : verrière rubis sur une grille de pierre noire, faîtage argent ; blason sur les murs nord et sud."""
    logo = logo_grid(13, relief=False)  # 13 × 16 : tient entre le sol et le plafond
    lw = len(logo[0])
    for gy, row in enumerate(logo):
        for gx, b in enumerate(row):
            if b:
                y = WALL_TOP - gy  # de y 16 à y 1
                put(RIDGE_X + gx - lw // 2, y, wz0, b)  # nord, vu depuis le sud
                put(RIDGE_X - (gx - lw // 2), y, wz1, b)  # sud, vu depuis le nord
    _arrival_platform(put, lambda x: FLAT_Y)
    ribs = set(range(wz0, wz1 + 1, 4)) | {wz0, wz1}
    for x in range(wx0 + 1, wx1):
        for z in range(wz0 + 1, wz1):
            if x == RIDGE_X:
                name = "minecraft:chiseled_polished_blackstone" if z in ribs else "minecraft:smooth_quartz"
            elif z in ribs or (x - RIDGE_X) % 6 == 0:
                name = PB
            else:
                name = "minecraft:red_stained_glass"
            put(x, FLAT_Y, z, name)
    for z in sorted(ribs):  # lanternes sous les nervures, de part et d'autre de la plateforme
        if wz0 < z < wz1:
            for x in (RIDGE_X - 6, RIDGE_X + 6):
                put(x, FLAT_Y - 1, z, "minecraft:chain")
                put(x, FLAT_Y - 2, z, "minecraft:lantern[hanging=true]")


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
            for zi in range(OBS_Z - Z0, -1, -1):  # depuis le couloir sud, vers le nord
                b = v[y, zi, x]
                if b:
                    front.putpixel((x, H - 1 - y), color(names[b]))
                    break
    front.resize((W * 12, H * 12), Image.Resampling.NEAREST).save(HERE / "apercu-face.png")
    print("obsidienne :", int((v == names.index("minecraft:obsidian")).sum()), "· taille :", v.shape[::-1])


if __name__ == "__main__":
    main()
