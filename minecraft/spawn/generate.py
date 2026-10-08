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


PB = "minecraft:polished_blackstone_bricks"
LEAVES = "minecraft:pale_oak_leaves[persistent=true]"
TRUNK_TOP = 26


def line(w, a, b, name, thick=0):
    """Segment 3D de blocs entre a et b (épaisseur optionnelle en croix)."""
    n = int(max(abs(b[i] - a[i]) for i in range(3)) * 2) + 1
    for k in range(n + 1):
        t = k / n
        x, y, z = (round(a[i] + (b[i] - a[i]) * t) for i in range(3))
        w.put(x, y, z, name)
        if thick:
            for dx, dy, dz in ((1, 0, 0), (-1, 0, 0), (0, 0, 1), (0, 0, -1), (0, -1, 0)):
                w.put(x + dx, y + dy, z + dz, name)


def blob(w, c, r, name, squash=1.0, rng=None, ragged=0.0, only_air=True):
    cx, cy, cz = c
    R = int(math.ceil(r))
    for x in range(-R, R + 1):
        for y in range(-R, R + 1):
            for z in range(-R, R + 1):
                e = (x / r) ** 2 + (y / (r * squash)) ** 2 + (z / r) ** 2
                if e > 1 or (rng is not None and e > 0.7 and rng.random() < ragged):
                    continue
                if not only_air or w.is_air(cx + x, cy + y, cz + z):
                    w.put(cx + x, cy + y, cz + z, name)


def build_tree(w):
    """Arbre-Cœur : chêne pâle torsadé, racines, cœur rubis, cinq branches, canopée en lobes, lianes rouges."""
    rng = np.random.default_rng(7)
    bark = ["minecraft:pale_oak_log"] * 7 + ["minecraft:pale_oak_wood"] * 2 + ["minecraft:stripped_pale_oak_log"]

    def center(y):
        return 0.9 * math.sin(y * 0.16), 0.7 * math.sin(y * 0.11 + 1.2)

    for y in range(1, TRUNK_TOP + 1):
        cx, cz = center(y)
        rad = 4.1 - 1.6 * y / TRUNK_TOP + (2.4 * (4 - y) / 3 if y < 4 else 0)
        for x in range(-7, 8):
            for z in range(-7, 8):
                if math.hypot(x - cx, z - cz) <= rad:
                    w.put(x, y, z, bark[int(rng.integers(len(bark)))])

    # Racines : elles courent sur l'îlot puis plongent dans le vide.
    for a in range(8):
        ang = a * math.pi / 4 + 0.3 + 0.15 * math.sin(a * 2.1)
        length = 16 if a % 2 == 0 else 11
        last = None
        for k10 in range(30, length * 10 + 1):
            k = k10 / 10
            ang_k = ang + 0.1 * math.sin(k * 0.45)
            x, z = round(k * math.cos(ang_k)), round(k * math.sin(ang_k))
            y = (3 if k < 5 else 2) if k <= R_ISLET - 1 else 2 - int((k - R_ISLET + 1) * 2.2)
            for yy in range(y, (1 if k <= R_ISLET - 1 else y - 2), -1):
                w.put(x, yy, z, "minecraft:pale_oak_wood")
            last = (x, y, z)
        if length == 16 and last:
            ex, ey, ez = last
            n = int(rng.integers(7, 13))
            for dy in range(1, n + 1):
                w.put(ex, ey - 2 - dy, ez, "minecraft:pale_oak_wood" if dy < 3 else "minecraft:mangrove_roots" if dy < n else "minecraft:hanging_roots")

    # Cœur rubis : fente dans l'écorce côté sud (face au spawn).
    for y in range(5, 10):
        for x in range(-1, 2):
            zs = [z for z in range(0, 8) if w.name_at(x, y, z).startswith(("minecraft:pale_oak", "minecraft:stripped_pale"))]
            if zs:
                zmax = max(zs)
                w.put(x, y, zmax, "minecraft:red_stained_glass")
                w.put(x, y, zmax - 1, "minecraft:shroomlight" if y in (6, 8) else "minecraft:redstone_block")

    # Branches maîtresses et rameaux, canopée en lobes autour de leurs extrémités.
    lobes = [((0, TRUNK_TOP + 12, 0), 8.5)]
    for b in range(5):
        ang = b * 2 * math.pi / 5 + 0.5 + 0.2 * math.sin(b * 1.7)
        reach = 13 + (b % 2) * 2
        cx, cz = center(TRUNK_TOP - 5)
        start = (cx, TRUNK_TOP - 5 - (b % 3), cz)
        end = (reach * math.cos(ang), TRUNK_TOP + 3 + (b % 2) * 2, reach * math.sin(ang))
        line(w, start, end, "minecraft:pale_oak_wood", thick=1 if b % 2 == 0 else 0)
        line(w, start, end, "minecraft:pale_oak_wood")
        lobes.append(((round(end[0]), round(end[1]) + 2, round(end[2])), 8.5))
        mid = tuple(start[i] + (end[i] - start[i]) * 0.6 for i in range(3))
        for side in (-1, 1):
            a2 = ang + side * 0.65
            tip = (mid[0] + 6 * math.cos(a2), mid[1] + 3, mid[2] + 6 * math.sin(a2))
            line(w, mid, tip, "minecraft:pale_oak_wood")
            lobes.append(((round(tip[0]), round(tip[1]) + 1, round(tip[2])), 5.5))
    for c, r in lobes:
        blob(w, c, r, LEAVES, squash=0.62, rng=rng, ragged=0.35)
        w.put(*c, "minecraft:light[level=12]")  # lumière invisible au cœur de chaque lobe

    # Lianes rouges (plus denses côté spawn) et mousse pâle pendante.
    leaf = w.pal(LEAVES)
    for x in range(-26, 27):
        for z in range(-26, 27):
            if rng.random() > (0.11 if z > 0 else 0.06):
                continue
            ybot = next((y for y in range(TRUNK_TOP - 8, TRUNK_TOP + 22) if w.get(x, y, z) == leaf), None)
            if ybot is None:
                continue
            red = rng.random() < 0.5
            n = int(rng.integers(3, 17)) if red else int(rng.integers(2, 7))
            for k in range(1, n + 1):
                yy = ybot - k
                if yy <= 3 or not w.is_air(x, yy, z):
                    break
                last = k == n or not w.is_air(x, yy - 1, z) or yy - 1 <= 3
                if red:
                    w.put(x, yy, z, "minecraft:weeping_vines[age=25]" if last else "minecraft:weeping_vines_plant")
                else:
                    w.put(x, yy, z, f"minecraft:pale_hanging_moss[tip={'true' if last else 'false'}]")
                if last:
                    break


def hang_under_islet(w):
    """Trois chaînes à lanterne sous la pointe de l'îlot."""
    for ang in (0.5, 2.6, 4.7):
        x, z = round(5 * math.cos(ang)), round(5 * math.sin(ang))
        ys = [y for y in range(Y0, 1) if not w.is_air(x, y, z)]
        if not ys:
            continue
        y = min(ys) - 1
        n = 6 + int(ang * 2) % 4
        for k in range(n):
            w.put(x, y - k, z, "minecraft:chain")
        w.put(x, y - n, z, "minecraft:lantern[hanging=true]")


def build_bridges(w):
    """Deux pontons de 20 × 5 : chêne pâle, rives en pierre noire, garde-corps en fer, lanternes, chaînes, piliers d'entrée."""
    a0, a1 = R_ISLET - 2, R_VOID + 2
    for s in (-1, 1):
        for k, zz in enumerate(range(a0, a1 + 1)):
            t = k / (a1 - a0)
            lift = round(1.5 * math.sin(math.pi * t))
            z = s * zz
            for x in range(-2, 3):
                w.put(x, lift, z, PB if abs(x) == 2 else "minecraft:pale_oak_planks")
                w.put(x, lift - 1, z, "minecraft:polished_blackstone_brick_slab[type=top]" if abs(x) < 2 else PB)
            for x in (-2, 2):
                if k % 4 == 0:
                    w.put(x, lift + 1, z, "minecraft:polished_blackstone_brick_wall[up=true]")
                    w.put(x, lift + 2, z, "minecraft:lantern[hanging=false]")
                else:
                    w.put(x, lift + 1, z, "minecraft:iron_bars[north=true,south=true]")
            for x, facing in ((-3, "west"), (3, "east")):  # trappes contre les rives
                w.put(x, lift, z, f"minecraft:pale_oak_trapdoor[facing={facing},half=top,open=true]")
            if 0 < k < a1 - a0 and k % 4 == 2:  # chaînes sous le tablier
                for dy in range(2, 2 + 6 + (k % 3)):
                    w.put(0, lift - dy, z, "minecraft:chain")
                w.put(0, lift - 2 - 6 - (k % 3), z, "minecraft:lantern[hanging=true]")
        # Piliers d'entrée : côté île et côté îlot.
        for zz, base in ((R_VOID + 3, 1), (R_ISLET + 1, 2)):
            for x in (-3, 3):
                for y in range(base - 4, base + 4):
                    w.put(x, y, s * zz, PB)
                w.put(x, base + 4, s * zz, "minecraft:chiseled_polished_blackstone")
                w.put(x, base + 5, s * zz, "minecraft:lantern[hanging=false]")


def build_gate(w):
    """Porte de guerre : estrade, piliers cerclés, arc brisé, vitrail rubis, losange au sommet."""
    Z = GATE_Z
    for x in range(-10, 11):
        for z in range(Z - 4, Z + 5):
            w.put(x, 0, z, PB if abs(x) == 10 or abs(z - Z) == 4 else "minecraft:deepslate_tiles")
            if abs(x) <= 9 and abs(z - Z) <= 3:
                w.put(x, 1, z, PB if abs(x) == 9 or abs(z - Z) == 3 else "minecraft:polished_deepslate")
    for px in (-7, 7):
        for y in range(2, 17):
            for dx in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    w.put(px + dx, y, Z + dz, PB if y % 5 == 1 else "minecraft:deepslate_tiles")
        w.put(px, 17, Z, "minecraft:chiseled_polished_blackstone")
        for y in (18, 19, 20):
            w.put(px, y, Z, "minecraft:polished_blackstone_wall[up=true]")
        w.put(px, 21, Z, "minecraft:end_rod[facing=up]")
    for x in range(-8, 9):  # linteau
        for z in (Z - 1, Z, Z + 1):
            for y in (17, 18):
                if abs(x) != 7:
                    w.put(x, y, z, PB)
    for y in range(12, 17):  # arc brisé
        hw = 5 - (y - 11)
        for x in range(-6, 7):
            if abs(x) > hw:
                for z in (Z - 1, Z, Z + 1):
                    w.put(x, y, z, PB)
    for y in range(8, 17):  # vitrail ; passage libre en dessous
        hw = 5 if y <= 11 else 5 - (y - 11)
        for x in range(-hw, hw + 1):
            w.put(x, y, Z, "minecraft:red_stained_glass_pane[east=true,west=true]")
    for y, half in ((19, 0), (20, 0), (21, 1), (22, 1), (23, 0)):  # losange rubis
        for x in range(-half, half + 1):
            w.put(x, y, Z, "minecraft:redstone_block")
    w.put(0, 2, Z, "minecraft:polished_blackstone_pressure_plate")


def stall(w, cx, cz, ux, uz):
    """Étal 5 × 3 tourné vers le centre (u = direction vers l'extérieur)."""
    tx, tz = -uz, ux

    def p(a, b):
        return cx + ux * a + tx * b, cz + uz * a + tz * b

    for b in (-1, 0, 1):
        x, z = p(0, b)
        w.put(x, 1, z, "minecraft:barrel[facing=up]" if b == 0 else "minecraft:pale_oak_planks")
        x, z = p(2, b)
        w.put(x, 1, z, "minecraft:decorated_pot" if b else "minecraft:barrel[facing=up]")
    for a in (0, 2):
        for b in (-2, 2):
            x, z = p(a, b)
            for y in (1, 2, 3):
                w.put(x, y, z, "minecraft:pale_oak_fence")
    for a in (-1, 0, 1, 2):
        for b in range(-2, 3):
            x, z = p(a, b)
            w.put(x, 4, z, "minecraft:red_wool" if b % 2 == 0 else "minecraft:black_wool")
    x, z = p(1, 0)
    w.put(x, 3, z, "minecraft:lantern[hanging=true]")


def round_plaza(w, cx, r_in, ring):
    for x in range(-12, 13):
        for z in range(-12, 13):
            d = math.hypot(x, z)
            if d <= 12:
                w.put(cx + x, 0, z, PB if d > 11 else ring if d > r_in else "minecraft:tuff_bricks")


def lamp(w, x, z, base=1, h=3):
    for y in range(base, base + h):
        w.put(x, y, z, "minecraft:polished_blackstone_wall[up=true]")
    w.put(x, base + h, z, "minecraft:lantern[hanging=false]")


def build_market(w):
    """Marché (est) : trois étals rayés noir et rubis, kiosque-banque au centre, lampadaires."""
    C = 57
    round_plaza(w, C, 10, "minecraft:polished_deepslate")
    stall(w, C, -8, 0, -1)
    stall(w, C, 8, 0, 1)
    stall(w, C + 8, 0, 1, 0)
    for x in range(-3, 4):
        for z in range(-3, 4):
            w.put(C + x, 0, z, "minecraft:polished_deepslate")
            w.put(C + x, 4, z, "minecraft:deepslate_tile_slab[type=bottom]")
    for x in (-2, 2):
        for z in (-2, 2):
            for y in (1, 2, 3):
                w.put(C + x, y, z, PB)
    for x in range(-1, 2):
        for z in range(-1, 2):
            w.put(C + x, 4, z, "minecraft:deepslate_tiles")
    w.put(C, 5, 0, "minecraft:chiseled_polished_blackstone")
    w.put(C, 6, 0, "minecraft:lantern[hanging=false]")
    w.put(C, 3, 0, "minecraft:lantern[hanging=true]")
    w.put(C, 1, 0, "minecraft:ender_chest[facing=west]")
    for x, z in ((8, 8), (8, -8), (-8, 8), (-8, -8)):
        lamp(w, C + x, z)


def build_arena(w):
    """Arène (ouest) : piste de duel, muret, gradins, deux plots de départ, mur des classements."""
    C = -57
    for x in range(-13, 14):
        for z in range(-13, 14):
            d = math.hypot(x, z)
            X = C + x
            if d <= 8:
                w.put(X, 0, z, "minecraft:tuff")
            elif d <= 9:
                w.put(X, 0, z, "minecraft:red_nether_bricks")
            elif d <= 12.5:
                w.put(X, 0, z, PB)
                gap = x > 0 and abs(z) <= 1  # entrée côté centre de l'île
                if not gap:
                    h = 1 if d <= 10 else 2 if d <= 11.5 else 3
                    for y in range(1, h + 1):
                        w.put(X, y, z, PB if d <= 10 else "minecraft:polished_deepslate")
    for x in (-6, 6):
        w.put(C + x, 0, 0, "minecraft:chiseled_polished_blackstone")
    for z in range(-5, 6):  # mur des classements, derrière les gradins ouest
        for y in range(1, 9):
            w.put(C - 13, y, z, PB if abs(z) == 5 or y in (1, 8) else "minecraft:black_concrete")
    for x, z in ((8, 8), (8, -8), (-8, 8), (-8, -8)):
        lamp(w, C + x, z, base=3, h=2)


def build_plaza_details(w):
    """Place d'arrivée : lampadaires, socles des hologrammes du tutoriel, socles du panthéon."""
    for x, z in ((11, PLAZA_Z - 11), (-11, PLAZA_Z - 11), (11, PLAZA_Z + 11), (-11, PLAZA_Z + 11)):
        lamp(w, x, z)
    for x, z in ((14, PLAZA_Z - 4), (-14, PLAZA_Z - 4), (9, PLAZA_Z - 12), (-9, PLAZA_Z - 12)):  # hologrammes
        w.put(x, 1, z, "minecraft:chiseled_polished_blackstone")
    for x in (-14, 14):  # panthéon n° 2 et 3
        for dx in (-1, 0, 1):
            for dz in (-1, 0, 1):
                w.put(x + dx, 1, PLAZA_Z + 8 + dz, PB)
        w.put(x, 2, PLAZA_Z + 8, "minecraft:chiseled_polished_blackstone")
    w.put(0, 3, LOGO_Z - 1, "minecraft:chiseled_polished_blackstone")  # panthéon n° 1, au pied du blason


def build_island_decor(w, rng):
    """Petits chênes pâles et rochers à veines de rubis sur l'anneau."""
    moss = w.pal("minecraft:pale_moss_block")
    for x, z, h in ((-40, -42, 6), (44, -46, 7), (-50, 32, 5), (40, 46, 6), (-22, -66, 5), (64, -24, 6)):
        if w.get(x, 0, z) != moss:
            continue
        for y in range(1, h + 1):
            w.put(x, y, z, "minecraft:pale_oak_log")
        blob(w, (x, h + 1, z), 3.2, LEAVES, squash=0.75, rng=rng, ragged=0.3)
        for k in range(int(rng.integers(2, 5))):
            vx, vz = x + int(rng.integers(-2, 3)), z + int(rng.integers(-2, 3))
            if w.is_air(vx, h - 1, vz):
                w.put(vx, h - 1, vz, "minecraft:pale_hanging_moss[tip=true]")
    for x, z, r in ((-64, -30, 2.6), (62, 34, 2.2), (-36, 58, 2.4), (22, -72, 2.0), (-72, 12, 2.2)):
        if w.get(x, 0, z) != moss:
            continue
        for dx in range(-3, 4):
            for dy in range(0, 4):
                for dz in range(-3, 4):
                    if (dx / r) ** 2 + (dy / (r * 0.8)) ** 2 + (dz / r) ** 2 <= 1:
                        n = rng.random()
                        w.put(x + dx, 1 + dy, z + dz, "minecraft:deepslate_redstone_ore" if n < 0.12 else "minecraft:calcite" if n < 0.4 else "minecraft:tuff")



class World:
    """Volume de travail dans le repère du spawn (x/z = 0 au centre de l'arbre, y = 0 au niveau de marche)."""

    def __init__(self):
        self.pal = Palette()
        self.vol = np.zeros((Y1 - Y0 + 1, X1 - X0 + 1, X1 - X0 + 1), dtype=np.int32)

    def put(self, x, y, z, name):
        if X0 <= x <= X1 and Y0 <= y <= Y1 and X0 <= z <= X1:
            self.vol[y - Y0, z - X0, x - X0] = self.pal(name)

    def get(self, x, y, z):
        if X0 <= x <= X1 and Y0 <= y <= Y1 and X0 <= z <= X1:
            return self.vol[y - Y0, z - X0, x - X0]
        return 0

    def is_air(self, x, y, z):
        return self.get(x, y, z) == 0

    def name_at(self, x, y, z):
        return self.pal.names[self.get(x, y, z)]

    def save(self, path: Path, crop=False):
        """Écrit le volume. crop=True : seulement la boîte occupée ; le point de collage reste le centre de l'arbre."""
        vol, ox, oy, oz = self.vol, X0, Y0, X0
        if crop:
            ys, zs, xs_ = np.nonzero(vol)
            vol = vol[ys.min(): ys.max() + 1, zs.min(): zs.max() + 1, xs_.min(): xs_.max() + 1]
            ox, oy, oz = X0 + xs_.min(), Y0 + ys.min(), X0 + zs.min()
        write_schem(path, vol, self.pal.names, (-ox, -oy, -oz))


def build_island(logo41, logo25):
    w = World()
    put, get, pal, vol = w.put, w.get, w.pal, w.vol

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
        put(x, 1, z, "minecraft:polished_blackstone_brick_slab[type=bottom]")

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

    build_gate(w)
    build_bridges(w)
    build_market(w)
    build_arena(w)
    build_plaza_details(w)
    build_island_decor(w, rng)
    build_tree(w)
    hang_under_islet(w)

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

    return w


def main():
    logo41, logo25 = logo_grid(41), logo_grid(25)
    for name, grid in (("41", logo41), ("25", logo25)):
        (HERE / f"logo-{name}.json").write_text(json.dumps(grid))
        preview(grid, HERE / f"apercu-logo-{name}.png")
    logo_schem(logo41, HERE / "vaeloria-logo-41.schem", vertical=True)
    logo_schem(logo25, HERE / "vaeloria-logo-sol-25.schem", vertical=False)
    w = build_island(logo41, logo25)
    w.save(HERE / "vaeloria-spawn-gabarit.schem")
    vol, names = w.vol, w.pal.names
    # Modules séparés : même point de collage que le gabarit (centre de l'arbre, niveau de marche).
    for fname, fn in (("arbre-coeur", build_tree), ("pontons", build_bridges), ("porte-de-guerre", build_gate),
                      ("marche", build_market), ("arene", build_arena)):
        m = World()
        fn(m)
        m.save(HERE / f"vaeloria-{fname}.schem", crop=True)
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
