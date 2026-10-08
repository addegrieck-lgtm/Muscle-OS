"""Génère le spawn VÆLORIA (Paper 1.21.4) : logo en blocs + gabarit de l'île au format Sponge v2 (.schem, WorldEdit/FAWE).

Usage : python3 minecraft/spawn/generate.py   (Pillow + numpy)
Sorties dans minecraft/spawn/ : vaeloria-logo-41.schem, vaeloria-logo-sol-25.schem,
vaeloria-spawn-gabarit.schem, logo-41.json, logo-25.json, apercu-*.png.

Repère du gabarit : x/z = 0 au centre de l'arbre, y = 0 au niveau de marche. Nord = -Z.
"""

from __future__ import annotations

import gzip
import io
import json
import math
import struct
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
DATA_VERSION = 4189  # Minecraft 1.21.4 (pale oak, pale moss)

# Couleur moyenne approximative des textures, pour la conversion du logo.
LOGO_BLOCKS: dict[str, tuple[int, int, int]] = {
    "minecraft:black_concrete": (8, 10, 15),
    "minecraft:polished_blackstone": (53, 48, 56),
    "minecraft:gray_concrete": (54, 57, 61),
    "minecraft:polished_deepslate": (72, 72, 73),
    "minecraft:light_gray_concrete": (125, 125, 115),
    "minecraft:polished_andesite": (132, 134, 133),
    "minecraft:polished_diorite": (192, 193, 194),
    "minecraft:white_concrete": (207, 213, 214),
    "minecraft:calcite": (223, 224, 220),
    "minecraft:iron_block": (220, 220, 220),
    "minecraft:red_concrete": (142, 33, 33),
    "minecraft:redstone_block": (175, 24, 5),
    "minecraft:nether_wart_block": (115, 2, 2),
    "minecraft:red_nether_bricks": (69, 7, 9),
}

# ---------------------------------------------------------------- NBT minimal


def _str(s: str) -> bytes:
    b = s.encode("utf-8")
    return struct.pack(">H", len(b)) + b


def _tag(tag_id: int, name: str, payload: bytes) -> bytes:
    return bytes([tag_id]) + _str(name) + payload


def nbt_int(name, v):
    return _tag(3, name, struct.pack(">i", v))


def nbt_short(name, v):
    return _tag(2, name, struct.pack(">h", v))


def nbt_bytes(name, data: bytes):
    return _tag(7, name, struct.pack(">i", len(data)) + data)


def nbt_ints(name, values):
    return _tag(11, name, struct.pack(">i", len(values)) + b"".join(struct.pack(">i", v) for v in values))


def nbt_compound(name, children: list[bytes]):
    return _tag(10, name, b"".join(children) + b"\x00")


def nbt_empty_compound_list(name):
    return _tag(9, name, bytes([10]) + struct.pack(">i", 0))


def varints(values: np.ndarray) -> bytes:
    out = bytearray()
    for v in values.tolist():
        while v & ~0x7F:
            out.append((v & 0x7F) | 0x80)
            v >>= 7
        out.append(v)
    return bytes(out)


def write_schem(path: Path, blocks: np.ndarray, palette: list[str], origin: tuple[int, int, int]):
    """blocks : indices de palette, forme (Y, Z, X). origin : point de collage (x, y, z) dans le volume."""
    h, l, w = blocks.shape
    data = varints(blocks.reshape(-1))  # ordre x + z*W + y*W*L
    root = nbt_compound(
        "Schematic",
        [
            nbt_int("Version", 2),
            nbt_int("DataVersion", DATA_VERSION),
            nbt_short("Width", w),
            nbt_short("Height", h),
            nbt_short("Length", l),
            nbt_ints("Offset", [0, 0, 0]),
            nbt_compound("Metadata", [nbt_int("WEOffsetX", -origin[0]), nbt_int("WEOffsetY", -origin[1]), nbt_int("WEOffsetZ", -origin[2])]),
            nbt_int("PaletteMax", len(palette)),
            nbt_compound("Palette", [nbt_int(name, i) for i, name in enumerate(palette)]),
            nbt_bytes("BlockData", data),
            nbt_empty_compound_list("BlockEntities"),
        ],
    )
    buf = io.BytesIO()
    with gzip.GzipFile(fileobj=buf, mode="wb", mtime=0) as gz:
        gz.write(root)
    path.write_bytes(buf.getvalue())


class Palette:
    def __init__(self):
        self.names = ["minecraft:air"]
        self.ids = {"minecraft:air": 0}

    def __call__(self, name: str) -> int:
        if name not in self.ids:
            self.ids[name] = len(self.names)
            self.names.append(name)
        return self.ids[name]


# ---------------------------------------------------------------- Logo


def _bezier(p0, p1, p2, p3, n=24):
    return [
        tuple((1 - t) ** 3 * a + 3 * (1 - t) ** 2 * t * b + 3 * (1 - t) * t**2 * c + t**3 * d for a, b, c, d in zip(p0, p1, p2, p3))
        for t in (i / n for i in range(1, n + 1))
    ]


# Géométrie exacte de brand/valoria-symbole.svg (viewBox 512).
SHIELD = (
    [(256, 40), (300, 100), (360, 72), (432, 104), (432, 264)]
    + _bezier((432, 264), (432, 360), (360, 420), (256, 472))
    + _bezier((256, 472), (152, 420), (80, 360), (80, 264))
    + [(80, 104), (152, 72), (212, 100)]
)
SHIELD_CORE = [(256 + (x - 256) * 0.875, 262 + (y - 262) * 0.875) for x, y in SHIELD]
LOGO_LAYERS = [  # du fond vers l'avant ; "border"/"ruby" = dégradés traités par ligne
    (SHIELD, "border"),
    (SHIELD_CORE, "minecraft:black_concrete"),
    ([(160, 150), (187, 150), (256, 350), (256, 400)], "minecraft:calcite"),  # #F4F5F7
    ([(187, 150), (214, 150), (256, 300), (256, 350)], "minecraft:light_gray_concrete"),  # argent sombre
    ([(352, 150), (325, 150), (256, 350), (256, 400)], "minecraft:polished_diorite"),  # #A9AEB8
    ([(325, 150), (298, 150), (256, 300), (256, 350)], "minecraft:white_concrete"),  # #E1E3E8
    ([(256, 150), (276, 188), (256, 272), (236, 188)], "ruby"),
]


def _inside(poly, x, y):
    hit = False
    j = len(poly) - 1
    for i in range(len(poly)):
        (xi, yi), (xj, yj) = poly[i], poly[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            hit = not hit
        j = i
    return hit


def _shade(kind, y):
    if kind == "border":  # reflet chromé : clair, bande sombre à mi-hauteur, clair
        t = (y - 40) / 432
        return ("minecraft:calcite" if t < 0.42 else "minecraft:polished_diorite" if t < 0.5
                else "minecraft:polished_andesite" if t < 0.58 else "minecraft:polished_diorite" if t < 0.78 else "minecraft:calcite")
    if kind == "ruby":  # #D21F2F -> #5E0710
        t = (y - 150) / 122
        return "minecraft:redstone_block" if t < 0.4 else "minecraft:red_concrete" if t < 0.72 else "minecraft:red_nether_bricks"
    return kind


def logo_grid(width: int) -> list[list[str | None]]:
    """Logo VÆLORIA redessiné bloc par bloc depuis la géométrie du SVG, ligne du haut en premier."""
    x0, y0, x1, y1 = 80, 40, 432, 472
    height = round(width * (y1 - y0) / (x1 - x0))
    cw, ch = (x1 - x0) / width, (y1 - y0) / height
    grid: list[list[str | None]] = []
    for gy in range(height):
        row: list[str | None] = []
        for gx in range(width):
            # Vote pondéré sur 9 points de la case (centre ×3) pour des arêtes nettes et fidèles.
            votes: dict[str | None, int] = {}
            for fy in (0.2, 0.5, 0.8):
                for fx in (0.2, 0.5, 0.8):
                    px, py = x0 + (gx + fx) * cw, y0 + (gy + fy) * ch
                    name = None
                    for poly, kind in LOGO_LAYERS:
                        if _inside(poly, px, py):
                            name = _shade(kind, py)
                    votes[name] = votes.get(name, 0) + (3 if fx == fy == 0.5 else 1)
            row.append(max(votes, key=votes.get))
        grid.append(row)
    # Symétrie parfaite de la silhouette (les teintes restent celles du logo : bras gauche clair, droit plus sombre).
    for row in grid:
        for x in range(width // 2):
            a, b = row[x], row[width - 1 - x]
            if (a is None) != (b is None):
                row[x] = row[width - 1 - x] = a or b
    # Relief : liseré anthracite sur le fond noir, au contact de l'argent et du rubis.
    shaded = [row[:] for row in grid]
    for y in range(height):
        for x in range(width):
            if grid[y][x] == "minecraft:black_concrete":
                near = [grid[y + dy][x + dx] for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)) if 0 <= y + dy < height and 0 <= x + dx < width]
                if any(n not in (None, "minecraft:black_concrete") for n in near):
                    shaded[y][x] = "minecraft:polished_blackstone"
    return shaded


def preview(grid, path: Path, scale=12):
    h, w = len(grid), len(grid[0])
    im = Image.new("RGB", (w * scale, h * scale), (7, 7, 10))
    px = im.load()
    for y, row in enumerate(grid):
        for x, name in enumerate(row):
            if name:
                c = LOGO_BLOCKS[name]
                for dy in range(scale - 1):
                    for dx in range(scale - 1):
                        px[x * scale + dx, y * scale + dy] = c
    im.save(path)


def logo_schem(grid, path: Path, vertical: bool):
    pal = Palette()
    h, w = len(grid), len(grid[0])
    if vertical:  # mur face au sud (+Z), lecture depuis le spawn ; 1 bloc d'épaisseur
        arr = np.zeros((h, 1, w), dtype=np.int32)
        for y, row in enumerate(grid):
            for x, name in enumerate(row):
                if name:
                    arr[h - 1 - y, 0, x] = pal(name)
        origin = (w // 2, 0, 0)
    else:  # au sol, haut du logo vers le nord (-Z) : lisible en regardant vers l'arbre
        arr = np.zeros((1, h, w), dtype=np.int32)
        for y, row in enumerate(grid):
            for x, name in enumerate(row):
                if name:
                    arr[0, y, x] = pal(name)
        origin = (w // 2, 0, h // 2)
    write_schem(path, arr, pal.names, origin)


# ---------------------------------------------------------------- Gabarit de l'île

X0, X1, Y0, Y1 = -92, 92, -72, 62  # emprise du gabarit (x et z partagent X0..X1)
R_VOID = 26  # rayon du vide autour de l'arbre
R_ISLET = 11  # rayon de l'îlot de l'arbre
R_EDGE = 80  # rayon moyen de l'île
PLAZA_Z, PLAZA_R = 48, 17  # place d'arrivée (sud)
SPAWN_Z = 62  # point d'apparition, regard vers le nord (l'arbre)
LOGO_Z = 70  # face avant du blason monumental, dos au vide sud, tourné vers l'arbre
GATE_Z = -58  # porte de guerre (nord)


def noise2(x, z, seed):
    """Bruit lisse déterministe (somme de sinus), suffisant pour un gabarit."""
    return (
        np.sin(x * 0.071 + seed) * np.cos(z * 0.063 + seed * 1.7)
        + 0.5 * np.sin(x * 0.17 + z * 0.13 + seed * 2.3)
        + 0.25 * np.sin(x * 0.41 - z * 0.37 + seed * 0.7)
    ) / 1.75


def build_island(logo41, logo25):
    pal = Palette()
    W = L = X1 - X0 + 1
    H = Y1 - Y0 + 1
    vol = np.zeros((H, L, W), dtype=np.int32)

    def put(x, y, z, name):
        if X0 <= x <= X1 and Y0 <= y <= Y1 and X0 <= z <= X1:
            vol[y - Y0, z - X0, x - X0] = pal(name)

    def get(x, y, z):
        return vol[y - Y0, z - X0, x - X0]

    xs = np.arange(X0, X1 + 1)
    gx, gz = np.meshgrid(xs, xs)  # gz[z, x]
    r = np.hypot(gx, gz)
    theta = np.arctan2(gz, gx)
    edge = R_EDGE + 6 * np.sin(3 * theta + 0.6) + 3.5 * np.sin(7 * theta + 2.1) + 2 * noise2(gx, gz, 4.0)
    void_r = R_VOID + 1.2 * np.sin(5 * theta + 1.3)
    islet_r = R_ISLET + 0.8 * np.sin(4 * theta)
    rng = np.random.default_rng(1)

    # Anneau principal : dessus en mousse pâle, dessous en cône inversé (profond au milieu de l'anneau).
    for (iz, ix), rv in np.ndenumerate(r):
        x, z = int(xs[ix]), int(xs[iz])
        e, vr = edge[iz, ix], void_r[iz, ix]
        if vr < rv < e:
            t = (rv - vr) / (e - vr)
            depth = int(3 + 52 * math.sin(math.pi * t) ** 1.6 + 5 * noise2(x, z, 9.1))
            for y in range(-depth, 1):
                d = -y
                if d == 0:
                    name = "minecraft:pale_moss_block"
                elif d <= 3:
                    name = "minecraft:tuff" if (x * 7 + z * 3 + d) % 5 else "minecraft:deepslate"
                elif d >= depth - 2:
                    name = "minecraft:blackstone"
                else:
                    n = noise2(x * 1.8, z * 1.8 + y * 2.2, 3.3)
                    if n > 0.78:
                        name = "minecraft:deepslate_redstone_ore"  # veines rubis
                    elif n < -0.8:
                        name = "minecraft:calcite"  # veines argent
                    else:
                        name = "minecraft:cobbled_deepslate" if d < depth * 0.6 else "minecraft:blackstone"
                put(x, y, z, name)
            put(x, -depth - 1, z, "minecraft:pointed_dripstone[thickness=tip,vertical_direction=down]") if rng.random() < 0.04 else None
        # Îlot de l'arbre : cône pointu suspendu dans le vide.
        ir = islet_r[iz, ix]
        if rv < ir:
            depth = int(4 + 34 * (1 - rv / ir) ** 1.4)
            for y in range(-depth, 2):
                d = 1 - y
                if d == 0:
                    name = "minecraft:pale_moss_block"
                elif d <= 2:
                    name = "minecraft:tuff"
                elif noise2(x * 2.1, z * 2.1 + y * 2.5, 6.6) > 0.7:
                    name = "minecraft:deepslate_redstone_ore"
                else:
                    name = "minecraft:polished_blackstone" if d > depth - 3 else "minecraft:cobbled_deepslate"
                put(x, y, z, name)

    # Garde-corps au bord du vide (côté anneau), sauf aux deux pontons.
    for a in np.linspace(0, 2 * math.pi, 900, endpoint=False):
        x, z = round((R_VOID + 2) * math.cos(a)), round((R_VOID + 2) * math.sin(a))
        if abs(x) <= 3:
            continue
        put(x, 1, z, "minecraft:polished_blackstone_brick_wall[up=true]")

    # Allée circulaire autour du vide et allées vers la place, le logo, l'est et l'ouest.
    for a in np.linspace(0, 2 * math.pi, 1400, endpoint=False):
        for rr in (31, 32, 33):
            x, z = round(rr * math.cos(a)), round(rr * math.sin(a))
            put(x, 0, z, "minecraft:deepslate_tiles" if rr == 32 else "minecraft:polished_deepslate")
    for z in range(R_VOID, PLAZA_Z - PLAZA_R + 1):
        for x in range(-2, 3):
            put(x, 0, z, "minecraft:polished_deepslate" if abs(x) == 2 else "minecraft:deepslate_tiles")
    for z in range(GATE_Z + 4, -R_VOID + 1):
        for x in range(-2, 3):
            put(x, 0, z, "minecraft:polished_deepslate" if abs(x) == 2 else "minecraft:deepslate_tiles")
    for s in (-1, 1):
        for x in range(34, 46):
            for z in range(-2, 3):
                put(s * x, 0, z, "minecraft:polished_deepslate" if abs(z) == 2 else "minecraft:deepslate_tiles")
        for x in range(-12, 13):  # places Est (marché) et Ouest (arène), gabarit uniquement
            for z in range(-12, 13):
                if math.hypot(x, z) <= 12:
                    put(s * 57 + x, 0, z, "minecraft:tuff_bricks" if math.hypot(x, z) < 11 else "minecraft:polished_blackstone_bricks")

    # Place d'arrivée : anneaux deepslate / argent / rubis + logo au sol (25 de large).
    for x in range(-PLAZA_R, PLAZA_R + 1):
        for z in range(-PLAZA_R, PLAZA_R + 1):
            d = math.hypot(x, z)
            if d <= PLAZA_R:
                name = (
                    "minecraft:polished_blackstone_bricks" if d > PLAZA_R - 1
                    else "minecraft:red_nether_bricks" if d > PLAZA_R - 2
                    else "minecraft:smooth_quartz" if d > PLAZA_R - 3
                    else "minecraft:polished_deepslate"
                )
                put(x, 0, PLAZA_Z + z, name)
    h25 = len(logo25)
    for gy, row in enumerate(logo25):  # haut du logo vers le nord : lisible face à l'arbre
        for gxl, name in enumerate(row):
            if name:
                put(gxl - len(row) // 2, 0, PLAZA_Z - 2 - h25 // 2 + gy, name)
    put(0, 0, SPAWN_Z, "minecraft:lodestone")  # point d'apparition, juste sous la pointe du logo au sol

    # Blason monumental derrière le point d'apparition, tourné vers l'arbre, sur un socle en gradins.
    h41, w41 = len(logo41), len(logo41[0])
    base_y = 4
    for step in range(4):
        for x in range(-w41 // 2 - 3 + step, w41 // 2 + 4 - step):
            for z in range(LOGO_Z - 4 + step, LOGO_Z + 4):
                put(x, step, z, "minecraft:polished_blackstone_bricks" if step < 3 else "minecraft:deepslate_tiles")
    for gy, row in enumerate(logo41):
        for gxl, name in enumerate(row):
            if name:
                # Vu depuis le nord, la gauche du spectateur est l'est (+X) : on inverse X pour garder le sens du logo.
                x, y = w41 // 2 - gxl, base_y + h41 - 1 - gy
                put(x, y, LOGO_Z, name)
                put(x, y, LOGO_Z + 1, "minecraft:polished_blackstone")  # dos du blason

    # Porte de guerre au nord (gabarit) : socle, deux piliers, linteau et vitrail rubis.
    for x in range(-9, 10):
        for z in range(GATE_Z - 3, GATE_Z + 4):
            put(x, 0, z, "minecraft:polished_blackstone_bricks")
    for px in (-7, 7):
        for y in range(1, 15):
            for dx in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    put(px + dx, y, GATE_Z + dz, "minecraft:deepslate_tiles" if y % 5 else "minecraft:polished_blackstone_bricks")
    for x in range(-8, 9):
        for y in (15, 16):
            put(x, y, GATE_Z, "minecraft:polished_blackstone_bricks")
    for x in range(-5, 6):
        for y in range(1, 15):
            put(x, y, GATE_Z, "minecraft:red_stained_glass_pane" if y > 4 else "minecraft:air")

    # Deux pontons (sud et nord) entre l'îlot et l'anneau, légèrement cintrés.
    for s in (-1, 1):
        a0, a1 = R_ISLET - 2, R_VOID + 2
        for k, zz in enumerate(range(a0, a1 + 1)):
            t = k / (a1 - a0)
            lift = round(1.5 * math.sin(math.pi * t))
            z = s * zz
            for x in range(-2, 3):
                put(x, lift, z, "minecraft:polished_blackstone_bricks" if abs(x) == 2 else "minecraft:pale_oak_planks")
                put(x, lift - 1, z, "minecraft:polished_blackstone_brick_slab[type=top]" if abs(x) < 2 else "minecraft:polished_blackstone_bricks")
            for x in (-2, 2):
                if k % 4 == 0:
                    put(x, lift + 1, z, "minecraft:polished_blackstone_brick_wall[up=true]")
                    put(x, lift + 2, z, "minecraft:lantern[hanging=false]")
                else:
                    put(x, lift + 1, z, "minecraft:iron_bars")
            if 0 < k < a1 - a0 and k % 4 == 2:  # chaînes sous le tablier, pendant dans le vide
                for dy in range(2, 2 + 6 + (k % 3)):
                    put(0, lift - dy, z, "minecraft:chain")

    # Arbre-Cœur (gabarit) : chêne pâle, racines, cœur rubis lumineux, canopée et lianes.
    TRUNK_TOP = 26
    for y in range(1, TRUNK_TOP + 1):
        rad = 3.6 - 1.4 * (y / TRUNK_TOP) + (1.8 if y < 4 else 0) * (4 - y) / 3
        for x in range(-6, 7):
            for z in range(-6, 7):
                if math.hypot(x, z) <= rad:
                    put(x, y, z, "minecraft:pale_oak_wood" if y < 3 else "minecraft:pale_oak_log")
    for a in range(8):  # racines qui serrent l'îlot puis plongent dans le vide
        ang = a * math.pi / 4 + 0.3
        for k in range(3, 15):
            x, z = round(k * math.cos(ang)), round(k * math.sin(ang))
            y = 1 if k <= R_ISLET - 1 else 1 - (k - R_ISLET + 1) * 2
            put(x, y, z, "minecraft:pale_oak_wood")
            if k > R_ISLET - 1:
                put(x, y - 1, z, "minecraft:pale_oak_wood")
        for dy in range(1, 9):  # racines pendantes
            x, z = round(15 * math.cos(ang)), round(15 * math.sin(ang))
            put(x, -7 - dy, z, "minecraft:hanging_roots" if dy == 8 else "minecraft:pale_oak_wood" if dy < 3 else "minecraft:mangrove_roots")
    for y in range(5, 10):  # cœur rubis visible depuis le ponton sud
        for x in range(-1, 2):
            put(x, y, 3, "minecraft:red_stained_glass")
            put(x, y, 2, "minecraft:shroomlight" if y in (6, 8) else "minecraft:redstone_block")
    for b in range(5):  # branches maîtresses
        ang = b * 2 * math.pi / 5 + 0.5
        for k in range(0, 13):
            x = round(k * math.cos(ang))
            z = round(k * math.sin(ang))
            put(x, TRUNK_TOP - 4 + round(k * 0.55), z, "minecraft:pale_oak_log")
    cy = TRUNK_TOP + 9
    for x in range(-21, 22):
        for z in range(-21, 22):
            for y in range(cy - 10, cy + 11):
                e = (x / 20) ** 2 + (z / 20) ** 2 + ((y - cy) / 9.5) ** 2
                if e <= 1 and noise2(x * 1.7, z * 1.7 + y * 1.3, 2.0) > -0.45 and get(x, y, z) == 0:
                    put(x, y, z, "minecraft:pale_oak_leaves[persistent=true]")
    for x in range(-19, 20):  # lianes rouges et mousse pâle pendante sous la canopée
        for z in range(-19, 20):
            if rng.random() > 0.11:
                continue
            ybot = None
            for y in range(cy - 10, cy + 2):
                if get(x, y, z) == pal("minecraft:pale_oak_leaves[persistent=true]"):
                    ybot = y
                    break
            if ybot is None:
                continue
            red = rng.random() < 0.55
            n = int(rng.integers(3, 12 if red else 6))
            for k in range(1, n + 1):
                yy = ybot - k
                if yy <= 2 or get(x, yy, z) != 0:
                    break
                if red:
                    put(x, yy, z, "minecraft:weeping_vines[age=25]" if k == n else "minecraft:weeping_vines_plant")
                else:
                    put(x, yy, z, "minecraft:pale_hanging_moss[tip=true]" if k == n else "minecraft:pale_hanging_moss[tip=false]")

    # Végétation pâle sur l'anneau (gabarit clairsemé, le builder affine).
    moss = pal("minecraft:pale_moss_block")
    for (iz, ix), _ in np.ndenumerate(r):
        x, z = int(xs[ix]), int(xs[iz])
        if get(x, 0, z) == moss and get(x, 1, z) == 0:
            p = rng.random()
            if p < 0.28:
                put(x, 1, z, "minecraft:pale_moss_carpet")
            elif p < 0.30:
                put(x, 1, z, "minecraft:red_tulip" if p < 0.29 else "minecraft:poppy")

    origin = (0 - X0, 0 - Y0, 0 - X0)
    return vol, pal.names, origin


def main():
    logo41, logo25 = logo_grid(41), logo_grid(25)
    for name, grid in (("41", logo41), ("25", logo25)):
        (HERE / f"logo-{name}.json").write_text(json.dumps(grid))
        preview(grid, HERE / f"apercu-logo-{name}.png")
    logo_schem(logo41, HERE / "vaeloria-logo-41.schem", vertical=True)
    logo_schem(logo25, HERE / "vaeloria-logo-sol-25.schem", vertical=False)
    vol, names, origin = build_island(logo41, logo25)
    write_schem(HERE / "vaeloria-spawn-gabarit.schem", vol, names, origin)
    # Aperçus de contrôle : vue de dessus, coupe nord-sud (x = 0) et élévation vue depuis le sud.
    shade = {
        "pale_moss_carpet": (176, 182, 172), "pale_moss": (160, 166, 156), "tuff": (108, 109, 102), "redstone_ore": (150, 40, 40),
        "cobbled_deepslate": (77, 77, 80), "deepslate": (72, 72, 73), "blackstone": (53, 48, 56), "smooth_quartz": (236, 230, 223),
        "red_stained_glass": (190, 40, 40), "shroomlight": (240, 140, 70), "weeping": (150, 20, 20), "pale_hanging_moss": (190, 194, 186),
        "pale_oak_leaves": (128, 134, 126), "pale_oak": (210, 204, 198), "mangrove_roots": (90, 70, 60), "hanging_roots": (150, 110, 90),
        "lantern": (230, 180, 90), "iron_bars": (180, 180, 185), "chain": (90, 95, 105), "dripstone": (130, 100, 85), "lodestone": (150, 150, 155),
        "red_tulip": (200, 40, 40), "poppy": (200, 30, 30), "red_nether": (69, 7, 9),
    }

    def color(i):
        n = names[i]
        base = n.split("[")[0]
        if base in LOGO_BLOCKS:
            return LOGO_BLOCKS[base]
        return next((v for k, v in shade.items() if k in n), (110, 110, 110))

    def save(img, name, k=4):
        img.resize((img.width * k, img.height * k), Image.Resampling.NEAREST).save(HERE / name)

    Hh, Ll, Ww = vol.shape
    top = Image.new("RGB", (Ww, Ll), (7, 7, 10))
    for z in range(Ll):
        for x in range(Ww):
            col = np.nonzero(vol[:, z, x])[0]
            if col.size:
                top.putpixel((x, z), color(vol[col[-1], z, x]))
    save(top, "apercu-gabarit-dessus.png")
    cut = Image.new("RGB", (Ll, Hh), (7, 7, 10))  # nord à gauche, sud à droite
    xi = Ww // 2
    for y in range(Hh):
        for z in range(Ll):
            v = vol[y, z, xi]
            if v:
                cut.putpixel((z, Hh - 1 - y), color(v))
    save(cut, "apercu-gabarit-coupe.png")
    def elevation(fname, z_from, z_to, from_south):
        img = Image.new("RGB", (Ww, Hh), (7, 7, 10))
        zs = range(z_to, z_from - 1, -1) if from_south else range(z_from, z_to + 1)
        zs = [z - X0 for z in zs]
        for y in range(Hh):
            for x in range(Ww):
                px = x if from_south else Ww - 1 - x
                for k, z in enumerate(zs):
                    v = vol[y, z, x]
                    if v:
                        fade = 1 - 0.45 * k / len(zs)  # plus sombre au loin
                        img.putpixel((px, Hh - 1 - y), tuple(int(ch * fade) for ch in color(v)))
                        break
        save(img, fname)

    elevation("apercu-vue-depuis-le-spawn.png", X0, SPAWN_Z - 1, from_south=True)
    elevation("apercu-vue-vers-le-blason.png", R_VOID - 4, X1, from_south=False)  # depuis le bout du ponton sud, sous la canopée
    print("blocs posés :", int((vol > 0).sum()), "· palette :", len(names), "· taille :", vol.shape[::-1])


if __name__ == "__main__":
    main()
