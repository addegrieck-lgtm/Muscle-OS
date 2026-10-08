"""Arène Totem VÆLORIA « Le Sanctuaire » pour un monde plat (Paper 1.21.4+), au format Sponge v2 (.schem).

Usage : python3 minecraft/totem/generate.py   (Pillow + numpy ; réutilise minecraft/spawn/generate.py)
Sorties dans minecraft/totem/ : vaeloria-totem-sanctuaire.schem, apercu-*.png.

Repère : x/z = 0 au centre (le totem), y = 0 au niveau des pieds sur le sol plat, y = -1 = couche d'herbe.
Coller debout au centre, sur le sol d'un monde plat (y = -60 en superflat 1.18+). Nord = -Z.
L'arène a une symétrie d'ordre 4 : chaque équipe a exactement le même terrain.
"""

from __future__ import annotations

import importlib.util
import math
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
_spec = importlib.util.spec_from_file_location("vaeloria_spawn", HERE.parent / "spawn" / "generate.py")
_spawn = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(_spawn)
LOGO_BLOCKS, Palette, logo_grid, write_schem = _spawn.LOGO_BLOCKS, _spawn.Palette, _spawn.logo_grid, _spawn.write_schem

R = 80  # emprise horizontale -R..R
YMIN, YMAX = -3, 15

R_DAIS = (17, 15, 13)  # gradins de l'autel (y 0, 1, 2)
R_CERCLE = 21  # muret du Cercle, ouvert aux quatre points cardinaux
R_MOAT = (27, 30)  # douves (eau, 2 de profondeur)
TOWER_D = 30  # tours aux diagonales, en (±30, ±30)
BASTION_D = 64  # bastions des équipes aux points cardinaux
GATE_D = 57  # herse du bastion
R_WALL = 76  # rempart extérieur

PB = "minecraft:polished_blackstone_bricks"
TEAMS = {  # nord, est, sud, ouest (sens horaire vu du dessus)
    "N": ("Rubis", "red"),
    "E": ("Argent", "white"),
    "S": ("Onyx", "black"),
    "W": ("Cendre", "light_gray"),
}


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
        """Pose le bloc et ses trois copies tournées de 90° autour du totem (équité entre équipes)."""
        for k in range(4):
            self.put(x, y, z, rotate_state(name, k))
            x, z = -z, x


DIRS = ["north", "east", "south", "west"]


def rotate_state(name: str, k: int) -> str:
    """Tourne les propriétés directionnelles d'un bloc de k quarts de tour (sens horaire vu du dessus)."""
    if k == 0 or "[" not in name:
        return name
    base, props = name[:-1].split("[")
    out = []
    conn = {}
    for p in props.split(","):
        key, val = p.split("=")
        if key == "facing" and val in DIRS:
            val = DIRS[(DIRS.index(val) + k) % 4]
        if key in DIRS:
            conn[DIRS[(DIRS.index(key) + k) % 4]] = val
            continue
        out.append(f"{key}={val}")
    out += [f"{d}={conn[d]}" for d in DIRS if d in conn]
    return f"{base}[{','.join(out)}]"


def build(logo):
    w = Vol()
    rng = np.random.default_rng(3)
    put, put4 = w.put, w.put4

    # Sol : mousse pâle (argent) dans l'enceinte, tuf en bordure du rempart.
    for x in range(-R, R + 1):
        for z in range(-R, R + 1):
            d = math.hypot(x, z)
            if d < R_WALL:
                put(x, -1, z, "minecraft:pale_moss_block" if d < R_WALL - 3 else "minecraft:tuff")

    # Rempart extérieur : 6 de haut, 2 d'épaisseur, créneaux.
    for a in np.linspace(0, 2 * math.pi, 3000, endpoint=False):
        for rr in (R_WALL, R_WALL + 1):
            x, z = round(rr * math.cos(a)), round(rr * math.sin(a))
            put(x, -1, z, PB)
            for y in range(0, 6):
                put(x, y, z, "minecraft:deepslate_tiles" if y in (2, 3) else PB)
            if rr == R_WALL + 1 and (round(a * R_WALL) // 2) % 2 == 0:
                put(x, 6, z, PB)

    # Douves : anneau d'eau de 3 de large et 2 de profondeur, rebord en briques de pierre noire.
    for x in range(-R_MOAT[1] - 1, R_MOAT[1] + 2):
        for z in range(-R_MOAT[1] - 1, R_MOAT[1] + 2):
            d = math.hypot(x, z)
            if R_MOAT[0] <= d < R_MOAT[1]:
                put(x, -1, z, "minecraft:water")
                put(x, -2, z, "minecraft:water")
                put(x, -3, z, "minecraft:tuff")
            elif R_MOAT[0] - 1 <= d < R_MOAT[0] or R_MOAT[1] <= d < R_MOAT[1] + 1:
                put(x, -1, z, PB)

    # Quatre ponts, uniquement aux diagonales : on ne fonce pas tout droit depuis son bastion.
    for t in np.linspace(R_MOAT[0] - 2, R_MOAT[1] + 2, 60):
        for off in np.linspace(-1.6, 1.6, 9):
            c = t / math.sqrt(2)
            x, z = round(c + off / math.sqrt(2)), round(-c + off / math.sqrt(2))  # diagonale nord-est
            edge = abs(off) > 1.2
            put4(x, -1, z, PB if edge else "minecraft:pale_oak_planks")
            put4(x, 0, z, "minecraft:polished_blackstone_brick_slab[type=bottom]" if edge else "minecraft:air")

    # Le Cercle : muret de 2 de haut, ouvert au nord, à l'est, au sud et à l'ouest (4 de large).
    for a in np.linspace(0, 2 * math.pi, 1200, endpoint=False):
        x, z = round(R_CERCLE * math.cos(a)), round(R_CERCLE * math.sin(a))
        if min(abs(x), abs(z)) <= 2:
            continue
        put(x, -1, z, "minecraft:polished_deepslate")
        put(x, 0, z, PB)
        put(x, 1, z, "minecraft:polished_blackstone_brick_slab[type=bottom]")

    # Allée circulaire entre le Cercle et les douves.
    for x in range(-R_MOAT[0], R_MOAT[0] + 1):
        for z in range(-R_MOAT[0], R_MOAT[0] + 1):
            d = math.hypot(x, z)
            if R_CERCLE + 1.5 <= d < R_CERCLE + 3.5:
                put(x, -1, z, "minecraft:deepslate_tiles")

    # Autel à trois gradins, logo VÆLORIA au sommet ; le totem apparaît sur le rubis du logo.
    for y, r in enumerate(R_DAIS):
        for x in range(-r, r + 1):
            for z in range(-r, r + 1):
                d = math.hypot(x, z)
                if d <= r:
                    put(x, y, z, PB if d > r - 1 else "minecraft:polished_deepslate")
    h, wd = len(logo), len(logo[0])
    for gy, row in enumerate(logo):  # logo centré : le totem (0, 0) se dresse au cœur du V, à égale distance des quatre équipes
        for gx, b in enumerate(row):
            x, z = gx - wd // 2, gy - h // 2
            if b and math.hypot(x, z) <= R_DAIS[2] - 0.5:
                put(x, 2, z, b)
    for a in (45, 135, 225, 315):  # lanternes sur le gradin du milieu, aux diagonales
        x, z = round(14 * math.cos(math.radians(a))), round(14 * math.sin(math.radians(a)))
        put(x, 2, z, "minecraft:polished_blackstone_wall[up=true]")
        put(x, 3, z, "minecraft:lantern[hanging=false]")

    # --- Un quart de l'arène (nord / nord-est), recopié quatre fois par rotation ---

    # Bastion de l'équipe (nord) : cour fermée, herse amovible, fenêtres teintées à la couleur de l'équipe.
    Z0, Z1 = -BASTION_D - 7, GATE_D
    for x in range(-8, 9):
        for z in range(Z0, -Z1 + 1):
            put4(x, -1, z, "minecraft:polished_deepslate")
            wall = abs(x) == 8 or z == Z0 or z == -Z1
            if wall:
                for y in range(0, 5):
                    put4(x, y, z, PB if y in (0, 4) else "minecraft:deepslate_tiles")
                if (x + z) % 2 == 0:
                    put4(x, 5, z, PB)
    for x in range(-2, 3):  # ouverture de la herse
        for y in range(0, 4):
            put4(x, y, -Z1, "minecraft:iron_bars[east=true,west=true]" if y < 3 else PB)
    for k, (key, (_, color)) in enumerate(TEAMS.items()):
        def tp(x, z):
            for _ in range(k):
                x, z = -z, x
            return x, z
        for x in range(-1, 2):  # dalle d'apparition à la couleur de l'équipe
            for z in range(-BASTION_D - 1, -BASTION_D + 2):
                put(*_xyz(tp(x, z), -1), f"minecraft:{color}_concrete")
        for side in (-8, 8):  # vitraux
            for z in (-BASTION_D - 3, -BASTION_D, -BASTION_D + 3):
                put(*_xyz(tp(side, z), 2), f"minecraft:{color}_stained_glass")
        for x in (-4, 0, 4):
            put(*_xyz(tp(x, Z0), 2), f"minecraft:{color}_stained_glass")
    for x, z in ((-6, Z0 + 2), (6, Z0 + 2), (-6, -Z1 - 2), (6, -Z1 - 2)):
        put4(x, 0, z, "minecraft:polished_blackstone_wall[up=true]")
        put4(x, 1, z, "minecraft:lantern[hanging=false]")

    # Avenue du bastion jusqu'aux douves : rapide mais à découvert ; abris en quinconce.
    for z in range(-Z1 + 1, -R_MOAT[1]):
        for x in range(-2, 3):
            put4(x, -1, z, "minecraft:polished_blackstone" if abs(x) < 2 else PB)
    for k, z in enumerate((-50, -44, -38)):
        sx = 4 if k % 2 == 0 else -4
        for dx in (0, 1 if sx > 0 else -1):
            for y in range(0, 3):
                put4(sx + dx, y, z, "minecraft:deepslate_tiles" if y < 2 else "minecraft:polished_blackstone_brick_slab[type=bottom]")

    # Tour de guet (nord-est) : 7 × 7, 10 de haut, échelle intérieure, balise rubis au sommet.
    T = TOWER_D
    for dx in range(-3, 4):
        for dz in range(-3, 4):
            x, z = T + dx, -T + dz
            put4(x, -1, z, "minecraft:polished_deepslate")
            edge = max(abs(dx), abs(dz)) == 3
            for y in range(0, 10):
                if edge:
                    door = dz == 3 and dx == 0 and y < 2  # porte côté sud, vers l'intérieur de l'arène
                    slit = y in (4, 7) and (dx == 0 or dz == 0) and not door
                    put4(x, y, z, "minecraft:air" if door or slit else PB if y % 3 == 0 else "minecraft:deepslate_tiles")
    for dx in range(-4, 5):  # plateforme et créneaux
        for dz in range(-4, 5):
            x, z = T + dx, -T + dz
            put4(x, 10, z, PB)
            if max(abs(dx), abs(dz)) == 4 and (dx + dz) % 2 == 0:
                put4(x, 11, z, PB)
    for y in range(0, 11):  # échelle contre le mur ouest, trappe d'accès dans la plateforme
        put4(T - 2, y, -T, "minecraft:ladder[facing=east]")
    put4(T - 3, 10, -T, PB)
    for dx in (-1, 0, 1):  # pyramide de fer, balise, verre rubis : faisceau rouge visible de partout
        for dz in (-1, 0, 1):
            put4(T + dx, 9, -T + dz, "minecraft:iron_block")
    put4(T, 10, -T, "minecraft:beacon")
    put4(T, 11, -T, "minecraft:red_stained_glass")
    for dx, dz in ((3, 3), (-3, 3), (3, -3), (-3, -3)):
        put4(T + dx, 11, -T + dz, "minecraft:lantern[hanging=false]")

    # Ruines de flanc (nord-est) : murs brisés et piliers pour couper les lignes de tir.
    ruins = [
        ((14, -46), (20, -46), 3), ((24, -40), (24, -34), 2), ((10, -36), (14, -38), 2),
        ((40, -50), (44, -46), 3), ((48, -36), (52, -40), 2), ((36, -14), (40, -14), 2),
        ((18, -58), (22, -54), 2), ((54, -20), (54, -14), 3),
    ]
    for (x0, z0), (x1, z1), hgt in ruins:
        n = max(abs(x1 - x0), abs(z1 - z0))
        for i in range(n + 1):
            x = round(x0 + (x1 - x0) * i / max(n, 1))
            z = round(z0 + (z1 - z0) * i / max(n, 1))
            top = hgt - (1 if rng.random() < 0.35 else 0)
            for y in range(0, top):
                put4(x, y, z, PB if rng.random() < 0.6 else "minecraft:cracked_polished_blackstone_bricks")
            if top < hgt:
                put4(x, top, z, "minecraft:polished_blackstone_brick_slab[type=bottom]")
    for x, z in ((30, -52), (46, -26), (12, -50)):  # piliers isolés
        for y in range(0, 4):
            put4(x, y, z, "minecraft:deepslate_tiles" if y < 3 else "minecraft:chiseled_polished_blackstone")
    for x, z, rr in ((34, -44, 2.4), (50, -30, 2.0)):  # buttes de tuf (hauteur, couverture)
        for dx in range(-3, 4):
            for dz in range(-3, 4):
                for y in range(0, 3):
                    if (dx / rr) ** 2 + (dz / rr) ** 2 + (y / (rr * 0.8)) ** 2 <= 1:
                        put4(x + dx, y, z + dz, "minecraft:tuff" if (dx + dz + y) % 4 else "minecraft:deepslate_redstone_ore")

    return w


def _xyz(xz, y):
    return xz[0], y, xz[1]


def main():
    logo = logo_grid(17)
    w = build(logo)
    origin = (R, -YMIN, R)
    write_schem(HERE / "vaeloria-totem-sanctuaire.schem", w.v, w.pal.names, origin)

    shade = {
        "pale_moss": (160, 166, 156), "tuff": (108, 109, 102), "water": (40, 70, 140), "deepslate": (72, 72, 73),
        "blackstone": (53, 48, 56), "pale_oak": (210, 204, 198), "iron_bars": (180, 180, 185), "iron_block": (220, 220, 220),
        "beacon": (120, 230, 220), "lantern": (230, 180, 90), "ladder": (150, 110, 70), "redstone_ore": (150, 40, 40),
        "red_stained": (190, 40, 40), "white_stained": (230, 230, 230), "black_stained": (30, 30, 30), "light_gray_stained": (150, 150, 150),
        "red_concrete": (142, 33, 33), "white_concrete": (207, 213, 214), "black_concrete": (8, 10, 15), "light_gray_concrete": (125, 125, 115),
    }

    def color(n):
        b = n.split("[")[0]
        if b in LOGO_BLOCKS:
            return LOGO_BLOCKS[b]
        return next((v for k, v in shade.items() if k in n), (110, 110, 110))

    v, names = w.v, w.pal.names
    H, L, W = v.shape
    top = Image.new("RGB", (W, L), (7, 7, 10))
    for z in range(L):
        for x in range(W):
            col = np.nonzero(v[:, z, x])[0]
            if col.size:
                c = color(names[v[col[-1], z, x]])
                lift = 1 + 0.05 * (col[-1] - 2)  # relief : plus clair en hauteur
                top.putpixel((x, z), tuple(min(255, int(ch * lift)) for ch in c))
    top.resize((W * 4, L * 4), Image.Resampling.NEAREST).save(HERE / "apercu-totem-dessus.png")
    side = Image.new("RGB", (W, H), (7, 7, 10))  # coupe ouest-est passant par le totem (z = 0), avec un peu de profondeur
    for y in range(H):
        for x in range(W):
            for k in range(0, 6):
                zi = R - k
                b = v[y, zi, x]
                if b:
                    side.putpixel((x, H - 1 - y), tuple(int(ch * (1 - 0.1 * k)) for ch in color(names[b])))
                    break
    side.resize((W * 4, H * 4), Image.Resampling.NEAREST).save(HERE / "apercu-totem-coupe.png")
    print("blocs posés :", int((v > 0).sum()), "· palette :", len(names), "· taille :", v.shape[::-1])


if __name__ == "__main__":
    main()
