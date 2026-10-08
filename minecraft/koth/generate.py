"""KOTH VÆLORIA « La Citadelle » (Paper 1.21.4+), au format Sponge v2 (.schem, WorldEdit/FAWE).

Usage : python3 minecraft/koth/generate.py   (Pillow + numpy ; réutilise minecraft/spawn et minecraft/totem)
Sorties dans minecraft/koth/ : vaeloria-koth-citadelle.schem, apercu-*.png.

Repère : x/z = 0 au centre de la zone de capture, y = 0 au niveau des pieds sur le terrain, y = -1 = sol.
Coller debout au centre de l'emplacement choisi (warzone ou monde plat). Nord = -Z.
Symétrie d'ordre 4 : quelle que soit la direction d'arrivée, le terrain est le même.

Zone de capture (5 × 5) : blocs x -2..2, z -2..2 ; le joueur s'y tient en y = 2.
"""

from __future__ import annotations

import importlib.util
import math
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


_spawn = _load("vaeloria_spawn", HERE.parent / "spawn" / "generate.py")
_totem = _load("vaeloria_totem", HERE.parent / "totem" / "generate.py")
LOGO_BLOCKS, Palette, logo_grid, write_schem = _spawn.LOGO_BLOCKS, _spawn.Palette, _spawn.logo_grid, _spawn.write_schem
rotate_state = _totem.rotate_state

R = 42  # emprise -R..R
YMIN, YMAX = -6, 30
R_SITE = 40  # disque de fondation
CAP = 2  # demi-côté de la zone de capture (5 × 5)
COURT = 10  # demi-côté de la cour intérieure
WALL = (11, 13)  # enceinte : 3 d'épaisseur
WALL_TOP = 8  # chemin de ronde (on s'y tient en y = 9)
TOWER = (11, 15)  # tours d'angle 5 × 5
TOWER_TOP = 11
GATE_R = 34  # arches d'entrée sur les routes

PB = "minecraft:polished_blackstone_bricks"
DT = "minecraft:deepslate_tiles"


class Vol:
    def __init__(self):
        self.pal = Palette()
        n = 2 * R + 1
        self.v = np.zeros((YMAX - YMIN + 1, n, n), dtype=np.int32)

    def put(self, x, y, z, name):
        if -R <= x <= R and -R <= z <= R and YMIN <= y <= YMAX:
            self.v[y - YMIN, z + R, x + R] = self.pal(name)

    def get(self, x, y, z):
        if -R <= x <= R and -R <= z <= R and YMIN <= y <= YMAX:
            return self.pal.names[self.v[y - YMIN, z + R, x + R]]
        return "minecraft:air"

    def put4(self, x, y, z, name):
        for k in range(4):
            self.put(x, y, z, rotate_state(name, k))
            x, z = -z, x


def build(logo):
    w = Vol()
    put, put4 = w.put, w.put4
    rng = np.random.default_rng(11)

    # Fondation : un disque plat qui rattrape un terrain irrégulier (jusqu'à 4 blocs de dénivelé).
    for x in range(-R_SITE, R_SITE + 1):
        for z in range(-R_SITE, R_SITE + 1):
            d = math.hypot(x, z)
            if d > R_SITE:
                continue
            depth = 4 if d < R_SITE - 3 else 2
            for y in range(-depth - 1, 0):
                put(x, y, z, "minecraft:tuff" if y == -1 else "minecraft:cobbled_deepslate")
            if d > R_SITE - 2:
                put(x, -1, z, PB)

    # --- Un quart, recopié quatre fois par rotation ---

    # Route d'approche (sud) jusqu'à la porte, arche monumentale au bout.
    for z in range(WALL[1] + 1, R_SITE - 1):
        for x in range(-2, 3):
            put4(x, -1, z, "minecraft:polished_blackstone" if abs(x) < 2 else PB)
    for side in (-4, 4):
        for y in range(0, 8):
            for dx in (0, 1 if side > 0 else -1):
                put4(side + dx, y, GATE_R, PB if y in (0, 7) else DT)
        put4(side, 8, GATE_R, "minecraft:polished_blackstone_wall[up=true]")
        put4(side, 9, GATE_R, "minecraft:lantern[hanging=false]")
    for x in range(-3, 4):
        put4(x, 7, GATE_R, PB)
    for y, half in ((8, 0), (9, 1), (10, 1), (11, 0)):  # losange rubis
        for x in range(-half, half + 1):
            put4(x, y, GATE_R, "minecraft:redstone_block")

    # Couvert extérieur : murets en L, piliers, ruines. Tout ce qui coupe les lignes de tir vers la porte.
    for (x0, z0), (x1, z1), h in (((8, 22), (14, 22), 2), ((14, 22), (14, 27), 2), ((-9, 28), (-15, 28), 2),
                                  ((20, 30), (24, 26), 3), ((27, 16), (31, 16), 2), ((-22, 19), (-22, 24), 3)):
        n = max(abs(x1 - x0), abs(z1 - z0))
        for i in range(n + 1):
            x = round(x0 + (x1 - x0) * i / n)
            z = round(z0 + (z1 - z0) * i / n)
            top = h - (1 if rng.random() < 0.3 else 0)
            for y in range(0, top):
                put4(x, y, z, PB if rng.random() < 0.65 else "minecraft:cracked_polished_blackstone_bricks")
            if top < h:
                put4(x, top, z, "minecraft:polished_blackstone_brick_slab[type=bottom]")
    for x, z in ((6, 30), (-6, 30), (25, 22), (-28, 10)):
        for y in range(0, 4):
            put4(x, y, z, DT if y < 3 else "minecraft:chiseled_polished_blackstone")

    # Enceinte : 3 d'épaisseur, 8 de haut, chemin de ronde, créneaux côté extérieur.
    for a in range(-WALL[1], WALL[1] + 1):
        for t in range(WALL[0], WALL[1] + 1):
            x, z = a, t  # mur sud ; les trois autres par rotation
            gate = abs(x) <= 1  # porte de 3 de large
            for y in range(0, WALL_TOP + 1):
                if gate and y <= 3:
                    continue
                put4(x, y, z, PB if y in (0, WALL_TOP) or y % 4 == 0 else DT)
            if t == WALL[1] and (x % 2 == 0) and not abs(x) <= 1:
                put4(x, WALL_TOP + 1, z, PB)
    for x in range(-1, 2):  # herse décorative au-dessus du passage
        put4(x, 3, WALL[0], "minecraft:iron_bars[east=true,west=true]")
        put4(x, 3, WALL[1], "minecraft:iron_bars[east=true,west=true]")
    for x in (-6, 6):  # meurtrières traversantes : on tire dans les deux sens
        for y in (2, 5):
            for t in range(WALL[0], WALL[1] + 1):
                put4(x, y, t, "minecraft:air")

    # Blason VÆLORIA au-dessus de chaque porte, tourné vers l'extérieur.
    h, wd = len(logo), len(logo[0])
    for gy, row in enumerate(logo):
        for gx, b in enumerate(row):
            if b:
                x, y = gx - wd // 2, WALL_TOP + 1 + h - 1 - gy  # vu depuis le sud, la gauche du spectateur est l'ouest (-X)
                put4(x, y, WALL[1], b)
                put4(x, y, WALL[1] - 1, "minecraft:polished_blackstone")

    # Tours d'angle 5 × 5, plus hautes que l'enceinte ; échelle depuis le chemin de ronde.
    for x in range(TOWER[0], TOWER[1] + 1):
        for z in range(TOWER[0], TOWER[1] + 1):
            for y in range(0, TOWER_TOP + 1):
                put4(x, y, z, PB if y % 4 == 0 or y == TOWER_TOP else DT)
            edge = x in TOWER or z in TOWER
            if edge and (x + z) % 2 == 0:
                put4(x, TOWER_TOP + 1, z, PB)
    for y in range(WALL_TOP + 1, TOWER_TOP + 1):  # échelle côté ouest de la tour sud-est, sur le chemin de ronde sud
        put4(TOWER[0] - 1, y, 12, "minecraft:ladder[facing=west]")
    put4(TOWER[0], TOWER_TOP + 1, 12, "minecraft:air")
    put4(13, TOWER_TOP + 2, 13, "minecraft:lantern[hanging=false]")

    # Escalier intérieur : de la cour au chemin de ronde, contre le mur sud (un par mur).
    for k in range(WALL_TOP + 1):
        x = -3 - k
        for y in range(0, k + 1):
            put4(x, y, COURT, "minecraft:polished_deepslate" if y == k else DT)

    # Cour intérieure.
    for x in range(-COURT, COURT + 1):
        for z in range(-COURT, COURT + 1):
            put(x, -1, z, "minecraft:polished_deepslate" if (x + z) % 2 else "minecraft:deepslate_tiles")
    for x, z in ((6, 6),):  # piliers de couvert dans la cour : on ne capture pas tranquille, on ne se fait pas tirer comme un lapin
        for y in range(0, 3):
            put4(x, y, z, DT if y < 2 else "minecraft:chiseled_polished_blackstone")
        put4(x, 3, z, "minecraft:lantern[hanging=false]")

    # Socle et zone de capture : 2 marches, liseré rubis, balise sous verre rouge (faisceau visible de loin).
    for x in range(-4, 5):
        for z in range(-4, 5):
            put(x, 0, z, PB)
    for x in range(-3, 4):
        for z in range(-3, 4):
            edge = max(abs(x), abs(z)) == 3
            put(x, 1, z, "minecraft:red_nether_bricks" if edge else "minecraft:polished_blackstone")
    for x in (-1, 0, 1):
        for z in (-1, 0, 1):
            put(x, -1, z, "minecraft:iron_block")
    put(0, 0, 0, "minecraft:beacon")
    put(0, 1, 0, "minecraft:red_stained_glass")
    for x, z in ((-2, -2), (2, -2), (-2, 2), (2, 2)):  # coins de la zone marqués en rubis
        put(x, 1, z, "minecraft:redstone_block")
    for k in range(4):  # quatre lanternes au pied du socle
        x, z = 4, 4
        for _ in range(k):
            x, z = -z, x
        put(x, 1, z, "minecraft:lantern[hanging=false]")

    return w


def main():
    logo = logo_grid(13)
    w = build(logo)
    write_schem(HERE / "vaeloria-koth-citadelle.schem", w.v, w.pal.names, (R, -YMIN, R))

    shade = {
        "tuff": (108, 109, 102), "deepslate": (72, 72, 73), "blackstone": (53, 48, 56), "iron_bars": (180, 180, 185),
        "iron_block": (220, 220, 220), "beacon": (120, 230, 220), "lantern": (230, 180, 90), "ladder": (150, 110, 70),
        "red_stained": (190, 40, 40), "red_nether": (69, 7, 9),
    }

    def color(n):
        b = n.split("[")[0]
        if b in LOGO_BLOCKS:
            return LOGO_BLOCKS[b]
        return next((v for k, v in shade.items() if k in n), (110, 110, 110))

    v, names = w.v, w.pal.names
    air = w.pal("minecraft:air")
    H, L, W = v.shape
    solid = (v != 0) & (v != air)
    top = Image.new("RGB", (W, L), (7, 7, 10))
    for z in range(L):
        for x in range(W):
            col = np.nonzero(solid[:, z, x])[0]
            if col.size:
                yv = col[-1] + YMIN
                c = color(names[v[col[-1], z, x]])
                lift = 1 + 0.04 * yv
                top.putpixel((x, z), tuple(max(0, min(255, int(ch * lift))) for ch in c))
    top.resize((W * 6, L * 6), Image.Resampling.NEAREST).save(HERE / "apercu-koth-dessus.png")
    front = Image.new("RGB", (W, H), (7, 7, 10))  # vue depuis le sud, comme en arrivant par la route
    for y in range(H):
        for x in range(W):
            col = np.nonzero(solid[y, :, x])[0]
            if col.size:
                zi = col[-1]
                fade = 0.45 + 0.55 * zi / L
                front.putpixel((x, H - 1 - y), tuple(int(ch * fade) for ch in color(names[v[y, zi, x]])))
    front.resize((W * 6, H * 6), Image.Resampling.NEAREST).save(HERE / "apercu-koth-face.png")
    cut = Image.new("RGB", (W, H), (7, 7, 10))  # coupe nord-sud par la zone de capture
    for y in range(H):
        for z in range(L):
            b = v[y, z, R]
            if b and b != air:
                cut.putpixel((z, H - 1 - y), color(names[b]))
    cut.resize((W * 6, H * 6), Image.Resampling.NEAREST).save(HERE / "apercu-koth-coupe.png")
    print("blocs posés :", int(solid.sum()), "· palette :", len(names), "· taille :", v.shape[::-1])


if __name__ == "__main__":
    main()
