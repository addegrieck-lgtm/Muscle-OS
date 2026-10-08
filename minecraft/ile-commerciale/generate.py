#!/usr/bin/env python3
"""
Île Marchande de VÆLORIA : île flottante commerciale + ponton, dans l'identité visuelle du spawn
(gabarit vaeloria-spawn-gabarit.schem : pale moss, tuff, dessous en deepslate/blackstone,
briques de blackstone polie, pale oak, accents rouge / noir / blanc).

Génère des schematics WorldEdit / FAWE (format Sponge v2, Minecraft 1.21.4) :
  - ile-commerciale-complete.schem : île + ponton (origine = bout libre du ponton, à raccorder au spawn)
  - ile-commerciale-seule.schem    : l'île seule (origine = bord ouest de l'île, là où arrive le ponton)
  - ponton-module-8.schem          : tronçon de ponton de 8 blocs, à répéter avec //stack
ainsi que des aperçus et shops.json (coordonnées des 16 boutiques).

Sans dépendance (Pillow uniquement pour les aperçus) :
    python3 generate.py [--ponton 40] [--spawn vaeloria-spawn-gabarit.schem]
Axes : X vers l'est, Z vers le sud. Le ponton part de l'île vers l'ouest, c'est-à-dire vers le spawn.
"""

from __future__ import annotations

import argparse
import gzip
import io
import json
import math
import struct
from pathlib import Path

OUT = Path(__file__).resolve().parent
DATA_VERSION = 4189  # Minecraft 1.21.4, comme le gabarit du spawn (blocs pale oak)

G = 44  # y local du sol de l'île (le rocher du dessous descend jusqu'à y 0)
DEPTH = 42  # épaisseur max. du rocher sous l'île
A, B = 60, 44  # demi-axes de l'île

# Gabarit du spawn : le bord est de l'île du spawn est à +85 blocs de son point de collage,
# dans l'axe du chemin est (5 de large, centré sur ce point). Le bout libre du ponton se colle juste après.
SPAWN_EAST_EDGE = 85

# Palette du spawn
BRICK = "polished_blackstone_bricks"
PBLACK = "polished_blackstone"
CHISEL = "chiseled_polished_blackstone"
DSLATE = "polished_deepslate"
TILES = "deepslate_tiles"
RED = "red_nether_bricks"
TUFFB = "tuff_bricks"
QUARTZ = "smooth_quartz"
SLAB = "polished_blackstone_brick_slab[type=bottom]"
POST = "polished_blackstone_wall[up=true]"
BWALL = "polished_blackstone_brick_wall[up=true]"

# --------------------------------------------------------------------------- monde


class World:
    def __init__(self) -> None:
        self.b: dict[tuple[int, int, int], str] = {}
        self.signs: dict[tuple[int, int, int], list[str]] = {}

    def set(self, x: int, y: int, z: int, s: str | None) -> None:
        if s is None:
            self.b.pop((x, y, z), None)
            self.signs.pop((x, y, z), None)
        else:
            self.b[(x, y, z)] = s

    def get(self, x: int, y: int, z: int) -> str | None:
        return self.b.get((x, y, z))

    def fill(self, x0, y0, z0, x1, y1, z1, s) -> None:
        for x in range(min(x0, x1), max(x0, x1) + 1):
            for y in range(min(y0, y1), max(y0, y1) + 1):
                for z in range(min(z0, z1), max(z0, z1) + 1):
                    self.set(x, y, z, s)

    def sign(self, x, y, z, state, lines) -> None:
        self.set(x, y, z, state)
        self.signs[(x, y, z)] = (lines + ['""'] * 4)[:4]

    def copy(self) -> "World":
        w = World()
        w.b, w.signs = dict(self.b), dict(self.signs)
        return w


def base(s: str) -> str:
    return s.split("[", 1)[0]


PLANTS = {"red_tulip", "poppy", "pale_moss_carpet", "pale_hanging_moss", "weeping_vines", "weeping_vines_plant",
          "hanging_roots", "pointed_dripstone"}
NOT_FULL = ("slab", "stairs", "fence", "pane", "iron_bars", "lantern", "chain", "sign", "carpet", "trapdoor", "door",
            "torch", "leaves", "end_rod", "pressure_plate", "_wall", "decorated_pot")


def is_full(s: str | None) -> bool:
    if s is None:
        return False
    n = base(s)
    return n not in PLANTS and not any(k in n for k in NOT_FULL)


def connect_pass(w: World) -> None:
    """Connexions des barrières, vitres et barreaux (WorldEdit ne les recalcule pas au collage)."""
    dirs = {"north": (0, -1), "south": (0, 1), "east": (1, 0), "west": (-1, 0)}
    for (x, y, z), s in list(w.b.items()):
        n = base(s)
        fence, pane = n.endswith("_fence"), n.endswith("glass_pane") or n == "iron_bars"
        if not (fence or pane):
            continue
        props = {}
        for d, (dx, dz) in dirs.items():
            o = w.get(x + dx, y, z + dz)
            on = base(o) if o else ""
            if fence:
                ok = is_full(o) or on.endswith("_fence") or on.endswith("_fence_gate")
            else:
                ok = is_full(o) or on.endswith("glass_pane") or on == "iron_bars" or on.endswith("_wall")
            props[d] = "true" if ok else "false"
        w.b[(x, y, z)] = n + "[" + ",".join(f"{k}={v}" for k, v in sorted(props.items())) + "]"


# --------------------------------------------------------------------------- outils


def h2(x: int, z: int, salt: int = 0) -> float:
    """Bruit déterministe 0..1."""
    v = (x * 73856093) ^ (z * 19349663) ^ (salt * 83492791)
    v = (v ^ (v >> 13)) * 1274126177 & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFF) / 0xFFFF


def h3(x: int, y: int, z: int, salt: int = 0) -> float:
    return h2(x * 31 + y * 1013, z * 17 - y * 7, salt)


def island_d(x: float, z: float) -> float:
    """Distance normalisée au centre de l'île (1 = bord)."""
    nx, nz = x / A, z / B
    t = math.atan2(nz, nx)
    r = 1 + 0.05 * math.sin(3 * t + 0.7) + 0.035 * math.sin(5 * t + 2.1) + 0.02 * math.sin(9 * t + 4)
    return math.hypot(nx, nz) / r


PAVED: dict[tuple[int, int], str | None] = {}  # None = pavage automatique (dalles + bordure)
RESERVED: set[tuple[int, int]] = set()


def pave(x: int, z: int, block: str | None = None) -> None:
    if block is not None or (x, z) not in PAVED:
        PAVED[(x, z)] = block
    RESERVED.add((x, z))


def finish_paving(w: World) -> None:
    """Chemins façon spawn : cœur en deepslate tiles, bordure en polished deepslate."""
    for (x, z), blk in PAVED.items():
        if w.get(x, G, z) is None:
            continue  # hors de l'île
        if blk is None:
            edge = any((x + dx, z + dz) not in PAVED for dx, dz in ((1, 0), (-1, 0), (0, 1), (0, -1)))
            blk = DSLATE if edge else TILES
        w.set(x, G, z, blk)
        if w.get(x, G + 1, z) and base(w.get(x, G + 1, z)) in PLANTS:
            w.set(x, G + 1, z, None)


def lamp_post(w: World, x: int, z: int, h: int = 3) -> None:
    for y in range(G + 1, G + 1 + h):
        w.set(x, y, z, POST)
    w.set(x, G + 1 + h, z, "lantern[hanging=false]")
    RESERVED.add((x, z))


def pale_tree(w: World, x: int, z: int, y0: int = G + 1, trunk: int = 5) -> None:
    """Petit pale oak comme ceux du spawn : tronc de 5, houppier arrondi, mousse pâle pendante."""
    cy = y0 + trunk
    for dx in range(-3, 4):
        for dz in range(-3, 4):
            for dy in range(-2, 3):
                lim = {-2: 2.3, -1: 5.5, 0: 9.5, 1: 5.5, 2: 1.2}[dy]
                if dx * dx + dz * dz <= lim + h2(x + dx, z + dz, dy + 40) * 1.2 and not w.get(x + dx, cy + dy, z + dz):
                    w.set(x + dx, cy + dy, z + dz, "pale_oak_leaves[persistent=true]")
    for y in range(y0, cy):
        w.set(x, y, z, "pale_oak_log[axis=y]")
    for dx in range(-2, 3):
        for dz in range(-2, 3):
            if (dx or dz) and h2(x + dx, z + dz, 44) < 0.35:
                y = cy - 3
                while y < cy + 3 and not w.get(x + dx, y + 1, z + dz):
                    y += 1
                if not w.get(x + dx, y, z + dz) and base(w.get(x + dx, y + 1, z + dz) or "") == "pale_oak_leaves":
                    w.set(x + dx, y, z + dz, "pale_hanging_moss[tip=true]")
    RESERVED.add((x, z))


def stairs(f: str) -> str:
    return f"pale_oak_stairs[facing={f}]"


# --------------------------------------------------------------------------- île flottante


def rock(x: int, y: int, z: int) -> str:
    """Roche du dessous, comme le spawn : cobbled deepslate qui vire au blackstone en profondeur,
    filons de deepslate redstone ore et traînées de calcite."""
    if h3(x // 2, y // 2, z // 2, 3) < 0.016:
        return "deepslate_redstone_ore"
    if h2(x, z, 31) < 0.012 and (y + int(h2(x, z, 32) * 9)) % 9 < 4:
        return "calcite"
    t = (G - 4 - y) / DEPTH
    return "blackstone" if h3(x, y, z, 5) < min(1.0, max(0.0, (t - 0.12) / 0.5)) else "cobbled_deepslate"


def floating_rock(w: World, x: int, z: int, top: int, depth: int, d: float) -> None:
    """Colonne de roche de top à top-depth, avec stalactites, lianes et mousse pendantes dessous."""
    bottom = max(top - depth, 1)
    for y in range(bottom, top + 1):
        w.set(x, y, z, rock(x, y, z))
    v = h2(x, z, 50)
    if v < 0.05 + 0.04 * d:
        w.set(x, bottom - 1, z, "pointed_dripstone[thickness=tip,vertical_direction=down]")
    elif d > 0.75 and v < 0.13:
        kind, n = h2(x, z, 52), 1 + int(h2(x, z, 51) * 4)
        if kind > 0.9:
            w.set(x, bottom - 1, z, "hanging_roots")
            return
        for k in range(n):
            last = k == n - 1
            if kind < 0.45:
                s = "weeping_vines[age=25]" if last else "weeping_vines_plant"
            else:
                s = f"pale_hanging_moss[tip={'true' if last else 'false'}]"
            w.set(x, bottom - 1 - k, z, s)


# Profil du cône du spawn (rayon relatif → profondeur relative), relevé sur le gabarit
CONE = [(1.0, 0.0), (0.96, 0.07), (0.92, 0.14), (0.87, 0.2), (0.8, 0.34), (0.74, 0.47), (0.66, 0.61),
        (0.57, 0.75), (0.39, 0.88), (0.18, 0.95), (0.0, 1.0)]


def rock_depth(d: float) -> float:
    for (d0, p0), (d1, p1) in zip(CONE, CONE[1:]):
        if d1 <= d <= d0:
            return p0 + (p1 - p0) * (d0 - d) / (d0 - d1)
    return 0.0


def build_island(w: World) -> None:
    for x in range(-int(A * 1.25), int(A * 1.25) + 1):
        for z in range(-int(B * 1.25), int(B * 1.25) + 1):
            d = island_d(x, z)
            if d > 1.0:
                continue
            depth = 4 + int(rock_depth(d) * (DEPTH - 4) * (0.9 + 0.2 * h2(x // 3, z // 3, 9)))
            floating_rock(w, x, z, G - 4, depth - 4, d)
            w.fill(x, G - 3, z, x, G - 1, z, "tuff")
            w.set(x, G, z, "pale_moss_block")


# --------------------------------------------------------------------------- hall commercial

SIZE_NAME = {5: "Échoppe", 7: "Boutique", 9: "Grande boutique", 11: "Enseigne"}
ROWS = {  # largeurs intérieures par demi-rangée (somme 26 + 3 murs = 29 blocs)
    ("nord", "ouest"): [9, 5, 7, 5],
    ("nord", "est"): [5, 7, 5, 9],
    ("sud", "ouest"): [11, 5, 5, 5],
    ("sud", "est"): [7, 7, 7, 5],
}
AWNINGS = [("red_wool", "black_wool"), ("red_wool", "white_wool"), ("black_wool", "white_wool")]
FRIEZE = ["red_concrete", "black_concrete", "white_concrete"]
FLOORS = ["pale_oak_planks", "polished_tuff", "pale_oak_planks", "calcite", "pale_oak_planks", DSLATE]
HX, HZ = 37, 14  # demi-dimensions du hall (murs compris)
RX = 7  # demi-largeur de la rotonde
D = 8  # profondeur intérieure d'une boutique
ROOF = {5: 11, 4: 12, 3: 12, 2: 13, 1: 13, 0: 14}  # verrière : hauteur au-dessus du sol selon |z|
F = G

# Blason en V du spawn, en réduction (11 × 11), au sol de la rotonde
EMBLEM = [
    "BBBBBBBBBBB",
    "BRRRRRRRRRB",
    "BRCCCCCCCRB",
    "BRKKCCCKKRB",
    "BRPKKCKKPRB",
    "BRCPKKKPCRB",
    "BRCCPKPCCRB",
    "BBRCCrCCRBB",
    ".BBRCCCRBB.",
    "..BBRRRBB..",
    "....BBB....",
]
EMBLEM_KEY = {"B": BRICK, "R": RED, "C": "calcite", "K": "black_concrete", "P": PBLACK, "r": "red_concrete"}


def build_hall(w: World) -> list[dict]:
    shops: list[dict] = []
    seps: dict[int, set[int]] = {-1: set(), 1: set()}
    for x in range(-HX, HX + 1):
        for z in range(-HZ, HZ + 1):
            RESERVED.add((x, z))
            w.set(x, F, z, DSLATE)

    # ---- Allée centrale : dalles, bordures et traverses en polished deepslate (comme les chemins du spawn)
    for x in range(-HX + 1, HX):
        for z in range(-4, 5):
            if abs(x) >= RX:
                w.set(x, F, z, DSLATE if abs(z) == 4 or x % 4 == 0 else TILES)

    # ---- Boutiques
    n = 0
    for (row, half), widths in ROWS.items():
        sgn = -1 if row == "nord" else 1
        zf, zb = 5 * sgn, HZ * sgn
        zin = range(min(zf, zb) + 1, max(zf, zb))
        x = -HX + 1 if half == "ouest" else RX + 1
        for wd in widths:
            n += 1
            x0, x1 = x, x + wd - 1
            aw1, aw2 = AWNINGS[n % 3]
            facing_aisle = "south" if row == "nord" else "north"
            zback_in, zfront_in = zb - sgn, zf + sgn
            for xx in range(x0, x1 + 1):
                for zz in zin:
                    w.set(xx, F, zz, FLOORS[n % len(FLOORS)])
                    w.fill(xx, F + 1, zz, xx, F + 5, zz, None)
                    w.set(xx, F + 6, zz, TILES)
            for xx in range(x0 - 1, x1 + 2):  # mur arrière
                w.set(xx, F + 1, zb, DSLATE)
                w.fill(xx, F + 2, zb, xx, F + 5, zb, BRICK)
                w.set(xx, F + 6, zb, QUARTZ)
                w.set(xx, F + 7, zb, SLAB)
            cx = (x0 + x1) // 2
            k = 1 if wd >= 7 else 0
            w.fill(cx - k, F + 2, zb, cx + k, F + 3, zb, "red_stained_glass_pane")
            for xx in (x0 - 1, x1 + 1):  # murs mitoyens
                for zz in zin:
                    w.fill(xx, F + 1, zz, xx, F + 5, zz, TUFFB)
                    w.set(xx, F + 6, zz, BRICK)
            door = 1 if wd == 5 else 3
            for xx in range(x0, x1 + 1):  # vitrine
                w.set(xx, F + 1, zf, DSLATE)
                w.fill(xx, F + 2, zf, xx, F + 4, zf, "glass_pane")
                w.set(xx, F + 5, zf, FRIEZE[n % 3])
                w.set(xx, F + 6, zf, TILES)
                if abs(xx - cx) <= door // 2:
                    w.fill(xx, F + 1, zf, xx, F + 3, zf, None)
                w.set(xx, F + 6, zf - sgn, aw1 if (xx - x0) % 2 == 0 else aw2)  # store rayé du marché du spawn
            num = f"{n:02d}"
            w.sign(cx, F + 5, zf - sgn, f"pale_oak_wall_sign[facing={facing_aisle}]",
                   ['{"text":"VÆLORIA","color":"dark_red"}', '{"text":"Boutique ' + num + '","bold":true}',
                    '{"text":"' + SIZE_NAME[wd] + '"}', '{"text":"À louer","color":"dark_gray"}'])
            for xx in range(x0, x1 + 1):  # étagères au fond
                if (xx - x0) % 2 == 0:
                    w.set(xx, F + 1, zback_in, f"barrel[facing={facing_aisle}]")
                    w.set(xx, F + 2, zback_in, "decorated_pot" if (xx + n) % 4 == 0 else "pale_oak_slab[type=bottom]")
                else:
                    w.set(xx, F + 1, zback_in, "pale_oak_planks")
                    w.set(xx, F + 2, zback_in, "barrel[facing=up]")
            if wd >= 7:  # comptoir
                zc = zback_in - 3 * sgn
                for xx in range(x0 + 2, x1):
                    w.set(xx, F + 1, zc, "stripped_pale_oak_log[axis=x]")
                w.set(x1 - 1, F + 2, zc, "lantern[hanging=false]")
            else:
                w.set(x1, F + 1, zfront_in + 2 * sgn, "barrel[facing=up]")
                w.set(x1, F + 2, zfront_in + 2 * sgn, "decorated_pot")
            for lx in ([x0, cx, x1] if wd >= 9 else [cx]):
                w.set(lx, F + 5, zfront_in + 3 * sgn, "lantern[hanging=true]")
            shops.append({"id": n, "nom": f"Boutique {num}", "type": SIZE_NAME[wd], "rangee": row, "aile": half,
                          "largeur": wd, "profondeur": D, "hauteur": 5,
                          "_min": (x0, F + 1, min(zin)), "_max": (x1, F + 5, max(zin)), "_porte": (cx, F + 1, zf)})
            seps[sgn].update((x0 - 1, x1 + 1))
            x = x1 + 2

    # ---- Façades de la galerie au-dessus des vitrines, piliers à chapiteau ciselé
    for sgn in (-1, 1):
        zf = 5 * sgn
        for x in range(-HX, HX + 1):
            if abs(x) < RX:
                continue
            w.set(x, F + 7, zf, QUARTZ)
            w.fill(x, F + 8, zf, x, F + 10, zf, TUFFB)
            if x % 4 == 0 and abs(x) not in (HX, RX):
                w.fill(x, F + 8, zf, x, F + 9, zf, "red_stained_glass_pane")
        for x in seps[sgn] | {-HX, -RX, RX, HX}:
            w.fill(x, F + 1, zf, x, F + 9, zf, BRICK)
            w.set(x, F + 10, zf, CHISEL)

    # ---- Verrière, fermes en blackstone polie tous les 6 blocs, lanternes suspendues
    for x in range(-HX + 1, HX):
        if abs(x) < RX:
            continue
        prev = F + 11
        for az in range(5, -1, -1):
            top = F + ROOF[az]
            for zz in {az, -az}:
                w.fill(x, prev, zz, x, top, zz, PBLACK if x % 6 == 0 else "glass")
            prev = top
        if x % 6 == 0:
            w.fill(x, F + 11, 0, x, F + 13, 0, "chain")
            w.set(x, F + 10, 0, "lantern[hanging=true]")

    # ---- Pignons est / ouest : grande arche, vitrail rouge, colonnes d'entrée
    for x in (-HX, HX):
        for z in range(-4, 5):
            top = F + ROOF[abs(z)]
            w.fill(x, F + 1, z, x, top, z, BRICK)
            for y in range(F + 1, top + 1):
                dy = y - F
                if (abs(z) <= 3 and dy <= 4) or (abs(z) <= 2 and dy == 5) or (abs(z) <= 1 and dy == 6):
                    w.set(x, y, z, None)
                elif (abs(z) <= 1 and 9 <= dy <= 11) or (abs(z) == 2 and dy == 10):
                    w.set(x, y, z, "red_stained_glass")
            if abs(z) in (2, 3):
                w.set(x, F + 7, z, QUARTZ)
        for z in (-4, 4):
            w.fill(x, F + 1, z, x, F + 6, z, PBLACK)
        w.set(x, F + 15, 0, CHISEL)
        w.set(x, F + 16, 0, "lantern[hanging=false]")

    # ---- Murs latéraux des extrémités, parapets, piliers d'angle
    for x in (-HX, HX):
        for z in list(range(-HZ, -4)) + list(range(5, HZ + 1)):
            w.set(x, F + 1, z, DSLATE)
            w.fill(x, F + 2, z, x, F + 5, z, BRICK)
            w.set(x, F + 6, z, QUARTZ)
            w.set(x, F + 7, z, SLAB)
    for z in (-HZ, HZ):
        for x in seps[-1 if z < 0 else 1] | {-HX, HX}:
            w.fill(x, F + 1, z, x, F + 6, z, PBLACK)
            w.set(x, F + 7, z, CHISEL)
        for x in (-HX, HX):
            w.set(x, F + 8, z, "lantern[hanging=false]")

    # ---- Rotonde centrale : blason en V au sol, coupole de verre
    for x in range(-RX + 1, RX):
        for z in range(-HZ + 1, HZ):
            w.fill(x, F + 1, z, x, F + 14, z, None)
            w.set(x, F, z, TILES if abs(z) >= 6 and abs(x) <= 1 else (DSLATE if (x + z) % 2 else TILES))
    for i, line in enumerate(EMBLEM):
        for j, ch in enumerate(line):
            if ch != ".":
                w.set(j - 5, F, i - 5, EMBLEM_KEY[ch])
    for z in (-HZ, HZ):  # façades nord / sud de la rotonde
        for x in range(-RX, RX + 1):
            w.set(x, F + 1, z, DSLATE)
            w.fill(x, F + 2, z, x, F + 14, z, BRICK)
            if abs(x) in (RX, 3):
                w.fill(x, F + 1, z, x, F + 14, z, PBLACK)
            elif abs(x) > 1:
                w.set(x, F + 7, z, QUARTZ)
            for y in range(F + 1, F + 15):
                dy = y - F
                if (abs(x) <= 2 and dy <= 5) or (abs(x) <= 1 and dy == 6):
                    w.set(x, y, z, None)
                elif abs(x) <= 1 and 9 <= dy <= 12:
                    w.set(x, y, z, "red_stained_glass")
    for x in (-RX, RX):  # murs est / ouest de la rotonde
        for z in range(-HZ, HZ + 1):
            w.fill(x, F + 7 if abs(z) >= 5 else F + 11, z, x, F + 14, z, BRICK)
            if abs(z) >= 5:
                w.fill(x, F + 1, z, x, F + 6, z, TUFFB)
        for z in (-HZ, -5, 5, HZ):
            w.fill(x, F + 1, z, x, F + 14, z, PBLACK)
    for x in range(-RX, RX + 1):  # toit + couronne
        for z in range(-HZ, HZ + 1):
            if math.hypot(x, z) >= 6.5:
                w.set(x, F + 15, z, BRICK if abs(x) == RX or abs(z) == HZ else TILES)
            if abs(x) == RX or abs(z) == HZ:
                w.set(x, F + 16, z, SLAB)
    for x in (-RX, RX):
        for z in (-HZ, HZ):
            w.set(x, F + 16, z, CHISEL)
            w.set(x, F + 17, z, "lantern[hanging=false]")
    cy = F + 15
    for x in range(-8, 9):
        for z in range(-8, 9):
            for y in range(cy + 1, cy + 9):
                if 6.5 <= math.sqrt(x * x + z * z + (y - cy) ** 2) < 7.5:
                    w.set(x, y, z, PBLACK if (x == 0 or z == 0) else "glass")
    w.set(0, cy + 8, 0, CHISEL)
    w.set(0, cy + 9, 0, "red_stained_glass")
    w.set(0, cy + 10, 0, "end_rod[facing=up]")
    w.fill(0, F + 9, 0, 0, cy + 6, 0, "chain")
    w.set(0, F + 8, 0, "lantern[hanging=true]")
    for sx in (-4, 4):  # pale oaks en bac aux 4 coins de la rotonde
        for sz in (-10, 10):
            for dx in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    w.set(sx + dx, F + 1, sz + dz, SLAB)
            w.set(sx, F + 1, sz, "pale_moss_block")
            pale_tree(w, sx, sz, F + 2, 4)
    for sz in (-7, 7):
        for sx in (-5, 5):
            w.set(sx, F + 1, sz, stairs("west" if sx < 0 else "east"))

    # ---- Bacs fleuris et bancs dans la galerie
    for x in (-30, -18, 18, 30):
        for dx in (-1, 0, 1):
            for dz in (-1, 0, 1):
                w.set(x + dx, F + 1, dz, SLAB)
        w.set(x, F + 1, 0, "pale_moss_block")
        w.set(x, F + 2, 0, "red_tulip")
        w.set(x - 3, F + 1, 0, stairs("west"))
        w.set(x + 3, F + 1, 0, stairs("east"))
    return shops


# --------------------------------------------------------------------------- abords


def ring_pad(w: World, cx: int, cz: int, r: float, posts: bool = True) -> None:
    """Plateforme circulaire comme celles du spawn : tuff, anneau rouge, polished deepslate, briques."""
    R = int(r) + 2
    for x in range(cx - R, cx + R + 1):
        for z in range(cz - R, cz + R + 1):
            d = math.hypot(x - cx, z - cz)
            if d <= r:
                pave(x, z, "tuff" if d <= r - 3 else RED if d <= r - 2 else DSLATE if d <= r - 1 else BRICK)
    if posts:
        k = (r - 1.5) / math.sqrt(2)
        for sx in (-1, 1):
            for sz in (-1, 1):
                lamp_post(w, cx + round(sx * k), cz + round(sz * k), 2)


def market_stall(w: World, kx: int, kz: int, colors: tuple[str, str]) -> None:
    """Étal du marché du spawn : piquets pale oak, store rayé, tonneau et jarres."""
    for dx in (-2, 2):
        for dz in (0, 3):
            w.fill(kx + dx, G + 1, kz + dz, kx + dx, G + 3, kz + dz, "pale_oak_fence")
    for dx in range(-2, 3):
        for dz in range(-1, 4):
            w.set(kx + dx, G + 4, kz + dz, colors[0] if (dx + 2) % 2 == 0 else colors[1])
    w.set(kx - 1, G + 1, kz, "decorated_pot")
    w.set(kx, G + 1, kz, "barrel[facing=up]")
    w.set(kx + 1, G + 1, kz, "decorated_pot")
    w.set(kx, G + 2, kz, "lantern[hanging=false]")
    w.set(kx, G + 3, kz + 2, "lantern[hanging=true]")


def build_surroundings(w: World, pad_x: int) -> None:
    # Couronne pavée autour du hall
    for x in range(-HX - 4, HX + 5):
        for z in range(-HZ - 4, HZ + 5):
            if not (abs(x) <= HX and abs(z) <= HZ):
                pave(x, z)
    # Plateforme d'arrivée du ponton (ouest) et allée vers le hall
    ring_pad(w, pad_x, 0, 8.5)
    for x in range(pad_x + 8, -HX - 3):
        for z in range(-2, 3):
            pave(x, z, DSLATE if abs(z) == 2 else TILES)
    for z, f in ((-10, "north"), (10, "south")):
        for dx in (-1, 0, 1):
            w.set(pad_x + dx, G + 1, z, stairs(f))
            pave(pad_x + dx, z, DSLATE)
    # Lampadaires autour du hall
    for x in range(-HX - 3, HX + 4, 8):
        for z in (-HZ - 4, HZ + 4):
            if abs(x) > 4:
                lamp_post(w, x, z)
    for x in (-HX - 4, HX + 4):
        for z in (-8, 8):
            lamp_post(w, x, z)

    # Balcon panoramique au nord, en encorbellement au-dessus du vide
    for z in range(-HZ - 4, -46, -1):
        for x in range(-2, 3):
            pave(x, z, DSLATE if abs(x) == 2 else TILES)
    for x in range(-6, 7):
        for z in range(-53, -36):
            r = math.hypot(x, (z + 44) * 0.8)
            if r > 5.5:
                continue
            if w.get(x, G - 1, z) is None:
                w.set(x, G - 1, z, "polished_blackstone_brick_slab[type=top]")
            w.set(x, G, z, BRICK if r > 4.6 else TILES)
            w.set(x, G + 1, z, "iron_bars" if r > 4.6 and z < -41 else None)
            PAVED.pop((x, z), None)
            RESERVED.add((x, z))
    for x, z in ((-4, -46), (4, -46), (0, -50)):
        w.set(x, G + 1, z, BWALL)
        w.set(x, G + 2, z, "lantern[hanging=false]")
    for x in (-2, -1, 1, 2):
        w.set(x, G + 1, -45, stairs("south"))
    w.fill(0, G - 5, -48, 0, G - 2, -48, "chain")
    w.set(0, G - 6, -48, "lantern[hanging=true]")

    # Place du marché au sud : 3 étals comme au spawn, tables
    for z in range(HZ + 5, 22):
        for x in range(-2, 3):
            pave(x, z)
    for x in range(-24, 25):
        for z in range(22, 34):
            if abs(x) <= 24 - max(0, z - 31) * 3:
                pave(x, z)
    for kx, col in ((-15, ("red_wool", "black_wool")), (0, ("red_wool", "white_wool")), (15, ("red_wool", "black_wool"))):
        market_stall(w, kx, 25, col)
    for tx in (-21, -8, 8, 21):
        w.set(tx, G + 1, 31, "pale_oak_fence")
        w.set(tx, G + 2, 31, "pale_oak_pressure_plate")
        w.set(tx - 1, G + 1, 31, stairs("west"))
        w.set(tx + 1, G + 1, 31, stairs("east"))

    # Obélisque rouge à l'est (rappel du portail rouge du spawn)
    ox = 49
    for x in range(HX + 5, ox - 6):
        for z in range(-2, 3):
            pave(x, z, DSLATE if abs(z) == 2 else TILES)
    ring_pad(w, ox, 0, 6.5, posts=False)
    w.fill(ox - 2, G + 1, -2, ox + 2, G + 1, 2, BRICK)
    for x in range(ox - 2, ox + 3):
        for z in range(-2, 3):
            if abs(x - ox) == 2 or abs(z) == 2:
                w.set(x, G + 2, z, SLAB)
    for y in range(G + 2, G + 18):
        for x in range(ox - 1, ox + 2):
            for z in range(-1, 2):
                if x == ox and z == 0:
                    w.set(x, y, z, "shroomlight" if y % 3 == 0 else "redstone_block")
                elif (x == ox) != (z == 0) and G + 4 <= y <= G + 15:
                    w.set(x, y, z, "red_stained_glass")
                else:
                    w.set(x, y, z, PBLACK)
    w.fill(ox - 1, G + 18, -1, ox + 1, G + 18, 1, CHISEL)
    w.set(ox, G + 19, 0, "red_stained_glass")
    w.set(ox, G + 20, 0, "end_rod[facing=up]")
    for x in (ox - 1, ox + 1):
        for z in (-1, 1):
            w.set(x, G + 19, z, "lantern[hanging=false]")
    for px, pz in ((ox + 5, 0), (ox, -5), (ox, 5)):
        lamp_post(w, px, pz, 2)

    finish_paving(w)

    # Jardins : pale oaks, tapis de mousse, fleurs rouges
    cands = sorted(((x, z) for x in range(-A, A + 1) for z in range(-B, B + 1) if island_d(x, z) < 0.86),
                   key=lambda p: h2(p[0], p[1], 77))
    placed: list[tuple[int, int]] = []
    for x, z in cands:
        if len(placed) >= 30:
            break
        if any((x + dx, z + dz) in RESERVED for dx in range(-3, 4) for dz in range(-3, 4)):
            continue
        if any((x - px) ** 2 + (z - pz) ** 2 < 64 for px, pz in placed):
            continue
        pale_tree(w, x, z)
        placed.append((x, z))
    for x in range(-A - 6, A + 7):
        for z in range(-B - 6, B + 7):
            if w.get(x, G, z) == "pale_moss_block" and not w.get(x, G + 1, z):
                v = h2(x, z, 21)
                if v < 0.25:
                    w.set(x, G + 1, z, "pale_moss_carpet")
                elif v < 0.27:
                    w.set(x, G + 1, z, "red_tulip")
                elif v < 0.285:
                    w.set(x, G + 1, z, "poppy")


# --------------------------------------------------------------------------- ponton (copie des ponts du spawn)


def pontoon_slice(w: World, x: int, k: int) -> None:
    """Une tranche du ponton, sur le modèle des ponts du spawn :
    trappe | briques | 3 planches pale oak | briques | trappe, garde-corps en barreaux,
    poteau + lanterne tous les 4 blocs, lanterne suspendue sous le tablier (décalée de 2)."""
    w.set(x, G, -3, "pale_oak_trapdoor[facing=north,half=top,open=true]")
    w.set(x, G, 3, "pale_oak_trapdoor[facing=south,half=top,open=true]")
    for z in (-2, 2):
        w.set(x, G, z, BRICK)
        w.set(x, G - 1, z, BRICK)
        w.set(x, G + 1, z, "iron_bars")
    for z in range(-1, 2):
        w.set(x, G, z, "pale_oak_planks")
        w.set(x, G - 1, z, "polished_blackstone_brick_slab[type=top]")
    w.set(x, G + 2, -2, None)
    w.set(x, G + 2, 2, None)
    if k % 4 == 0:
        for z in (-2, 2):
            w.set(x, G + 1, z, BWALL)
            w.set(x, G + 2, z, "lantern[hanging=false]")
    if k % 4 == 2:
        n = 6 + (k // 4) % 3
        w.fill(x, G - n, 0, x, G - 2, 0, "chain")
        w.set(x, G - n - 1, 0, "lantern[hanging=true]")


def bridge_pillars(w: World, x: int) -> None:
    """Piliers d'entrée des ponts du spawn : briques sur 4, chapiteau ciselé, lanterne."""
    for z in (-2, 2):
        w.fill(x, G + 1, z, x, G + 4, z, BRICK)
        w.set(x, G + 5, z, CHISEL)
        w.set(x, G + 6, z, "lantern[hanging=false]")


def build_pontoon(w: World, xs: int, xe: int) -> None:
    """Ponton de xs (bout libre, côté spawn) à xe (côté île, exclu), avec un îlot de repos à mi-chemin."""
    for x in range(xs, xe):
        pontoon_slice(w, x, x - xs)
    length = xe - xs
    if length < 28:
        return
    mx = xs + (length // 8) * 4
    for x in range(mx - 7, mx + 8):  # petit rocher flottant sous le belvédère de repos
        for z in range(-8, 9):
            r = math.hypot(x - mx, z * 0.85)
            if r > 6.5:
                continue
            depth = 2 + int(7 * (1 - r / 6.5) ** 0.8 * (0.8 + 0.4 * h2(x, z, 61)))
            floating_rock(w, x, z, G - 1, depth, r / 6.5)
            if abs(z) >= 3:
                w.set(x, G, z, "pale_moss_block" if r > 5.6 else DSLATE if r > 4.8 else TILES)
                w.set(x, G + 1, z, "pale_moss_carpet" if r > 5.6 and h2(x, z, 63) < 0.4 else None)
    for x in range(mx - 3, mx + 4):  # ouvre le garde-corps vers les deux terrasses
        for z in (-2, 2):
            w.set(x, G + 1, z, None)
            w.set(x, G + 2, z, None)
    for sz in (-1, 1):
        for x in range(mx - 2, mx + 3):
            w.set(x, G + 1, sz * 6, stairs("south" if sz > 0 else "north"))
        for sx in (-4, 4):
            w.set(mx + sx, G + 1, sz * 5, BWALL)
            w.set(mx + sx, G + 2, sz * 5, "lantern[hanging=false]")
        w.set(mx, G + 1, sz * 5, "decorated_pot")


# --------------------------------------------------------------------------- export


def nbt(tag_type: int, value) -> bytes:
    if tag_type == 1:
        return struct.pack(">b", value)
    if tag_type == 2:
        return struct.pack(">h", value)
    if tag_type == 3:
        return struct.pack(">i", value)
    if tag_type == 7:
        return struct.pack(">i", len(value)) + bytes(value)
    if tag_type == 8:
        e = value.encode("utf-8")
        return struct.pack(">H", len(e)) + e
    if tag_type == 9:
        et, items = value
        return struct.pack(">bi", et if items else 0, len(items)) + b"".join(nbt(et, i) for i in items)
    if tag_type == 10:
        out = b""
        for k, (t, v) in value.items():
            out += struct.pack(">b", t) + nbt(8, k) + nbt(t, v)
        return out + b"\x00"
    if tag_type == 11:
        return struct.pack(">i", len(value)) + b"".join(struct.pack(">i", i) for i in value)
    raise ValueError(tag_type)


def text_side(lines: list[str]) -> dict:
    return {"has_glowing_text": (1, 0), "color": (8, "black"), "messages": (9, (8, lines))}


def export(w: World, path: Path, origin: tuple[int, int, int]) -> dict:
    xs, ys, zs = [p[0] for p in w.b], [p[1] for p in w.b], [p[2] for p in w.b]
    mn = (min(xs), min(ys), min(zs))
    W, H, L = max(xs) - mn[0] + 1, max(ys) - mn[1] + 1, max(zs) - mn[2] + 1
    palette: dict[str, int] = {"minecraft:air": 0}
    data = bytearray()
    for y in range(H):
        for z in range(L):
            for x in range(W):
                s = w.b.get((x + mn[0], y + mn[1], z + mn[2]))
                i = palette.setdefault("minecraft:" + s if s else "minecraft:air", len(palette))
                while i & ~0x7F:
                    data.append((i & 0x7F) | 0x80)
                    i >>= 7
                data.append(i)
    bes = [{"Pos": (11, [x - mn[0], y - mn[1], z - mn[2]]), "Id": (8, "minecraft:sign"),
            "front_text": (10, text_side(lines)), "back_text": (10, text_side(['""'] * 4)), "is_waxed": (1, 1)}
           for (x, y, z), lines in w.signs.items()]
    off = [mn[i] - origin[i] for i in range(3)]
    root = {
        "Version": (3, 2), "DataVersion": (3, DATA_VERSION),
        "Width": (2, W), "Height": (2, H), "Length": (2, L),
        "Offset": (11, [0, 0, 0]),
        "Metadata": (10, {"WEOffsetX": (3, off[0]), "WEOffsetY": (3, off[1]), "WEOffsetZ": (3, off[2]),
                          "Name": (8, path.stem), "Author": (8, "VÆLORIA")}),
        "PaletteMax": (3, len(palette)),
        "Palette": (10, {k: (3, v) for k, v in palette.items()}),
        "BlockData": (7, data),
        "BlockEntities": (9, (10, bes)),
    }
    path.write_bytes(gzip.compress(struct.pack(">b", 10) + nbt(8, "Schematic") + nbt(10, root), mtime=0))
    return {"size": (W, H, L), "offset": off, "blocks": len(w.b), "palette": len(palette)}


def read_schem(path: Path) -> tuple[dict, dict]:
    """Lecture minimale d'un .schem Sponge v2 (pour l'aperçu d'assemblage avec le gabarit du spawn)."""

    def rd(f, t):
        fmt = {1: ">b", 2: ">h", 3: ">i", 4: ">q", 5: ">f", 6: ">d"}
        if t in fmt:
            return struct.unpack(fmt[t], f.read(struct.calcsize(fmt[t])))[0]
        if t == 7:
            return f.read(rd(f, 3))
        if t == 8:
            return f.read(struct.unpack(">H", f.read(2))[0]).decode("utf-8", "replace")
        if t == 9:
            et, n = rd(f, 1), rd(f, 3)
            return [rd(f, et) for _ in range(n)]
        if t == 10:
            d = {}
            while (tt := rd(f, 1)) != 0:
                k = rd(f, 8)
                d[k] = rd(f, tt)
            return d
        if t in (11, 12):
            return [rd(f, 3 if t == 11 else 4) for _ in range(rd(f, 3))]
        raise ValueError(t)

    f = io.BytesIO(gzip.decompress(path.read_bytes()))
    f.read(1)
    rd(f, 8)
    r = rd(f, 10)
    W, L = r["Width"], r["Length"]
    pal = {v: k.removeprefix("minecraft:") for k, v in r["Palette"].items()}
    data, i, idx, blocks = r["BlockData"], 0, 0, {}
    while i < len(data):
        v = s = 0
        while True:
            bt = data[i]
            i += 1
            v |= (bt & 0x7F) << s
            s += 7
            if not bt & 0x80:
                break
        if v:
            y, rem = divmod(idx, W * L)
            z, x = divmod(rem, W)
            blocks[(x, y, z)] = pal[v]
        idx += 1
    return r["Metadata"], blocks


# --------------------------------------------------------------------------- aperçus

COLORS = {
    "pale_moss_block": (106, 112, 105), "pale_moss_carpet": (120, 128, 118), "tuff": (108, 109, 102),
    "cobbled_deepslate": (77, 77, 80), "blackstone": (42, 36, 41), "deepslate": (80, 80, 82),
    "deepslate_redstone_ore": (110, 60, 60), "calcite": (223, 224, 220), "polished_blackstone": (53, 48, 56),
    "polished_blackstone_bricks": (48, 42, 50), "chiseled_polished_blackstone": (60, 55, 62),
    "polished_deepslate": (72, 72, 73), "deepslate_tiles": (54, 54, 55), "black_concrete": (8, 10, 15),
    "red_nether_bricks": (70, 7, 9), "red_concrete": (142, 32, 32), "white_concrete": (207, 213, 214),
    "smooth_quartz": (235, 229, 222), "polished_diorite": (192, 193, 194), "light_gray_concrete": (125, 125, 115),
    "polished_andesite": (132, 135, 134), "tuff_bricks": (98, 102, 95), "polished_tuff": (98, 104, 98),
    "pale_oak_planks": (227, 217, 216), "pale_oak_log": (90, 80, 75), "pale_oak_wood": (90, 80, 75),
    "stripped_pale_oak_log": (245, 238, 236), "pale_oak_leaves": (150, 160, 150), "pale_oak_fence": (227, 217, 216),
    "pale_oak_trapdoor": (227, 217, 216), "pale_oak_slab": (227, 217, 216), "pale_oak_stairs": (227, 217, 216),
    "glass": (200, 225, 235), "glass_pane": (200, 225, 235), "red_stained_glass": (153, 51, 51),
    "red_stained_glass_pane": (153, 51, 51), "iron_bars": (150, 150, 150), "chain": (60, 60, 70),
    "lantern": (230, 170, 80), "shroomlight": (240, 146, 70), "redstone_block": (175, 24, 5),
    "red_wool": (160, 39, 34), "black_wool": (20, 21, 25), "white_wool": (233, 236, 236), "barrel": (140, 105, 60),
    "decorated_pot": (150, 85, 65), "end_rod": (240, 235, 225), "red_tulip": (200, 40, 40), "poppy": (200, 30, 30),
    "pointed_dripstone": (130, 100, 85), "weeping_vines": (130, 20, 20), "weeping_vines_plant": (130, 20, 20),
    "pale_hanging_moss": (130, 140, 130), "hanging_roots": (160, 110, 90), "lodestone": (120, 120, 125),
    "mangrove_roots": (80, 60, 40), "polished_blackstone_brick_slab": (48, 42, 50),
    "polished_blackstone_wall": (53, 48, 56), "polished_blackstone_brick_wall": (48, 42, 50),
    "deepslate_tile_slab": (54, 54, 55), "polished_blackstone_pressure_plate": (53, 48, 56),
    "pale_oak_pressure_plate": (227, 217, 216), "ender_chest": (20, 30, 30),
}
INVISIBLE = {"light", "pale_oak_wall_sign"}


def color_of(s: str):
    n = base(s)
    return None if n in INVISIBLE else COLORS.get(n, (150, 150, 150))


def shape_of(s: str) -> tuple[float, float, float]:
    n = base(s)
    if "slab" in n:
        return (0, 0.5, 1) if "type=top" in s else (0, 0, 0.5)
    if "carpet" in n or "pressure_plate" in n:
        return (0, 0, 0.1)
    if n.endswith("_fence") or n.endswith("_wall") or n in ("iron_bars", "chain", "end_rod"):
        return (0.36, 0, 1)
    if "pane" in n or n in PLANTS:
        return (0.3, 0, 1)
    if "lantern" in n:
        return (0.3, 0.1, 0.65)
    if "trapdoor" in n:
        return (0.2, 0, 1)
    return (0, 0, 1)


def render_iso(blocks: dict, path: Path, scale: int = 4, bg=(16, 18, 22)) -> None:
    from PIL import Image, ImageDraw

    keys = [p for p, s in blocks.items() if color_of(s)]
    xs, ys, zs = [p[0] for p in keys], [p[1] for p in keys], [p[2] for p in keys]
    mnx, mxx, mnz, mxz, mny, mxy = min(xs), max(xs), min(zs), max(zs), min(ys), max(ys)

    def proj(X, Y, Z):
        return ((X - Z - (mnx - mxz) + 2) * scale, ((X + Z - mnx - mnz) / 2 - Y + mxy + 3) * scale)

    img = Image.new("RGB", (int((mxx - mnx + mxz - mnz + 5) * scale),
                            int(((mxx - mnx + mxz - mnz) / 2 + mxy - mny + 6) * scale)), bg)
    dr = ImageDraw.Draw(img)
    solid = {p for p in keys if shape_of(blocks[p]) == (0, 0, 1) and "glass" not in blocks[p] and "leaves" not in blocks[p]}
    for (x, y, z) in sorted(keys, key=lambda p: (p[0] + p[2], p[1], p[0])):
        if (x, y + 1, z) in solid and (x + 1, y, z) in solid and (x, y, z + 1) in solid:
            continue
        s = blocks[(x, y, z)]
        c = color_of(s)
        ins, y0, y1 = shape_of(s)
        x0, x1, z0, z1, Y0, Y1 = x + ins, x + 1 - ins, z + ins, z + 1 - ins, y + y0, y + y1
        sh = lambda k: tuple(int(v * k) for v in c)
        dr.polygon([proj(x1, Y1, z0), proj(x1, Y1, z1), proj(x1, Y0, z1), proj(x1, Y0, z0)], fill=sh(0.78))
        dr.polygon([proj(x0, Y1, z1), proj(x1, Y1, z1), proj(x1, Y0, z1), proj(x0, Y0, z1)], fill=sh(0.62))
        dr.polygon([proj(x0, Y1, z0), proj(x1, Y1, z0), proj(x1, Y1, z1), proj(x0, Y1, z1)], fill=c)
    img.save(path, optimize=True)


def render_plan(blocks: dict, path: Path, shops: list[dict], ymax: int, scale: int = 6, labels=(), caption="") -> None:
    """Vue de dessus, coupée à ymax (sous les toits), avec les numéros de boutiques."""
    from PIL import Image, ImageDraw, ImageFont

    xs, zs = [p[0] for p in blocks], [p[2] for p in blocks]
    mnx, mxx, mnz, mxz = min(xs), max(xs), min(zs), max(zs)
    cols: dict = {}
    for (x, y, z), s in blocks.items():
        if y <= ymax and color_of(s) and ((x, z) not in cols or y > cols[(x, z)][0]):
            cols[(x, z)] = (y, s)
    img = Image.new("RGB", ((mxx - mnx + 1) * scale, (mxz - mnz + 1) * scale + 34), (16, 18, 22))
    dr = ImageDraw.Draw(img)
    for (x, z), (y, s) in cols.items():
        k = 1.0 if y >= ymax - 3 else 0.55
        dr.rectangle([(x - mnx) * scale, (z - mnz) * scale, (x - mnx + 1) * scale - 1, (z - mnz + 1) * scale - 1],
                     fill=tuple(int(v * k) for v in color_of(s)))
    try:
        font = ImageFont.truetype("DejaVuSans-Bold.ttf", 14)
        small = ImageFont.truetype("DejaVuSans.ttf", 13)
    except OSError:
        font = small = ImageFont.load_default()
    for s in shops:
        (x0, _, z0), (x1, _, z1) = s["_min"], s["_max"]
        cx, cz = ((x0 + x1 + 1) / 2 - mnx) * scale, ((z0 + z1 + 1) / 2 - mnz) * scale
        dr.rectangle([cx - 13, cz - 10, cx + 13, cz + 10], fill=(120, 14, 18))
        dr.text((cx, cz), f"{s['id']:02d}", fill=(255, 255, 255), font=font, anchor="mm")
    for lx, lz, text in labels:
        dr.text(((lx - mnx) * scale, (lz - mnz) * scale), text, fill=(255, 255, 255), font=font, anchor="mm",
                stroke_width=3, stroke_fill=(0, 0, 0))
    dr.text((10, (mxz - mnz + 1) * scale + 10), caption, fill=(230, 230, 230), font=small)
    img.save(path, optimize=True)


# --------------------------------------------------------------------------- main


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ponton", type=int, default=40, help="longueur du ponton dans le vide, en blocs (défaut 40)")
    ap.add_argument("--spawn", type=Path, help="gabarit du spawn (.schem) pour l'aperçu d'assemblage")
    ap.add_argument("--no-preview", action="store_true")
    args = ap.parse_args()

    w = World()
    build_island(w)
    west = min(x for x in range(-A - 10, 0) if island_d(x, 0) <= 1.0)  # bord ouest de l'île, sur l'axe
    pad_x = west + 9
    shops = build_hall(w)
    build_surroundings(w, pad_x)
    island = w.copy()
    xe = pad_x - 8  # le ponton s'arrête sur la bordure de la plateforme d'arrivée
    xs = west - args.ponton
    build_pontoon(w, xs, xe)
    for x in range(west, xe):
        pontoon_slice(island, x, x - xs)
    for ww in (w, island):
        bridge_pillars(ww, xe - 1)
        connect_pass(ww)

    origin = (xs, G, 0)  # plancher du bout libre du ponton
    info_full = export(w, OUT / "ile-commerciale-complete.schem", origin)
    o_island = (west, G, 0)
    info_island = export(island, OUT / "ile-commerciale-seule.schem", o_island)
    mod = World()
    for x in range(8):
        pontoon_slice(mod, x, x)
    connect_pass(mod)
    for z in (-2, 2):  # les barreaux en bout de module se raccordent au module suivant
        s = mod.get(7, G + 1, z)
        mod.set(7, G + 1, z, s.replace("east=false", "east=true"))
    info_mod = export(mod, OUT / "ponton-module-8.schem", (0, G, 0))

    rel = lambda p, o: [p[i] - o[i] for i in range(3)]
    out = [{k: v for k, v in s.items() if not k.startswith("_")} | {
        "depuis_bout_du_ponton": {"min": rel(s["_min"], origin), "max": rel(s["_max"], origin), "porte": rel(s["_porte"], origin)},
        "depuis_bord_de_l_ile": {"min": rel(s["_min"], o_island), "max": rel(s["_max"], o_island), "porte": rel(s["_porte"], o_island)},
    } for s in shops]
    (OUT / "shops.json").write_text(json.dumps(out, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    if not args.no_preview:
        render_iso(w.b, OUT / "apercu-isometrique.png", scale=4)
        render_plan(island.b, OUT / "plan-boutiques.png", shops, G + 2, scale=7,
                    caption="Plan au sol — Échoppe 5×8 · Boutique 7×8 · Grande boutique 9×8 · Enseigne 11×8 · Nord en haut")
        if args.spawn:
            meta, sp = read_schem(args.spawn)
            so = (-meta["WEOffsetX"], -meta["WEOffsetY"], -meta["WEOffsetZ"])  # point de collage du spawn
            dx = so[0] + SPAWN_EAST_EDGE + 1 - origin[0]
            dy, dz = so[1] - origin[1], so[2] - origin[2]
            both = dict(sp)
            both.update({(x + dx, y + dy, z + dz): s for (x, y, z), s in w.b.items()})
            render_iso(both, OUT / "apercu-avec-spawn.png", scale=3)
            e = so[0] + SPAWN_EAST_EDGE + 1
            render_plan(both, OUT / "plan-avec-spawn.png", [], so[1] + 2, scale=3,
                        labels=[(so[0], so[2] - 80, "SPAWN"), (e + args.ponton // 2, so[2] - 14, "PONTON"),
                                (e + args.ponton + 70, so[2] - 56, "ÎLE MARCHANDE")],
                        caption=f"Assemblage : bout libre du ponton à +{SPAWN_EAST_EDGE + 1} blocs à l'est du point de collage "
                                f"du spawn, même hauteur, dans l'axe du chemin est")

    for name, i in (("complète", info_full), ("île seule", info_island), ("module ponton", info_mod)):
        print(f"{name:14} {i['size'][0]}×{i['size'][1]}×{i['size'][2]}  blocs={i['blocks']}  palette={i['palette']}  offset={i['offset']}")
    print(f"ponton : {xe - xs} blocs (dont {args.ponton} dans le vide)")


if __name__ == "__main__":
    main()
